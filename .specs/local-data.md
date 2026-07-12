# Local Data

All Chronicle data lives on the user's machine. This document specifies where, in what
shape, and how the user gets it out.

## Storage engine

**SQLite** (D-008, Pending but high-confidence — see `architecture.md`). Single database
file, WAL mode. Rationale: queryability (date grouping, state filters, future FTS on
notes), atomicity, inspectability by the user (data-ownership bonus: any SQLite browser
can open their data), zero-dependency portability.

## Locations (Final in shape)

Platform-standard app data directories:

| Platform | Data (DB, settings) |
|---|---|
| Linux | `$XDG_DATA_HOME/chronicle/` (default `~/.local/share/chronicle/`) |
| macOS | `~/Library/Application Support/Chronicle/` |
| Windows | `%APPDATA%\Chronicle\` |

- `chronicle.db` — the database.
- `settings.json` — non-sensitive preferences (theme, shortcuts overrides, refresh
  interval). Human-readable/editable on purpose. Read at startup; malformed file →
  defaults + non-blocking warning (never crash on user-edited config).
- Logs: `$XDG_STATE_HOME/chronicle/logs/` (or platform equivalent), plain text, rotated,
  size-capped (default 10 MB total), **never containing tokens or secrets**.
- Secrets are **not** here — they live in the OS keychain (`authentication.md`).
- Wizard screenshots/assets ship inside the app bundle, not app data.

## Schema (v1 draft — Final in shape, columns may grow)

```sql
-- Schema versioning: PRAGMA user_version, forward-only numbered migrations.

CREATE TABLE channels (
  channel_id        TEXT PRIMARY KEY,        -- UC…
  title             TEXT NOT NULL,
  thumbnail_url     TEXT,
  uploads_playlist  TEXT,                    -- UU…
  subscribed        INTEGER NOT NULL DEFAULT 1,  -- 0 = unsubscribed on YT, data retained
  available         INTEGER NOT NULL DEFAULT 1,  -- 0 = channel deleted/terminated
  rss_etag          TEXT,                    -- conditional GET support
  rss_last_modified TEXT,
  last_synced_at    TEXT,                    -- ISO-8601 UTC
  added_at          TEXT NOT NULL,
  subscription_id   TEXT                     -- v3 (B-010): YouTube's subscription resource id,
                                              -- distinct from channel_id — needed for subscriptions.delete
);

CREATE TABLE videos (
  video_id          TEXT PRIMARY KEY,
  channel_id        TEXT NOT NULL REFERENCES channels(channel_id),
  title             TEXT NOT NULL,
  description       TEXT,                    -- truncated (first ~500 chars) — full text on demand
  published_at      TEXT NOT NULL,           -- ISO-8601 UTC; feed sort key
  duration_seconds  INTEGER,                 -- NULL until hydrated
  is_short          INTEGER,                 -- NULL unknown | 0 confirmed not | 1 confirmed Short (D-028)
  live_content      TEXT,                    -- none | live | upcoming (from liveBroadcastContent)
  thumbnail_url     TEXT,
  hydrated_at       TEXT,                    -- NULL = RSS-only, awaiting videos.list
  fetched_at        TEXT NOT NULL,
  view_count        INTEGER                  -- v2 (D-018): captured at hydration, NULL until then
);
CREATE INDEX idx_videos_feed ON videos (published_at DESC);
CREATE INDEX idx_videos_channel ON videos (channel_id, published_at DESC);

CREATE TABLE video_state (               -- D-010 model: status + orthogonal flags
  video_id          TEXT PRIMARY KEY REFERENCES videos(video_id),
  read_status       TEXT NOT NULL DEFAULT 'unread',  -- unread | read | ignored
  favorite          INTEGER NOT NULL DEFAULT 0,
  watch_later       INTEGER NOT NULL DEFAULT 0,
  watch_later_pos   INTEGER,                 -- queue order; NULL when not in queue
  status_changed_at TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);
CREATE INDEX idx_state_status ON video_state (read_status);

CREATE TABLE sync_log (                  -- observability without telemetry: local only
  id                INTEGER PRIMARY KEY,
  started_at        TEXT NOT NULL,
  finished_at       TEXT,
  trigger           TEXT NOT NULL,           -- launch | manual | timer
  channels_polled   INTEGER, videos_new INTEGER,
  quota_spent       INTEGER,                 -- our own accounting (see youtube-api.md)
  outcome           TEXT                     -- ok | partial | failed | quota
);

CREATE TABLE meta (                      -- misc durable key-values (profile id, consent-
  key TEXT PRIMARY KEY, value TEXT         -- screen publishing status, wizard progress)
);
```

Design notes:
- `channels` also holds rows with `subscribed = 0` for channels of externally opened
  videos (D-029) and unsubscribed-but-retained channels; feed queries filter on
  `subscribed = 1`. A `followed_locally` flag is anticipated for local follows (D-030) —
  feed membership then becomes `subscribed = 1 OR followed_locally = 1`.
- `videos` (facts from YouTube) and `video_state` (the user's data) are **separate tables
  on purpose**: they have different owners, different lifecycles, and different
  export/privacy meaning. A video row can be re-fetched/updated freely; a state row is
  precious and only the user's actions touch it.
- `video_state` rows are created lazily on first state change; absence = unread default.
  (Keeps the table small and makes "user data export" exactly this table + notes later.)
- Quota accounting is client-side estimation (`sync_log.quota_spent`) since Google offers
  no runtime quota-remaining API (**Assumption:** still true — verify).
- Future tables already anticipated (do not build yet): `categories`,
  `channel_categories`, `notes(video_id, body, updated_at)` with FTS5, `filters`.
  Nothing in v1 blocks them.

## Migrations (Final)

- `PRAGMA user_version`-based, forward-only, numbered, applied transactionally at startup
  by the backend before anything reads the DB.
- Every migration ships with the app version that introduced it; downgrading the app
  across a schema version is unsupported (documented; the export path is the safety net).
- A migration failure leaves the previous DB intact (transactional) and surfaces a
  startup error with the export/backup path offered.

## Retention (Final in shape)

- Videos and states are kept indefinitely by default — disk cost is trivial (metadata
  only; ~1 KB/video → 100k videos ≈ 100 MB worst case) and "user owns their data" implies
  not deleting it behind their back.
- Settings offer optional pruning: "remove videos older than N months **that have no
  state row** (never read/favorited/queued/noted)". Favorites/notes are never pruned
  automatically. **D-020 (Pending):** default off vs. on-at-24-months.
  Recommendation: off by default.

## Export / import (Final in shape; format detail at implementation)

- **Export (MVP requirement):** one action in Settings produces a single JSON file:
  schema version, export date, channels (id, title, subscribed), videos (ids + core
  metadata), full `video_state`, settings. Documented format (a `FORMAT.md` ships in the
  repo) — the promise is "you can leave with everything."
- **Import (post-MVP but schema-stable now):** restore states by `video_id` match —
  enables machine migration. Conflict rule: imported state wins only if
  `status_changed_at` is newer.
- The SQLite file itself is also a legitimate backup artifact; docs will say so.

## Privacy invariants (Final)

- No data leaves the machine except requests to Google APIs (and the video player’s own
  traffic, `playback.md`).
- No telemetry, no crash upload, no update pings carrying identifiers (D-011).
- Deleting the app data directory + the keychain entries removes every trace of
  Chronicle; a "Delete all local data" settings action does both.
