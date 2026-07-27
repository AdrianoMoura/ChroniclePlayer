import type { DatabaseSync } from 'node:sqlite'

// Schema v1 per local-data.md §Schema. Forward-only numbered migrations keyed
// on PRAGMA user_version; migrations[N] moves the schema from version N to N+1.
const SCHEMA_V1 = `
CREATE TABLE channels (
  channel_id        TEXT PRIMARY KEY,
  title             TEXT NOT NULL,
  thumbnail_url     TEXT,
  uploads_playlist  TEXT,
  subscribed        INTEGER NOT NULL DEFAULT 1,
  available         INTEGER NOT NULL DEFAULT 1,
  rss_etag          TEXT,
  rss_last_modified TEXT,
  last_synced_at    TEXT,
  added_at          TEXT NOT NULL
);

CREATE TABLE videos (
  video_id          TEXT PRIMARY KEY,
  channel_id        TEXT NOT NULL REFERENCES channels(channel_id),
  title             TEXT NOT NULL,
  description       TEXT,
  published_at      TEXT NOT NULL,
  duration_seconds  INTEGER,
  is_short          INTEGER,
  live_content      TEXT,
  thumbnail_url     TEXT,
  hydrated_at       TEXT,
  fetched_at        TEXT NOT NULL
);
CREATE INDEX idx_videos_feed ON videos (published_at DESC);
CREATE INDEX idx_videos_channel ON videos (channel_id, published_at DESC);

CREATE TABLE video_state (
  video_id          TEXT PRIMARY KEY REFERENCES videos(video_id),
  read_status       TEXT NOT NULL DEFAULT 'unread',
  favorite          INTEGER NOT NULL DEFAULT 0,
  watch_later       INTEGER NOT NULL DEFAULT 0,
  watch_later_pos   INTEGER,
  status_changed_at TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);
CREATE INDEX idx_state_status ON video_state (read_status);

CREATE TABLE sync_log (
  id                INTEGER PRIMARY KEY,
  started_at        TEXT NOT NULL,
  finished_at       TEXT,
  trigger           TEXT NOT NULL,
  channels_polled   INTEGER,
  videos_new        INTEGER,
  quota_spent       INTEGER,
  outcome           TEXT
);

CREATE TABLE meta (
  key   TEXT PRIMARY KEY,
  value TEXT
);
`

// v2 (D-018): view counts, captured during hydration so the hidden-by-default
// setting has data to show. NULL means not yet hydrated.
const SCHEMA_V2 = `
ALTER TABLE videos ADD COLUMN view_count INTEGER;
`

// v3 (B-010): subscriptions.delete needs the subscription resource id,
// distinct from channel_id — captured at subscription-list time.
const SCHEMA_V3 = `
ALTER TABLE channels ADD COLUMN subscription_id TEXT;
`

// v4 (B-042): channel-level priority marker, distinct from a video's own
// favorite (video_state.favorite, D-010) — surfaces a priority section in
// the main feed for favorited channels' recent unread videos.
const SCHEMA_V4 = `
ALTER TABLE channels ADD COLUMN favorite INTEGER NOT NULL DEFAULT 0;
`

// v5 (B-002): continuation state for user-initiated back-catalog fetch
// (uploads playlist paging past what routine sync ever loads). Separate
// from rss_etag/rss_last_modified — this walks a different, on-demand path.
const SCHEMA_V5 = `
ALTER TABLE channels ADD COLUMN backfill_page_token TEXT;
ALTER TABLE channels ADD COLUMN backfill_exhausted INTEGER NOT NULL DEFAULT 0;
`

