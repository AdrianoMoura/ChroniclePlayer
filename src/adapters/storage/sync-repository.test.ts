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
  // B-003: account_channels has an FK on accounts — every test below acts
  // as this one account.
  sync.addAccount('acc1', 'Test', NOW)
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
    liveEndedAt: null,
    thumbnailUrl: 'https://thumb.example/x.jpg',
    description: 'full description',
    viewCount: 12345
  }
}

describe('applySubscriptions', () => {
  it('adds new channels, unsubscribes missing ones, retains their data', () => {
    sync.applySubscriptions('acc1', [{ channelId: 'UCa', title: 'Alpha', thumbnailUrl: null }], NOW)
    sync.insertDiscoveredVideos('UCa', [discovered('v1')], NOW)
    new SqliteStateRepository(db, clock).toggleFavorite('v1')

    const result = sync.applySubscriptions('acc1', [{ channelId: 'UCb', title: 'Beta', thumbnailUrl: null }], NOW)
    expect(result).toEqual({ added: 1, removed: 1 })

    // Data ownership: the unsubscribed channel's videos and states remain.
    expect(sync.knownVideoIds(['v1']).has('v1')).toBe(true)
    expect(feed.listPage('favorites', null, 10).entries.map((e) => e.video.videoId)).toEqual(['v1'])
    // …but its videos left the feed views.
    expect(feed.listPage('all', null, 10).entries).toEqual([])
    // …and re-subscribing brings them back.
    sync.applySubscriptions('acc1', 
      [
        { channelId: 'UCa', title: 'Alpha', thumbnailUrl: null },
        { channelId: 'UCb', title: 'Beta', thumbnailUrl: null }
      ],
      NOW
    )
    expect(feed.listPage('all', null, 10).entries.map((e) => e.video.videoId)).toEqual(['v1'])
  })

  it('stores and updates the subscription resource id (B-010)', () => {
    sync.applySubscriptions('acc1', [{ channelId: 'UCa', title: 'Alpha', thumbnailUrl: null, subscriptionId: 'subA' }], NOW)
    expect(sync.getSubscriptionId('acc1', 'UCa')).toBe('subA')

    sync.applySubscriptions('acc1', [{ channelId: 'UCa', title: 'Alpha', thumbnailUrl: null, subscriptionId: 'subA2' }], NOW)
    expect(sync.getSubscriptionId('acc1', 'UCa')).toBe('subA2')
  })

  it('getSubscriptionId is null for channels synced before schema v3 / without one', () => {
    sync.applySubscriptions('acc1', [{ channelId: 'UCa', title: 'Alpha', thumbnailUrl: null }], NOW)
    expect(sync.getSubscriptionId('acc1', 'UCa')).toBeNull()
    expect(sync.getSubscriptionId('acc1', 'unknown')).toBeNull()
  })
})

describe('accounts (B-003)', () => {
  it('lists connected accounts oldest first', () => {
    sync.addAccount('acc2', 'Second', '2026-07-12T00:00:00Z')
    expect(sync.listAccounts().map((a) => a.accountId)).toEqual(['acc1', 'acc2'])
  })

  it('removeAccount cascades its account_channels rows only', () => {
    sync.addAccount('acc2', 'Second', NOW)
    sync.applySubscriptions('acc1', [{ channelId: 'UCa', title: 'Alpha', thumbnailUrl: null }], NOW)
    sync.applySubscriptions('acc2', [{ channelId: 'UCa', title: 'Alpha', thumbnailUrl: null }], NOW)

    sync.removeAccount('acc1')

    expect(sync.listAccounts().map((a) => a.accountId)).toEqual(['acc2'])
    expect(sync.listAccountIdsForChannel('UCa')).toEqual(['acc2'])
    // The channel's own facts (title etc.) survive the cascade — acc2 still follows it.
    expect(feed.listFollowedChannels(true, 'acc2').map((c) => c.channel.title)).toEqual(['Alpha'])
  })

  it('listAccountIdsForChannel finds every account subscribing to a shared channel', () => {
    sync.addAccount('acc2', 'Second', NOW)
    sync.applySubscriptions('acc1', [{ channelId: 'UCshared', title: 'Shared', thumbnailUrl: null }], NOW)
    sync.applySubscriptions('acc2', [{ channelId: 'UCshared', title: 'Shared', thumbnailUrl: null }], NOW)
    expect(sync.listAccountIdsForChannel('UCshared').toSorted()).toEqual(['acc1', 'acc2'])
  })
})

