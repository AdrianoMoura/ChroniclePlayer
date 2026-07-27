import type { DatabaseSync, SQLInputValue } from 'node:sqlite'
import type { FeedEntry } from '../../core/feed'
import { MAX_PLAYLIST_THUMBS, type Playlist, type PlaylistSummary } from '../../core/playlist'
import type { PlaylistRepository } from '../../core/ports'
import { FEED_SELECT, toEntry, type FeedRow } from './repositories'

interface PlaylistRow {
  playlist_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
  source_playlist_id: string | null
}

function toPlaylist(row: PlaylistRow): Playlist {
  return {
    playlistId: row.playlist_id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sourcePlaylistId: row.source_playlist_id
  }
}

export class SqlitePlaylistRepository implements PlaylistRepository {
  constructor(private readonly db: DatabaseSync) {}

  listPlaylists(): PlaylistSummary[] {
    return this.summarize(null)
  }

  getPlaylistSummary(playlistId: string): PlaylistSummary | null {
    return this.summarize(playlistId)[0] ?? null
  }

  // onlyPlaylistId narrows to a single playlist (getPlaylistSummary); null
  // summarizes every playlist (listPlaylists) — same query either way, one
  // extra predicate.
  private summarize(onlyPlaylistId: string | null): PlaylistSummary[] {
    const filter = onlyPlaylistId !== null ? 'WHERE p.playlist_id = :playlistId' : ''
    const params: Record<string, SQLInputValue> =
      onlyPlaylistId !== null ? { playlistId: onlyPlaylistId } : {}
    const rows = this.db
      .prepare(
        `SELECT
           p.playlist_id AS playlist_id,
           p.name AS name,
           p.description AS description,
           p.created_at AS created_at,
           p.updated_at AS updated_at,
           p.source_playlist_id AS source_playlist_id,
           COUNT(pv.video_id) AS video_count,
           COALESCE(SUM(v.duration_seconds), 0) AS total_duration_seconds
         FROM playlists p
         LEFT JOIN playlist_videos pv ON pv.playlist_id = p.playlist_id
         LEFT JOIN videos v ON v.video_id = pv.video_id
         ${filter}
         GROUP BY p.playlist_id
         ORDER BY p.created_at DESC`
      )
      .all(params) as unknown as (PlaylistRow & {
      video_count: number | bigint
      total_duration_seconds: number | bigint
    })[]

    if (rows.length === 0) return []

    // Composite thumbnail (ui.md): the first MAX_PLAYLIST_THUMBS videos (by
    // position) per playlist, fetched for every matched playlist in one
    // query rather than one round trip each.
    const thumbFilter =
      onlyPlaylistId !== null
        ? 'WHERE pv.playlist_id = :playlistId AND v.thumbnail_url IS NOT NULL'
        : 'WHERE v.thumbnail_url IS NOT NULL'
    const thumbRows = this.db
      .prepare(
        `SELECT pv.playlist_id AS playlist_id, v.thumbnail_url AS thumbnail_url
         FROM playlist_videos pv
         JOIN videos v ON v.video_id = pv.video_id
         ${thumbFilter}
         ORDER BY pv.playlist_id ASC, pv.position ASC`
      )
      .all(params) as unknown as { playlist_id: string; thumbnail_url: string }[]

    const thumbsByPlaylist = new Map<string, string[]>()
    for (const row of thumbRows) {
      const list = thumbsByPlaylist.get(row.playlist_id) ?? []
      if (list.length < MAX_PLAYLIST_THUMBS) {
        list.push(row.thumbnail_url)
        thumbsByPlaylist.set(row.playlist_id, list)
      }
    }

    return rows.map((row) => ({
      ...toPlaylist(row),
      videoCount: Number(row.video_count),
      totalDurationSeconds: Number(row.total_duration_seconds),
      thumbnailUrls: thumbsByPlaylist.get(row.playlist_id) ?? []
    }))
  }

  getPlaylist(playlistId: string): Playlist | null {
    const row = this.db
      .prepare(
        `SELECT playlist_id, name, description, created_at, updated_at, source_playlist_id
         FROM playlists WHERE playlist_id = ?`
      )
      .get(playlistId) as PlaylistRow | undefined
    return row === undefined ? null : toPlaylist(row)
  }

