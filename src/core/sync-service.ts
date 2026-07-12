import { mapPool } from './concurrency'
import { isDomainError } from './errors'
import type {
  ChannelSyncInfo,
  Clock,
  QuotaCounter,
  ShortsProber,
  SubscriptionSource,
  SyncRepository,
  VideoSource
} from './ports'

// The refresh path (architecture.md §Data flow, D-007 hybrid source):
// RSS discovers new videoIds for free → genuinely new ones are hydrated in
// 50-id batches → Shorts candidates are confirmed and cached (D-028).
// Failures are per-channel; a refresh is idempotent and resumable.

export type SyncTrigger = 'launch' | 'manual' | 'timer'

export interface SyncProgress {
  phase: 'channels' | 'shorts'
  checked: number
  total: number
}

export interface SyncReport {
  trigger: SyncTrigger
  startedAt: string
  finishedAt: string
  channelsPolled: number
  channelsFailed: number
  videosNew: number
  quotaSpent: number
  outcome: 'ok' | 'partial' | 'failed' | 'quota'
  // The subscription-list diff for this run (B-021: every sync re-lists —
  // no gate, no separate manual action; new channels never wait).
  subscriptions: { added: number; removed: number } | null
  // True the very first time this account ever synced subscriptions
  // (B-020: drives the connect-time backlog auto-read — the composition
  // root marks pre-existing videos read after this report comes back).
  firstSync: boolean
}

const RSS_CONCURRENCY = 8 // youtube-api.md politeness rule
const SHORTS_CONCURRENCY = 8 // same politeness bound; first sync probes ~1k candidates
const HYDRATE_BATCH = 50 // videos.list: 1 unit per 50-id call
const GAP_BACKFILL_MAX = 200 // feed.md §Backfill bound, per channel per cycle
const META_SUBSCRIPTIONS_SYNCED_AT = 'subscriptions_synced_at'
// B-002: bounds one on-demand archive-backfill call — at most this many
// playlistItems.list pages (1 unit each) before giving up for this call,
// so a single scroll-triggered fetch can't run away.
const ARCHIVE_BACKFILL_PAGE_LIMIT = 4

interface SyncDeps {
  subscriptions: SubscriptionSource
  videoSource: VideoSource
  repo: SyncRepository
  shortsProber: ShortsProber
  quota: QuotaCounter
  clock: Clock
  onProgress?: (progress: SyncProgress) => void
}

interface RefreshContext {
  quotaHit: boolean
}

export class SyncService {
  constructor(private readonly deps: SyncDeps) {}

  // channelId scopes the whole run to one channel (B-036): the subscription
  // re-list is skipped (nothing to gain re-listing every channel to refresh
  // one), and both channel discovery and Shorts confirmation are filtered to
  // it.
  async refresh(trigger: SyncTrigger, channelId?: string): Promise<SyncReport> {
    const { repo, clock, quota } = this.deps
    const startedAt = clock.now().toISOString()
    const quotaBefore = quota.spent
    const ctx: RefreshContext = { quotaHit: false }
    let channelsFailed = 0
    let channelsPolled = 0
    let videosNew = 0
    let subscriptions: { added: number; removed: number } | null = null
    const firstSync = repo.getMeta(META_SUBSCRIPTIONS_SYNCED_AT) === null

    try {
      if (channelId === undefined) {
        try {
          subscriptions = await this.syncSubscriptions()
        } catch (error) {
          if (isDomainError(error, 'quota-exceeded')) ctx.quotaHit = true
          else if (isDomainError(error, 'auth-expired')) throw error
          else channelsFailed += 1 // stale subscription list; continue with local channels
        }
      }

      const channels = repo.listSubscribedChannels(channelId)
      channelsPolled = channels.length
      let checked = 0
      this.deps.onProgress?.({ phase: 'channels', checked, total: channels.length })

      const toHydrate: string[] = []
      const results = await mapPool(channels, RSS_CONCURRENCY, async (channel) => {
        const newIds = await this.discoverChannel(channel, ctx)
        checked += 1
        this.deps.onProgress?.({ phase: 'channels', checked, total: channels.length })
        return newIds
      })
      for (const result of results) {
        if (result.ok) {
          toHydrate.push(...result.value)
        } else if (isDomainError(result.error, 'quota-exceeded')) {
          ctx.quotaHit = true
        } else if (isDomainError(result.error, 'auth-expired')) {
          throw result.error
        } else {
          channelsFailed += 1
        }
      }

      const newIds = [...new Set(toHydrate)]
      videosNew = newIds.length
      if (!ctx.quotaHit && newIds.length > 0) {
        try {
          for (let i = 0; i < newIds.length; i += HYDRATE_BATCH) {
            const hydrated = await this.deps.videoSource.hydrate(newIds.slice(i, i + HYDRATE_BATCH))
            repo.applyHydration(hydrated, clock.now().toISOString())
          }
        } catch (error) {
          // Discovery is already persisted; hydration retries next cycle
          // (rows keep hydrated_at NULL).
          if (isDomainError(error, 'quota-exceeded')) ctx.quotaHit = true
          else if (isDomainError(error, 'auth-expired')) throw error
          else channelsFailed += 1
        }
      }

      await this.confirmShorts(channelId)

      const outcome = ctx.quotaHit
        ? 'quota'
        : channelsFailed === 0
          ? 'ok'
          : channelsPolled > 0 && channelsFailed >= channelsPolled
            ? 'failed'
            : 'partial'
      return this.finish(
        trigger,
        startedAt,
        channelsPolled,
        channelsFailed,
        videosNew,
        quotaBefore,
        outcome,
        subscriptions,
        firstSync
      )
    } catch (error) {
      if (isDomainError(error, 'auth-expired')) {
        this.finish(
          trigger,
          startedAt,
          channelsPolled,
          channelsFailed,
          videosNew,
          quotaBefore,
          'failed',
          subscriptions,
          firstSync
        )
      }
      throw error
    }
  }