// v6 (B-003): multi-account. `channels` stays account-agnostic — synced
// facts (title, uploads playlist, RSS validators) are shared/deduped across
// every account that follows a channel (same as an externally-opened
// channel, D-029). The per-account relationship (subscribed, favorite,
// subscription id, backfill cursor) moves into a new junction table.
// videos/video_state stay account-agnostic too — read/favorite/watch-later
// are the user's own facts, not tied to whichever account surfaced the
// video (D-003).
const SCHEMA_V6 = `
CREATE TABLE accounts (
  account_id TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  added_at   TEXT NOT NULL
);

CREATE TABLE account_channels (
  account_id          TEXT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
  channel_id          TEXT NOT NULL REFERENCES channels(channel_id),
  subscribed          INTEGER NOT NULL DEFAULT 1,
  favorite            INTEGER NOT NULL DEFAULT 0,
  subscription_id     TEXT,
  added_at            TEXT NOT NULL,
  backfill_page_token TEXT,
  backfill_exhausted  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (account_id, channel_id)
);
CREATE INDEX idx_account_channels_channel ON account_channels (channel_id);
CREATE INDEX idx_account_channels_account ON account_channels (account_id);

INSERT INTO accounts (account_id, label, added_at)
  SELECT 'default', 'My account', COALESCE((SELECT MIN(added_at) FROM channels), '1970-01-01T00:00:00.000Z')
  WHERE EXISTS (SELECT 1 FROM channels);

INSERT INTO account_channels
  (account_id, channel_id, subscribed, favorite, subscription_id, added_at, backfill_page_token, backfill_exhausted)
  SELECT 'default', channel_id, subscribed, favorite, subscription_id, added_at, backfill_page_token, backfill_exhausted
  FROM channels;

ALTER TABLE channels DROP COLUMN subscribed;
ALTER TABLE channels DROP COLUMN favorite;
ALTER TABLE channels DROP COLUMN subscription_id;
ALTER TABLE channels DROP COLUMN backfill_page_token;
ALTER TABLE channels DROP COLUMN backfill_exhausted;
`

// v7: last known playback position, so reopening a partially-watched video
// resumes instead of starting at 0:00. Local-only, never synced to YouTube
// (D-003), same as read/favorite/watch-later.
const SCHEMA_V7 = `
ALTER TABLE video_state ADD COLUMN resume_position_seconds INTEGER;
`

// v8 (D-048, B-110): drops `available` — channel availability is no longer
// tracked; a single transient RSS 404 isn't reliable proof a channel was
// deleted.
const SCHEMA_V8 = `
ALTER TABLE channels DROP COLUMN available;
`

// v9 (D-050): per-account, per-channel opt-in flag for the "Custom" new-video
// notification scope — same table/shape as the existing favorite column,
// toggled the same way (sidebar channel context menu).
const SCHEMA_V9 = `
ALTER TABLE account_channels ADD COLUMN notify INTEGER NOT NULL DEFAULT 0;
`

// v10 (B-114): adds was_live, a sticky flag so an ended broadcast
// (live_content reverts to 'none', same as a normal upload) can still be
// told apart from a video that was never live. Backfills existing rows
// already at live_content = 'live' so they keep the marker.
const SCHEMA_V10 = `
ALTER TABLE videos ADD COLUMN was_live INTEGER NOT NULL DEFAULT 0;
UPDATE videos SET was_live = 1 WHERE live_content = 'live';
`

// v11 (B-115): adds is_premiere — best-effort Premiere signal from
// liveStreamingDetails.concurrentViewers absence while liveContent = 'live'
// (see HydratedVideo.isPremiere). Not sticky like was_live (v10):
// re-derived fresh on every hydration.
const SCHEMA_V11 = `
ALTER TABLE videos ADD COLUMN is_premiere INTEGER NOT NULL DEFAULT 0;
`

// v12 (D-053): adds live_ended_at — liveStreamingDetails.actualEndTime,
// captured once a broadcast ends, so an ended livestream sorts by its wrap
// time instead of a stale publishedAt (feed.md §Ordering). Sticky once set.
const SCHEMA_V12 = `
ALTER TABLE videos ADD COLUMN live_ended_at TEXT;
`

