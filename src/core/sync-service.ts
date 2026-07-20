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

// B-097: per-channel (or account-level, when channelId is null) failure
// detail behind channelsFailed, so a failure banner has something to show.
export interface SyncFailureDetail {
  channelId: string | null
  channelTitle: string | null
  message: string
}

export interface SyncReport {
  trigger: SyncTrigger
  startedAt: string
  finishedAt: string
  channelsPolled: number
  channelsFailed: number
  failures: SyncFailureDetail[]
  videosNew: number
  // Per-channel breakdown of videosNew, channels with ≥1 new video only (D-050).
  // shortsCount is filled in after confirmShorts() settles this cycle's verdicts (D-052).
  newVideosByChannel: { channelId: string; channelTitle: string; count: number; shortsCount: number }[]
  quotaSpent: number
  outcome: 'ok' | 'partial' | 'failed' | 'quota'
  // The subscription-list diff for this run (B-021: every sync re-lists —
  // no gate, no separate manual action; new channels never wait).
  subscriptions: { added: number; removed: number } | null
  // True on an account's first-ever subscription sync — the composition
  // root uses this to mark the backlog read after the report returns (B-020).
  firstSync: boolean
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

// youtube-api.md politeness bound — concurrency doesn't meaningfully affect
// RSS failure rate, so a higher value only shortens first-sync discovery time.
const RSS_CONCURRENCY = 12
const SHORTS_CONCURRENCY = 8 // same politeness bound; first sync probes ~1k candidates
const HYDRATE_BATCH = 50 // videos.list: 1 unit per 50-id call
const GAP_BACKFILL_MAX = 200 // feed.md §Backfill bound, per channel per cycle
const META_SUBSCRIPTIONS_SYNCED_AT = 'subscriptions_synced_at'
// B-002: bounds one on-demand archive-backfill call — at most this many
// playlistItems.list pages (1 unit each) before giving up for this call,
// so a single scroll-triggered fetch can't run away.
const ARCHIVE_BACKFILL_PAGE_LIMIT = 4
// youtube-api.md §Failure handling: exponential backoff, per-channel, up to
// RSS_RETRY_ATTEMPTS attempts per cycle — YouTube's RSS backend returns
// transient 404/500 for active channels, and most resolve within the same
// cycle. Bounded by how long a fully-failing channel holds its
// RSS_CONCURRENCY worker slot (worst case: the sum of the backoff delays below).
const RSS_RETRY_ATTEMPTS = 5
const RSS_RETRY_BASE_MS = 300

interface SyncDeps {
  subscriptions: SubscriptionSource
  videoSource: VideoSource
  repo: SyncRepository
  shortsProber: ShortsProber
  quota: QuotaCounter
  clock: Clock
  onProgress?: (progress: SyncProgress) => void
  // Injectable so tests don't wait on real timers; defaults to a real one.
  sleep?: (ms: number) => Promise<void>
}

const defaultSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

interface RefreshContext {
  quotaHit: boolean
}

export class SyncService {
  constructor(private readonly deps: SyncDeps) {}

