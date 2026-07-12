import { beforeEach, describe, expect, it } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { migrate } from './migrations'
import { SqliteSyncRepository } from './sync-repository'
import { SqliteFeedRepository, SqliteStateRepository } from './repositories'
import type { Clock, DiscoveredVideo, HydratedVideo } from '../../core/ports'

const clock: Clock = { now: () => new Date('2026-07-11T12:00:00Z') }
const NOW = clock.now().toISOString()

let db: DatabaseSync
let sync: SqliteSyncRepository
let feed: SqliteFeedRepository

beforeEach(() => {
  db = new DatabaseSync(':memory:')
  migrate(db)
  sync = new SqliteSyncRepository(db)
  feed = new SqliteFeedRepository(db)
})

function discovered(videoId: string, description: string | null = null): DiscoveredVideo {
  return { videoId, title: `t-${videoId}`, publishedAt: '2026-07-11T08:00:00Z', thumbnailUrl: null, description }
}

function hydratedVideo(videoId: string, durationSeconds: number, channelId = 'UCa'): HydratedVideo {
  return {
    videoId,
    channelId,
    channelTitle: `Channel ${channelId}`,
    title: `hydrated-${videoId}`,
    publishedAt: '2026-07-11T08:00:00Z',
    durationSeconds,
    liveContent: 'none',
    thumbnailUrl: 'https://thumb.example/x.jpg',
    description: 'full description',
    viewCount: 12345
  }
}

describe('applySubscriptions', () => {
  it('adds new channels, unsubscribes missing ones, retains their data', () => {
    sync.applySubscriptions([{ channelId: 'UCa', title: 'Alpha', thumbnailUrl: null }], NOW)
    sync.insertDiscoveredVideos('UCa', [discovered('v1')], NOW)
    new SqliteStateRepository(db, clock).toggleFavorite('v1')

    const result = sync.applySubscriptions([{ channelId: 'UCb', title: 'Beta', thumbnailUrl: null }], NOW)
    expect(result).toEqual({ added: 1, removed: 1 })

    // Data ownership: the unsubscribed channel's videos and states remain.
    expect(sync.knownVideoIds(['v1']).has('v1')).toBe(true)
    expect(feed.listPage('favorites', null, 10).entries.map((e) => e.video.videoId)).toEqual(['v1'])
    // …but its videos left the feed views.
    expect(feed.listPage('all', null, 10).entries).toEqual([])
    // …and re-subscribing brings them back.
    sync.applySubscriptions(
      [
        { channelId: 'UCa', title: 'Alpha', thumbnailUrl: null },
        { channelId: 'UCb', title: 'Beta', thumbnailUrl: null }
      ],
      NOW
    )
    expect(feed.listPage('all', null, 10).entries.map((e) => e.video.videoId)).toEqual(['v1'])
  })
})

describe('discovery and hydration', () => {
  beforeEach(() => {
    sync.applySubscriptions([{ channelId: 'UCa', title: 'Alpha', thumbnailUrl: null }], NOW)
  })

  it('insertDiscoveredVideos never overwrites hydrated facts', () => {
    sync.applyHydration([hydratedVideo('v1', 900)], NOW)
    sync.insertDiscoveredVideos('UCa', [discovered('v1')], NOW)
    const entry = feed.listPage('all', null, 10).entries[0]
    expect(entry?.video.title).toBe('hydrated-v1')
    expect(entry?.video.durationSeconds).toBe(900)
  })

  it('truncates stored descriptions to ~500 chars', () => {
    sync.insertDiscoveredVideos('UCa', [discovered('v1', 'x'.repeat(2000))], NOW)
    const row = db.prepare(`SELECT description FROM videos WHERE video_id = 'v1'`).get() as {
      description: string
    }
    expect(row.description.length).toBe(500)
  })

  it('applyHydration inserts gap-backfilled videos that RSS never saw', () => {
    sync.applyHydration([hydratedVideo('gap-1', 1200)], NOW)
    const entries = feed.listPage('all', null, 10).entries
    expect(entries.map((e) => e.video.videoId)).toEqual(['gap-1'])
    expect(entries[0]?.video.durationSeconds).toBe(1200)
  })

  it('knownVideoIds handles more ids than one SQL parameter batch', () => {
    const many = Array.from({ length: 600 }, (_, i) => discovered(`v${i}`))
    sync.insertDiscoveredVideos('UCa', many, NOW)
    const known = sync.knownVideoIds([...many.map((v) => v.videoId), 'absent'])
    expect(known.size).toBe(600)
    expect(known.has('absent')).toBe(false)
  })
})

