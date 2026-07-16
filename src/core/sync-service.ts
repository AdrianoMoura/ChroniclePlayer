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

// B-097: the raw per-channel (or account-level, when channelId is null —
// e.g. the subscription re-list itself, or a hydration batch spanning more
// than one channel) detail behind channelsFailed, so a failure banner has
// something to actually show beyond a bare count.
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

// youtube-api.md politeness rule (raised from 8 to 12, product owner's call,
// 2026-07-16: live testing showed the RSS failure rate is roughly the same
// concurrent or sequential, so this only trades a bit of "politeness"
// headroom for a shorter wait before the first sync's channel-discovery
// phase — and therefore hydration/the feed itself — finishes).
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
// RSS_RETRY_ATTEMPTS attempts per cycle. YouTube's RSS backend (a distinct,
// less reliable service from the main site — confirmed live: valid, active
// channels return transient 404/500 from it under ordinary conditions, no
// special load required, and a plain retry moments later often succeeds) is
// flaky enough that most of these resolve within the same cycle rather than
// waiting for the next one. Since B-110's fix made these failures silent by
// default (D-049 — no banner for an ordinary partial failure), a higher
// attempt count is pure upside for cutting the residual failure rate
// further, bounded only by how long a fully-failing channel holds its
// RSS_CONCURRENCY worker slot (worst case here: sum of the backoff delays
// below, a few seconds).
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

  // channelId scopes the whole run to one channel (B-036): the subscription
  // re-list is skipped (nothing to gain re-listing every channel to refresh
  // one), and both channel discovery and Shorts confirmation are filtered to
  // it. accountId (B-003) scopes which account's subscriptions/tokens this
  // run uses — the repo is shared across accounts, so every call threads it.
  async refresh(trigger: SyncTrigger, accountId: string, channelId?: string): Promise<SyncReport> {
    const { repo, clock, quota } = this.deps
    const startedAt = clock.now().toISOString()
    const quotaBefore = quota.spent
    const ctx: RefreshContext = { quotaHit: false }
    let channelsFailed = 0
    let channelsPolled = 0
    let videosNew = 0
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
      const results = await mapPool(channels, RSS_CONCURRENCY, async (channel) => {
        const newIds = await this.discoverChannel(channel, ctx)
        checked += 1
        this.deps.onProgress?.({ phase: 'channels', checked, total: channels.length })
        return newIds
      })
      results.forEach((result, index) => {
        if (result.ok) {
          toHydrate.push(...result.value)
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
      // B-020/B-069, amended by B-105 (2026-07-16, owner's call): on an
      // account's very first sync there is no prior visit for "today's
      // videos" to be new relative to — every video discovered is an
      // equally uninformed guess about relevance, so none of it should
      // render as unread, not just the backlog published before today.
      // Applied here, per hydrated batch, rather than only once in a
      // retroactive pass after every channel finishes (which left a long
      // window where a feed reload mid-sync showed them as unread).
      // Every subsequent sync (routine or backfill) is unaffected and
      // marks newly discovered videos unread as normal.
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

      await this.refreshUpcomingLiveStatus(channelId, ctx)
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
        failures,
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
          failures,
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
    failures: SyncFailureDetail[],
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
      failures,
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
    // channel is reason enough to check the uploads playlist for older
    // misses (feed.md §Backfill). Previously gated on the *entire* RSS
    // window being new — but a window that's a mix of known and new entries
    // can still hide a real gap: RSS only ever shows the ~15 most recent
    // entries, so a video missed on a day sync failed (or otherwise never
    // got captured) silently falls out of every future window the moment
    // enough newer videos push it out, regardless of whether *this* cycle's
    // window happens to still contain some already-known entry too
    // (`bugs.md` B-051, hypothesis 6). `backfillGap` itself already checks
    // the real DB-known set per page (not just this window), so it stops at
    // the very first overlapping page in the common, gap-free case — the
    // extra cost of checking is normally one bounded page fetch, not a deep
    // walk; GAP_BACKFILL_MAX still caps the worst case.
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
  // playlist from wherever the last on-demand call left off, hydrates
  // whatever is genuinely new, and stops once it finds something to show
  // (or hits the page bound). Distinct from backfillGap: this is scroll-
  // triggered, resumable across calls (backfill_page_token), and has no
  // relation to routine sync's gap detection.
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

  // B-085: liveContent is captured once, at hydration time — a video that
  // was `upcoming` then stays `upcoming` forever unless something re-checks
  // it. Bounded by however many local videos are actually still flagged
  // upcoming (typically tiny), re-hydrated the same way newly discovered
  // videos are. Tolerant of failure the same way confirmShorts is: a video
  // left at `upcoming` just gets retried on the next cycle.
  private async refreshUpcomingLiveStatus(channelId: string | undefined, ctx: RefreshContext): Promise<void> {
    if (ctx.quotaHit) return
    const ids = this.deps.repo.upcomingVideoIds(channelId)
    if (ids.length === 0) return
    try {
      for (let i = 0; i < ids.length; i += HYDRATE_BATCH) {
        const hydrated = await this.deps.videoSource.hydrate(ids.slice(i, i + HYDRATE_BATCH))
        this.deps.repo.applyHydration(hydrated, this.deps.clock.now().toISOString())
      }
    } catch (error) {
      if (isDomainError(error, 'quota-exceeded')) ctx.quotaHit = true
      else if (isDomainError(error, 'auth-expired')) throw error
      // Other failures: leave these stuck at `upcoming`, retried next cycle.
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