  createPlaylist(
    playlistId: string,
    name: string,
    description: string | null,
    now: string,
    sourcePlaylistId: string | null = null
  ): Playlist {
    this.db
      .prepare(
        `INSERT INTO playlists (playlist_id, name, description, created_at, updated_at, source_playlist_id)
         VALUES (:id, :name, :description, :now, :now, :sourcePlaylistId)`
      )
      .run({ id: playlistId, name, description, now, sourcePlaylistId })
    return { playlistId, name, description, createdAt: now, updatedAt: now, sourcePlaylistId }
  }

  updatePlaylist(
    playlistId: string,
    name: string,
    description: string | null,
    now: string
  ): Playlist | null {
    const result = this.db
      .prepare(
        `UPDATE playlists SET name = :name, description = :description, updated_at = :now
         WHERE playlist_id = :id`
      )
      .run({ id: playlistId, name, description, now })
    if (Number(result.changes) === 0) return null
    return this.getPlaylist(playlistId)
  }

  deletePlaylist(playlistId: string): void {
    // playlist_videos rows cascade (ON DELETE CASCADE, foreign_keys = ON) —
    // the videos themselves are untouched, same as removing a Watch Later
    // entry never deletes the video.
    this.db.prepare(`DELETE FROM playlists WHERE playlist_id = ?`).run(playlistId)
  }

  listPlaylistVideos(playlistId: string): FeedEntry[] {
    const rows = this.db
      .prepare(
        `${FEED_SELECT}
         JOIN playlist_videos pv ON pv.video_id = v.video_id
         WHERE pv.playlist_id = :playlistId
         ORDER BY pv.position ASC`
      )
      .all({ playlistId }) as unknown as FeedRow[]
    return rows.map(toEntry)
  }

  addVideoToPlaylist(playlistId: string, videoId: string, now: string): void {
    const row = this.db
      .prepare(
        `SELECT COALESCE(MAX(position), 0) AS max_pos FROM playlist_videos WHERE playlist_id = ?`
      )
      .get(playlistId) as { max_pos: number | bigint }
    this.db
      .prepare(
        `INSERT INTO playlist_videos (playlist_id, video_id, position, added_at)
         VALUES (:playlistId, :videoId, :position, :now)
         ON CONFLICT(playlist_id, video_id) DO NOTHING`
      )
      .run({ playlistId, videoId, position: Number(row.max_pos) + 1, now })
    this.db
      .prepare(`UPDATE playlists SET updated_at = :now WHERE playlist_id = :id`)
      .run({ id: playlistId, now })
  }

  removeVideoFromPlaylist(playlistId: string, videoId: string): void {
    this.db
      .prepare(`DELETE FROM playlist_videos WHERE playlist_id = ? AND video_id = ?`)
      .run(playlistId, videoId)
  }

  listPlaylistsForVideo(videoId: string): string[] {
    const rows = this.db
      .prepare(`SELECT playlist_id FROM playlist_videos WHERE video_id = ?`)
      .all(videoId) as unknown as { playlist_id: string }[]
    return rows.map((row) => row.playlist_id)
  }

  // D-059: this playlist's own membership as a Set — the Sync diff (and the
  // import path's own de-dupe) look up membership by id, not in feed order.
  listImportedVideoIds(playlistId: string): Set<string> {
    const rows = this.db
      .prepare(`SELECT video_id FROM playlist_videos WHERE playlist_id = ?`)
      .all(playlistId) as unknown as { video_id: string }[]
    return new Set(rows.map((row) => row.video_id))
  }

  // Mirrors StateRepository.reorderWatchLater: videoIds is the full playlist
  // in its new order.
  reorderPlaylist(playlistId: string, videoIds: readonly string[]): void {
    const stmt = this.db.prepare(
      `UPDATE playlist_videos SET position = :pos
       WHERE playlist_id = :playlistId AND video_id = :videoId`
    )
    this.db.exec('BEGIN')
    try {
      videoIds.forEach((videoId, index) => stmt.run({ playlistId, videoId, pos: index + 1 }))
      this.db.exec('COMMIT')
    } catch (cause) {
      this.db.exec('ROLLBACK')
      throw cause
    }
  }
}
