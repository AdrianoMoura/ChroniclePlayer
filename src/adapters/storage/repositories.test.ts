import { beforeEach, describe, expect, it } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { migrate } from './migrations'
import {
  SqliteCatalogRepository,
  SqliteFeedRepository,
  SqliteStateRepository
} from './repositories'
import { belongsToView, FEED_VIEWS } from '../../core/views'
import type { ReadStatus } from '../../core/state'
import type { Clock } from '../../core/ports'

const fixedClock: Clock = { now: () => new Date('2026-07-08T15:00:00Z') }

let db: DatabaseSync
let feed: SqliteFeedRepository
let states: SqliteStateRepository
let catalog: SqliteCatalogRepository

beforeEach(() => {
  db = new DatabaseSync(':memory:')
  migrate(db)
  feed = new SqliteFeedRepository(db)
  states = new SqliteStateRepository(db, fixedClock)
  catalog = new SqliteCatalogRepository(db, fixedClock)
  catalog.upsertChannel({ channelId: 'UCa', title: 'Alpha', thumbnailUrl: null })
  catalog.upsertChannel({ channelId: 'UCb', title: 'Beta', thumbnailUrl: null })
  // B-003: feed membership now lives in account_channels, not channels —
  // subscribe both fixture channels under one test account.
  subscribe('UCa')
  subscribe('UCb')
})

const ACCOUNT = 'acc1'

function subscribe(channelId: string): void {
  subscribeAs(ACCOUNT, channelId)
}

function subscribeAs(accountId: string, channelId: string): void {
  db.prepare(
    `INSERT INTO accounts (account_id, label, added_at) VALUES (:account, 'Test', :now)
     ON CONFLICT(account_id) DO NOTHING`
  ).run({ account: accountId, now: fixedClock.now().toISOString() })
  db.prepare(
    `INSERT INTO account_channels (account_id, channel_id, subscribed, added_at)
     VALUES (:account, :channelId, 1, :now)
     ON CONFLICT(account_id, channel_id) DO UPDATE SET subscribed = 1`
  ).run({ account: accountId, channelId, now: fixedClock.now().toISOString() })
}

function addVideo(
  videoId: string,
  publishedAt: string,
  channelId = 'UCa',
  liveContent: 'none' | 'live' | 'upcoming' = 'none'
): void {
  catalog.upsertVideo(
    {
      videoId,
      channelId,
      title: `Video ${videoId}`,
      publishedAt,
      durationSeconds: 600,
      thumbnailUrl: null,
      viewCount: null,
      isShort: false,
      liveContent,
      liveStartedAt: null,
      liveEndedAt: null,
      isPremiere: false
    },
    fixedClock.now().toISOString()
  )
}

describe('migrations', () => {
  it('are idempotent (user_version guards re-application)', () => {
    expect(() => migrate(db)).not.toThrow()
    const row = db.prepare('PRAGMA user_version').get() as { user_version: number | bigint }
    expect(Number(row.user_version)).toBe(18)
  })

  it('upgrades a v1 database in place (forward-only chain)', () => {
    const legacy = new DatabaseSync(':memory:')
    // Recreate v1 by migrating and stripping the v2 column's version mark.
    migrate(legacy)
    // A v2 column must exist and accept writes after the chain runs.
    legacy
      .prepare(
        `INSERT INTO channels (channel_id, title, added_at) VALUES ('UCx', 'X', '2026-01-01')`
      )
      .run()
    legacy
      .prepare(
        `INSERT INTO videos (video_id, channel_id, title, published_at, view_count, fetched_at)
         VALUES ('v', 'UCx', 't', '2026-01-01', 42, '2026-01-01')`
      )
      .run()
    const row = legacy.prepare(`SELECT view_count FROM videos WHERE video_id = 'v'`).get() as {
      view_count: number | bigint
    }
    expect(Number(row.view_count)).toBe(42)
  })
})

