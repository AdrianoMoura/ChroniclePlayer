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

  // channels' facts (title, uploads playlist, RSS state) are account-agnostic
  // and shared across every account that follows it (B-003) — only the
  // account_channels join says whether *this* account currently subscribes.
  listSubscribedChannels(accountId: string, channelId?: string): ChannelSyncInfo[] {
    const rows = (
      channelId === undefined
        ? this.db.prepare(
            `SELECT c.channel_id, c.title, c.uploads_playlist, c.rss_etag, c.rss_last_modified, c.last_synced_at
             FROM channels c JOIN account_channels ac ON ac.channel_id = c.channel_id
             WHERE ac.account_id = :accountId AND ac.subscribed = 1`
          )
        : this.db.prepare(
            `SELECT c.channel_id, c.title, c.uploads_playlist, c.rss_etag, c.rss_last_modified, c.last_synced_at
             FROM channels c JOIN account_channels ac ON ac.channel_id = c.channel_id
             WHERE ac.account_id = :accountId AND ac.subscribed = 1
               AND c.channel_id = :channelId`
          )
    ).all({ accountId, ...(channelId === undefined ? {} : { channelId }) }) as unknown as {
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

  // Diff-apply the fresh list for one account: removed channels are marked
  // unsubscribed (for that account only) but videos and states are retained
  // (youtube-api.md §Subscription import). Channel facts (title/thumbnail)
  // are upserted independently of any account — B-003: shared/deduped when
  // more than one account follows the same channel.
  applySubscriptions(
    accountId: string,
    channels: readonly Channel[],
    now: string
  ): { added: number; removed: number } {
    const existing = new Set(
      (
        this.db
          .prepare(`SELECT channel_id FROM account_channels WHERE account_id = ? AND subscribed = 1`)
          .all(accountId) as unknown as { channel_id: string }[]
      ).map((row) => row.channel_id)
    )
    const currentIds = new Set(channels.map((channel) => channel.channelId))

    let added = 0
    this.db.exec('BEGIN')
    try {
      const upsertChannel = this.db.prepare(
        `INSERT INTO channels (channel_id, title, thumbnail_url, added_at)
         VALUES (:id, :title, :thumb, :now)
         ON CONFLICT(channel_id) DO UPDATE SET title = :title, thumbnail_url = :thumb`
      )
      const upsertMembership = this.db.prepare(
        `INSERT INTO account_channels (account_id, channel_id, subscription_id, subscribed, added_at)
         VALUES (:accountId, :channelId, :subId, 1, :now)
         ON CONFLICT(account_id, channel_id) DO UPDATE SET subscription_id = :subId, subscribed = 1`
      )
      for (const channel of channels) {
        if (!existing.has(channel.channelId)) added += 1
        upsertChannel.run({ id: channel.channelId, title: channel.title, thumb: channel.thumbnailUrl, now })
        upsertMembership.run({
          accountId,
          channelId: channel.channelId,
          subId: channel.subscriptionId ?? null,
          now
        })
      }

      let removed = 0
      const unsubscribe = this.db.prepare(
        `UPDATE account_channels SET subscribed = 0 WHERE account_id = ? AND channel_id = ?`
      )
      for (const channelId of existing) {
        if (!currentIds.has(channelId)) {
          unsubscribe.run(accountId, channelId)
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

  // B-010: local half of user-initiated unsubscribe — the real
  // subscriptions.delete call happens in the platform layer before this runs.
  // Same soft-delete as applySubscriptions' diff removal: videos/state stay.
  // B-009: single-channel subscribe (user-initiated, via search/discovery) —
  // the same upsert shape as applySubscriptions' bulk diff-apply, for one row.
  upsertSubscribedChannel(accountId: string, channel: Channel, now: string): void {
    this.db
      .prepare(
        `INSERT INTO channels (channel_id, title, thumbnail_url, added_at)
         VALUES (:id, :title, :thumb, :now)
         ON CONFLICT(channel_id) DO UPDATE SET title = :title, thumbnail_url = :thumb`
      )
      .run({ id: channel.channelId, title: channel.title, thumb: channel.thumbnailUrl, now })
    this.db
      .prepare(
        `INSERT INTO account_channels (account_id, channel_id, subscription_id, subscribed, added_at)
         VALUES (:accountId, :channelId, :subId, 1, :now)
         ON CONFLICT(account_id, channel_id) DO UPDATE SET subscription_id = :subId, subscribed = 1`
      )
      .run({ accountId, channelId: channel.channelId, subId: channel.subscriptionId ?? null, now })
  }

  getSubscriptionId(accountId: string, channelId: string): string | null {
    const row = this.db
      .prepare(
        `SELECT subscription_id FROM account_channels WHERE account_id = ? AND channel_id = ?`
      )
      .get(accountId, channelId) as { subscription_id: string | null } | undefined
    return row?.subscription_id ?? null
  }

  markUnsubscribed(accountId: string, channelId: string): void {
    this.db
      .prepare(`UPDATE account_channels SET subscribed = 0 WHERE account_id = ? AND channel_id = ?`)
      .run(accountId, channelId)
  }

  // Channel fact, account-agnostic — set once, read by every account that
  // follows the channel (B-003).
  setUploadsPlaylist(channelId: string, playlistId: string): void {
    this.db
      .prepare(`UPDATE channels SET uploads_playlist = ? WHERE channel_id = ?`)
      .run(playlistId, channelId)
  }

  // B-003: which connected account(s) currently subscribe to this channel —
  // usually one, but two accounts can both follow the same channel.
  listAccountIdsForChannel(channelId: string): string[] {
    const rows = this.db
      .prepare(`SELECT account_id FROM account_channels WHERE channel_id = ? AND subscribed = 1`)
      .all(channelId) as unknown as { account_id: string }[]
    return rows.map((row) => row.account_id)
  }

  // B-003: connected Google accounts, oldest first.
  listAccounts(): { accountId: string; label: string; addedAt: string }[] {
    const rows = this.db
      .prepare(`SELECT account_id, label, added_at FROM accounts ORDER BY added_at ASC`)
      .all() as unknown as { account_id: string; label: string; added_at: string }[]
    return rows.map((row) => ({ accountId: row.account_id, label: row.label, addedAt: row.added_at }))
  }

  addAccount(accountId: string, label: string, now: string): void {
    this.db
      .prepare(
        `INSERT INTO accounts (account_id, label, added_at) VALUES (?, ?, ?)
         ON CONFLICT(account_id) DO UPDATE SET label = excluded.label`
      )
      .run(accountId, label, now)
  }

  // ON DELETE CASCADE drops this account's account_channels rows too;
  // channels/videos/video_state (shared, or account-agnostic per D-003) are
  // untouched — only membership disappears.
  removeAccount(accountId: string): void {
    this.db.prepare(`DELETE FROM accounts WHERE account_id = ?`).run(accountId)
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
          live_content, thumbnail_url, view_count, hydrated_at, fetched_at)
       VALUES (:id, :channelId, :title, :description, :publishedAt, :duration, :live, :thumb, :views, :now, :now)
       ON CONFLICT(video_id) DO UPDATE SET
         title = :title,
         description = :description,
         published_at = :publishedAt,
         duration_seconds = :duration,
         live_content = :live,
         thumbnail_url = COALESCE(:thumb, thumbnail_url),
         view_count = :views,
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
        views: video.viewCount,
        now
      })
    }
  }

  markVideosReadIfUnset(videoIds: readonly string[], now: string): void {
    const insert = this.db.prepare(
      `INSERT INTO video_state (video_id, read_status, status_changed_at, updated_at)
       VALUES (:id, 'read', :now, :now)
       ON CONFLICT(video_id) DO NOTHING`
    )
    for (const id of videoIds) insert.run({ id, now })
  }

  // D-029: an externally opened video gets a bare channel-facts row (no
  // account_channels membership at all — that absence, not a flag, is what
  // keeps it out of every feed view, B-003) and a fully hydrated video row.
  upsertExternalVideo(video: HydratedVideo, now: string): void {
    this.db
      .prepare(
        `INSERT INTO channels (channel_id, title, added_at)
         VALUES (:id, :title, :now)
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
    }
  ): void {
    this.db
      .prepare(
        `UPDATE channels
         SET rss_etag = :etag, rss_last_modified = :lastModified, last_synced_at = :syncedAt
         WHERE channel_id = :id`
      )
      .run({
        etag: meta.rssEtag,
        lastModified: meta.rssLastModified,
        syncedAt: meta.lastSyncedAt,
        id: channelId
      })
  }

  getBackfillState(
    accountId: string,
    channelId: string
  ): { pageToken: string | null; exhausted: boolean } {
    const row = this.db
      .prepare(
        `SELECT backfill_page_token, backfill_exhausted FROM account_channels
         WHERE account_id = ? AND channel_id = ?`
      )
      .get(accountId, channelId) as
      | { backfill_page_token: string | null; backfill_exhausted: number | bigint }
      | undefined
    return {
      pageToken: row?.backfill_page_token ?? null,
      exhausted: row !== undefined && Number(row.backfill_exhausted) === 1
    }
  }

  setBackfillState(
    accountId: string,
    channelId: string,
    pageToken: string | null,
    exhausted: boolean
  ): void {
    this.db
      .prepare(
        `UPDATE account_channels SET backfill_page_token = ?, backfill_exhausted = ?
         WHERE account_id = ? AND channel_id = ?`
      )
      .run(pageToken, exhausted ? 1 : 0, accountId, channelId)
  }

  // D-028 candidates: short-duration videos whose verdict is still unknown.
  // channelId scopes to a single channel (B-036).
  shortCandidates(channelId?: string): string[] {
    const rows = (
      channelId === undefined
        ? this.db.prepare(
            `SELECT video_id FROM videos
             WHERE duration_seconds IS NOT NULL AND duration_seconds <= 180 AND is_short IS NULL`
          )
        : this.db.prepare(
            `SELECT video_id FROM videos
             WHERE duration_seconds IS NOT NULL AND duration_seconds <= 180 AND is_short IS NULL
               AND channel_id = ?`
          )
    ).all(...(channelId === undefined ? [] : [channelId])) as unknown as { video_id: string }[]
    return rows.map((row) => row.video_id)
  }

  setShortStatus(videoId: string, isShort: boolean): void {
    this.db
      .prepare(`UPDATE videos SET is_short = ? WHERE video_id = ?`)
      .run(isShort ? 1 : 0, videoId)
  }

  countShorts(videoIds: readonly string[]): number {
    let count = 0
    for (let i = 0; i < videoIds.length; i += 500) {
      const chunk = videoIds.slice(i, i + 500)
      const placeholders = chunk.map(() => '?').join(',')
      const row = this.db
        .prepare(`SELECT COUNT(*) AS n FROM videos WHERE is_short = 1 AND video_id IN (${placeholders})`)
        .get(...chunk) as unknown as { n: number | bigint }
      count += Number(row.n)
    }
    return count
  }

  upcomingVideoIds(channelId?: string): string[] {
    const rows = (
      channelId === undefined
        ? this.db.prepare(`SELECT video_id FROM videos WHERE live_content = 'upcoming'`)
        : this.db.prepare(
            `SELECT video_id FROM videos WHERE live_content = 'upcoming' AND channel_id = ?`
          )
    ).all(...(channelId === undefined ? [] : [channelId])) as unknown as { video_id: string }[]
    return rows.map((row) => row.video_id)
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

  // Export payload per local-data.md §Export: channels (id/title/subscribed),
  // videos (core metadata), the full video_state table. "You can leave with
  // everything."
  exportData(): {
    channels: { channelId: string; title: string; subscribed: boolean }[]
    videos: {
      videoId: string
      channelId: string
      title: string
      publishedAt: string
      durationSeconds: number | null
      isShort: boolean | null
    }[]
    videoStates: {
      videoId: string
      readStatus: string
      favorite: boolean
      watchLater: boolean
      watchLaterPos: number | null
      statusChangedAt: string
      updatedAt: string
    }[]
  } {
    // subscribed = followed by at least one connected account (B-003) —
    // export summarizes "do you currently follow this," not per-account detail.
    const channels = (
      this.db
        .prepare(
          `SELECT c.channel_id, c.title,
                  EXISTS(
                    SELECT 1 FROM account_channels ac
                    WHERE ac.channel_id = c.channel_id AND ac.subscribed = 1
                  ) AS subscribed
           FROM channels c ORDER BY c.channel_id`
        )
        .all() as unknown as {
        channel_id: string
        title: string
        subscribed: number | bigint
      }[]
    ).map((row) => ({
      channelId: row.channel_id,
      title: row.title,
      subscribed: Number(row.subscribed) === 1
    }))

    const videos = (
      this.db
        .prepare(
          `SELECT video_id, channel_id, title, published_at, duration_seconds, is_short
           FROM videos ORDER BY published_at DESC, video_id`
        )
        .all() as unknown as {
        video_id: string
        channel_id: string
        title: string
        published_at: string
        duration_seconds: number | bigint | null
        is_short: number | bigint | null
      }[]
    ).map((row) => ({
      videoId: row.video_id,
      channelId: row.channel_id,
      title: row.title,
      publishedAt: row.published_at,
      durationSeconds: row.duration_seconds === null ? null : Number(row.duration_seconds),
      isShort: row.is_short === null ? null : Number(row.is_short) === 1
    }))

    const videoStates = (
      this.db
        .prepare(
          `SELECT video_id, read_status, favorite, watch_later, watch_later_pos,
                  status_changed_at, updated_at
           FROM video_state ORDER BY video_id`
        )
        .all() as unknown as {
        video_id: string
        read_status: string
        favorite: number | bigint
        watch_later: number | bigint
        watch_later_pos: number | bigint | null
        status_changed_at: string
        updated_at: string
      }[]
    ).map((row) => ({
      videoId: row.video_id,
      readStatus: row.read_status,
      favorite: Number(row.favorite) === 1,
      watchLater: Number(row.watch_later) === 1,
      watchLaterPos: row.watch_later_pos === null ? null : Number(row.watch_later_pos),
      statusChangedAt: row.status_changed_at,
      updatedAt: row.updated_at
    }))

    return { channels, videos, videoStates }
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