describe('shorts pipeline storage (D-028)', () => {
  beforeEach(() => {
    sync.applySubscriptions([{ channelId: 'UCa', title: 'Alpha', thumbnailUrl: null }], NOW)
  })

  it('candidates are hydrated videos ≤ 180 s with unknown verdict', () => {
    sync.applyHydration(
      [hydratedVideo('shorty', 60), hydratedVideo('normal', 600), hydratedVideo('boundary', 180)],
      NOW
    )
    sync.setShortStatus('boundary', false)
    expect(sync.shortCandidates().toSorted()).toEqual(['shorty'])
  })

  it('a confirmed Short is tagged but stays visible by default (B-028)', () => {
    sync.applyHydration([hydratedVideo('shorty', 60), hydratedVideo('fine', 90)], NOW)
    sync.setShortStatus('shorty', true)
    sync.setShortStatus('fine', false)
    const entries = feed.listPage('all', null, 10).entries
    expect(entries.map((e) => e.video.videoId).toSorted()).toEqual(['fine', 'shorty'])
    expect(entries.find((e) => e.video.videoId === 'shorty')?.video.isShort).toBe(true)
    expect(feed.countUnread()).toBe(2)
  })

  it('a confirmed Short leaves every feed view when showShorts is false', () => {
    sync.applyHydration([hydratedVideo('shorty', 60), hydratedVideo('fine', 90)], NOW)
    sync.setShortStatus('shorty', true)
    sync.setShortStatus('fine', false)
    expect(
      feed.listPage('all', null, 10, undefined, false).entries.map((e) => e.video.videoId)
    ).toEqual(['fine'])
    expect(feed.countUnread(false)).toBe(1)
  })
})

describe('channel sync meta', () => {
  it('unavailable channels stop being polled but stay out of the way', () => {
    sync.applySubscriptions(
      [
        { channelId: 'UCa', title: 'Alpha', thumbnailUrl: null },
        { channelId: 'UCgone', title: 'Gone', thumbnailUrl: null }
      ],
      NOW
    )
    sync.markChannelUnavailable('UCgone')
    expect(sync.listSubscribedChannels().map((c) => c.channelId)).toEqual(['UCa'])
  })

  it('stores RSS validators for conditional GET', () => {
    sync.applySubscriptions([{ channelId: 'UCa', title: 'Alpha', thumbnailUrl: null }], NOW)
    sync.updateChannelSyncMeta('UCa', {
      rssEtag: 'e1',
      rssLastModified: 'Fri, 11 Jul 2026 08:00:00 GMT',
      lastSyncedAt: NOW,
      available: true
    })
    expect(sync.listSubscribedChannels()[0]).toMatchObject({ rssEtag: 'e1', lastSyncedAt: NOW })
  })
})

describe('external videos (D-029)', () => {
  it('creates a subscribed=0 channel and the video stays out of feed views', () => {
    sync.upsertExternalVideo(hydratedVideo('ext-1', 700, 'UCext'), NOW)
    expect(feed.listPage('all', null, 10).entries).toEqual([])
    expect(feed.countUnread()).toBe(0)
    // …but the player can find it and states work on it
    expect(feed.findVideo('ext-1')?.entry.video.title).toBe('hydrated-ext-1')
    new SqliteStateRepository(db, clock).toggleFavorite('ext-1')
    expect(feed.listPage('favorites', null, 10).entries.map((e) => e.video.videoId)).toEqual([
      'ext-1'
    ])
  })

  it('never flips an existing subscribed channel to 0', () => {
    sync.applySubscriptions([{ channelId: 'UCa', title: 'Alpha', thumbnailUrl: null }], NOW)
    sync.upsertExternalVideo(hydratedVideo('v1', 700, 'UCa'), NOW)
    expect(feed.listPage('all', null, 10).entries.map((e) => e.video.videoId)).toEqual(['v1'])
  })
})

describe('findVideo (player read)', () => {
  it('returns entry with description, or null for unknown ids', () => {
    sync.applySubscriptions([{ channelId: 'UCa', title: 'Alpha', thumbnailUrl: null }], NOW)
    sync.insertDiscoveredVideos('UCa', [discovered('v1', 'a description')], NOW)
    expect(feed.findVideo('v1')?.description).toBe('a description')
    expect(feed.findVideo('v1')?.entry.channelTitle).toBe('Alpha')
    expect(feed.findVideo('nope')).toBeNull()
  })
})

describe('sync log and meta', () => {
  it('records syncs and exposes the last start time', () => {
    expect(sync.lastSyncStartedAt()).toBeNull()
    sync.recordSync({
      startedAt: NOW,
      finishedAt: NOW,
      trigger: 'manual',
      channelsPolled: 3,
      videosNew: 7,
      quotaSpent: 2,
      outcome: 'ok'
    })
    expect(sync.lastSyncStartedAt()).toBe(NOW)
    const row = db.prepare(`SELECT * FROM sync_log`).get() as Record<string, unknown>
    expect(row['outcome']).toBe('ok')
    expect(Number(row['quota_spent'])).toBe(2)
  })

  it('meta is a durable key-value store', () => {
    expect(sync.getMeta('k')).toBeNull()
    sync.setMeta('k', 'v1')
    sync.setMeta('k', 'v2')
    expect(sync.getMeta('k')).toBe('v2')
  })
})

describe('feed channel filter (sidebar)', () => {
  it('narrows the feed to one channel and lists followed channels sorted', () => {
    sync.applySubscriptions(
      [
        { channelId: 'UCb', title: 'beta', thumbnailUrl: null },
        { channelId: 'UCa', title: 'Alpha', thumbnailUrl: null }
      ],
      NOW
    )
    sync.insertDiscoveredVideos('UCa', [discovered('a1')], NOW)
    sync.insertDiscoveredVideos('UCb', [discovered('b1')], NOW)

    expect(feed.listFollowedChannels().map((c) => c.channel.title)).toEqual(['Alpha', 'beta'])
    expect(feed.listPage('all', null, 10, 'UCb').entries.map((e) => e.video.videoId)).toEqual(['b1'])
  })
})