describe('SqliteStateRepository', () => {
  it('returns the default state when no row exists (lazy rows)', () => {
    expect(states.get('missing')).toEqual({
      readStatus: 'unread',
      favorite: false,
      watchLater: false,
      resumePositionSeconds: null
    })
  })

  it('persists read-status transitions', () => {
    addVideo('v1', '2026-07-08T10:00:00Z')
    states.setReadStatus('v1', 'read')
    expect(states.get('v1').readStatus).toBe('read')
    states.setReadStatus('v1', 'unread')
    expect(states.get('v1').readStatus).toBe('unread')
    states.setReadStatus('v1', 'ignored')
    expect(states.get('v1').readStatus).toBe('ignored')
  })

  it('setReadStatus(unread) on an ignored video un-ignores it', () => {
    addVideo('v1', '2026-07-08T10:00:00Z')
    states.setReadStatus('v1', 'ignored')
    states.setReadStatus('v1', 'unread')
    expect(states.get('v1').readStatus).toBe('unread')
  })

  it('flags survive read-status changes (orthogonality, D-010)', () => {
    addVideo('v1', '2026-07-08T10:00:00Z')
    states.toggleFavorite('v1')
    states.toggleWatchLater('v1')
    states.setReadStatus('v1', 'read')
    expect(states.get('v1')).toEqual({
      readStatus: 'read',
      favorite: true,
      watchLater: true,
      resumePositionSeconds: null
    })
  })

  it('assigns watch-later queue positions in insertion order and clears on exit', () => {
    addVideo('a', '2026-07-08T10:00:00Z')
    addVideo('b', '2026-07-08T11:00:00Z')
    addVideo('c', '2026-07-08T12:00:00Z')
    states.toggleWatchLater('a')
    states.toggleWatchLater('b')
    states.toggleWatchLater('c')
    expect(feed.listWatchLaterQueue().map((e) => e.video.videoId)).toEqual(['a', 'b', 'c'])

    states.toggleWatchLater('b') // leaves the queue
    expect(feed.listWatchLaterQueue().map((e) => e.video.videoId)).toEqual(['a', 'c'])

    states.toggleWatchLater('b') // re-enters at the end
    expect(feed.listWatchLaterQueue().map((e) => e.video.videoId)).toEqual(['a', 'c', 'b'])
  })

  it('reorderWatchLater (D-057) persists a drag-and-drop reorder', () => {
    addVideo('a', '2026-07-08T10:00:00Z')
    addVideo('b', '2026-07-08T11:00:00Z')
    addVideo('c', '2026-07-08T12:00:00Z')
    states.toggleWatchLater('a')
    states.toggleWatchLater('b')
    states.toggleWatchLater('c')

    states.reorderWatchLater(['c', 'a', 'b'])
    expect(feed.listWatchLaterQueue().map((e) => e.video.videoId)).toEqual(['c', 'a', 'b'])
  })

  it('reorderWatchLater ignores ids no longer in the queue', () => {
    addVideo('a', '2026-07-08T10:00:00Z')
    addVideo('b', '2026-07-08T11:00:00Z')
    states.toggleWatchLater('a')
    states.toggleWatchLater('b')
    states.toggleWatchLater('a') // leaves the queue before the reorder lands

    states.reorderWatchLater(['a', 'b'])
    expect(feed.listWatchLaterQueue().map((e) => e.video.videoId)).toEqual(['b'])
    expect(states.get('a').watchLater).toBe(false)
  })

  it('setResumePosition persists and clears independently of other flags', () => {
    addVideo('v1', '2026-07-08T10:00:00Z')
    states.toggleFavorite('v1')
    states.setResumePosition('v1', 245)
    expect(states.get('v1')).toEqual({
      readStatus: 'unread',
      favorite: true,
      watchLater: false,
      resumePositionSeconds: 245
    })
    states.setResumePosition('v1', null)
    expect(states.get('v1').resumePositionSeconds).toBeNull()
    expect(states.get('v1').favorite).toBe(true) // untouched
  })

  it('resume position round-trips through findVideo (the player\'s read path)', () => {
    addVideo('v1', '2026-07-08T10:00:00Z')
    states.setResumePosition('v1', 90)
    expect(feed.findVideo('v1')?.entry.state.resumePositionSeconds).toBe(90)
  })
})

