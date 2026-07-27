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
Acceptance: embedded player view styled per the clean-embed mandate (`rel=0` keeps
related videos restricted to the same channel); per-video open-in-browser;
embed-restricted videos detected and routed to browser; opening marks read. **Any**
YouTube video plays in-app: video
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

## Shipped beyond MVP

These landed after MVP scope closed (mostly via direct product-owner requests or
dogfooding, not a formal milestone) and are now permanent, current features. Full
build rationale and history for each lives in `decisions.md`.

### Channel view + follow (D-030)
From any video, channel link, sidebar entry, or search result, an in-app channel page
(avatar, banner, subscriber count, Unsubscribe, open-in-browser) shows the channel's
uploads in strict chronological order — no popularity sort, no "for you" tab.
Subscribing is a real YouTube subscription (`subscriptions.insert`, 50 units,
incremental write scope), synced with the user's YouTube account — the UI is honest
that this also feeds the *YouTube* algorithm on that account. "Follow locally"
(RSS-only, invisible to the YouTube account) is not built — see Accountless mode below.

### YouTube search (D-031)
Focusing `/` and pressing Enter searches YouTube directly — videos and channels across
all of YouTube, including channels the user doesn't follow. It never re-filters the
already-loaded feed (browsing followed channels is the sidebar's job). Results reuse
the feed's own layout/item-size settings and paginate via "Load more results." Pasted
@handle/channel/video URLs resolve via a 1-unit lookup; free-text queries cost 100
units (`search.list`) — the UI communicates this. Search results get the same Shorts
tagging/filtering as the main feed.

### Comments & likes (D-032)
From the player's action bar: like a video (`videos.rate`, 50 units), load comments on
explicit action (`commentThreads.list`, 1 unit — never auto-loaded), post a top-level
comment or reply (`commentThreads.insert`/`comments.insert`, 50 units). There is no
like button on a comment — the YouTube Data API has no endpoint for it. Comment
pagination past the first page and replying to a reply are not built.

### Multiple accounts (D-040/D-041)
More than one Google account can be connected at once. Channel facts are deduped in a
single shared `channels` table; each account's own subscriptions live in a separate
junction table, so two accounts following the same channel never overwrite each
other's row. Feeds combine across all connected accounts by default, with an account
filter in the sidebar. Read/favorite/watch-later state is shared per video, not per
account — one person's "have I seen this" is unified across their own accounts.

### Unsubscribe, favorite channels, and a priority feed section (D-039)
Favoriting a channel surfaces its unread videos in a capped priority section at the
top of the feed, in addition to (never instead of) their normal chronological spot.

### Tray-resident mode, auto-start, and opt-in notifications (D-050, D-052)
Three independent Settings toggles, all default off: auto-start on OS login; closing
the window to a tray icon instead of quitting (keeps the 30-min sync timer running
with no window open); and mechanical new-video OS notifications ("N new video(s) from
{channel}," no re-engagement copy, no streaks/badges). Notification scope is
all-channels or individually-selected channels, with a convenience toggle to keep a
channel's notify flag in sync with its favorite status. Notifications respect the
"Show Shorts" feed setting, plus their own independent "Notify me about new Shorts"
toggle. A fourth toggle, "Start minimized to tray," only applies when auto-start and
background mode are both on.

### Playlists (D-058)
Multiple named, user-ordered, local-only queues — beyond what Watch Later's one single
queue covers. Never a YouTube playlist (readonly scope, D-003) — a Chronicle-only
concept, same rule as read/favorite/watch-later. A playlist has a name, an optional
description (both editable in place from its own screen), a video list (drag-and-drop
reorderable, same mechanism as D-057's Watch Later reorder), and a composite cover built
from its own first 1-6 video thumbnails. Every video card/row everywhere gained an "Add
to Playlist" action opening a checklist dialog (create-and-add inline, no need to set up
a destination first). Unlike Watch Later, opening a video from a playlist never removes
it — removal is its own explicit action. The player's existing "up next" card (D-055)
also covers a playlist context: finishing a video opened from a playlist's own screen
suggests that playlist's own next video instead of Watch Later's.

**Import from YouTube, plus Sync (D-059, Pending decision — implemented, not yet
live-tested by the product owner):** a second toolbar action next to "Create Playlist,"
"Import from YouTube" — paste a playlist URL, and Chronicle creates a new local playlist
pre-named from the source's own title, populated with the same videos in the same order.
A one-time snapshot at import time — it never polls the source in the background. An
imported playlist's own detail screen additionally gains a **Sync** action (only shown
for a playlist that came from an import, never for one made via "Create Playlist"): it
checks, live, whenever that screen is opened, how many videos the source has that the
local copy is missing, and a click pulls just those in. Sync is **add-only** — it never
removes a video the source removed, never reorders, never touches name/description — so
it never clobbers whatever the user has since done to their own copy. See `decisions.md`
D-059 for the exact mechanism (reuses D-029's external-video hydration and the existing
channel-backfill `playlistItems.list` call unmodified for both import and sync) and
`youtube-api.md` for its quota cost.

## Future features (sketches — build nothing yet)

Ordered roughly by expected value. Each must re-pass the `non-goals.md` checklist at
design time.

### Accountless mode + "Follow locally" (D-033, D-030's second follow mechanism)
Local follows would make Chronicle usable **without any Google/YouTube account**:
follow channels via RSS, get the chronological feed, watch via the embedded player,
keep all local states — zero setup beyond installing the app. The onboarding wizard
would become an **optional path** ("Connect a YouTube account") unlocking subscription
import, YouTube search, full metadata hydration, and interactions. Graceful
degradation without an account:
- No `videos.list` hydration → no duration badges, no live status flags (RSS-only
  metadata: title, thumbnail, date, description).
- Shorts detection would still run: without duration-based candidate filtering, every
  new video would need the `/shorts/{id}` HEAD confirmation (zero quota, cached
  forever) instead of only duration-flagged candidates.
- Adding channels by pasted channel URL/@handle; without API access, @handle →
  channelId resolution needs a non-API path (**Assumption to verify:** whether a
  channel page's RSS `<link>` tag or canonical URL exposes the channelId without
  scraping-fragile parsing).

### Local notes
Per-video private notes, FTS5-searchable. Strengthens the "your data" story. Notes
would be part of the user-data export and never pruned.

### In-feed local search
`/` currently triggers YouTube search (D-031) and never filters the loaded feed. This
is a sketch for a separate, DB-wide local search (SQLite FTS across
titles/descriptions/notes) — a different surface from `/`, not an upgrade to it. Never
touches YouTube search (see `non-goals.md`).

### Offline metadata cache hardening
The app already works offline on local data; this would be deliberate offline-first
polish (thumbnail pre-caching policies, TOS-compliant retention windows — see the
storage-policy note in `youtube-api.md`).

### Import/restore of exported data
Completes the export story (`local-data.md` §Import) — machine migration.
