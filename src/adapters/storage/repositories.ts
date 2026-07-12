import type { DatabaseSync, SQLInputValue } from 'node:sqlite'
import type {
  CatalogRepository,
  Clock,
  FeedCursor,
  FeedPage,
  FeedRepository,
  FollowedChannel,
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
    v.view_count        AS view_count,
    v.is_short           AS is_short,
    c.title             AS channel_title,
    COALESCE(s.read_status, 'unread') AS read_status,
    COALESCE(s.favorite, 0)           AS favorite,
    COALESCE(s.watch_later, 0)        AS watch_later
  FROM videos v
  JOIN channels c ON c.channel_id = v.channel_id
  LEFT JOIN video_state s ON s.video_id = v.video_id
`

// B-028: Shorts are shown by default, tagged with a badge — this filter only
// applies when the user's "Show Shorts" setting is off. Candidates are
// excluded only after confirmation (is_short = 1); NULL (unknown) and 0
// (confirmed not) both stay visible either way.
const NOT_SHORT = `(v.is_short IS NULL OR v.is_short = 0)`

function shortsFilter(showShorts: boolean): string {
  return showShorts ? '' : `AND ${NOT_SHORT}`
}

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
  view_count: number | bigint | null
  is_short: number | bigint | null
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
      thumbnailUrl: row.thumbnail_url,
      viewCount: row.view_count === null ? null : Number(row.view_count),
      isShort: Number(row.is_short) === 1
    }
  }
}

export class SqliteFeedRepository implements FeedRepository {
  constructor(private readonly db: DatabaseSync) {}

  listPage(
    view: FeedView,
    cursor: FeedCursor | null,
    limit: number,
    channelId?: string,
    showShorts = true
  ): FeedPage {
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
         WHERE ${VIEW_PREDICATES[view]} ${shortsFilter(showShorts)} ${byChannel} ${afterCursor}
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

  listWatchLaterQueue(showShorts = true): FeedEntry[] {
    const rows = this.db
      .prepare(
        `${FEED_SELECT}
         WHERE COALESCE(s.watch_later, 0) = 1 ${shortsFilter(showShorts)}
         ORDER BY s.watch_later_pos ASC`
      )
      .all() as unknown as FeedRow[]
    return rows.map(toEntry)
  }

  countWatchLater(showShorts = true): number {
    const row = this.db
      .prepare(
        `SELECT COUNT(*) AS n
         FROM videos v
         LEFT JOIN video_state s ON s.video_id = v.video_id
         WHERE COALESCE(s.watch_later, 0) = 1 ${shortsFilter(showShorts)}`
      )
      .get() as { n: number | bigint }
    return Number(row.n)
  }

  countUnread(showShorts = true): number {
    return this.unreadCountWhere('', {}, showShorts)
  }

  countUnreadSince(publishedAtIso: string, showShorts = true): number {
    return this.unreadCountWhere(`AND v.published_at >= :since`, { since: publishedAtIso }, showShorts)
  }

  private unreadCountWhere(
    extra: string,
    params: Record<string, string> = {},
    showShorts = true
  ): number {
    const row = this.db
      .prepare(
        `SELECT COUNT(*) AS n
         FROM videos v
         JOIN channels c ON c.channel_id = v.channel_id
         LEFT JOIN video_state s ON s.video_id = v.video_id
         WHERE ${VIEW_PREDICATES.unread} ${shortsFilter(showShorts)} ${extra}`
      )
      .get(params) as { n: number | bigint }
    return Number(row.n)
  }

  markManyRead(channelId: string | null, beforeIso: string | null, now: string): number {
    const result = this.db
      .prepare(
        `INSERT INTO video_state
           (video_id, read_status, favorite, watch_later, watch_later_pos, status_changed_at, updated_at)
         SELECT v.video_id, 'read', 0, 0, NULL, :now, :now
         FROM videos v
         JOIN channels c ON c.channel_id = v.channel_id
         LEFT JOIN video_state s ON s.video_id = v.video_id
         WHERE c.subscribed = 1
           AND COALESCE(s.read_status, 'unread') = 'unread'
           AND (:channelId IS NULL OR v.channel_id = :channelId)
           AND (:before IS NULL OR v.published_at < :before)
         ON CONFLICT(video_id) DO UPDATE SET
           read_status = 'read',
           status_changed_at = :now,
           updated_at = :now`
      )
      .run({ now, channelId, before: beforeIso })
    return Number(result.changes)
  }

  findVideo(videoId: string): { entry: FeedEntry; description: string | null } | null {
    const row = this.db
      .prepare(
        `${FEED_SELECT.replace('FROM videos v', ', v.description AS description FROM videos v')}
         WHERE v.video_id = ?`
      )
      .get(videoId) as unknown as (FeedRow & { description: string | null }) | undefined
    if (row === undefined) return null
    return { entry: toEntry(row), description: row.description }
  }

  listFollowedChannels(showShorts = true): FollowedChannel[] {
    // Freshest channel first (B-008); channels with nothing synced sink to
    // the bottom alphabetically. Counts mirror the unread view predicate.
    const filter = shortsFilter(showShorts)
    const rows = this.db
      .prepare(
        `SELECT
           c.channel_id,
           c.title,
           c.thumbnail_url,
           c.favorite,
           (SELECT MAX(v.published_at) FROM videos v
             WHERE v.channel_id = c.channel_id ${filter}) AS latest_published_at,
           (SELECT COUNT(*) FROM videos v
             LEFT JOIN video_state s ON s.video_id = v.video_id
             WHERE v.channel_id = c.channel_id ${filter}
               AND COALESCE(s.read_status, 'unread') = 'unread') AS unread_count
         FROM channels c
         WHERE c.subscribed = 1
         ORDER BY latest_published_at IS NULL, latest_published_at DESC,
                  c.title COLLATE NOCASE ASC`
      )
      .all() as unknown as {
      channel_id: string
      title: string
      thumbnail_url: string | null
      favorite: number | bigint
      latest_published_at: string | null
      unread_count: number | bigint
    }[]
    return rows.map((row) => ({
      channel: {
        channelId: row.channel_id,
        title: row.title,
        thumbnailUrl: row.thumbnail_url
      },
      latestPublishedAt: row.latest_published_at,
      unreadCount: Number(row.unread_count),
      favorite: Number(row.favorite) === 1
    }))
  }

  // B-042: returns the new favorite state.
  toggleChannelFavorite(channelId: string): boolean {
    const row = this.db
      .prepare(`SELECT favorite FROM channels WHERE channel_id = ?`)
      .get(channelId) as { favorite: number | bigint } | undefined
    const next = row && Number(row.favorite) === 1 ? 0 : 1
    this.db.prepare(`UPDATE channels SET favorite = ? WHERE channel_id = ?`).run(next, channelId)
    return next === 1
  }

  // B-009: cross-references search-result channels against local state so
  // the UI can show "Subscribed" instead of a live Subscribe button.
  isSubscribed(channelId: string): boolean {
    const row = this.db
      .prepare(`SELECT 1 AS present FROM channels WHERE channel_id = ? AND subscribed = 1`)
      .get(channelId) as { present: number } | undefined
    return row !== undefined
  }

  // B-042: unread videos from favorited channels, most recent first, capped.
  // D-039: these also stay in their normal chronological bucket — this is a
  // separate, additive list, not a filter that removes them from elsewhere.
  listPriorityVideos(limit: number, showShorts = true): FeedEntry[] {
    const rows = this.db
      .prepare(
        `${FEED_SELECT}
         WHERE c.subscribed = 1 AND c.favorite = 1
           AND COALESCE(s.read_status, 'unread') = 'unread' ${shortsFilter(showShorts)}
         ${FEED_ORDER}
         LIMIT :limit`
      )
      .all({ limit }) as unknown as FeedRow[]
    return rows.map(toEntry)
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