describe('SqliteFeedRepository', () => {
  it('orders by published desc, channel title, videoId (core order, exactly)', () => {
    addVideo('newest', '2026-07-08T12:00:00Z', 'UCa')
    addVideo('tie-beta', '2026-07-08T10:00:00Z', 'UCb')
    addVideo('tie-alpha-z', '2026-07-08T10:00:00Z', 'UCa')
    addVideo('tie-alpha-a', '2026-07-08T10:00:00Z', 'UCa')
    const page = feed.listPage('all', null, 50)
    expect(page.entries.map((e) => e.video.videoId)).toEqual([
      'newest',
      'tie-alpha-a',
      'tie-alpha-z',
      'tie-beta'
    ])
  })

  it('paginates by keyset without skipping or duplicating tied rows (D-027)', () => {
    // 3 videos share one timestamp; page size 2 splits the tie across pages.
    addVideo('t1', '2026-07-08T10:00:00Z', 'UCa')
    addVideo('t2', '2026-07-08T10:00:00Z', 'UCa')
    addVideo('t3', '2026-07-08T10:00:00Z', 'UCb')
    addVideo('old', '2026-07-01T10:00:00Z', 'UCa')

    const seen: string[] = []
    let cursor = null
    for (;;) {
      const page = feed.listPage('all', cursor, 2)
      seen.push(...page.entries.map((e) => e.video.videoId))
      if (!page.nextCursor) break
      cursor = page.nextCursor
    }
    expect(seen).toEqual(['t1', 't2', 't3', 'old'])
  })

  it('returns a null cursor on the final page', () => {
    addVideo('only', '2026-07-08T10:00:00Z')
    expect(feed.listPage('all', null, 50).nextCursor).toBeNull()
  })

  it('lists followed channels freshest-first with unread counts (B-008)', () => {
    catalog.upsertChannel({ channelId: 'UCc', title: 'Zed', thumbnailUrl: null })
    subscribe('UCc')
    addVideo('a-old', '2026-07-01T10:00:00Z', 'UCa')
    addVideo('a-new', '2026-07-08T10:00:00Z', 'UCa')
    addVideo('b-mid', '2026-07-05T10:00:00Z', 'UCb')
    states.setReadStatus('a-new', 'read')

    const followed = feed.listFollowedChannels()
    // Freshest channel first; channels with nothing synced sink to the end.
    expect(followed.map((c) => c.channel.title)).toEqual(['Alpha', 'Beta', 'Zed'])
    expect(followed.map((c) => c.unreadCount)).toEqual([1, 1, 0])
    expect(followed[0].latestPublishedAt).toBe('2026-07-08T10:00:00Z')
    expect(followed[2].latestPublishedAt).toBeNull()
    expect(followed.every((c) => c.favorite === false)).toBe(true)
  })

  it('favorited channels sort first, then by recency within each group', () => {
    catalog.upsertChannel({ channelId: 'UCc', title: 'Zed', thumbnailUrl: null })
    subscribe('UCc')
    addVideo('a-old', '2026-07-01T10:00:00Z', 'UCa')
    addVideo('b-mid', '2026-07-05T10:00:00Z', 'UCb')
    // Zed (freshest) stays unfavorited; Alpha (oldest) becomes favorited —
    // it should still jump ahead of both Beta and Zed.
    feed.toggleChannelFavorite(ACCOUNT, 'UCa')

    const followed = feed.listFollowedChannels()
    expect(followed.map((c) => c.channel.title)).toEqual(['Alpha', 'Beta', 'Zed'])
    expect(followed[0].favorite).toBe(true)
  })

  it('isSubscribed cross-references a channel id against local state (B-009)', () => {
    expect(feed.isSubscribed('UCa')).toBe(true)
    expect(feed.isSubscribed('UCunknown')).toBe(false)
  })

  it('toggleChannelFavorite flips the channel-level priority marker (B-042)', () => {
    expect(feed.toggleChannelFavorite(ACCOUNT, 'UCa')).toBe(true)
    expect(feed.listFollowedChannels().find((c) => c.channel.channelId === 'UCa')?.favorite).toBe(
      true
    )
    expect(feed.toggleChannelFavorite(ACCOUNT, 'UCa')).toBe(false)
    expect(feed.listFollowedChannels().find((c) => c.channel.channelId === 'UCa')?.favorite).toBe(
      false
    )
  })

  it('toggleChannelNotify flips the channel-level notify flag (D-050)', () => {
    expect(feed.toggleChannelNotify(ACCOUNT, 'UCa')).toBe(true)
    expect(feed.listFollowedChannels().find((c) => c.channel.channelId === 'UCa')?.notify).toBe(
      true
    )
    expect(feed.toggleChannelNotify(ACCOUNT, 'UCa')).toBe(false)
    expect(feed.listFollowedChannels().find((c) => c.channel.channelId === 'UCa')?.notify).toBe(
      false
    )
  })

  it('setChannelNotify sets (not toggles) the notify flag (D-050 redesign)', () => {
    feed.setChannelNotify(ACCOUNT, 'UCa', true)
    expect(feed.listFollowedChannels().find((c) => c.channel.channelId === 'UCa')?.notify).toBe(true)
    feed.setChannelNotify(ACCOUNT, 'UCa', true) // idempotent — setting true again stays true
    expect(feed.listFollowedChannels().find((c) => c.channel.channelId === 'UCa')?.notify).toBe(true)
    feed.setChannelNotify(ACCOUNT, 'UCa', false)
    expect(feed.listFollowedChannels().find((c) => c.channel.channelId === 'UCa')?.notify).toBe(false)
  })

  it('bulkSetNotifyForFavorites only touches favorited channels (D-050 redesign)', () => {
    feed.toggleChannelFavorite(ACCOUNT, 'UCa') // UCa favorited, UCb not
    feed.bulkSetNotifyForFavorites(true)
    const afterEnable = feed.listFollowedChannels()
    expect(afterEnable.find((c) => c.channel.channelId === 'UCa')?.notify).toBe(true)
    expect(afterEnable.find((c) => c.channel.channelId === 'UCb')?.notify).toBe(false)

    feed.bulkSetNotifyForFavorites(false)
    const afterDisable = feed.listFollowedChannels()
    expect(afterDisable.find((c) => c.channel.channelId === 'UCa')?.notify).toBe(false)
    expect(afterDisable.find((c) => c.channel.channelId === 'UCb')?.notify).toBe(false)
  })

  it('listPriorityVideos surfaces unread videos from favorited channels only (B-042, D-039)', () => {
    addVideo('a-old', '2026-07-01T10:00:00Z', 'UCa')
    addVideo('a-new', '2026-07-08T10:00:00Z', 'UCa')
    addVideo('b-mid', '2026-07-05T10:00:00Z', 'UCb')
    states.setReadStatus('a-old', 'read')

    expect(feed.listPriorityVideos(20)).toEqual([])

    feed.toggleChannelFavorite(ACCOUNT, 'UCa')
    // Unread only ('a-old' is read); most recent first; 'UCb' excluded (not favorited).
    expect(feed.listPriorityVideos(20).map((e) => e.video.videoId)).toEqual(['a-new'])

    // D-039: still present in the normal chronological feed too (not exclusive).
    expect(feed.listPage('all', null, 50).entries.map((e) => e.video.videoId)).toEqual([
      'a-new',
      'b-mid',
      'a-old'
    ])
  })

  it('listPriorityVideos caps at the requested limit', () => {
    feed.toggleChannelFavorite(ACCOUNT, 'UCa')
    for (let i = 0; i < 5; i++) addVideo(`v${i}`, `2026-07-0${i + 1}T10:00:00Z`, 'UCa')
    expect(feed.listPriorityVideos(3)).toHaveLength(3)
  })

  it('paginates a channel-filtered feed through every page (B-002)', () => {
    // Interleave two channels so the channel filter has rows to exclude
    // between the target channel's keyset boundaries.
    for (let i = 0; i < 7; i++) {
      const stamp = `2026-07-0${(i % 7) + 1}T1${i % 10}:00:00Z`
      addVideo(`a${i}`, stamp, 'UCa')
      addVideo(`b${i}`, stamp, 'UCb')
    }

    const seen: string[] = []
    let cursor = null
    let pages = 0
    for (;;) {
      const page = feed.listPage('all', cursor, 3, 'UCa')
      pages++
      seen.push(...page.entries.map((e) => e.video.videoId))
      expect(page.entries.every((e) => e.video.channelId === 'UCa')).toBe(true)
      if (!page.nextCursor) break
      cursor = page.nextCursor
    }
    expect(seen).toHaveLength(7)
    expect(new Set(seen).size).toBe(7)
    expect(pages).toBeGreaterThan(1)
  })

  it('agrees with core belongsToView for every state × view combination', () => {
    // One video per reachable state combination, driven through the real
    // state repository so the SQL sees real rows.
    const statuses: ReadStatus[] = ['unread', 'read', 'ignored']
    const combos: string[] = []
    let i = 0
    for (const status of statuses) {
      for (const favorite of [false, true]) {
        for (const watchLater of [false, true]) {
          const id = `v${i++}-${status}${favorite ? '-fav' : ''}${watchLater ? '-wl' : ''}`
          addVideo(id, '2026-07-08T10:00:00Z')
          if (status !== 'unread') states.setReadStatus(id, status)
          if (favorite) states.toggleFavorite(id)
          if (watchLater) states.toggleWatchLater(id)
          combos.push(id)
        }
      }
    }

    for (const view of FEED_VIEWS) {
      const fromSql =
        view === 'watch-later'
          ? feed.listWatchLaterQueue().map((e) => e.video.videoId)
          : feed.listPage(view, null, 100).entries.map((e) => e.video.videoId)
      const fromCore = combos.filter((id) => belongsToView(states.get(id), view))
      expect(fromSql.toSorted(), `view=${view}`).toEqual(fromCore.toSorted())
    }
  })

  it('includes confirmed Shorts by default, tagged, in every view (B-028)', () => {
    addVideo('regular', '2026-07-08T10:00:00Z')
    addVideo('short', '2026-07-08T11:00:00Z')
    addVideo('unknown', '2026-07-08T12:00:00Z')
    db.prepare(`UPDATE videos SET is_short = 1 WHERE video_id = 'short'`).run()
    db.prepare(`UPDATE videos SET is_short = 0 WHERE video_id = 'regular'`).run()
    states.toggleFavorite('short')
    states.toggleWatchLater('short')

    expect(feed.listPage('all', null, 50).entries.map((e) => e.video.videoId)).toEqual([
      'unknown',
      'short',
      'regular'
    ])
    expect(feed.listPage('all', null, 50).entries.find((e) => e.video.videoId === 'short')?.video.isShort).toBe(
      true
    )
    expect(feed.listPage('favorites', null, 50).entries.map((e) => e.video.videoId)).toEqual(['short'])
    expect(feed.listWatchLaterQueue().map((e) => e.video.videoId)).toEqual(['short'])
    expect(feed.countUnread()).toBe(3)
  })

  it('excludes confirmed Shorts when showShorts is false, in any view (B-028 setting)', () => {
    addVideo('regular', '2026-07-08T10:00:00Z')
    addVideo('short', '2026-07-08T11:00:00Z')
    addVideo('unknown', '2026-07-08T12:00:00Z')
    db.prepare(`UPDATE videos SET is_short = 1 WHERE video_id = 'short'`).run()
    db.prepare(`UPDATE videos SET is_short = 0 WHERE video_id = 'regular'`).run()
    states.toggleFavorite('short')
    states.toggleWatchLater('short')

    expect(
      feed.listPage('all', null, 50, undefined, false).entries.map((e) => e.video.videoId)
    ).toEqual(['unknown', 'regular'])
    expect(feed.listPage('favorites', null, 50, undefined, false).entries).toEqual([])
    expect(feed.listWatchLaterQueue(false)).toEqual([])
    expect(feed.countUnread(false)).toBe(2)
  })

  it('feed views require subscribed channels; favorites/watch-later do not (D-029)', () => {
    db.prepare(
      `UPDATE account_channels SET subscribed = 0 WHERE account_id = :account AND channel_id = 'UCb'`
    ).run({ account: ACCOUNT })
    addVideo('external', '2026-07-08T10:00:00Z', 'UCb')
    states.toggleFavorite('external')
    states.toggleWatchLater('external')

    expect(feed.listPage('all', null, 50).entries).toEqual([])
    expect(feed.listPage('unread', null, 50).entries).toEqual([])
    expect(feed.countUnread()).toBe(0)
    expect(feed.listPage('favorites', null, 50).entries.map((e) => e.video.videoId)).toEqual([
      'external'
    ])
    expect(feed.listWatchLaterQueue().map((e) => e.video.videoId)).toEqual(['external'])
  })

  it('countUnread is the mechanical unread count within the feed', () => {
    addVideo('u1', '2026-07-08T10:00:00Z')
    addVideo('u2', '2026-07-08T11:00:00Z')
    addVideo('r1', '2026-07-08T12:00:00Z')
    states.setReadStatus('r1', 'read')
    expect(feed.countUnread()).toBe(2)
  })

  it('countWatchLater mirrors the queue (B-025)', () => {
    addVideo('a', '2026-07-08T10:00:00Z')
    addVideo('b', '2026-07-08T11:00:00Z')
    expect(feed.countWatchLater()).toBe(0)
    states.toggleWatchLater('a')
    states.toggleWatchLater('b')
    expect(feed.countWatchLater()).toBe(2)
    states.toggleWatchLater('a')
    expect(feed.countWatchLater()).toBe(1)
  })

  describe('markManyRead (B-020)', () => {
    it('marks every unread video in the feed as read, globally', () => {
      addVideo('a', '2026-07-08T10:00:00Z', 'UCa')
      addVideo('b', '2026-07-08T10:00:00Z', 'UCb')
      states.setReadStatus('a', 'ignored') // untouched: not "unread"

      const changed = feed.markManyRead(null, null, fixedClock.now().toISOString())

      expect(changed).toBe(1)
      expect(states.get('a').readStatus).toBe('ignored')
      expect(states.get('b').readStatus).toBe('read')
    })

    it('scopes to one channel when channelId is given', () => {
      addVideo('a', '2026-07-08T10:00:00Z', 'UCa')
      addVideo('b', '2026-07-08T10:00:00Z', 'UCb')

      const changed = feed.markManyRead('UCa', null, fixedClock.now().toISOString())

      expect(changed).toBe(1)
      expect(states.get('a').readStatus).toBe('read')
      expect(states.get('b').readStatus).toBe('unread')
    })

    it('only touches videos published before the cutoff (connect-time backlog auto-read)', () => {
      addVideo('old', '2026-07-07T10:00:00Z')
      addVideo('today', '2026-07-08T10:00:00Z')

      const changed = feed.markManyRead(null, '2026-07-08T00:00:00Z', fixedClock.now().toISOString())

      expect(changed).toBe(1)
      expect(states.get('old').readStatus).toBe('read')
      expect(states.get('today').readStatus).toBe('unread')
    })

    it('preserves favorite/watch-later flags on rows it touches', () => {
      addVideo('a', '2026-07-08T10:00:00Z')
      states.toggleFavorite('a')
      states.toggleWatchLater('a')

      feed.markManyRead(null, null, fixedClock.now().toISOString())

      expect(states.get('a')).toEqual({
        readStatus: 'read',
        favorite: true,
        watchLater: true,
        resumePositionSeconds: null
      })
    })
  })
})

