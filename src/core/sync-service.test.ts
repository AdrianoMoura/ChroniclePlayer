import { describe, expect, it } from 'vitest'
import { SyncService, type SyncProgress } from './sync-service'
import { authExpired, internal, networkUnavailable, quotaExceeded } from './errors'
import {
  QuotaCounter,
  type ChannelSyncInfo,
  type Clock,
  type DiscoveredVideo,
  type HydratedVideo,
  type RssFeedResult,
  type ShortsProber,
  type SubscriptionSource,
  type SyncLogEntry,
  type SyncRepository,
  type VideoSource
} from './ports'
import type { Channel } from './video'

const clock: Clock = { now: () => new Date('2026-07-11T12:00:00Z') }

function discovered(videoId: string): DiscoveredVideo {
  return { videoId, title: `t-${videoId}`, publishedAt: '2026-07-11T10:00:00Z', thumbnailUrl: null, description: null }
}

class FakeRepo implements SyncRepository {
  channels = new Map<string, ChannelSyncInfo>()
  known = new Set<string>()
  inserted: string[] = []
  hydrated: string[] = []
  syncMeta = new Map<string, { lastSyncedAt: string }>()
  logs: SyncLogEntry[] = []
  meta = new Map<string, string>()
  candidates: string[] = []
  candidateChannel = new Map<string, string>() // videoId -> channelId, for scoped shortCandidates tests
  shortStatuses = new Map<string, boolean>()
  upcoming: string[] = []
  upcomingChannel = new Map<string, string>() // videoId -> channelId, for scoped upcomingVideoIds tests
  uploadsSet = new Map<string, string>()
  appliedSubscriptions: Channel[][] = []
  backfillState = new Map<string, { pageToken: string | null; exhausted: boolean }>()
  markedRead: string[] = []

  // Single implicit account — SyncService just threads accountId through to
  // the repo; real per-account isolation is a SQL-layer concern, tested in
  // sync-repository.test.ts against SqliteSyncRepository.
  listSubscribedChannels(_accountId: string, channelId?: string): ChannelSyncInfo[] {
    const all = [...this.channels.values()]
    return channelId === undefined ? all : all.filter((c) => c.channelId === channelId)
  }
  applySubscriptions(_accountId: string, channels: readonly Channel[]): { added: number; removed: number } {
    this.appliedSubscriptions.push([...channels])
    for (const c of channels) {
      if (!this.channels.has(c.channelId)) {
        this.channels.set(c.channelId, {
          channelId: c.channelId,
          title: c.title,
          uploadsPlaylist: null,
          rssEtag: null,
          rssLastModified: null,
          lastSyncedAt: null
        })
      }
    }
    return { added: channels.length, removed: 0 }
  }
  setUploadsPlaylist(channelId: string, playlistId: string): void {
    this.uploadsSet.set(channelId, playlistId)
    const c = this.channels.get(channelId)
    if (c) c.uploadsPlaylist = playlistId
  }
  knownVideoIds(videoIds: readonly string[]): Set<string> {
    return new Set(videoIds.filter((id) => this.known.has(id)))
  }
  insertDiscoveredVideos(_channelId: string, videos: readonly DiscoveredVideo[]): void {
    for (const v of videos) {
      this.inserted.push(v.videoId)
      this.known.add(v.videoId)
    }
  }
  applyHydration(videos: readonly HydratedVideo[]): void {
    for (const v of videos) {
      this.hydrated.push(v.videoId)
      this.known.add(v.videoId)
    }
  }
  markVideosReadIfUnset(videoIds: readonly string[]): void {
    this.markedRead.push(...videoIds)
  }
  updateChannelSyncMeta(channelId: string, meta: { lastSyncedAt: string }): void {
    this.syncMeta.set(channelId, { lastSyncedAt: meta.lastSyncedAt })
  }
  getBackfillState(_accountId: string, channelId: string): { pageToken: string | null; exhausted: boolean } {
    return this.backfillState.get(channelId) ?? { pageToken: null, exhausted: false }
  }
  setBackfillState(_accountId: string, channelId: string, pageToken: string | null, exhausted: boolean): void {
    this.backfillState.set(channelId, { pageToken, exhausted })
  }
  listAccounts(): { accountId: string; label: string; addedAt: string }[] {
    return []
  }
  addAccount(): void {}
  removeAccount(): void {}
  shortCandidates(channelId?: string): string[] {
    if (channelId === undefined) return this.candidates
    return this.candidates.filter((id) => this.candidateChannel.get(id) === channelId)
  }
  setShortStatus(videoId: string, isShort: boolean): void {
    this.shortStatuses.set(videoId, isShort)
  }
  countShorts(videoIds: readonly string[]): number {
    return videoIds.filter((id) => this.shortStatuses.get(id) === true).length
  }
  upcomingVideoIds(channelId?: string): string[] {
    if (channelId === undefined) return this.upcoming
    return this.upcoming.filter((id) => this.upcomingChannel.get(id) === channelId)
  }
  recordSync(entry: SyncLogEntry): void {
    this.logs.push(entry)
  }
  lastSyncStartedAt(): string | null {
    return null
  }
  getMeta(key: string): string | null {
    return this.meta.get(key) ?? null
  }
  setMeta(key: string, value: string): void {
    this.meta.set(key, value)
  }

