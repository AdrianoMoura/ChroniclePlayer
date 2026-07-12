# Features

MVP features are specified here at the level implementation can execute against, with
pointers into the detailed specs. Future features are sketched with enough rationale to
guide architectural headroom — they are **not** commitments.

## MVP (Final scope)

### 1. OAuth authentication (own credentials)
Full spec: `authentication.md`, `onboarding.md`.
Acceptance: a new user with only a Google account reaches an authenticated state entirely
through the wizard; tokens live in the OS keychain; `youtube.readonly` is the only scope;
app remains usable on local data when auth expires.

### 2. Onboarding wizard
Full spec: `onboarding.md`. This *is* an MVP feature with the same priority as the feed.
Acceptance: all 8 steps implemented with explanations, screenshots, open-page buttons,
copy buttons, and the validations specced; resumable; re-enterable from Settings.

### 3. Import subscriptions
Full spec: `youtube-api.md` §Subscription import.
Acceptance: paginated `subscriptions.list` import; diffing re-sync (manual button +
weekly auto); unsubscribed channels retained locally as specced.

### 4. Chronological subscriptions feed
Full spec: `feed.md`; layout `ui.md`.
Acceptance: Today/Yesterday/This Week/Earlier grouping in local time; strict
`publishedAt` desc order; continuous-scroll loading of the local archive with on-demand
backfill (D-027); new-video pill; caught-up state; virtualized rendering to 10k+ rows.

### 5. Refresh subscriptions feed
Full spec: `youtube-api.md` §Refresh policy + D-007 hybrid source.
Acceptance: launch/manual/timer triggers; RSS discovery + batched hydration; per-channel
failure isolation; quota accounting written to `sync_log`; all failure states from the
failure table surfaced per `ui.md`.

### 6. Watch videos — any video (universal opening)
Full spec: `playback.md` (D-006 Final: clean embedded IFrame player; D-029 Final:
universal opening).
Acceptance: embedded player view styled per the clean-embed mandate, end-overlay
suppressing related videos; per-video open-in-browser; embed-restricted videos detected
and routed to browser; opening marks read. **Any** YouTube video plays in-app: video
links in descriptions open in the player (navigation stack with back), pasted URLs open
via Ctrl+O; externally opened videos are hydrated (1 unit), never enter the feed, and
accept favorite/watch-later.

### 7. Video states: mark as watched, ignore, favorite, Watch Later
Full spec: `feed.md` §state model (D-010), storage `local-data.md`.
Acceptance: all transitions available via keyboard + row actions with inline undo;
states are local-only; Watch Later is an ordered queue with its own view; Favorites and
Ignored have views; unread count is mechanical.

### 8. Data export
Full spec: `local-data.md` §Export.
Acceptance: one-click JSON export of channels/videos/states/settings in the documented
format. (Small feature, but it is the "user owns their data" promise made concrete —
it ships in MVP.)

### 9. Shorts visibility (D-028, Final — reversed 2026-07-12 by B-028)
Full spec: `feed.md` §Shorts.
Shorts are shown in the feed like any other video, tagged with a "Short" badge, with a
"Show Shorts" Settings toggle (default on) to hide them. Acceptance: detection pipeline
(duration candidate signal + `/shorts/{id}` HEAD confirmation, cached in
`videos.is_short`) runs inside sync unchanged; confirmed Shorts are tagged, count as
unread, and disappear from every view (including Watch Later/Favorites) only while the
toggle is off.

## Future features (sketches — build nothing yet)

Ordered roughly by expected value. Each must re-pass the `non-goals.md` checklist at
design time.

### Channel view + follow — the discovery feature (D-030, Final; post-MVP #1)
From any video (or channel link), an in-app channel page: channel header + its uploads in
strict chronological order — no popularity sort, no "for you" tab. From there, two follow
mechanisms (recommendation: offer **both** — they serve different intents):
- **Subscribe on YouTube** — real subscription via `subscriptions.insert` (50 units),
  using incremental authorization: the write scope is requested only at first use
  (see `authentication.md`). One canonical list, synced with the user's YouTube account.
  Honest caveat surfaced in the UI: subscribing on YouTube also feeds the *YouTube*
  algorithm on the user's account.
- **Follow locally** — Chronicle-only, via the channel's RSS feed; invisible to the
  user's YouTube account. For channels the user wants in the feed without any
  account-side effect. Marked distinctly in the sidebar; included in exports.
This completes the discovery loop specced in `vision.md`: creator link → watch → visit
channel → follow — all human decisions. Decided (D-030): **both mechanisms ship**.