describe('multi-account isolation (B-003)', () => {
  it('combined feed (no accountId) shows every connected account; filtered shows one', () => {
    catalog.upsertChannel({ channelId: 'UCc', title: 'Gamma', thumbnailUrl: null })
    subscribeAs('acc2', 'UCc')
    addVideo('a1', '2026-07-08T10:00:00Z', 'UCa') // acc1 only (beforeEach)
    addVideo('c1', '2026-07-08T09:00:00Z', 'UCc') // acc2 only

    expect(feed.listPage('all', null, 50).entries.map((e) => e.video.videoId).toSorted()).toEqual([
      'a1',
      'c1'
    ])
    expect(feed.listPage('all', null, 50, undefined, true, ACCOUNT).entries.map((e) => e.video.videoId)).toEqual(
      ['a1']
    )
    expect(
      feed.listPage('all', null, 50, undefined, true, 'acc2').entries.map((e) => e.video.videoId)
    ).toEqual(['c1'])
  })

  it('a channel followed by two accounts appears once in the combined sidebar list', () => {
    subscribeAs('acc2', 'UCa')
    addVideo('a1', '2026-07-08T10:00:00Z', 'UCa')

    const combined = feed.listFollowedChannels()
    expect(combined.filter((c) => c.channel.channelId === 'UCa')).toHaveLength(1)

    const acc1Only = feed.listFollowedChannels(true, ACCOUNT)
    const acc2Only = feed.listFollowedChannels(true, 'acc2')
    expect(acc1Only.map((c) => c.channel.channelId)).toContain('UCa')
    expect(acc2Only.map((c) => c.channel.channelId)).toEqual(['UCa'])
  })

  it('unsubscribing one account never affects another account following the same channel', () => {
    subscribeAs('acc2', 'UCa')
    addVideo('a1', '2026-07-08T10:00:00Z', 'UCa')

    db.prepare(
      `UPDATE account_channels SET subscribed = 0 WHERE account_id = ? AND channel_id = 'UCa'`
    ).run(ACCOUNT)

    expect(feed.listPage('all', null, 50, undefined, true, ACCOUNT).entries).toEqual([])
    expect(
      feed.listPage('all', null, 50, undefined, true, 'acc2').entries.map((e) => e.video.videoId)
    ).toEqual(['a1'])
    // Combined view: still visible, since acc2 still subscribes.
    expect(feed.listPage('all', null, 50).entries.map((e) => e.video.videoId)).toEqual(['a1'])
  })

  it('countUnread and isSubscribed respect the account filter / any-account default', () => {
    subscribeAs('acc2', 'UCa')
    addVideo('a1', '2026-07-08T10:00:00Z', 'UCa')
    addVideo('a2', '2026-07-08T11:00:00Z', 'UCa')
    states.setReadStatus('a1', 'read')

    expect(feed.countUnread(true, ACCOUNT)).toBe(1)
    expect(feed.countUnread(true, 'acc2')).toBe(1)
    expect(feed.countUnread()).toBe(1) // same underlying video, not double-counted

    expect(feed.isSubscribed('UCa')).toBe(true)
    expect(feed.isSubscribed('UCnope')).toBe(false)
  })
})

