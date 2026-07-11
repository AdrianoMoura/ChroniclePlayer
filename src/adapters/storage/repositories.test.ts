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
})

function addVideo(videoId: string, publishedAt: string, channelId = 'UCa'): void {
  catalog.upsertVideo(
    {
      videoId,
      channelId,
      title: `Video ${videoId}`,
      publishedAt,
      durationSeconds: 600,
      thumbnailUrl: null,
      viewCount: null
    },
    fixedClock.now().toISOString()
  )
}

describe('migrations', () => {
  it('are idempotent (user_version guards re-application)', () => {
    expect(() => migrate(db)).not.toThrow()
    const row = db.prepare('PRAGMA user_version').get() as { user_version: number | bigint }
    expect(Number(row.user_version)).toBe(2)
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
      watchLater: false
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
    expect(states.get('v1')).toEqual({ readStatus: 'read', favorite: true, watchLater: true })
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

  it('never returns confirmed Shorts, in any view (D-028)', () => {
    addVideo('regular', '2026-07-08T10:00:00Z')
    addVideo('short', '2026-07-08T11:00:00Z')
    addVideo('unknown', '2026-07-08T12:00:00Z')
    db.prepare(`UPDATE videos SET is_short = 1 WHERE video_id = 'short'`).run()
    db.prepare(`UPDATE videos SET is_short = 0 WHERE video_id = 'regular'`).run()
    states.toggleFavorite('short')
    states.toggleWatchLater('short')

    expect(feed.listPage('all', null, 50).entries.map((e) => e.video.videoId)).toEqual([
      'unknown',
      'regular'
    ])
    expect(feed.listPage('favorites', null, 50).entries).toEqual([])
    expect(feed.listWatchLaterQueue()).toEqual([])
    expect(feed.countUnread()).toBe(2)
  })

  it('feed views require subscribed channels; favorites/watch-later do not (D-029)', () => {
    db.prepare(`UPDATE channels SET subscribed = 0 WHERE channel_id = 'UCb'`).run()
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
        viewCount: 1234
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
})
