import type { DatabaseSync, SQLInputValue } from 'node:sqlite'
import type {
  CatalogRepository,
  Clock,
  FeedCursor,
  FeedPage,
  FeedRepository,
  StateRepository
} from '../../core/ports'
import type { FeedEntry } from '../../core/feed'
import type { FeedView } from '../../core/views'
import {
  DEFAULT_VIDEO_STATE,
  ignore,
  markRead,
  markUnread,
  toggleFavorite,
  toggleWatchLater,
  unignore,
  type ReadStatus,
  type VideoState
} from '../../core/state'
import type { Channel, Video } from '../../core/video'

// Rows joined for the feed. COALESCEs encode "absent state row = default
// state" (local-data.md: video_state rows are created lazily).
const FEED_SELECT = `
  SELECT
    v.video_id          AS video_id,
    v.channel_id        AS channel_id,
    v.title             AS title,
    v.published_at      AS published_at,
    v.duration_seconds  AS duration_seconds,
    v.thumbnail_url     AS thumbnail_url,
    c.title             AS channel_title,
    COALESCE(s.read_status, 'unread') AS read_status,
    COALESCE(s.favorite, 0)           AS favorite,
    COALESCE(s.watch_later, 0)        AS watch_later
  FROM videos v
  JOIN channels c ON c.channel_id = v.channel_id
  LEFT JOIN video_state s ON s.video_id = v.video_id
`

// D-028: Shorts candidates are hidden only after confirmation (is_short = 1);
// NULL (unknown) and 0 (confirmed not) both stay visible.
const NOT_SHORT = `(v.is_short IS NULL OR v.is_short = 0)`

// Feed membership (feed.md): subscribed channels only. Favorites and Watch
// Later are NOT feed views — they also reach externally opened videos
// (D-029), so they skip the subscribed filter.
const VIEW_PREDICATES: Record<FeedView, string> = {
  all: `c.subscribed = 1 AND COALESCE(s.read_status, 'unread') <> 'ignored'`,
  unread: `c.subscribed = 1 AND COALESCE(s.read_status, 'unread') = 'unread'`,
  favorites: `COALESCE(s.favorite, 0) = 1`,
  'watch-later': `COALESCE(s.watch_later, 0) = 1`,
  ignored: `c.subscribed = 1 AND s.read_status = 'ignored'`
}

// Must mirror core compareFeedOrder exactly (published desc, channel title,
// videoId) — keyset pagination breaks if SQL and core disagree on ties.
const FEED_ORDER = `ORDER BY v.published_at DESC, c.title ASC, v.video_id ASC`

interface FeedRow {
  video_id: string
  channel_id: string
  title: string
  published_at: string
  duration_seconds: number | bigint | null
  thumbnail_url: string | null
  channel_title: string
  read_status: string
  favorite: number | bigint
  watch_later: number | bigint
}

function toEntry(row: FeedRow): FeedEntry {
  return {
    channelTitle: row.channel_title,
    state: {
      readStatus: row.read_status as ReadStatus,
      favorite: Number(row.favorite) === 1,
      watchLater: Number(row.watch_later) === 1
    },
    video: {
      videoId: row.video_id,
      channelId: row.channel_id,
      title: row.title,
      publishedAt: row.published_at,
      durationSeconds: row.duration_seconds === null ? null : Number(row.duration_seconds),
      thumbnailUrl: row.thumbnail_url
    }
  }
}

export class SqliteFeedRepository implements FeedRepository {
  constructor(private readonly db: DatabaseSync) {}

  listPage(view: FeedView, cursor: FeedCursor | null, limit: number, channelId?: string): FeedPage {
    const afterCursor = cursor
      ? `AND (
           v.published_at < :pub
           OR (v.published_at = :pub AND (c.title > :ct
           OR (c.title = :ct AND v.video_id > :vid)))
         )`
      : ''
    const byChannel = channelId !== undefined ? `AND v.channel_id = :channelId` : ''
    const params: Record<string, SQLInputValue> = {
      limit,
      ...(cursor ? { pub: cursor.publishedAt, ct: cursor.channelTitle, vid: cursor.videoId } : {}),
      ...(channelId !== undefined ? { channelId } : {})
    }

    const rows = this.db
      .prepare(
        `${FEED_SELECT}
         WHERE ${VIEW_PREDICATES[view]} AND ${NOT_SHORT} ${byChannel} ${afterCursor}
         ${FEED_ORDER}
         LIMIT :limit`
      )
      .all(params) as unknown as FeedRow[]

    const entries = rows.map(toEntry)
    const last = entries.at(-1)
    return {
      entries,
      nextCursor:
        entries.length < limit || !last
          ? null
          : {
              publishedAt: last.video.publishedAt,
              channelTitle: last.channelTitle,
              videoId: last.video.videoId
            }
    }
  }

  listWatchLaterQueue(): FeedEntry[] {
    const rows = this.db
      .prepare(
        `${FEED_SELECT}
         WHERE COALESCE(s.watch_later, 0) = 1 AND ${NOT_SHORT}
         ORDER BY s.watch_later_pos ASC`
      )
      .all() as unknown as FeedRow[]
    return rows.map(toEntry)
  }

  countUnread(): number {
    return this.unreadCountWhere('')
  }

  countUnreadSince(publishedAtIso: string): number {
    return this.unreadCountWhere(`AND v.published_at >= :since`, { since: publishedAtIso })
  }