  private finish(
    trigger: SyncTrigger,
    startedAt: string,
    channelsPolled: number,
    channelsFailed: number,
    videosNew: number,
    quotaBefore: number,
    outcome: SyncReport['outcome'],
    subscriptions: { added: number; removed: number } | null,
    firstSync: boolean
  ): SyncReport {
    const finishedAt = this.deps.clock.now().toISOString()
    const report: SyncReport = {
      trigger,
      startedAt,
      finishedAt,
      channelsPolled,
      channelsFailed,
      videosNew,
      quotaSpent: this.deps.quota.spent - quotaBefore,
      outcome,
      subscriptions,
      firstSync
    }
    this.deps.repo.recordSync({
      startedAt,
      finishedAt,
      trigger,
      channelsPolled,
      videosNew,
      quotaSpent: report.quotaSpent,
      outcome
    })
    return report
  }

  // Re-lists subscriptions on every sync (B-021 — no gate, no separate
  // manual action: a new subscription shows up on the very next sync,
  // launch/manual/timer alike). Cost is a few units per run
  // (subscriptions.list, 1 unit per 50) — cheap enough at any reasonable
  // refresh interval that gating it added friction for no real saving
  // (youtube-api.md §Subscription import & sync).
  private async syncSubscriptions(): Promise<{ added: number; removed: number }> {
    const { repo, subscriptions, clock } = this.deps
    const now = clock.now()

    const current = await subscriptions.listSubscriptions()
    const diff = repo.applySubscriptions(current, now.toISOString())

    const missingPlaylist = repo
      .listSubscribedChannels()
      .filter((channel) => channel.uploadsPlaylist === null)
      .map((channel) => channel.channelId)
    for (let i = 0; i < missingPlaylist.length; i += 50) {
      const playlists = await subscriptions.fetchUploadsPlaylists(missingPlaylist.slice(i, i + 50))
      for (const [channelId, playlistId] of playlists) {
        repo.setUploadsPlaylist(channelId, playlistId)
      }
    }
    repo.setMeta(META_SUBSCRIPTIONS_SYNCED_AT, now.toISOString())
    return diff
  }

  // Returns the channel's new videoIds (RSS window + gap backfill).
  private async discoverChannel(channel: ChannelSyncInfo, ctx: RefreshContext): Promise<string[]> {
    const { repo, videoSource, clock } = this.deps
    const now = clock.now().toISOString()

    let feed
    try {
      feed = await videoSource.discoverRecent(channel)
    } catch (error) {
      if (isDomainError(error, 'channel-unavailable')) {
        // Deleted/terminated: keep local data, stop polling (youtube-api.md).
        repo.markChannelUnavailable(channel.channelId)
        return []
      }
      throw error
    }

    if (feed.kind === 'not-modified') {
      repo.updateChannelSyncMeta(channel.channelId, {
        rssEtag: channel.rssEtag,
        rssLastModified: channel.rssLastModified,
        lastSyncedAt: now,
        available: true
      })
      return []
    }

    const ids = feed.entries.map((entry) => entry.videoId)
    const known = repo.knownVideoIds(ids)
    const newEntries = feed.entries.filter((entry) => !known.has(entry.videoId))
    repo.insertDiscoveredVideos(channel.channelId, newEntries, now)
    const newIds = newEntries.map((entry) => entry.videoId)

    // Gap detection: the whole RSS window being new on a previously synced
    // channel suggests missed uploads — page the uploads playlist until
    // overlap with known videos, bounded (feed.md §Backfill).
    const possibleGap =
      ids.length > 0 &&
      newIds.length === ids.length &&
      channel.lastSyncedAt !== null &&
      channel.uploadsPlaylist !== null
    if (possibleGap && !ctx.quotaHit) {
      try {
        newIds.push(...(await this.backfillGap(channel.uploadsPlaylist as string, newIds)))
      } catch (error) {
        if (isDomainError(error, 'quota-exceeded')) ctx.quotaHit = true
        else throw error
      }
    }

    repo.updateChannelSyncMeta(channel.channelId, {
      rssEtag: feed.etag,
      rssLastModified: feed.lastModified,
      lastSyncedAt: now,
      available: true
    })
    return newIds
  }

