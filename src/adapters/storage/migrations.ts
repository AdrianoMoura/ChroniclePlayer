import type { Database } from 'better-sqlite3'

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

const migrations: readonly string[] = [SCHEMA_V1]

export function migrate(db: Database): void {
  const applyNext = db.transaction((sql: string, nextVersion: number) => {
    db.exec(sql)
    db.pragma(`user_version = ${nextVersion}`)
  })
  let version = db.pragma('user_version', { simple: true }) as number
  while (version < migrations.length) {
    applyNext(migrations[version], version + 1)
    version += 1
  }
}