  // channelId scopes the whole run to one channel (B-036) — subscription
  // re-list is skipped, discovery and Shorts confirmation filter to it.
  // accountId (B-003) selects whose subscriptions/tokens this run uses.
  async refresh(trigger: SyncTrigger, accountId: string, channelId?: string): Promise<SyncReport> {
    const { repo, clock, quota } = this.deps
    const startedAt = clock.now().toISOString()
    const quotaBefore = quota.spent
    const ctx: RefreshContext = { quotaHit: false }
    let channelsFailed = 0
    let channelsPolled = 0
    let videosNew = 0
    // Per-channel new-video counts, used by main-process notifications to
    // resolve their channel scope (D-050).
    const newVideosByChannel: SyncReport['newVideosByChannel'] = []
    let subscriptions: { added: number; removed: number } | null = null
    const failures: SyncFailureDetail[] = []
    const firstSyncMetaKey = `${META_SUBSCRIPTIONS_SYNCED_AT}:${accountId}`
    const firstSync = repo.getMeta(firstSyncMetaKey) === null

    try {
      if (channelId === undefined) {
        try {
          subscriptions = await this.syncSubscriptions(accountId)
        } catch (error) {
          if (isDomainError(error, 'quota-exceeded')) ctx.quotaHit = true
          else if (isDomainError(error, 'auth-expired')) throw error
          else {
            // stale subscription list; continue with local channels
            channelsFailed += 1
            failures.push({ channelId: null, channelTitle: null, message: errorMessage(error) })
          }
        }
      }

      const channels = repo.listSubscribedChannels(accountId, channelId)
      channelsPolled = channels.length
      let checked = 0
      this.deps.onProgress?.({ phase: 'channels', checked, total: channels.length })

      const toHydrate: string[] = []
      // Kept alongside newVideosByChannel so shortsCount can be resolved
      // once confirmShorts() settles this cycle's verdicts (D-052).
      const newIdsByChannel = new Map<string, string[]>()
      const results = await mapPool(channels, RSS_CONCURRENCY, async (channel) => {
        const newIds = await this.discoverChannel(channel, ctx)
        checked += 1
        this.deps.onProgress?.({ phase: 'channels', checked, total: channels.length })
        return newIds
      })
      results.forEach((result, index) => {
        if (result.ok) {
          toHydrate.push(...result.value)
          if (result.value.length > 0) {
            const channel = channels[index]
            newIdsByChannel.set(channel.channelId, result.value)
            newVideosByChannel.push({
              channelId: channel.channelId,
              channelTitle: channel.title,
              count: result.value.length,
              shortsCount: 0
            })
          }
        } else if (isDomainError(result.error, 'quota-exceeded')) {
          ctx.quotaHit = true
        } else if (isDomainError(result.error, 'auth-expired')) {
          throw result.error
        } else {
          channelsFailed += 1
          const channel = channels[index]
          failures.push({
            channelId: channel.channelId,
            channelTitle: channel.title,
            message: errorMessage(result.error)
          })
        }
      })

      const newIds = [...new Set(toHydrate)]
      videosNew = newIds.length
      // On an account's first sync, every discovered video is marked read
      // instead of unread — applied per hydrated batch so a feed reload
      // mid-sync never shows them unread (B-020, B-069, B-105).
      if (!ctx.quotaHit && newIds.length > 0) {
        try {
          for (let i = 0; i < newIds.length; i += HYDRATE_BATCH) {
            const hydrated = await this.deps.videoSource.hydrate(newIds.slice(i, i + HYDRATE_BATCH))
            const hydratedAt = clock.now().toISOString()
            repo.applyHydration(hydrated, hydratedAt)
            if (firstSync) {
              repo.markVideosReadIfUnset(
                hydrated.map((video) => video.videoId),
                hydratedAt
              )
            }
          }
        } catch (error) {
          // Discovery is already persisted; hydration retries next cycle
          // (rows keep hydrated_at NULL).
          if (isDomainError(error, 'quota-exceeded')) ctx.quotaHit = true
          else if (isDomainError(error, 'auth-expired')) throw error
          else {
            channelsFailed += 1
            // Spans whatever channels' videos were in this batch — not
            // attributable to a single one.
            failures.push({ channelId: null, channelTitle: null, message: errorMessage(error) })
          }
        }
      }

      await this.refreshLiveStatus(channelId, ctx)
      await this.confirmShorts(channelId)
      // D-052: Shorts verdicts are settled now — resolve each channel's
      // shortsCount for the notify-shorts filter (main.ts's maybeNotifyNewVideos).
      for (const entry of newVideosByChannel) {
        entry.shortsCount = this.deps.repo.countShorts(newIdsByChannel.get(entry.channelId) ?? [])
      }

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
        failures,
        videosNew,
        newVideosByChannel,
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
          failures,
          videosNew,
          newVideosByChannel,
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
    failures: SyncFailureDetail[],
    videosNew: number,
    newVideosByChannel: SyncReport['newVideosByChannel'],
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
      failures,
      videosNew,
      newVideosByChannel,
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

  // Re-lists subscriptions on every sync, no gate (B-021) — a few units per
  // run (subscriptions.list, 1 unit per 50), cheap enough not to bother gating.
  private async syncSubscriptions(
    accountId: string
  ): Promise<{ added: number; removed: number }> {
    const { repo, subscriptions, clock } = this.deps
    const now = clock.now()

    const current = await subscriptions.listSubscriptions()
    const diff = repo.applySubscriptions(accountId, current, now.toISOString())

    const missingPlaylist = repo
      .listSubscribedChannels(accountId)
      .filter((channel) => channel.uploadsPlaylist === null)
      .map((channel) => channel.channelId)
    for (let i = 0; i < missingPlaylist.length; i += 50) {
      const playlists = await subscriptions.fetchUploadsPlaylists(missingPlaylist.slice(i, i + 50))
      for (const [channelId, playlistId] of playlists) {
        repo.setUploadsPlaylist(channelId, playlistId)
      }
    }
    repo.setMeta(`${META_SUBSCRIPTIONS_SYNCED_AT}:${accountId}`, now.toISOString())
    return diff
  }

  // youtube-api.md §Failure handling: retry the RSS fetch itself, per
  // channel, before letting a failure count against this cycle at all.
  private async discoverRecentWithRetry(channel: ChannelSyncInfo): ReturnType<VideoSource['discoverRecent']> {
    const sleep = this.deps.sleep ?? defaultSleep
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.deps.videoSource.discoverRecent(channel)
      } catch (error) {
        if (attempt >= RSS_RETRY_ATTEMPTS) throw error
        await sleep(RSS_RETRY_BASE_MS * 2 ** (attempt - 1))
      }
    }
  }

