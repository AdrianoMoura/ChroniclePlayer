import { describe, expect, it } from 'vitest'
import { SyncService } from './sync-service'
import { authExpired, channelUnavailable, networkUnavailable, quotaExceeded } from './errors'
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
  unavailable: string[] = []
  syncMeta = new Map<string, { lastSyncedAt: string }>()
  logs: SyncLogEntry[] = []
  meta = new Map<string, string>()
  candidates: string[] = []
  shortStatuses = new Map<string, boolean>()
  uploadsSet = new Map<string, string>()
  appliedSubscriptions: Channel[][] = []

  listSubscribedChannels(): ChannelSyncInfo[] {
    return [...this.channels.values()]
  }
  applySubscriptions(channels: readonly Channel[]): { added: number; removed: number } {
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
  updateChannelSyncMeta(channelId: string, meta: { lastSyncedAt: string }): void {
    this.syncMeta.set(channelId, { lastSyncedAt: meta.lastSyncedAt })
  }
  markChannelUnavailable(channelId: string): void {
    this.unavailable.push(channelId)
  }
  shortCandidates(): string[] {
    return this.candidates
  }
  setShortStatus(videoId: string, isShort: boolean): void {
    this.shortStatuses.set(videoId, isShort)
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
          title: `t-${videoId}`,
          publishedAt: '2026-07-11T10:00:00Z',
          durationSeconds: 600,
          liveContent: 'none' as const,
          thumbnailUrl: null,
          description: null
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
  options: { subscriptions?: SubscriptionSource; quota?: QuotaCounter; prober?: ShortsProber; onProgress?: (p: { checked: number; total: number }) => void } = {}
): SyncService {
  return new SyncService({
    subscriptions: options.subscriptions ?? fakeSubscriptions(),
    videoSource: source,
    repo,
    shortsProber: options.prober ?? noShorts,
    quota: options.quota ?? new QuotaCounter(),
    clock,
    onProgress: options.onProgress
  })
}

describe('SyncService.refresh', () => {
  it('imports subscriptions on first refresh and fetches uploads playlists', async () => {
    const repo = new FakeRepo()
    const subs = fakeSubscriptions([{ channelId: 'UCa', title: 'Alpha', thumbnailUrl: null }])
    await service(repo, fakeVideoSource(), { subscriptions: subs }).refresh('launch')

    expect(repo.appliedSubscriptions).toHaveLength(1)
    expect(repo.uploadsSet.get('UCa')).toBe('UUa')
    expect(repo.getMeta('subscriptions_synced_at')).not.toBeNull()
  })

  it('skips subscription re-sync when the last one is recent', async () => {
    const repo = new FakeRepo()
    repo.setMeta('subscriptions_synced_at', '2026-07-10T12:00:00Z') // 1 day ago
    await service(repo, fakeVideoSource()).refresh('timer')
    expect(repo.appliedSubscriptions).toHaveLength(0)
  })

  it('re-syncs subscriptions after a week', async () => {
    const repo = new FakeRepo()
    repo.setMeta('subscriptions_synced_at', '2026-07-01T12:00:00Z') // 10 days ago
    await service(repo, fakeVideoSource()).refresh('timer')
    expect(repo.appliedSubscriptions).toHaveLength(1)
  })

  it('discovers only genuinely new videos and hydrates them in 50-id batches', async () => {
    const repo = new FakeRepo()
    repo.addChannel('UCa')
    repo.known.add('old-1')
    const entries = [discovered('old-1'), ...Array.from({ length: 60 }, (_, i) => discovered(`new-${i}`))]
    const source = fakeVideoSource({ feeds: { UCa: { kind: 'ok', entries, etag: 'e1', lastModified: null } } })

    const report = await service(repo, source).refresh('manual')

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

    const report = await service(repo, source).refresh('manual')

    expect(repo.inserted).toContain('v1')
    expect(report.channelsFailed).toBe(1)
    expect(report.outcome).toBe('partial')
  })

  it('marks deleted channels unavailable without failing the sync', async () => {
    const repo = new FakeRepo()
    repo.addChannel('UCgone')
    const source = fakeVideoSource({
      feeds: {
        UCgone: () => {
          throw channelUnavailable('UCgone')
        }
      }
    })
    const report = await service(repo, source).refresh('manual')
    expect(repo.unavailable).toEqual(['UCgone'])
    expect(report.outcome).toBe('ok')
  })

  it('treats not-modified as a successful no-op poll', async () => {
    const repo = new FakeRepo()
    repo.addChannel('UCa', { rssEtag: 'e1' })
    const source = fakeVideoSource({ feeds: { UCa: { kind: 'not-modified' } } })
    const report = await service(repo, source).refresh('timer')
    expect(repo.inserted).toEqual([])
    expect(repo.syncMeta.get('UCa')?.lastSyncedAt).toBe('2026-07-11T12:00:00.000Z')
    expect(report.outcome).toBe('ok')
  })

  it('backfills a gap when the whole RSS window is new on a previously synced channel', async () => {
    const repo = new FakeRepo()
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

    const report = await service(repo, source).refresh('manual')

    // 15 RSS + 3 gap videos; paging stops at the first known video.
    expect(report.videosNew).toBe(18)
    expect(source.hydrateCalls[0]).toContain('gap-3')
    expect(source.hydrateCalls[0]).not.toContain('ancient')
  })

  it('never gap-backfills a channel on its first sync', async () => {
    const repo = new FakeRepo()
    repo.addChannel('UCa', { lastSyncedAt: null, uploadsPlaylist: 'UUa' })
    const source = fakeVideoSource({
      feeds: { UCa: { kind: 'ok', entries: [discovered('v1')], etag: null, lastModified: null } },
      uploads: { UUa: [['should-not-be-fetched']] }
    })
    const report = await service(repo, source).refresh('manual')
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
    const report = await service(repo, source).refresh('manual')
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
    await service(new FakeRepo(), fakeVideoSource(), { prober }).refresh('manual')
    // run against the repo holding candidates
    await service(repo, fakeVideoSource(), { prober }).refresh('manual')

    expect(repo.shortStatuses.get('short-1')).toBe(true)
    expect(repo.shortStatuses.get('normal-1')).toBe(false)
    expect(repo.shortStatuses.has('flaky-1')).toBe(false)
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
    await expect(service(repo, source).refresh('launch')).rejects.toMatchObject({ kind: 'auth-expired' })
    expect(repo.logs.at(-1)?.outcome).toBe('failed')
  })

  it('records quota accounting in the sync log and reports progress', async () => {
    const repo = new FakeRepo()
    repo.addChannel('UCa')
    repo.setMeta('subscriptions_synced_at', '2026-07-11T00:00:00Z')
    const quota = new QuotaCounter()
    const source = fakeVideoSource({
      feeds: { UCa: { kind: 'ok', entries: [discovered('v1')], etag: null, lastModified: null } },
      quota
    })
    const progress: number[] = []
    const report = await service(repo, source, {
      quota,
      onProgress: (p) => progress.push(p.checked)
    }).refresh('manual')

    expect(report.quotaSpent).toBe(1) // one hydrate batch
    expect(repo.logs.at(-1)).toMatchObject({ quotaSpent: 1, outcome: 'ok', trigger: 'manual' })
    expect(progress).toEqual([0, 1])
  })
})