### Accountless mode (D-033, Final in principle; lands with D-030)
Local follows make Chronicle usable **without any Google/YouTube account**: follow
channels via RSS, get the chronological feed, watch via the embedded player, keep all
local states — zero setup beyond installing the app. The onboarding wizard becomes an
**optional path** ("Connect a YouTube account") that unlocks: subscription import,
YouTube search (D-031 — the API requires credentials), full metadata hydration, and
interactions (D-032). Graceful degradation without an account:
- No `videos.list` hydration → no duration badges, no live/premiere flags (RSS-only
  metadata: title, thumbnail, date, description).
- Shorts detection (D-028) still runs: without duration-based candidate filtering,
  **every** new video gets the `/shorts/{id}` HEAD confirmation (zero quota, cached
  forever, bounded concurrency) — costlier in requests, same tagging guarantee.
- Adding channels: by pasted channel URL/@handle. Without API access, @handle → channelId
  resolution needs a non-API path (**Assumption to verify:** the channel page's RSS
  `<link>` tag or canonical URL exposes the channelId without scraping-fragile parsing;
  if not, accountless follow requires full channel URLs, and the UI says so honestly).
- The UI hides (not disables-with-nag) account-gated features; one quiet "Connect
  account" entry in the sidebar/settings explains what connecting adds.

### YouTube search (D-031, Final in shape; ships with D-030)
Real, YouTube-style search: the user types a query (Ctrl+K or the search affordance) and
finds **videos and channels across all of YouTube**, including channels they don't
follow. Results render as a list (thumbnail, title, channel, date, duration), videos
open in Chronicle's player (D-029), channels open in the channel view (D-030) with
follow actions. Guardrails: the tool is inert until a query is typed; results are never
injected into the feed or any other view; no query history-based suggestions.
Cost design: pasted **@handle or channel/video URL** resolves via
`channels.list`/`videos.list` (1 unit — detected and used automatically); free-text
queries use `search.list` (100 units — fine for deliberate use, ~100 queries/day of
headroom; the UI communicates quota use honestly). Search result videos get Shorts
tagging/filtering like everything else (D-028).

### YouTube interactions: like & comment (D-032; after search/discovery)
User-initiated interactions on YouTube, from the player view: **like** a video
(`videos.rate`, 50 units), **read comments** (explicit "load comments" action —
`commentThreads.list`, 1 unit — flat, chronological) and **write a comment**
(`commentThreads.insert`, 50 units). Unlocked via incremental scope on first use
(`authentication.md` §D-032). Hard rule: Chronicle never *prompts* interaction — no
"like this video?" nudges, no comment-count badges in the feed; the affordances sit
quietly in the player's action bar. Like state read/display requires `getRating`
(via `videos.getRating`, 1 unit) — fetched only when the player view opens, post-grant.

### OS-level YouTube link handler (opt-in)
Register Chronicle as a handler so YouTube links from anywhere (chat apps, browsers via
extension, terminals) open in the player view (D-029's natural extension). Strictly
opt-in; never hijacks defaults silently.

### Hide live streams / premieres / duration filters
`liveBroadcastContent` and `duration_seconds` are captured from day one; these are pure
feed-query filters + settings UI. Include per-channel overrides (e.g., "hide live
except for channel X").

### Channel categories & folder organization
User-defined groups of channels (sidebar folders → feed filtered to the folder).
Schema anticipated in `local-data.md` (`categories`, `channel_categories`). Interacts
with unread counts (per-folder badge). Purely local; never synced.

### Local notes
Per-video private notes, FTS5-searchable. Strengthens the "your data" story. Notes are
part of the user-data export and are never pruned.

### Playlist management (local)
Beyond Watch Later: multiple named local queues. Only if users ask; Watch Later covers
the core need. (YouTube-side playlist management is out — readonly scope, D-003.)

### Offline metadata cache hardening
The app already works offline on local data; this feature is about deliberate
offline-first polish (thumbnail pre-caching policies, TOS-compliant retention windows —
see the storage-policy note in `youtube-api.md`).

### Opt-in mechanical notifications
Per-channel, default-off OS notifications for new uploads. Must remain mechanical
(no batching "engagement" logic, no re-engagement copy). Requires tray-resident or
scheduled background refresh — a real architectural addition; do not underestimate.

### In-feed local search
`/` currently filters loaded rows (`ui.md`); this upgrades it to DB-wide local search
(SQLite FTS across titles/descriptions/notes). Never touches YouTube search
(see `non-goals.md`).

### Multiple profiles
Separate Google identity + DB per profile (`authentication.md` §Multi-account).
Secret-store keys are profile-scoped from day one to keep this cheap.

### Import/restore of exported data
Completes the export story (`local-data.md` §Import) — machine migration.

### Read-only comments (explicitly optional — see non-goals.md)
If ever: loaded on explicit click only, flat, chronological, no reply/like affordances.
`commentThreads.list` = 1 unit. Decision deferred until real user demand exists.
