import type { DatabaseSync } from 'node:sqlite'
import type {
  ChannelSyncInfo,
  DiscoveredVideo,
  HydratedVideo,
  SyncLogEntry,
  SyncRepository
} from '../../core/ports'
import type { Channel } from '../../core/video'

// Descriptions are stored truncated; full text is fetched on demand later
// (local-data.md schema note).
const DESCRIPTION_LIMIT = 500

function truncate(text: string | null): string | null {
  if (text === null) return null
  return text.length > DESCRIPTION_LIMIT ? text.slice(0, DESCRIPTION_LIMIT) : text
}

export class SqliteSyncRepository implements SyncRepository {
  constructor(private readonly db: DatabaseSync) {}

  listSubscribedChannels(): ChannelSyncInfo[] {
    const rows = this.db
      .prepare(
        `SELECT channel_id, title, uploads_playlist, rss_etag, rss_last_modified, last_synced_at
         FROM channels WHERE subscribed = 1 AND available = 1`
      )
      .all() as unknown as {
      channel_id: string
      title: string
      uploads_playlist: string | null
      rss_etag: string | null
      rss_last_modified: string | null
      last_synced_at: string | null
    }[]
    return rows.map((row) => ({
      channelId: row.channel_id,
      title: row.title,
      uploadsPlaylist: row.uploads_playlist,
      rssEtag: row.rss_etag,
      rssLastModified: row.rss_last_modified,
      lastSyncedAt: row.last_synced_at
    }))
  }

  // Diff-apply the fresh list: removed channels are marked unsubscribed but
  // videos and states are retained (youtube-api.md §Subscription import).
  applySubscriptions(channels: readonly Channel[], now: string): { added: number; removed: number } {
    const existing = new Set(
      (
        this.db.prepare(`SELECT channel_id FROM channels WHERE subscribed = 1`).all() as unknown as {
          channel_id: string
        }[]
      ).map((row) => row.channel_id)
    )
    const currentIds = new Set(channels.map((channel) => channel.channelId))

    let added = 0
    this.db.exec('BEGIN')
    try {
      const upsert = this.db.prepare(
        `INSERT INTO channels (channel_id, title, thumbnail_url, subscribed, added_at)
         VALUES (:id, :title, :thumb, 1, :now)
         ON CONFLICT(channel_id) DO UPDATE SET title = :title, thumbnail_url = :thumb, subscribed = 1`
      )
      for (const channel of channels) {
        if (!existing.has(channel.channelId)) added += 1
        upsert.run({ id: channel.channelId, title: channel.title, thumb: channel.thumbnailUrl, now })
      }

      let removed = 0
      const unsubscribe = this.db.prepare(`UPDATE channels SET subscribed = 0 WHERE channel_id = ?`)
      for (const channelId of existing) {
        if (!currentIds.has(channelId)) {
          unsubscribe.run(channelId)
          removed += 1
        }
      }
      this.db.exec('COMMIT')
      return { added, removed }
    } catch (cause) {
      this.db.exec('ROLLBACK')
      throw cause
    }
  }

  setUploadsPlaylist(channelId: string, playlistId: string): void {
    this.db
      .prepare(`UPDATE channels SET uploads_playlist = ? WHERE channel_id = ?`)
      .run(playlistId, channelId)
  }

  knownVideoIds(videoIds: readonly string[]): Set<string> {
    const known = new Set<string>()
    for (let i = 0; i < videoIds.length; i += 500) {
      const chunk = videoIds.slice(i, i + 500)
      const placeholders = chunk.map(() => '?').join(',')
      const rows = this.db
        .prepare(`SELECT video_id FROM videos WHERE video_id IN (${placeholders})`)
        .all(...chunk) as unknown as { video_id: string }[]
      for (const row of rows) known.add(row.video_id)
    }
    return known
  }

  // RSS discovery: insert-only. Facts already hydrated by the API are never
  // downgraded by the thinner RSS shape.
  insertDiscoveredVideos(channelId: string, videos: readonly DiscoveredVideo[], now: string): void {
    const insert = this.db.prepare(
      `INSERT OR IGNORE INTO videos
         (video_id, channel_id, title, description, published_at, thumbnail_url, fetched_at)
       VALUES (:id, :channelId, :title, :description, :publishedAt, :thumb, :now)`
    )
    for (const video of videos) {
      insert.run({
        id: video.videoId,
        channelId,
        title: video.title,
        description: truncate(video.description),
        publishedAt: video.publishedAt,
        thumb: video.thumbnailUrl,
        now
      })
    }
  }