// v13 (B-117): drops is_premiere (v11) — its heuristic proved unreliable
// (misidentified a genuine live broadcast). Feed reverts to plain
// 'live'/'upcoming'/'none' until a reliable signal exists.
const SCHEMA_V13 = `
ALTER TABLE videos DROP COLUMN is_premiere;
`

// v14: re-adds is_premiere, keyed on status.uploadStatus ('processed' vs.
// 'uploaded') while live_content = 'live'. Sticky once set (see
// sync-repository.ts applyHydration, which also gates live_ended_at so a
// Premiere doesn't get an ended broadcast's wrap-time sort). Not backfilled —
// the signal only applies while still live.
const SCHEMA_V14 = `
ALTER TABLE videos ADD COLUMN is_premiere INTEGER NOT NULL DEFAULT 0;
`

// v15: drops was_live (v10) — no longer read; live_ended_at alone drives
// ended-broadcast sort/bucket order.
const SCHEMA_V15 = `
ALTER TABLE videos DROP COLUMN was_live;
`

// v16: adds live_started_at — liveStreamingDetails.actualStartTime, free on
// the same videos.list call as actualEndTime (v12). Drives the feed's
// "Started X ago" label for a currently-live video (whose own effectiveDate
// is pinned to "now", D-053).
const SCHEMA_V16 = `
ALTER TABLE videos ADD COLUMN live_started_at TEXT;
`

// v17: user-created local playlists (decisions.md) — never synced to
// YouTube. playlist_videos references videos(video_id) like video_state
// does: a video must already be known locally (the feed, or hydrated
// on-demand via getVideo, D-029) before it can join a playlist.
// ON DELETE CASCADE on the playlist side (foreign_keys = ON, database.ts)
// means deleting a playlist drops its membership rows for free; videos
// themselves are untouched, same as removing a video from Watch Later
// never deletes the video.
const SCHEMA_V17 = `
CREATE TABLE playlists (
  playlist_id  TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  description  TEXT,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE TABLE playlist_videos (
  playlist_id  TEXT NOT NULL REFERENCES playlists(playlist_id) ON DELETE CASCADE,
  video_id     TEXT NOT NULL REFERENCES videos(video_id),
  position     INTEGER NOT NULL,
  added_at     TEXT NOT NULL,
  PRIMARY KEY (playlist_id, video_id)
);
CREATE INDEX idx_playlist_videos_playlist ON playlist_videos (playlist_id, position ASC);
`

// v18 (D-059): marks which playlists came from importing a YouTube playlist
// rather than "Create Playlist" — NULL for an ordinary local-only playlist,
// the source YouTube playlist id otherwise. Gates the Sync action (pulls in
// videos the source added since the import; never removes/reorders what's
// already here).
const SCHEMA_V18 = `
ALTER TABLE playlists ADD COLUMN source_playlist_id TEXT;
`

const migrations: readonly string[] = [
  SCHEMA_V1,
  SCHEMA_V2,
  SCHEMA_V3,
  SCHEMA_V4,
  SCHEMA_V5,
  SCHEMA_V6,
  SCHEMA_V7,
  SCHEMA_V8,
  SCHEMA_V9,
  SCHEMA_V10,
  SCHEMA_V11,
  SCHEMA_V12,
  SCHEMA_V13,
  SCHEMA_V14,
  SCHEMA_V15,
  SCHEMA_V16,
  SCHEMA_V17,
  SCHEMA_V18
]

export function migrate(db: DatabaseSync): void {
  let version = schemaVersion(db)
  while (version < migrations.length) {
    // Transactional: a failed migration leaves the previous DB intact
    // (local-data.md §Migrations).
    db.exec('BEGIN')
    try {
      db.exec(migrations[version])
      db.exec(`PRAGMA user_version = ${version + 1}`)
      db.exec('COMMIT')
    } catch (cause) {
      db.exec('ROLLBACK')
      throw cause
    }
    version += 1
  }
}

function schemaVersion(db: DatabaseSync): number {
  const row = db.prepare('PRAGMA user_version').get() as { user_version: number | bigint }
  return Number(row.user_version)
}
