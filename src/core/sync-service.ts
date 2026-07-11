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
}

const RSS_CONCURRENCY = 8 // youtube-api.md politeness rule
const SHORTS_CONCURRENCY = 8 // same politeness bound; first sync probes ~1k candidates
const HYDRATE_BATCH = 50 // videos.list: 1 unit per 50-id call
const GAP_BACKFILL_MAX = 200 // feed.md §Backfill bound, per channel per cycle
const SUBSCRIPTION_RESYNC_MS = 7 * 24 * 3_600_000 // automatic weekly re-list
const META_SUBSCRIPTIONS_SYNCED_AT = 'subscriptions_synced_at'

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

  async refresh(trigger: SyncTrigger): Promise<SyncReport> {
    const { repo, clock, quota } = this.deps
    const startedAt = clock.now().toISOString()
    const quotaBefore = quota.spent
    const ctx: RefreshContext = { quotaHit: false }
    let channelsFailed = 0
    let channelsPolled = 0
    let videosNew = 0

    try {
      try {
        await this.syncSubscriptionsIfDue()
      } catch (error) {
        if (isDomainError(error, 'quota-exceeded')) ctx.quotaHit = true
        else if (isDomainError(error, 'auth-expired')) throw error
        else channelsFailed += 1 // stale subscription list; continue with local channels
      }

      const channels = repo.listSubscribedChannels()
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

      await this.confirmShorts()

      const outcome = ctx.quotaHit
        ? 'quota'
        : channelsFailed === 0
          ? 'ok'
          : channelsPolled > 0 && channelsFailed >= channelsPolled
            ? 'failed'
            : 'partial'
      return this.finish(trigger, startedAt, channelsPolled, channelsFailed, videosNew, quotaBefore, outcome)
    } catch (error) {
      if (isDomainError(error, 'auth-expired')) {
        this.finish(trigger, startedAt, channelsPolled, channelsFailed, videosNew, quotaBefore, 'failed')
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
    outcome: SyncReport['outcome']
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
      outcome
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

  // Initial import (first refresh) or the automatic weekly re-list
  // (youtube-api.md §Subscription import & sync).
  private async syncSubscriptionsIfDue(): Promise<void> {
    const { repo, subscriptions, clock } = this.deps
    const last = repo.getMeta(META_SUBSCRIPTIONS_SYNCED_AT)
    const now = clock.now()
    if (last !== null && now.getTime() - Date.parse(last) < SUBSCRIPTION_RESYNC_MS) return

    const current = await subscriptions.listSubscriptions()
    repo.applySubscriptions(current, now.toISOString())

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
  private async confirmShorts(): Promise<void> {
    const candidates = this.deps.repo.shortCandidates()
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