  addChannel(channelId: string, overrides: Partial<ChannelSyncInfo> = {}): void {
    this.channels.set(channelId, {
      channelId,
      title: channelId,
      uploadsPlaylist: null,
      rssEtag: null,
      rssLastModified: null,
      lastSyncedAt: null,
      ...overrides
    })
  }
}

function fakeSubscriptions(channels: Channel[] = []): SubscriptionSource {
  return {
    listSubscriptions: () => Promise.resolve(channels),
    fetchUploadsPlaylists: (ids) => Promise.resolve(new Map(ids.map((id) => [id, `UU${id.slice(2)}`])))
  }
}

interface SourceBehavior {
  feeds?: Record<string, RssFeedResult | (() => RssFeedResult)>
  uploads?: Record<string, string[][]> // playlistId -> pages of videoIds
  hydrateError?: () => never
  quota?: QuotaCounter
  publishedAt?: Record<string, string> // videoId -> hydrate()'s publishedAt, default '2026-07-11T10:00:00Z'
}

function fakeVideoSource(behavior: SourceBehavior = {}): VideoSource & { hydrateCalls: string[][] } {
  const hydrateCalls: string[][] = []
  return {
    hydrateCalls,
    discoverRecent: (channel) => {
      const feed = behavior.feeds?.[channel.channelId]
      if (feed === undefined) return Promise.resolve({ kind: 'ok', entries: [], etag: null, lastModified: null })
      return Promise.resolve(typeof feed === 'function' ? feed() : feed)
    },
    hydrate: (ids) => {
      if (behavior.hydrateError) behavior.hydrateError()
      behavior.quota?.add(1)
      hydrateCalls.push([...ids])
      return Promise.resolve(
        ids.map((videoId) => ({
          videoId,
          channelId: 'UCa',
          channelTitle: 'Alpha',
          title: `t-${videoId}`,
          publishedAt: behavior.publishedAt?.[videoId] ?? '2026-07-11T10:00:00Z',
          durationSeconds: 600,
          liveContent: 'none' as const,
          thumbnailUrl: null,
          description: null,
          viewCount: 1000
        }))
      )
    },
    listUploads: (playlistId, pageToken) => {
      const pages = behavior.uploads?.[playlistId] ?? []
      const index = pageToken ? Number(pageToken) : 0
      behavior.quota?.add(1)
      return Promise.resolve({
        videoIds: pages[index] ?? [],
        nextPageToken: index + 1 < pages.length ? String(index + 1) : null
      })
    }
  }
}

const noShorts: ShortsProber = { isShort: () => Promise.resolve(false) }

function service(
  repo: FakeRepo,
  source: VideoSource,
  options: {
    subscriptions?: SubscriptionSource
    quota?: QuotaCounter
    prober?: ShortsProber
    onProgress?: (p: SyncProgress) => void
  } = {}
): SyncService {
  return new SyncService({
    subscriptions: options.subscriptions ?? fakeSubscriptions(),
    videoSource: source,
    repo,
    shortsProber: options.prober ?? noShorts,
    quota: options.quota ?? new QuotaCounter(),
    clock,
    onProgress: options.onProgress,
    // Instant — tests shouldn't wait on the real RSS-retry backoff delay.
    sleep: () => Promise.resolve()
  })
}