  private unreadCountWhere(extra: string, params: Record<string, string> = {}): number {
    const row = this.db
      .prepare(
        `SELECT COUNT(*) AS n
         FROM videos v
         JOIN channels c ON c.channel_id = v.channel_id
         LEFT JOIN video_state s ON s.video_id = v.video_id
         WHERE ${VIEW_PREDICATES.unread} AND ${NOT_SHORT} ${extra}`
      )
      .get(params) as { n: number | bigint }
    return Number(row.n)
  }

  listFollowedChannels(): Channel[] {
    const rows = this.db
      .prepare(
        `SELECT channel_id, title, thumbnail_url FROM channels
         WHERE subscribed = 1
         ORDER BY title COLLATE NOCASE ASC`
      )
      .all() as unknown as { channel_id: string; title: string; thumbnail_url: string | null }[]
    return rows.map((row) => ({
      channelId: row.channel_id,
      title: row.title,
      thumbnailUrl: row.thumbnail_url
    }))
  }
}

export class SqliteStateRepository implements StateRepository {
  constructor(
    private readonly db: DatabaseSync,
    private readonly clock: Clock
  ) {}

  get(videoId: string): VideoState {
    const row = this.db
      .prepare(`SELECT read_status, favorite, watch_later FROM video_state WHERE video_id = ?`)
      .get(videoId) as
      | { read_status: string; favorite: number | bigint; watch_later: number | bigint }
      | undefined
    if (!row) return DEFAULT_VIDEO_STATE
    return {
      readStatus: row.read_status as ReadStatus,
      favorite: Number(row.favorite) === 1,
      watchLater: Number(row.watch_later) === 1
    }
  }

  setReadStatus(videoId: string, status: ReadStatus): VideoState {
    return this.apply(videoId, (state) => {
      switch (status) {
        case 'read':
          return markRead(state)
        case 'unread':
          return state.readStatus === 'ignored' ? unignore(state) : markUnread(state)
        case 'ignored':
          return ignore(state)
      }
    })
  }

  toggleFavorite(videoId: string): VideoState {
    return this.apply(videoId, toggleFavorite)
  }

  toggleWatchLater(videoId: string): VideoState {
    return this.apply(videoId, toggleWatchLater)
  }

  // Reads current state, applies a core transition, persists the result.
  // State rows are precious user data — only these transitions touch them.
  private apply(videoId: string, transition: (state: VideoState) => VideoState): VideoState {
    const current = this.get(videoId)
    const next = transition(current)
    const now = this.clock.now().toISOString()

    // Queue position: assigned at the end on entry, cleared on exit
    // (feed.md §Watch Later ordering — default order = insertion order).
    let position: number | null = null
    if (next.watchLater) {
      position = current.watchLater ? this.currentPosition(videoId) : this.nextQueuePosition()
    }

    this.db
      .prepare(
        `INSERT INTO video_state
           (video_id, read_status, favorite, watch_later, watch_later_pos, status_changed_at, updated_at)
         VALUES (:id, :status, :fav, :wl, :pos, :now, :now)
         ON CONFLICT(video_id) DO UPDATE SET
           read_status = :status,
           favorite = :fav,
           watch_later = :wl,
           watch_later_pos = :pos,
           status_changed_at = CASE
             WHEN read_status <> :status THEN :now ELSE status_changed_at END,
           updated_at = :now`
      )
      .run({
        id: videoId,
        status: next.readStatus,
        fav: next.favorite ? 1 : 0,
        wl: next.watchLater ? 1 : 0,
        pos: position,
        now
      })
    return next
  }

  private currentPosition(videoId: string): number | null {
    const row = this.db
      .prepare(`SELECT watch_later_pos AS pos FROM video_state WHERE video_id = ?`)
      .get(videoId) as { pos: number | bigint | null } | undefined
    return row?.pos == null ? null : Number(row.pos)
  }

  private nextQueuePosition(): number {
    const row = this.db
      .prepare(`SELECT COALESCE(MAX(watch_later_pos), 0) AS max_pos FROM video_state`)
      .get() as { max_pos: number | bigint }
    return Number(row.max_pos) + 1
  }
}

export class SqliteCatalogRepository implements CatalogRepository {
  constructor(
    private readonly db: DatabaseSync,
    private readonly clock: Clock
  ) {}

  upsertChannel(channel: Channel): void {
    this.db
      .prepare(
        `INSERT INTO channels (channel_id, title, thumbnail_url, added_at)
         VALUES (:id, :title, :thumb, :addedAt)
         ON CONFLICT(channel_id) DO UPDATE SET title = :title, thumbnail_url = :thumb`
      )
      .run({
        id: channel.channelId,
        title: channel.title,
        thumb: channel.thumbnailUrl,
        addedAt: this.clock.now().toISOString()
      })
  }

  upsertVideo(video: Video, fetchedAt: string): void {
    this.db
      .prepare(
        `INSERT INTO videos
           (video_id, channel_id, title, published_at, duration_seconds, thumbnail_url, fetched_at)
         VALUES (:id, :channelId, :title, :publishedAt, :duration, :thumb, :fetchedAt)
         ON CONFLICT(video_id) DO UPDATE SET
           title = :title,
           published_at = :publishedAt,
           duration_seconds = :duration,
           thumbnail_url = :thumb`
      )
      .run({
        id: video.videoId,
        channelId: video.channelId,
        title: video.title,
        publishedAt: video.publishedAt,
        duration: video.durationSeconds,
        thumb: video.thumbnailUrl,
        fetchedAt
      })
  }

  countVideos(): number {
    const row = this.db.prepare(`SELECT COUNT(*) AS n FROM videos`).get() as {
      n: number | bigint
    }
    return Number(row.n)
  }
}