  // Returns the channel's new videoIds (RSS window + gap backfill).
  private async discoverChannel(channel: ChannelSyncInfo, ctx: RefreshContext): Promise<string[]> {
    const { repo, clock } = this.deps
    const now = clock.now().toISOString()

    const feed = await this.discoverRecentWithRetry(channel)

    if (feed.kind === 'not-modified') {
      repo.updateChannelSyncMeta(channel.channelId, {
        rssEtag: channel.rssEtag,
        rssLastModified: channel.rssLastModified,
        lastSyncedAt: now
      })
      return []
    }

    const ids = feed.entries.map((entry) => entry.videoId)
    const known = repo.knownVideoIds(ids)
    const newEntries = feed.entries.filter((entry) => !known.has(entry.videoId))
    repo.insertDiscoveredVideos(channel.channelId, newEntries, now)
    const newIds = newEntries.map((entry) => entry.videoId)

    // Gap detection: any newly discovered video on a previously synced
    // channel triggers a check of the uploads playlist for older misses
    // (feed.md §Backfill, B-051) — a mix of known and new entries in the RSS
    // window can still hide a real gap. backfillGap stops at the first page
    // it finds already known, so the common gap-free case costs one bounded
    // page fetch; GAP_BACKFILL_MAX caps the worst case.
    const possibleGap =
      newIds.length > 0 && channel.lastSyncedAt !== null && channel.uploadsPlaylist !== null
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
      lastSyncedAt: now
    })
    return newIds
  }

  // B-002: user-initiated back-catalog fetch — paginates a channel's uploads
  // playlist from wherever the last call left off, hydrates whatever is
  // genuinely new, and stops once it finds something (or hits the page
  // bound). Resumable across calls, independent of routine sync's gap detection.
  async backfillArchive(
    accountId: string,
    channelId: string
  ): Promise<{ videosNew: number; exhausted: boolean }> {
    const { repo, videoSource, clock } = this.deps
    const channel = repo.listSubscribedChannels(accountId, channelId)[0]
    if (channel === undefined || channel.uploadsPlaylist === null) {
      return { videosNew: 0, exhausted: true }
    }

    const state = repo.getBackfillState(accountId, channelId)
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
    repo.setBackfillState(accountId, channelId, pageToken ?? null, exhausted)

    if (newIds.length > 0) {
      const now = clock.now().toISOString()
      for (let i = 0; i < newIds.length; i += HYDRATE_BATCH) {
        const hydrated = await videoSource.hydrate(newIds.slice(i, i + HYDRATE_BATCH))
        repo.applyHydration(hydrated, now)
      }
      // These predate the user following/using Chronicle — they were never
      // "missed" chronologically, so they shouldn't inflate unread counts.
      repo.markVideosReadIfUnset(newIds, now)
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

  // liveContent is captured once at hydration time and never re-checked
  // otherwise, so `upcoming`/`live` videos would get stuck forever (B-085,
  // B-114) — re-hydrated here every cycle instead, at no extra quota cost
  // (videos.list is 1 unit per call regardless of id count). Failures just
  // leave a video stuck for one more cycle, retried next time.
  private async refreshLiveStatus(channelId: string | undefined, ctx: RefreshContext): Promise<void> {
    if (ctx.quotaHit) return
    const ids = [
      ...this.deps.repo.upcomingVideoIds(channelId),
      ...this.deps.repo.liveVideoIds(channelId)
    ]
    if (ids.length === 0) return
    try {
      for (let i = 0; i < ids.length; i += HYDRATE_BATCH) {
        const hydrated = await this.deps.videoSource.hydrate(ids.slice(i, i + HYDRATE_BATCH))
        this.deps.repo.applyHydration(hydrated, this.deps.clock.now().toISOString())
      }
    } catch (error) {
      if (isDomainError(error, 'quota-exceeded')) ctx.quotaHit = true
      else if (isDomainError(error, 'auth-expired')) throw error
      // Other failures: leave these stuck at `upcoming`/`live`, retried next cycle.
    }
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
