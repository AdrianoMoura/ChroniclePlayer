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

// v2 (M5, D-018): view counts are captured during hydration so the
// hidden-by-default setting has data to show. NULL = not yet hydrated
// since this migration.
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

// v6 (B-003): multi-account. `channels` stays account-agnostic — a
// channel's synced facts (title, uploads playlist, RSS validators,
// availability) are shared/deduped across every account that follows it,
// same as an externally-opened channel (D-029). The per-account
// *relationship* to a channel (subscribed, favorite, subscription id,
// on-demand backfill cursor) moves into a new junction table, since the
// same channel can now be followed by more than one local account.
// videos/video_state stay untouched and account-agnostic too — read/
// favorite/watch-later are the Chronicle user's own facts, not tied to
// whichever account's subscription surfaced the video (D-003).
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

// v7: last known playback position, so reopening a partially-watched
// video can resume instead of always starting at 0:00. Lives on video_state
// alongside the other user-facts flags (local-data.md) — Chronicle-only,
// never synced to YouTube (D-003), same as read/favorite/watch-later.
const SCHEMA_V7 = `
ALTER TABLE video_state ADD COLUMN resume_position_seconds INTEGER;
`

// v8 (D-048, bugs.md B-110): a single RSS 404 used to permanently flip a
// channel's `available` off and silently exclude it from every future sync
// and on-demand backfill — with no retry and no UI ever surfacing the state
// (the "show in a settings list" plan in youtube-api.md was never built and
// is dropped, per the product owner: this was never actually a discussed
// decision, just an assumption from earlier development). A transient 404
// isn't reliable proof of deletion; the column is gone outright rather than
// just unused, since nothing sets or reads it anymore.
const SCHEMA_V8 = `
ALTER TABLE channels DROP COLUMN available;
`

// v9 (D-050): per-account, per-channel opt-in flag for the "Custom" new-video
// notification scope — same table/shape as the existing favorite column,
// toggled the same way (sidebar channel context menu).
const SCHEMA_V9 = `
ALTER TABLE account_channels ADD COLUMN notify INTEGER NOT NULL DEFAULT 0;
`

// v10 (B-114): live_content flips back to 'none' once a broadcast ends
// (same value a normal upload has) — sticky was_live is the only way to
// still tell "this was a livestream" apart from a normal upload afterward,
// which the feed badge needs (gray "Live" badge for an ended broadcast, vs.
// no badge at all for a video that was never live). Backfills existing rows
// already sitting at live_content = 'live' at migration time, so nothing
// already-live loses its marker the next time it gets re-hydrated.
const SCHEMA_V10 = `
ALTER TABLE videos ADD COLUMN was_live INTEGER NOT NULL DEFAULT 0;
UPDATE videos SET was_live = 1 WHERE live_content = 'live';
`

// v11 (B-115): liveStreamingDetails.concurrentViewers absence, while
// liveContent = 'live' — best-effort Premiere signal (unverified against
// real Premiere data, see HydratedVideo.isPremiere's own comment). Not
// sticky like was_live (v10): only meaningful for as long as liveContent
// itself says 'live' — re-derived fresh on every hydration, no CASE-based
// preservation needed.
const SCHEMA_V11 = `
ALTER TABLE videos ADD COLUMN is_premiere INTEGER NOT NULL DEFAULT 0;
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
  SCHEMA_V11
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