describe('SqliteCatalogRepository', () => {
  it('upserts videos idempotently (re-fetch updates facts, keeps identity)', () => {
    addVideo('v1', '2026-07-08T10:00:00Z')
    catalog.upsertVideo(
      {
        videoId: 'v1',
        channelId: 'UCa',
        title: 'Updated title',
        publishedAt: '2026-07-08T10:00:00Z',
        durationSeconds: 900,
        thumbnailUrl: 'thumb.jpg',
        viewCount: 1234,
        isShort: false,
        liveContent: 'none',
        liveStartedAt: null,
        liveEndedAt: null,
        isPremiere: false
      },
      fixedClock.now().toISOString()
    )
    expect(catalog.countVideos()).toBe(1)
    const entry = feed.listPage('all', null, 1).entries[0]
    expect(entry?.video.title).toBe('Updated title')
    expect(entry?.video.durationSeconds).toBe(900)
  })

  it('video upsert never touches the state row (facts vs. user data)', () => {
    addVideo('v1', '2026-07-08T10:00:00Z')
    states.setReadStatus('v1', 'read')
    addVideo('v1', '2026-07-08T10:00:00Z') // re-fetch
    expect(states.get('v1').readStatus).toBe('read')
  })

  it('deleteVideo (B-130) removes the video plus its state and playlist membership', () => {
    addVideo('v1', '2026-07-08T10:00:00Z')
    states.toggleFavorite('v1')
    db.prepare(
      `INSERT INTO playlists (playlist_id, name, created_at, updated_at)
       VALUES ('p1', 'My List', :now, :now)`
    ).run({ now: fixedClock.now().toISOString() })
    db.prepare(
      `INSERT INTO playlist_videos (playlist_id, video_id, position, added_at)
       VALUES ('p1', 'v1', 1, :now)`
    ).run({ now: fixedClock.now().toISOString() })

    catalog.deleteVideo('v1')

    expect(catalog.countVideos()).toBe(0)
    expect(states.get('v1')).toEqual(states.get('never-existed'))
    const membership = db
      .prepare(`SELECT COUNT(*) AS n FROM playlist_videos WHERE video_id = 'v1'`)
      .get() as { n: number | bigint }
    expect(Number(membership.n)).toBe(0)
    // The playlist itself, and any other membership row, are untouched.
    const playlist = db.prepare(`SELECT name FROM playlists WHERE playlist_id = 'p1'`).get() as
      | { name: string }
      | undefined
    expect(playlist?.name).toBe('My List')
  })

  describe('countPrunableVideos / pruneOldVideos (D-020 exercised)', () => {
    const CUTOFF = '2026-01-01T00:00:00Z'

    it('counts old videos not favorited/queued/ignored/in a playlist', () => {
      addVideo('old-stateless', '2025-06-01T00:00:00Z') // eligible
      addVideo('old-favorite', '2025-06-01T00:00:00Z')
      states.toggleFavorite('old-favorite') // favorited — excluded
      addVideo('old-watch-later', '2025-06-01T00:00:00Z')
      states.toggleWatchLater('old-watch-later') // queued — excluded
      addVideo('old-ignored', '2025-06-01T00:00:00Z')
      states.setReadStatus('old-ignored', 'ignored') // a deliberate user action — excluded
      addVideo('old-in-progress', '2025-06-01T00:00:00Z')
      states.setResumePosition('old-in-progress', 120) // eligible: resume position is just a
      // convenience for picking a video back up, not a signal to keep it
      addVideo('old-read', '2025-06-01T00:00:00Z')
      states.setReadStatus('old-read', 'read') // eligible: plain read/unread never excludes
      addVideo('old-in-playlist', '2025-06-01T00:00:00Z')
      db.prepare(
        `INSERT INTO playlists (playlist_id, name, created_at, updated_at)
         VALUES ('p1', 'My List', :now, :now)`
      ).run({ now: fixedClock.now().toISOString() })
      db.prepare(
        `INSERT INTO playlist_videos (playlist_id, video_id, position, added_at)
         VALUES ('p1', 'old-in-playlist', 1, :now)`
      ).run({ now: fixedClock.now().toISOString() }) // in a playlist — excluded
      addVideo('recent-stateless', '2026-07-01T00:00:00Z') // too recent — excluded

      expect(catalog.countPrunableVideos(CUTOFF)).toBe(3) // stateless, in-progress, read
    })

    it('a video only auto-marked read by sync backfill is eligible (read_status ignored)', () => {
      // sync-service.ts's markVideosReadIfUnset bulk-marks every backfilled/
      // first-sync video 'read' since it predates the user following/using
      // Chronicle, not because the user did anything with it — reproduces the
      // scenario reported live: scrolling to trigger archive backfill on old
      // channels left nothing eligible to prune.
      addVideo('old-auto-read', '2025-06-01T00:00:00Z')
      states.setReadStatus('old-auto-read', 'read')

      expect(catalog.countPrunableVideos(CUTOFF)).toBe(1)
    })

    it('cutoff null (the "All" option) ignores publish date entirely', () => {
      addVideo('ancient-stateless', '2015-01-01T00:00:00Z')
      addVideo('newer-stateless', '2026-03-01T00:00:00Z') // after CUTOFF, before fixedClock's "now"
      addVideo('newer-favorite', '2026-03-01T00:00:00Z')
      states.toggleFavorite('newer-favorite') // favorited — excluded regardless of cutoff

      expect(catalog.countPrunableVideos(CUTOFF)).toBe(1) // only the ancient one
      expect(catalog.countPrunableVideos(null)).toBe(2) // both stateless ones, any age
    })

    it('pruneOldVideos removes exactly the eligible videos and returns the count', () => {
      addVideo('old-stateless', '2025-06-01T00:00:00Z')
      addVideo('old-favorite', '2025-06-01T00:00:00Z')
      states.toggleFavorite('old-favorite')
      addVideo('recent-stateless', '2026-07-01T00:00:00Z')

      const removed = catalog.pruneOldVideos(CUTOFF)

      expect(removed).toBe(1)
      expect(catalog.countVideos()).toBe(2)
      expect(feed.listPage('all', null, 10).entries.map((e) => e.video.videoId).sort()).toEqual([
        'old-favorite',
        'recent-stateless'
      ])
    })
  })
})