describe('SyncService.refresh', () => {
  it('imports subscriptions on first refresh and fetches uploads playlists', async () => {
    const repo = new FakeRepo()
    const subs = fakeSubscriptions([{ channelId: 'UCa', title: 'Alpha', thumbnailUrl: null }])
    const report = await service(repo, fakeVideoSource(), { subscriptions: subs }).refresh('launch', 'acc1')

    expect(repo.appliedSubscriptions).toHaveLength(1)
    expect(repo.uploadsSet.get('UCa')).toBe('UUa')
    expect(repo.getMeta('subscriptions_synced_at:acc1')).not.toBeNull()
    expect(report.subscriptions).toEqual({ added: 1, removed: 0 })
    expect(report.firstSync).toBe(true) // B-020: drives the connect-time auto-read
  })

  it('is not a firstSync once subscriptions have synced before (B-020)', async () => {
    const repo = new FakeRepo()
    repo.setMeta('subscriptions_synced_at:acc1', '2026-07-10T12:00:00Z') // synced before
    const report = await service(repo, fakeVideoSource()).refresh('timer', 'acc1')
    expect(report.firstSync).toBe(false)
  })

  it('re-lists subscriptions on every sync, regardless of trigger or recency (B-021 — no gate)', async () => {
    const repo = new FakeRepo()
    repo.setMeta('subscriptions_synced_at:acc1', '2026-07-11T11:59:00Z') // 1 minute ago
    const subs = fakeSubscriptions([{ channelId: 'UCa', title: 'Alpha', thumbnailUrl: null }])
    const report = await service(repo, fakeVideoSource(), { subscriptions: subs }).refresh('timer', 'acc1')
    expect(repo.appliedSubscriptions).toHaveLength(1)
    expect(report.subscriptions).toEqual({ added: 1, removed: 0 })
  })

  it('discovers only genuinely new videos and hydrates them in 50-id batches', async () => {
    const repo = new FakeRepo()
    repo.addChannel('UCa')
    repo.known.add('old-1')
    const entries = [discovered('old-1'), ...Array.from({ length: 60 }, (_, i) => discovered(`new-${i}`))]
    const source = fakeVideoSource({ feeds: { UCa: { kind: 'ok', entries, etag: 'e1', lastModified: null } } })

    const report = await service(repo, source).refresh('manual', 'acc1')

    expect(report.videosNew).toBe(60)
    expect(repo.inserted).not.toContain('old-1')
    expect(source.hydrateCalls.map((c) => c.length)).toEqual([50, 10])
    expect(report.outcome).toBe('ok')
  })

  it('isolates per-channel failures: one bad channel never aborts the sync', async () => {
    const repo = new FakeRepo()
    repo.addChannel('UCbad')
    repo.addChannel('UCgood')
    const source = fakeVideoSource({
      feeds: {
        UCbad: () => {
          throw networkUnavailable()
        },
        UCgood: { kind: 'ok', entries: [discovered('v1')], etag: null, lastModified: null }
      }
    })

    const report = await service(repo, source).refresh('manual', 'acc1')

    expect(repo.inserted).toContain('v1')
    expect(report.channelsFailed).toBe(1)
    expect(report.outcome).toBe('partial')
  })

  it('breaks new-video counts down per channel (D-050)', async () => {
    const repo = new FakeRepo()
    repo.addChannel('UCa', { title: 'Alpha' })
    repo.addChannel('UCb', { title: 'Beta' })
    repo.addChannel('UCc', { title: 'Gamma' }) // nothing new here — must be omitted
    const source = fakeVideoSource({
      feeds: {
        UCa: { kind: 'ok', entries: [discovered('a1'), discovered('a2')], etag: null, lastModified: null },
        UCb: { kind: 'ok', entries: [discovered('b1')], etag: null, lastModified: null },
        UCc: { kind: 'ok', entries: [], etag: null, lastModified: null }
      }
    })

    const report = await service(repo, source).refresh('manual', 'acc1')

    expect(report.newVideosByChannel).toEqual(
      expect.arrayContaining([
        { channelId: 'UCa', channelTitle: 'Alpha', count: 2, shortsCount: 0 },
        { channelId: 'UCb', channelTitle: 'Beta', count: 1, shortsCount: 0 }
      ])
    )
    expect(report.newVideosByChannel).toHaveLength(2)
  })

  it('breaks each channel\'s new-video count down into shorts vs. non-shorts (D-052)', async () => {
    const repo = new FakeRepo()
    repo.addChannel('UCa', { title: 'Alpha' })
    repo.addChannel('UCb', { title: 'Beta' })
    const source = fakeVideoSource({
      feeds: {
        UCa: {
          kind: 'ok',
          entries: [discovered('a-short'), discovered('a-long')],
          etag: null,
          lastModified: null
        },
        UCb: { kind: 'ok', entries: [discovered('b-long')], etag: null, lastModified: null }
      }
    })
    const prober: ShortsProber = { isShort: (videoId) => Promise.resolve(videoId === 'a-short') }
    // Only videos with duration <= 180s become candidates in the real repo;
    // the fake tracks confirmed status directly, so seed it as if
    // shortCandidates() had already surfaced these two.
    repo.candidates = ['a-short', 'a-long']
    repo.candidateChannel.set('a-short', 'UCa')
    repo.candidateChannel.set('a-long', 'UCa')

    const report = await service(repo, source, { prober }).refresh('manual', 'acc1')

    expect(report.newVideosByChannel).toEqual(
      expect.arrayContaining([
        { channelId: 'UCa', channelTitle: 'Alpha', count: 2, shortsCount: 1 },
        { channelId: 'UCb', channelTitle: 'Beta', count: 1, shortsCount: 0 }
      ])
    )
  })

  it('attributes a per-channel failure to its channel in the report (B-097)', async () => {
    const repo = new FakeRepo()
    repo.addChannel('UCbad', { title: 'Bad Channel' })
    const source = fakeVideoSource({
      feeds: {
        UCbad: () => {
          throw networkUnavailable()
        }
      }
    })

    const report = await service(repo, source).refresh('manual', 'acc1')

    expect(report.failures).toEqual([
      { channelId: 'UCbad', channelTitle: 'Bad Channel', message: 'network unavailable' }
    ])
  })

  // D-048 (bugs.md B-110): an RSS 404 used to be treated as permanent proof
  // of channel deletion, excluding the channel from every future sync with
  // no retry — a single transient 404 shouldn't be able to do that, so it's
  // now just an ordinary per-channel failure like any other, retried next
  // cycle.
  it('treats an RSS 404 as an ordinary per-channel failure, not a permanent exclusion', async () => {
    const repo = new FakeRepo()
    repo.addChannel('UCgone')
    const source = fakeVideoSource({
      feeds: {
        UCgone: () => {
          throw internal('RSS fetch failed with 404')
        }
      }
    })
    const report = await service(repo, source).refresh('manual', 'acc1')
    expect(report.channelsFailed).toBe(1)
    expect(report.outcome).toBe('failed')
    expect(repo.listSubscribedChannels('acc1').map((c) => c.channelId)).toContain('UCgone')
  })

  // D-048/B-110: YouTube's RSS backend was confirmed live to return
  // transient 404/500 for genuinely active channels under ordinary
  // conditions — retrying within the same cycle (youtube-api.md's own
  // documented, previously-unimplemented "max 3 per cycle" rule) recovers
  // most of these instead of waiting for the next 30-minute cycle.
  it('retries a failing RSS fetch up to 5 times before giving up on the channel this cycle', async () => {
    const repo = new FakeRepo()
    repo.addChannel('UCflaky')
    let calls = 0
    const source = fakeVideoSource({
      feeds: {
        UCflaky: () => {
          calls += 1
          if (calls < 5) throw internal('RSS fetch failed with 500')
          return { kind: 'ok', entries: [discovered('v1')], etag: null, lastModified: null }
        }
      }
    })
    const report = await service(repo, source).refresh('manual', 'acc1')
    expect(calls).toBe(5)
    expect(repo.inserted).toContain('v1')
    expect(report.channelsFailed).toBe(0)
  })

  it('gives up on the channel this cycle after 5 straight RSS failures (retried again next cycle)', async () => {
    const repo = new FakeRepo()
    repo.addChannel('UCdown')
    let calls = 0
    const source = fakeVideoSource({
      feeds: {
        UCdown: () => {
          calls += 1
          throw internal('RSS fetch failed with 500')
        }
      }
    })
    const report = await service(repo, source).refresh('manual', 'acc1')
    expect(calls).toBe(5)
    expect(report.channelsFailed).toBe(1)
    expect(repo.listSubscribedChannels('acc1').map((c) => c.channelId)).toContain('UCdown')
  })

  it('re-checks locally upcoming videos every refresh, so a broadcast that went live can update (B-085)', async () => {
    const repo = new FakeRepo()
    repo.addChannel('UCa')
    repo.upcoming = ['premiere-1']
    const source = fakeVideoSource()
    await service(repo, source).refresh('timer', 'acc1')
    expect(source.hydrateCalls.flat()).toContain('premiere-1')
    expect(repo.hydrated).toContain('premiere-1')
  })

  it('skips the upcoming re-check entirely when there is nothing flagged upcoming', async () => {
    const repo = new FakeRepo()
    repo.addChannel('UCa')
    const source = fakeVideoSource()
    await service(repo, source).refresh('timer', 'acc1')
    expect(source.hydrateCalls).toEqual([])
  })

  it('treats not-modified as a successful no-op poll', async () => {
    const repo = new FakeRepo()
    repo.addChannel('UCa', { rssEtag: 'e1' })
    const source = fakeVideoSource({ feeds: { UCa: { kind: 'not-modified' } } })
    const report = await service(repo, source).refresh('timer', 'acc1')
    expect(repo.inserted).toEqual([])
    expect(repo.syncMeta.get('UCa')?.lastSyncedAt).toBe('2026-07-11T12:00:00.000Z')
    expect(report.outcome).toBe('ok')
  })

  it('backfills a gap when the whole RSS window is new on a previously synced channel', async () => {
    const repo = new FakeRepo()
    // Not a first sync (B-105 now marks everything read on a first sync,
    // which this test isn't exercising — see the account-level meta).
    repo.setMeta('subscriptions_synced_at:acc1', '2026-07-01T00:00:00Z')
    repo.addChannel('UCa', { lastSyncedAt: '2026-07-01T00:00:00Z', uploadsPlaylist: 'UUa' })
    repo.known.add('older-known')
    const rssEntries = Array.from({ length: 15 }, (_, i) => discovered(`rss-${i}`))
    const source = fakeVideoSource({
      feeds: { UCa: { kind: 'ok', entries: rssEntries, etag: null, lastModified: null } },
      uploads: {
        UUa: [
          [...rssEntries.map((e) => e.videoId), 'gap-1', 'gap-2'],
          ['gap-3', 'older-known', 'ancient']
        ]
      }
    })

    const report = await service(repo, source).refresh('manual', 'acc1')

    // 15 RSS + 3 gap videos; paging stops at the first known video.
    expect(report.videosNew).toBe(18)
    expect(source.hydrateCalls[0]).toContain('gap-3')
    expect(source.hydrateCalls[0]).not.toContain('ancient')
    // Gap-backfilled videos are genuinely missed uploads since the last
    // sync, not deep-archive history — they stay unread, unlike
    // backfillArchive's videos (see the describe block below).
    expect(repo.markedRead).toEqual([])
  })

  it('backfills a gap even when the RSS window is a mix of known and new entries (B-051)', async () => {
    const repo = new FakeRepo()
    repo.addChannel('UCa', { lastSyncedAt: '2026-07-01T00:00:00Z', uploadsPlaylist: 'UUa' })
    // 'window-known' sits in the current RSS window alongside genuinely new
    // entries — under the old all-or-nothing gate this alone would have
    // suppressed gap-backfill entirely, hiding 'missed-1' forever even
    // though it's a real, never-captured video sitting just past the RSS
    // window and just before 'window-known' in the uploads playlist.
    repo.known.add('window-known')
    const rssEntries = [discovered('rss-new-1'), discovered('rss-new-2'), discovered('window-known')]
    const source = fakeVideoSource({
      feeds: { UCa: { kind: 'ok', entries: rssEntries, etag: null, lastModified: null } },
      uploads: {
        UUa: [['rss-new-1', 'rss-new-2', 'missed-1', 'window-known']]
      }
    })

    const report = await service(repo, source).refresh('manual', 'acc1')

    expect(report.videosNew).toBe(3) // rss-new-1, rss-new-2, missed-1
    expect(source.hydrateCalls.flat()).toContain('missed-1')
  })

  it('does not attempt gap-backfill when nothing new was discovered this cycle', async () => {
    const repo = new FakeRepo()
    repo.addChannel('UCa', { lastSyncedAt: '2026-07-01T00:00:00Z', uploadsPlaylist: 'UUa' })
    repo.known.add('already-known')
    const source = fakeVideoSource({
      feeds: {
        UCa: { kind: 'ok', entries: [discovered('already-known')], etag: null, lastModified: null }
      },
      uploads: { UUa: [['should-never-be-fetched']] }
    })

    const report = await service(repo, source).refresh('manual', 'acc1')

    expect(report.videosNew).toBe(0)
    expect(source.hydrateCalls).toEqual([])
  })

  it('marks every video read as soon as it hydrates on a first sync, backlog and same-day alike (B-069, amended by B-105)', async () => {
    const repo = new FakeRepo()
    repo.addChannel('UCa')
    const source = fakeVideoSource({
      feeds: {
        UCa: { kind: 'ok', entries: [discovered('old-1'), discovered('new-1')], etag: null, lastModified: null }
      },
      // clock is fixed at 2026-07-11T12:00:00Z — old-1 is yesterday (backlog),
      // new-1 is later today. A first sync has no prior visit to judge
      // "new" against, so both are marked read on arrival (B-105).
      publishedAt: { 'old-1': '2026-07-10T09:00:00Z', 'new-1': '2026-07-11T11:00:00Z' }
    })

    const report = await service(repo, source).refresh('launch', 'acc1')

    expect(report.firstSync).toBe(true)
    expect(repo.markedRead).toEqual(['old-1', 'new-1'])
  })

  it('does not mark backlog videos read once an account is past its first sync', async () => {
    const repo = new FakeRepo()
    repo.setMeta('subscriptions_synced_at:acc1', '2026-07-01T00:00:00Z')
    repo.addChannel('UCa')
    const source = fakeVideoSource({
      feeds: { UCa: { kind: 'ok', entries: [discovered('old-1')], etag: null, lastModified: null } },
      publishedAt: { 'old-1': '2026-07-10T09:00:00Z' }
    })

    const report = await service(repo, source).refresh('timer', 'acc1')

    expect(report.firstSync).toBe(false)
    expect(repo.markedRead).toEqual([])
  })

  it('never gap-backfills a channel on its first sync', async () => {
    const repo = new FakeRepo()
    repo.addChannel('UCa', { lastSyncedAt: null, uploadsPlaylist: 'UUa' })
    const source = fakeVideoSource({
      feeds: { UCa: { kind: 'ok', entries: [discovered('v1')], etag: null, lastModified: null } },
      uploads: { UUa: [['should-not-be-fetched']] }
    })
    const report = await service(repo, source).refresh('manual', 'acc1')
    expect(report.videosNew).toBe(1)
    expect(source.hydrateCalls[0]).toEqual(['v1'])
  })

  it('quota exhaustion during hydration keeps discovery and reports quota outcome', async () => {
    const repo = new FakeRepo()
    repo.addChannel('UCa')
    const source = fakeVideoSource({
      feeds: { UCa: { kind: 'ok', entries: [discovered('v1')], etag: null, lastModified: null } },
      hydrateError: () => {
        throw quotaExceeded()
      }
    })
    const report = await service(repo, source).refresh('manual', 'acc1')
    expect(repo.inserted).toEqual(['v1']) // discovery persisted; hydration queues until reset
    expect(report.outcome).toBe('quota')
  })

  it('confirms Shorts candidates and caches the verdict; probe failures stay pending', async () => {
    const repo = new FakeRepo()
    repo.candidates = ['short-1', 'normal-1', 'flaky-1']
    const prober: ShortsProber = {
      isShort: (videoId) => {
        if (videoId === 'flaky-1') return Promise.reject(new Error('timeout'))
        return Promise.resolve(videoId === 'short-1')
      }
    }
    await service(new FakeRepo(), fakeVideoSource(), { prober }).refresh('manual', 'acc1')
    // run against the repo holding candidates
    await service(repo, fakeVideoSource(), { prober }).refresh('manual', 'acc1')

    expect(repo.shortStatuses.get('short-1')).toBe(true)
    expect(repo.shortStatuses.get('normal-1')).toBe(false)
    expect(repo.shortStatuses.has('flaky-1')).toBe(false)
  })

  it('scopes to one channel when a channelId is given (B-036): no re-list, other channels untouched', async () => {
    const repo = new FakeRepo()
    repo.addChannel('UCa')
    repo.addChannel('UCb')
    repo.candidates = ['short-a', 'short-b']
    repo.candidateChannel.set('short-a', 'UCa')
    repo.candidateChannel.set('short-b', 'UCb')
    const source = fakeVideoSource({
      feeds: {
        UCa: { kind: 'ok', entries: [discovered('va')], etag: null, lastModified: null },
        UCb: { kind: 'ok', entries: [discovered('vb')], etag: null, lastModified: null }
      }
    })
    const prober: ShortsProber = { isShort: () => Promise.resolve(true) }

    const report = await service(repo, source, { prober }).refresh('manual', 'acc1', 'UCa')

    expect(report.channelsPolled).toBe(1)
    expect(repo.inserted).toEqual(['va'])
    expect(repo.inserted).not.toContain('vb')
    expect(repo.appliedSubscriptions).toHaveLength(0) // no subscription re-list
    expect(report.subscriptions).toBeNull()
    expect(repo.shortStatuses.has('short-a')).toBe(true)
    expect(repo.shortStatuses.has('short-b')).toBe(false) // other channel's candidate untouched
  })

  it('rethrows auth expiry after recording a failed sync', async () => {
    const repo = new FakeRepo()
    repo.addChannel('UCa')
    const source = fakeVideoSource({
      feeds: {
        UCa: () => {
          throw authExpired()
        }
      }
    })
    await expect(service(repo, source).refresh('launch', 'acc1')).rejects.toMatchObject({ kind: 'auth-expired' })
    expect(repo.logs.at(-1)?.outcome).toBe('failed')
  })

  it('records quota accounting in the sync log and reports progress', async () => {
    const repo = new FakeRepo()
    repo.addChannel('UCa')
    repo.setMeta('subscriptions_synced_at:acc1', '2026-07-11T00:00:00Z')
    const quota = new QuotaCounter()
    const source = fakeVideoSource({
      feeds: { UCa: { kind: 'ok', entries: [discovered('v1')], etag: null, lastModified: null } },
      quota
    })
    const progress: [string, number][] = []
    const report = await service(repo, source, {
      quota,
      onProgress: (p) => progress.push([p.phase, p.checked])
    }).refresh('manual', 'acc1')

    expect(report.quotaSpent).toBe(1) // one hydrate batch
    expect(repo.logs.at(-1)).toMatchObject({ quotaSpent: 1, outcome: 'ok', trigger: 'manual' })
    expect(progress).toEqual([
      ['channels', 0],
      ['channels', 1]
    ])
  })

  it('reports shorts-phase progress while confirming candidates', async () => {
    const repo = new FakeRepo()
    repo.candidates = ['a', 'b']
    repo.setMeta('subscriptions_synced_at:acc1', '2026-07-11T00:00:00Z')
    const progress: [string, number, number][] = []
    await service(repo, fakeVideoSource(), {
      onProgress: (p) => progress.push([p.phase, p.checked, p.total])
    }).refresh('manual', 'acc1')

    expect(progress.filter(([phase]) => phase === 'shorts')).toEqual([
      ['shorts', 0, 2],
      ['shorts', 1, 2],
      ['shorts', 2, 2]
    ])
  })
})