describe('backfill state (B-002)', () => {
  it('defaults to no cursor, not exhausted, and persists across calls', () => {
    sync.applySubscriptions('acc1', [{ channelId: 'UCa', title: 'Alpha', thumbnailUrl: null }], NOW)
    expect(sync.getBackfillState('acc1', 'UCa')).toEqual({ pageToken: null, exhausted: false })

    sync.setBackfillState('acc1', 'UCa', 'tok123', false)
    expect(sync.getBackfillState('acc1', 'UCa')).toEqual({ pageToken: 'tok123', exhausted: false })

    sync.setBackfillState('acc1', 'UCa', null, true)
    expect(sync.getBackfillState('acc1', 'UCa')).toEqual({ pageToken: null, exhausted: true })
  })
})

describe('upsertSubscribedChannel (B-009)', () => {
  it('inserts a new channel as subscribed with its subscription id', () => {
    sync.upsertSubscribedChannel('acc1', 
      { channelId: 'UCnew', title: 'New', thumbnailUrl: null, subscriptionId: 'subNEW' },
      NOW
    )
    expect(sync.getSubscriptionId('acc1', 'UCnew')).toBe('subNEW')
    expect(feed.listFollowedChannels().map((c) => c.channel.channelId)).toContain('UCnew')
  })

  it('re-subscribes a previously-unsubscribed channel in place, keeping its data', () => {
    sync.applySubscriptions('acc1', [{ channelId: 'UCa', title: 'Alpha', thumbnailUrl: null }], NOW)
    sync.markUnsubscribed('acc1', 'UCa')
    expect(feed.listFollowedChannels().map((c) => c.channel.channelId)).not.toContain('UCa')

    sync.upsertSubscribedChannel('acc1', 
      { channelId: 'UCa', title: 'Alpha', thumbnailUrl: null, subscriptionId: 'subA' },
      NOW
    )
    expect(feed.listFollowedChannels().map((c) => c.channel.channelId)).toContain('UCa')
    expect(sync.getSubscriptionId('acc1', 'UCa')).toBe('subA')
  })
})

describe('markUnsubscribed (B-010)', () => {
  it('soft-deletes like applySubscriptions removal — videos and state stay', () => {
    sync.applySubscriptions('acc1', [{ channelId: 'UCa', title: 'Alpha', thumbnailUrl: null }], NOW)
    sync.insertDiscoveredVideos('UCa', [discovered('v1')], NOW)
    new SqliteStateRepository(db, clock).toggleFavorite('v1')

    sync.markUnsubscribed('acc1', 'UCa')

    expect(feed.listPage('all', null, 10).entries).toEqual([])
    expect(feed.listPage('favorites', null, 10).entries.map((e) => e.video.videoId)).toEqual(['v1'])
  })
})