  // B-002: user-initiated back-catalog fetch — paginates a channel's uploads
  // playlist from wherever the last on-demand call left off, hydrates
  // whatever is genuinely new, and stops once it finds something to show
  // (or hits the page bound). Distinct from backfillGap: this is scroll-
  // triggered, resumable across calls (backfill_page_token), and has no
  // relation to routine sync's gap detection.
  async backfillArchive(channelId: string): Promise<{ videosNew: number; exhausted: boolean }> {
    const { repo, videoSource, clock } = this.deps
    const channel = repo.listSubscribedChannels(channelId)[0]
    if (channel === undefined || channel.uploadsPlaylist === null) {
      return { videosNew: 0, exhausted: true }
    }

    const state = repo.getBackfillState(channelId)
    if (state.exhausted) return { videosNew: 0, exhausted: true }

    let pageToken = state.pageToken ?? undefined
    const newIds: string[] = []
    let exhausted = false
    for (let page = 0; page < ARCHIVE_BACKFILL_PAGE_LIMIT; page++) {
      const result = await videoSource.listUploads(channel.uploadsPlaylist, pageToken)
      const known = repo.knownVideoIds(result.videoIds)
      for (const videoId of result.videoIds) {
        if (!known.has(videoId)) newIds.push(videoId)
      }
      pageToken = result.nextPageToken ?? undefined
      if (pageToken === undefined) {
        exhausted = true
        break
      }
      if (newIds.length > 0) break
    }
    repo.setBackfillState(channelId, pageToken ?? null, exhausted)

    if (newIds.length > 0) {
      const now = clock.now().toISOString()
      for (let i = 0; i < newIds.length; i += HYDRATE_BATCH) {
        const hydrated = await videoSource.hydrate(newIds.slice(i, i + HYDRATE_BATCH))
        repo.applyHydration(hydrated, now)
      }
      await this.confirmShorts(channelId)
    }
    return { videosNew: newIds.length, exhausted }
  }

  private async backfillGap(playlistId: string, alreadyNew: readonly string[]): Promise<string[]> {
    const seen = new Set(alreadyNew)
    const collected: string[] = []
    let pageToken: string | undefined

    while (collected.length < GAP_BACKFILL_MAX) {
      const page = await this.deps.videoSource.listUploads(playlistId, pageToken)
      const known = this.deps.repo.knownVideoIds(page.videoIds)
      let overlapped = false
      for (const videoId of page.videoIds) {
        if (seen.has(videoId)) continue
        if (known.has(videoId)) {
          overlapped = true
          break
        }
        collected.push(videoId)
        seen.add(videoId)
      }
      if (overlapped || !page.nextPageToken) break
      pageToken = page.nextPageToken
    }
    return collected.slice(0, GAP_BACKFILL_MAX)
  }

  // D-028 pipeline: candidates are confirmed via HEAD probe, cached forever.
  // Probe failures leave is_short NULL — the video stays visible (candidates
  // are hidden only after confirmation) and is retried next cycle.
  private async confirmShorts(channelId?: string): Promise<void> {
    const candidates = this.deps.repo.shortCandidates(channelId)
    if (candidates.length === 0) return
    let checked = 0
    this.deps.onProgress?.({ phase: 'shorts', checked, total: candidates.length })
    await mapPool(candidates, SHORTS_CONCURRENCY, async (videoId) => {
      const isShort = await this.deps.shortsProber.isShort(videoId)
      this.deps.repo.setShortStatus(videoId, isShort)
      checked += 1
      this.deps.onProgress?.({ phase: 'shorts', checked, total: candidates.length })
    })
  }
}