describe('SyncService.backfillArchive (B-002)', () => {
  it('pages the uploads playlist, hydrates new videos, and reports exhaustion', async () => {
    const repo = new FakeRepo()
    repo.addChannel('UCa', { uploadsPlaylist: 'UUa' })
    const source = fakeVideoSource({ uploads: { UUa: [['v1', 'v2']] } }) // single page

    const result = await service(repo, source).backfillArchive('acc1', 'UCa')

    expect(result).toEqual({ videosNew: 2, exhausted: true })
    expect(repo.hydrated.sort()).toEqual(['v1', 'v2'])
    expect(repo.getBackfillState('acc1', 'UCa')).toEqual({ pageToken: null, exhausted: true })
    // Archive-backfilled videos predate the user following/using Chronicle —
    // they default to read rather than inflating unread counts.
    expect(repo.markedRead.sort()).toEqual(['v1', 'v2'])
  })

  it('resumes from the stored page token across calls', async () => {
    const repo = new FakeRepo()
    repo.addChannel('UCa', { uploadsPlaylist: 'UUa' })
    const source = fakeVideoSource({ uploads: { UUa: [['v1'], ['v2']] } })

    const first = await service(repo, source).backfillArchive('acc1', 'UCa')
    expect(first).toEqual({ videosNew: 1, exhausted: false })
    expect(repo.hydrated).toEqual(['v1'])

    const second = await service(repo, source).backfillArchive('acc1', 'UCa')
    expect(second).toEqual({ videosNew: 1, exhausted: true })
    expect(repo.hydrated).toEqual(['v1', 'v2'])
  })

  it('skips fully-known pages until it finds something new, bounded by the page limit', async () => {
    const repo = new FakeRepo()
    repo.addChannel('UCa', { uploadsPlaylist: 'UUa' })
    repo.known.add('known1')
    repo.known.add('known2')
    const source = fakeVideoSource({
      uploads: { UUa: [['known1'], ['known2'], ['v3']] }
    })

    // 'v3' is on the last page, so this also exhausts the playlist.
    const result = await service(repo, source).backfillArchive('acc1', 'UCa')
    expect(result).toEqual({ videosNew: 1, exhausted: true })
    expect(repo.hydrated).toEqual(['v3'])
  })

  it('gives up after the page bound rather than walking a fully-known archive forever', async () => {
    const repo = new FakeRepo()
    repo.addChannel('UCa', { uploadsPlaylist: 'UUa' })
    for (const id of ['k1', 'k2', 'k3', 'k4', 'k5']) repo.known.add(id)
    const source = fakeVideoSource({
      uploads: { UUa: [['k1'], ['k2'], ['k3'], ['k4'], ['k5']] } // 5 pages, only 4 walked
    })

    const result = await service(repo, source).backfillArchive('acc1', 'UCa')
    expect(result).toEqual({ videosNew: 0, exhausted: false })
    // Continuation token points past the 4 pages walked, ready for next call.
    expect(repo.getBackfillState('acc1', 'UCa').pageToken).toBe('4')
  })

  it('returns exhausted without a network call once already marked exhausted', async () => {
    const repo = new FakeRepo()
    repo.addChannel('UCa', { uploadsPlaylist: 'UUa' })
    repo.setBackfillState('acc1', 'UCa', null, true)
    const source = fakeVideoSource({ uploads: { UUa: [['v1']] } })

    const result = await service(repo, source).backfillArchive('acc1', 'UCa')
    expect(result).toEqual({ videosNew: 0, exhausted: true })
    expect(repo.hydrated).toEqual([])
  })

  it('returns exhausted when the channel has no uploads playlist yet', async () => {
    const repo = new FakeRepo()
    repo.addChannel('UCa')
    const result = await service(repo, fakeVideoSource()).backfillArchive('acc1', 'UCa')
    expect(result).toEqual({ videosNew: 0, exhausted: true })
  })
})
