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
  setResumePosition,
  toggleFavorite,
  toggleWatchLater,
  unignore,
  type ReadStatus,
  type VideoState
} from '../../core/state'
import type { Channel, Video } from '../../core/video'

// Rows joined for the feed. COALESCEs encode "absent state row = default
// state" (local-data.md: video_state rows are created lazily). Exported so
// playlist-repository.ts (a user-ordered queue over the same videos/state
// tables, same shape as the Watch Later queue below) can reuse the join
// instead of duplicating it.
export const FEED_SELECT = `
  SELECT
    v.video_id          AS video_id,
    v.channel_id        AS channel_id,
    v.title             AS title,
    v.published_at      AS published_at,
    v.duration_seconds  AS duration_seconds,
    v.thumbnail_url     AS thumbnail_url,
    v.view_count        AS view_count,
    v.is_short           AS is_short,
    v.live_content       AS live_content,
    v.is_premiere        AS is_premiere,
    v.live_started_at    AS live_started_at,
    v.live_ended_at      AS live_ended_at,
    c.title             AS channel_title,
    COALESCE(s.read_status, 'unread') AS read_status,
    COALESCE(s.favorite, 0)           AS favorite,
    COALESCE(s.watch_later, 0)        AS watch_later,
    s.resume_position_seconds         AS resume_position_seconds
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

// B-003: subscribed/favorite live per (account, channel) in account_channels
// — more than one local account can follow the same channel. An EXISTS
// subquery (not a JOIN) avoids duplicating a video row per subscribing
// account; accountId narrows to one account, undefined means any connected
// account (the combined-feed default).
function membershipExists(column: 'subscribed' | 'favorite', accountId?: string): string {
  return `EXISTS (
    SELECT 1 FROM account_channels ac
    WHERE ac.channel_id = c.channel_id AND ac.${column} = 1
    ${accountId !== undefined ? 'AND ac.account_id = :accountId' : ''}
  )`
}

// A favorited-but-unsubscribed channel (favorite outlives unsubscribe, D-039)
// must not surface in the priority section — requires both flags on the
// same row.
function favoritedAndSubscribedExists(accountId?: string): string {
  return `EXISTS (
    SELECT 1 FROM account_channels ac
    WHERE ac.channel_id = c.channel_id AND ac.favorite = 1 AND ac.subscribed = 1
    ${accountId !== undefined ? 'AND ac.account_id = :accountId' : ''}
  )`
}

// Feed membership (feed.md): subscribed channels only. Favorites and Watch
// Later are NOT feed views — they also reach externally opened videos
// (D-029), so they skip the subscribed filter.
function viewPredicate(view: FeedView, accountId?: string): string {
  const subscribed = membershipExists('subscribed', accountId)
  switch (view) {
    case 'all':
      return `${subscribed} AND COALESCE(s.read_status, 'unread') <> 'ignored'`
    case 'unread':
      return `${subscribed} AND COALESCE(s.read_status, 'unread') = 'unread'`
    case 'favorites':
      return `COALESCE(s.favorite, 0) = 1`
    case 'watch-later':
      return `COALESCE(s.watch_later, 0) = 1`
    case 'ignored':
      return `${subscribed} AND s.read_status = 'ignored'`
  }
}

// Keyset pagination (D-027) fetch order — plain publishedAt, not core's
// effectiveDate-based compareFeedOrder (D-053): a keyset cursor can't be
// built on a value like "now" that changes between calls. FeedService.getSlice
// re-sorts each fetched page by effectiveDate for display without changing
// which rows a page contains.
const FEED_ORDER = `ORDER BY v.published_at DESC, c.title ASC, v.video_id ASC`

export interface FeedRow {
  video_id: string
  channel_id: string
  title: string
  published_at: string
  duration_seconds: number | bigint | null
  thumbnail_url: string | null
  view_count: number | bigint | null
  is_short: number | bigint | null
  live_content: string | null
  is_premiere: number | bigint
  live_started_at: string | null
  live_ended_at: string | null
  channel_title: string
  read_status: string
  favorite: number | bigint
  watch_later: number | bigint
  resume_position_seconds: number | bigint | null
}

export function toEntry(row: FeedRow): FeedEntry {
  return {
    channelTitle: row.channel_title,
    state: {
      readStatus: row.read_status as ReadStatus,
      favorite: Number(row.favorite) === 1,
      watchLater: Number(row.watch_later) === 1,
      resumePositionSeconds:
        row.resume_position_seconds === null ? null : Number(row.resume_position_seconds)
    },
    video: {
      videoId: row.video_id,
      channelId: row.channel_id,
      title: row.title,
      publishedAt: row.published_at,
      durationSeconds: row.duration_seconds === null ? null : Number(row.duration_seconds),
      thumbnailUrl: row.thumbnail_url,
      viewCount: row.view_count === null ? null : Number(row.view_count),
      isShort: Number(row.is_short) === 1,
      liveContent: (row.live_content ?? 'none') as 'none' | 'live' | 'upcoming',
      isPremiere: Number(row.is_premiere) === 1,
      liveStartedAt: row.live_started_at,
      liveEndedAt: row.live_ended_at
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
    showShorts = true,
    accountId?: string
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
      ...(channelId !== undefined ? { channelId } : {}),
      ...(accountId !== undefined ? { accountId } : {})
    }

    const rows = this.db
      .prepare(
        `${FEED_SELECT}
         WHERE ${viewPredicate(view, accountId)} ${shortsFilter(showShorts)} ${byChannel} ${afterCursor}
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

  countUnread(showShorts = true, accountId?: string): number {
    return this.unreadCountWhere('', {}, showShorts, accountId)
  }

  countUnreadSince(publishedAtIso: string, showShorts = true, accountId?: string): number {
    return this.unreadCountWhere(
      `AND v.published_at >= :since`,
      { since: publishedAtIso },
      showShorts,
      accountId
    )
  }

  private unreadCountWhere(
    extra: string,
    params: Record<string, SQLInputValue> = {},
    showShorts = true,
    accountId?: string
  ): number {
    const row = this.db
      .prepare(
        `SELECT COUNT(*) AS n
         FROM videos v
         JOIN channels c ON c.channel_id = v.channel_id
         LEFT JOIN video_state s ON s.video_id = v.video_id
         WHERE ${viewPredicate('unread', accountId)} ${shortsFilter(showShorts)} ${extra}`
      )
      .get({ ...params, ...(accountId !== undefined ? { accountId } : {}) }) as { n: number | bigint }
    return Number(row.n)
  }

  markManyRead(
    channelId: string | null,
    beforeIso: string | null,
    now: string,
    accountId?: string
  ): number {
    const result = this.db
      .prepare(
        `INSERT INTO video_state
           (video_id, read_status, favorite, watch_later, watch_later_pos, status_changed_at, updated_at)
         SELECT v.video_id, 'read', 0, 0, NULL, :now, :now
         FROM videos v
         JOIN channels c ON c.channel_id = v.channel_id
         LEFT JOIN video_state s ON s.video_id = v.video_id
         WHERE ${membershipExists('subscribed', accountId)}
           AND COALESCE(s.read_status, 'unread') = 'unread'
           AND (:channelId IS NULL OR v.channel_id = :channelId)
           AND (:before IS NULL OR v.published_at < :before)
         ON CONFLICT(video_id) DO UPDATE SET
           read_status = 'read',
           status_changed_at = :now,
           updated_at = :now`
      )
      .run({ now, channelId, before: beforeIso, ...(accountId !== undefined ? { accountId } : {}) })
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

  // accountId (B-003) narrows to one account; unfiltered shows every channel
  // followed by any connected account, deduped (favorite = true if any
  // account favorites it — same OR-across-accounts semantics as membership).
  listFollowedChannels(showShorts = true, accountId?: string): FollowedChannel[] {
    // Favorited channels first, then freshest channel first (B-008); channels
    // with nothing synced sink to the bottom alphabetically. Counts mirror
    // the unread view predicate.
    const filter = shortsFilter(showShorts)
    const rows = this.db
      .prepare(
        `SELECT
           c.channel_id,
           c.title,
           c.thumbnail_url,
           MAX(ac.favorite) AS favorite,
           MAX(ac.notify) AS notify,
           (SELECT MAX(v.published_at) FROM videos v
             WHERE v.channel_id = c.channel_id ${filter}) AS latest_published_at,
           (SELECT COUNT(*) FROM videos v
             LEFT JOIN video_state s ON s.video_id = v.video_id
             WHERE v.channel_id = c.channel_id ${filter}
               AND COALESCE(s.read_status, 'unread') = 'unread') AS unread_count
         FROM channels c
         JOIN account_channels ac ON ac.channel_id = c.channel_id AND ac.subscribed = 1
           ${accountId !== undefined ? 'AND ac.account_id = :accountId' : ''}
         GROUP BY c.channel_id, c.title, c.thumbnail_url
         ORDER BY favorite DESC, latest_published_at IS NULL, latest_published_at DESC,
                  c.title COLLATE NOCASE ASC`
      )
      .all(accountId !== undefined ? { accountId } : {}) as unknown as {
      channel_id: string
      title: string
      thumbnail_url: string | null
      favorite: number | bigint
      notify: number | bigint
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
      favorite: Number(row.favorite) === 1,
      notify: Number(row.notify) === 1
    }))
  }

  // B-042: returns the new favorite state. accountId (B-003) scopes which
  // account's relationship to the channel gets toggled.
  toggleChannelFavorite(accountId: string, channelId: string): boolean {
    const row = this.db
      .prepare(`SELECT favorite FROM account_channels WHERE account_id = ? AND channel_id = ?`)
      .get(accountId, channelId) as { favorite: number | bigint } | undefined
    const next = row && Number(row.favorite) === 1 ? 0 : 1
    this.db
      .prepare(`UPDATE account_channels SET favorite = ? WHERE account_id = ? AND channel_id = ?`)
      .run(next, accountId, channelId)
    return next === 1
  }

  // D-050: returns the new notify state (the "Custom" notification-scope
  // membership toggle) — same shape as toggleChannelFavorite above.
  toggleChannelNotify(accountId: string, channelId: string): boolean {
    const row = this.db
      .prepare(`SELECT notify FROM account_channels WHERE account_id = ? AND channel_id = ?`)
      .get(accountId, channelId) as { notify: number | bigint } | undefined
    const next = row && Number(row.notify) === 1 ? 0 : 1
    this.db
      .prepare(`UPDATE account_channels SET notify = ? WHERE account_id = ? AND channel_id = ?`)
      .run(next, accountId, channelId)
    return next === 1
  }

  // D-050: direct set (not toggle) — syncs the notify flag to a channel's
  // favorite state when autoNotifyFavorites is on.
  setChannelNotify(accountId: string, channelId: string, notify: boolean): void {
    this.db
      .prepare(`UPDATE account_channels SET notify = ? WHERE account_id = ? AND channel_id = ?`)
      .run(notify ? 1 : 0, accountId, channelId)
  }

  // D-050: bulk-applies the notify flag to every row (any account) currently
  // marked favorite, for the "auto-enable on favorite" setting.
  bulkSetNotifyForFavorites(enable: boolean): void {
    this.db.prepare(`UPDATE account_channels SET notify = ? WHERE favorite = 1`).run(enable ? 1 : 0)
  }

  // B-009: cross-references search-result channels against local state so
  // the UI can show "Subscribed" instead of a live Subscribe button —
  // subscribed by any connected account (B-003).
  isSubscribed(channelId: string): boolean {
    const row = this.db
      .prepare(`SELECT 1 AS present FROM account_channels WHERE channel_id = ? AND subscribed = 1`)
      .get(channelId) as { present: number } | undefined
    return row !== undefined
  }

  // B-042: unread videos from favorited channels, most recent first, capped.
  // D-039: these also stay in their normal chronological bucket — this is a
  // separate, additive list, not a filter that removes them from elsewhere.
  // accountId (B-003) narrows to one account's favorites; unfiltered is any
  // connected account's favorites.
  listPriorityVideos(limit: number, showShorts = true, accountId?: string): FeedEntry[] {
    const rows = this.db
      .prepare(
        `${FEED_SELECT}
         WHERE ${favoritedAndSubscribedExists(accountId)}
           AND COALESCE(s.read_status, 'unread') = 'unread' ${shortsFilter(showShorts)}
         ${FEED_ORDER}
         LIMIT :limit`
      )
      .all({ limit, ...(accountId !== undefined ? { accountId } : {}) }) as unknown as FeedRow[]
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
      .prepare(
        `SELECT read_status, favorite, watch_later, resume_position_seconds
         FROM video_state WHERE video_id = ?`
      )
      .get(videoId) as
      | {
          read_status: string
          favorite: number | bigint
          watch_later: number | bigint
          resume_position_seconds: number | bigint | null
        }
      | undefined
    if (!row) return DEFAULT_VIDEO_STATE
    return {
      readStatus: row.read_status as ReadStatus,
      favorite: Number(row.favorite) === 1,
      watchLater: Number(row.watch_later) === 1,
      resumePositionSeconds:
        row.resume_position_seconds === null ? null : Number(row.resume_position_seconds)
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

  setResumePosition(videoId: string, seconds: number | null): VideoState {
    return this.apply(videoId, (state) => setResumePosition(state, seconds))
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
           (video_id, read_status, favorite, watch_later, watch_later_pos,
            resume_position_seconds, status_changed_at, updated_at)
         VALUES (:id, :status, :fav, :wl, :pos, :resume, :now, :now)
         ON CONFLICT(video_id) DO UPDATE SET
           read_status = :status,
           favorite = :fav,
           watch_later = :wl,
           watch_later_pos = :pos,
           resume_position_seconds = :resume,
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
        resume: next.resumePositionSeconds,
        now
      })
    return next
  }

  // Drag-and-drop reorder from the Watch Later view. videoIds is the full
  // queue in its new order; only rows still watch_later=1 are touched, so
  // a ended-drag race against a manual untoggle can't resurrect the flag.
  reorderWatchLater(videoIds: readonly string[]): void {
    const now = this.clock.now().toISOString()
    const stmt = this.db.prepare(
      `UPDATE video_state SET watch_later_pos = :pos, updated_at = :now
       WHERE video_id = :id AND watch_later = 1`
    )
    this.db.exec('BEGIN')
    try {
      videoIds.forEach((id, index) => stmt.run({ id, pos: index + 1, now }))
      this.db.exec('COMMIT')
    } catch (cause) {
      this.db.exec('ROLLBACK')
      throw cause
    }
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

  // B-130: no ON DELETE CASCADE from video_state/playlist_videos onto videos
  // (local-data.md), so each reference is dropped explicitly, in one
  // transaction, before the video row itself.
  deleteVideo(videoId: string): void {
    this.db.exec('BEGIN')
    try {
      this.db.prepare(`DELETE FROM playlist_videos WHERE video_id = ?`).run(videoId)
      this.db.prepare(`DELETE FROM video_state WHERE video_id = ?`).run(videoId)
      this.db.prepare(`DELETE FROM videos WHERE video_id = ?`).run(videoId)
      this.db.exec('COMMIT')
    } catch (cause) {
      this.db.exec('ROLLBACK')
      throw cause
    }
  }

  private static readonly PRUNABLE_WHERE = `
    published_at < :cutoff
    AND NOT EXISTS (SELECT 1 FROM video_state s WHERE s.video_id = videos.video_id)
    AND NOT EXISTS (SELECT 1 FROM playlist_videos p WHERE p.video_id = videos.video_id)
  `

  countPrunableVideos(cutoffIso: string): number {
    const row = this.db
      .prepare(`SELECT COUNT(*) AS n FROM videos WHERE ${SqliteCatalogRepository.PRUNABLE_WHERE}`)
      .get({ cutoff: cutoffIso }) as { n: number | bigint }
    return Number(row.n)
  }

  pruneOldVideos(cutoffIso: string): number {
    const result = this.db
      .prepare(`DELETE FROM videos WHERE ${SqliteCatalogRepository.PRUNABLE_WHERE}`)
      .run({ cutoff: cutoffIso })
    return Number(result.changes)
  }
}