describe('discovery and hydration', () => {
  beforeEach(() => {
    sync.applySubscriptions('acc1', [{ channelId: 'UCa', title: 'Alpha', thumbnailUrl: null }], NOW)
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

  it('carries liveBroadcastContent through to the feed query', () => {
    sync.applyHydration(
      [{ ...hydratedVideo('premiere-1', 600), liveContent: 'upcoming' }],
      NOW
    )
    sync.insertDiscoveredVideos('UCa', [discovered('normal-1')], NOW)
    const entries = feed.listPage('all', null, 10).entries
    expect(entries.find((e) => e.video.videoId === 'premiere-1')?.video.liveContent).toBe(
      'upcoming'
    )
    // Never hydrated — defaults to 'none' rather than a raw NULL leaking out.
    expect(entries.find((e) => e.video.videoId === 'normal-1')?.video.liveContent).toBe('none')
  })

  it('upcomingVideoIds finds videos still flagged upcoming, and clears once re-hydrated live (B-085)', () => {
    sync.applyHydration(
      [
        { ...hydratedVideo('premiere-1', 600), liveContent: 'upcoming' },
        { ...hydratedVideo('normal-1', 600), liveContent: 'none' }
      ],
      NOW
    )
    expect(sync.upcomingVideoIds()).toEqual(['premiere-1'])
    sync.applyHydration([{ ...hydratedVideo('premiere-1', 600), liveContent: 'live' }], NOW)
    expect(sync.upcomingVideoIds()).toEqual([])
    const entries = feed.listPage('all', null, 10).entries
    expect(entries.find((e) => e.video.videoId === 'premiere-1')?.video.liveContent).toBe('live')
  })

  it('liveVideoIds finds videos still flagged live, and clears (with the real duration) once the broadcast ends (B-114)', () => {
    sync.applyHydration(
      [
        { ...hydratedVideo('stream-1', 0), liveContent: 'live' },
        { ...hydratedVideo('normal-1', 600), liveContent: 'none' }
      ],
      NOW
    )
    expect(sync.liveVideoIds()).toEqual(['stream-1'])
    sync.applyHydration([{ ...hydratedVideo('stream-1', 5400), liveContent: 'none' }], NOW)
    expect(sync.liveVideoIds()).toEqual([])
    const entries = feed.listPage('all', null, 10).entries
    const ended = entries.find((e) => e.video.videoId === 'stream-1')?.video
    expect(ended?.liveContent).toBe('none')
    expect(ended?.durationSeconds).toBe(5400)
  })

  it('captures liveEndedAt once a broadcast ends, and keeps it sticky through later re-hydrations (D-053)', () => {
    sync.applyHydration([{ ...hydratedVideo('stream-1', 0), liveContent: 'live' }], NOW)
    let ended = feed.listPage('all', null, 10).entries.find((e) => e.video.videoId === 'stream-1')?.video
    expect(ended?.liveEndedAt).toBeNull()

    sync.applyHydration(
      [{ ...hydratedVideo('stream-1', 5400), liveContent: 'none', liveEndedAt: '2026-07-11T13:30:00Z' }],
      NOW
    )
    ended = feed.listPage('all', null, 10).entries.find((e) => e.video.videoId === 'stream-1')?.video
    expect(ended?.liveEndedAt).toBe('2026-07-11T13:30:00Z')

    // A later re-hydration reporting no end time (shouldn't normally happen,
    // but the sticky COALESCE must not let it clear a real one already
    // captured) leaves it untouched.
    sync.applyHydration(
      [{ ...hydratedVideo('stream-1', 5400), liveContent: 'none', liveEndedAt: null }],
      NOW
    )
    ended = feed.listPage('all', null, 10).entries.find((e) => e.video.videoId === 'stream-1')?.video
    expect(ended?.liveEndedAt).toBe('2026-07-11T13:30:00Z')
  })

  it('knownVideoIds handles more ids than one SQL parameter batch', () => {
    const many = Array.from({ length: 600 }, (_, i) => discovered(`v${i}`))
    sync.insertDiscoveredVideos('UCa', many, NOW)
    const known = sync.knownVideoIds([...many.map((v) => v.videoId), 'absent'])
    expect(known.size).toBe(600)
    expect(known.has('absent')).toBe(false)
  })

  it('markVideosReadIfUnset defaults archive-backfilled videos to read', () => {
    sync.applyHydration([hydratedVideo('old-1', 300)], NOW)
    sync.markVideosReadIfUnset(['old-1'], NOW)
    const state = new SqliteStateRepository(db, clock)
    expect(state.get('old-1').readStatus).toBe('read')
  })

  it('markVideosReadIfUnset never overwrites an existing state row', () => {
    sync.applyHydration([hydratedVideo('old-2', 300)], NOW)
    const state = new SqliteStateRepository(db, clock)
    state.toggleFavorite('old-2') // creates a video_state row, still unread
    sync.markVideosReadIfUnset(['old-2'], NOW)
    const after = state.get('old-2')
    expect(after.readStatus).toBe('unread')
    expect(after.favorite).toBe(true)
  })
})

describe('shorts pipeline storage (D-028)', () => {
  beforeEach(() => {
    sync.applySubscriptions('acc1', [{ channelId: 'UCa', title: 'Alpha', thumbnailUrl: null }], NOW)
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

  it('countShorts counts only confirmed Shorts among the given ids (D-052)', () => {
    sync.applyHydration(
      [hydratedVideo('shorty-1', 30), hydratedVideo('shorty-2', 60), hydratedVideo('fine', 90)],
      NOW
    )
    sync.setShortStatus('shorty-1', true)
    sync.setShortStatus('shorty-2', true)
    sync.setShortStatus('fine', false)
    expect(sync.countShorts(['shorty-1', 'shorty-2', 'fine'])).toBe(2)
    expect(sync.countShorts(['fine'])).toBe(0)
    expect(sync.countShorts(['unknown-id'])).toBe(0)
    expect(sync.countShorts([])).toBe(0)
  })
})

describe('channel sync meta', () => {
  it('stores RSS validators for conditional GET', () => {
    sync.applySubscriptions('acc1', [{ channelId: 'UCa', title: 'Alpha', thumbnailUrl: null }], NOW)
    sync.updateChannelSyncMeta('UCa', {
      rssEtag: 'e1',
      rssLastModified: 'Fri, 11 Jul 2026 08:00:00 GMT',
      lastSyncedAt: NOW
    })
    expect(sync.listSubscribedChannels('acc1')[0]).toMatchObject({ rssEtag: 'e1', lastSyncedAt: NOW })
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
    sync.applySubscriptions('acc1', [{ channelId: 'UCa', title: 'Alpha', thumbnailUrl: null }], NOW)
    sync.upsertExternalVideo(hydratedVideo('v1', 700, 'UCa'), NOW)
    expect(feed.listPage('all', null, 10).entries.map((e) => e.video.videoId)).toEqual(['v1'])
  })
})

describe('findVideo (player read)', () => {
  it('returns entry with description, or null for unknown ids', () => {
    sync.applySubscriptions('acc1', [{ channelId: 'UCa', title: 'Alpha', thumbnailUrl: null }], NOW)
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
    sync.applySubscriptions('acc1', 
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