  // Hydration upserts full facts — it also creates rows for gap-backfilled
  // videos that never passed through RSS.
  applyHydration(videos: readonly HydratedVideo[], now: string): void {
    const upsert = this.db.prepare(
      `INSERT INTO videos
         (video_id, channel_id, title, description, published_at, duration_seconds,
          live_content, thumbnail_url, hydrated_at, fetched_at)
       VALUES (:id, :channelId, :title, :description, :publishedAt, :duration, :live, :thumb, :now, :now)
       ON CONFLICT(video_id) DO UPDATE SET
         title = :title,
         description = :description,
         published_at = :publishedAt,
         duration_seconds = :duration,
         live_content = :live,
         thumbnail_url = COALESCE(:thumb, thumbnail_url),
         hydrated_at = :now`
    )
    for (const video of videos) {
      upsert.run({
        id: video.videoId,
        channelId: video.channelId,
        title: video.title,
        description: truncate(video.description),
        publishedAt: video.publishedAt,
        duration: video.durationSeconds,
        live: video.liveContent,
        thumb: video.thumbnailUrl,
        now
      })
    }
  }

  // D-029: an externally opened video gets a channel row with subscribed=0
  // (never feed membership) and a fully hydrated video row.
  upsertExternalVideo(video: HydratedVideo, now: string): void {
    this.db
      .prepare(
        `INSERT INTO channels (channel_id, title, subscribed, added_at)
         VALUES (:id, :title, 0, :now)
         ON CONFLICT(channel_id) DO NOTHING`
      )
      .run({ id: video.channelId, title: video.channelTitle || video.channelId, now })
    this.applyHydration([video], now)
  }

  updateChannelSyncMeta(
    channelId: string,
    meta: {
      rssEtag: string | null
      rssLastModified: string | null
      lastSyncedAt: string
      available: boolean
    }
  ): void {
    this.db
      .prepare(
        `UPDATE channels
         SET rss_etag = :etag, rss_last_modified = :lastModified,
             last_synced_at = :syncedAt, available = :available
         WHERE channel_id = :id`
      )
      .run({
        etag: meta.rssEtag,
        lastModified: meta.rssLastModified,
        syncedAt: meta.lastSyncedAt,
        available: meta.available ? 1 : 0,
        id: channelId
      })
  }

  markChannelUnavailable(channelId: string): void {
    this.db.prepare(`UPDATE channels SET available = 0 WHERE channel_id = ?`).run(channelId)
  }

  // D-028 candidates: short-duration videos whose verdict is still unknown.
  shortCandidates(): string[] {
    const rows = this.db
      .prepare(
        `SELECT video_id FROM videos
         WHERE duration_seconds IS NOT NULL AND duration_seconds <= 180 AND is_short IS NULL`
      )
      .all() as unknown as { video_id: string }[]
    return rows.map((row) => row.video_id)
  }

  setShortStatus(videoId: string, isShort: boolean): void {
    this.db
      .prepare(`UPDATE videos SET is_short = ? WHERE video_id = ?`)
      .run(isShort ? 1 : 0, videoId)
  }

  recordSync(entry: SyncLogEntry): void {
    this.db
      .prepare(
        `INSERT INTO sync_log
           (started_at, finished_at, trigger, channels_polled, videos_new, quota_spent, outcome)
         VALUES (:startedAt, :finishedAt, :trigger, :channelsPolled, :videosNew, :quotaSpent, :outcome)`
      )
      .run({ ...entry })
  }

  lastSyncStartedAt(): string | null {
    const row = this.db
      .prepare(`SELECT started_at FROM sync_log ORDER BY id DESC LIMIT 1`)
      .get() as { started_at: string } | undefined
    return row?.started_at ?? null
  }

  getMeta(key: string): string | null {
    const row = this.db.prepare(`SELECT value FROM meta WHERE key = ?`).get(key) as
      | { value: string | null }
      | undefined
    return row?.value ?? null
  }

  setMeta(key: string, value: string): void {
    this.db
      .prepare(
        `INSERT INTO meta (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`
      )
      .run(key, value)
  }
}
