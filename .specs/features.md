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

**Several of these sketches shipped ahead of schedule via the dogfooding batches**
(`bugs.md`) rather than waiting for a formal post-MVP milestone — each shipped item is
annotated inline below with what actually landed vs. what's still sketch-only. Two
shipped features have **no sketch here at all** because they were reported directly as
dogfooding items, not planned in advance: **unsubscribe** (`subscriptions.delete`,
[[B-010]] in `bugs.md`) and **favorite channels + a priority feed section** for their
unread videos ([[B-042]], D-039 in `decisions.md`).

### Channel view + follow — the discovery feature (D-030, Final; post-MVP #1)
**Partially implemented 2026-07-12.** Of the two follow mechanisms below, **"Subscribe
on YouTube" is shipped** (B-009's search results carry a Subscribe button;
[[B-010]] added Unsubscribe from the sidebar/channel screen) — see D-030 in
`decisions.md`. **"Follow locally" is not built.** The **in-app channel page**
(`bugs.md` [[B-056]], implemented 2026-07-13): a compact header (avatar, banner image,
subscriber count, Unsubscribe, open-in-browser) above the existing channel-filtered
feed — deliberately a slim strip rather than YouTube's full-height banner (D-004: content
fills the screen). Banner/subscriber count come from `channels.list`
(`part=brandingSettings,statistics`, 1 unit), fetched live on every visit rather than
cached in the DB.
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
**Implemented 2026-07-12 (B-009).** Shipped shape initially differed from the sketch
below in one way the sketch didn't anticipate: it launched with a "Mine"/"YouTube" scope
toggle and a local-filter-while-typing behavior that turned out confusing in practice —
**dropped 2026-07-12 (`bugs.md` [[B-054]]):** the `/` filter is now a YouTube-search
trigger only (still explicit-Enter, per the cost design below), and never re-filters the
already-loaded feed; browsing local subscriptions stays the sidebar channel list's job.
**Results UX shipped 2026-07-13 (`bugs.md` [[B-055]]):** results reuse the feed's
item-size/layout settings (list rows or grid cards, same as the main feed); the
grid/list toggle hides itself while search is active (the size slider stays — it still
applies); `pageToken`/`nextPageToken` are wired through a "Load more results" button;
channel results get a circular avatar and subscriber count instead of the video-thumb
treatment; video results get the same Short badge as the main feed and respect the
"Show Shorts" setting (duration-heuristic only — no HEAD-probe confirmation step for a
transient result list, unlike the synced feed's D-028 pipeline). The @handle/URL
cheap-path vs. free-text `search.list` cost split described below did ship as designed.

The original sketch, for reference: real, YouTube-style search — the user types a query
and finds **videos and channels across all of YouTube**, including channels they don't
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
**Implemented 2026-07-12 ([[B-006]]).** Shipped as designed below, with one API gap
discovered during implementation, not a product choice: the YouTube Data API v3 has no
endpoint to like a *comment*, only videos — comment `likeCount` is shown read-only, no
like button exists or can exist for comments (recorded permanently in `decisions.md`
D-032). Still rough per `bugs.md` [[B-062]]: comment pagination is wired at the API/IPC
layer but unused by the UI ("load more" doesn't exist), and replying to a reply (not
just a top-level comment) isn't supported yet.

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

### Tray-resident mode, auto-start, and opt-in mechanical notifications (D-050)
**Implemented 2026-07-16.** Full design/rationale: `decisions.md` D-050. Three fully
independent Settings toggles, **all default off** — none gates any other:
- **Auto-start** — launch Chronicle on OS login.
- **Run in background** — closing the window hides it instead of quitting; a tray icon
  offers Open Chronicle / Refresh now / Quit. This keeps the existing 30-min sync timer
  (D-016) running with no window open.
- **New-video notifications** — mechanical only ("N new video(s) from {channel}",
  click-through opens Chronicle; no re-engagement copy, no streaks/badges —
  `non-goals.md`). **Not gated on "Run in background"**: the only real requirement for
  a notification to fire is that the app process is running at all, which is already
  true any time the window is open (even minimized) — "Run in background" just extends
  *when* that's true, it isn't a prerequisite. Settings shows an informational note
  near the toggle when "Run in background" is off, never a disabled control (a
  corrected assumption from this decision's first, spec-only pass — the product owner
  caught that the original design wrongly disabled the toggle).

**Notification scope, redesigned same day (2026-07-16, owner's own written spec) —
see `decisions.md` D-050's revision for the full rationale.** One segmented choice:
**All Channels** (ignores the per-channel notify flag — everyone notifies) ·
**Selected Channels** (respects it). "Favorites only" is gone as a distinct scope;
in its place, a separate convenience toggle, **"Automatically notify for channels I
favorite,"** syncs the per-channel `notify` flag to match a channel's favorite state
at the moment either is toggled — a one-shot nudge, not a live binding, so a later
manual per-channel change always sticks until the next favorite/unfavorite. Enabling
the convenience toggle immediately bulk-applies it to every current favorite (no
confirmation); disabling it always takes effect immediately but asks whether to also
bulk-clear notify from current favorites, via a confirm dialog reusing the existing
write-scope-gate visual pattern. **Configuration is never destroyed by mode
switches:** neither `notifyScope` nor the global on/off ever writes to the per-channel
flag — both are pure read-side filters, so a "Selected Channels" configuration
survives being temporarily ignored (global off, or scope set to "All") and reappears
exactly as left. Favorite and Notify are independent per-channel properties exposed
identically in two places, always in sync: a **directly clickable, always-visible
icon** (`●` filled / `○` outline — plain glyph matching the existing `★`/`☆` favorite
convention, no emoji) placed immediately before the sidebar row's "⋯" button (shown
only when the icon would actually mean something: `notifyNewVideos && notifyScope ===
'selected'`), and an identical control on the channel details page next to the
existing Favorite button.

Real architectural addition — lands in the `platform/` layer (`architecture.md`'s
existing reservation for tray/window-mgmt): `src/platform/tray.ts` (Electron `Tray`,
cross-platform), `src/platform/linux-autostart.ts` (hand-written XDG `.desktop`
autostart entry — Electron's `app.setLoginItemSettings()` only covers Windows/macOS,
no native module either way, D-034). Windows/macOS auto-start and notification
behavior are unverified — the product owner's hands-on testing is Linux-only (see
D-050's own risk note in `decisions.md`); each capability feature-detects and disables
itself silently rather than throwing if unsupported on a given platform. **Also fixed
same day:** a missing `app.requestSingleInstanceLock()` was the root cause of
duplicate/stuck tray icons the owner hit on first live use — relaunching the app while
a prior tray-resident instance was still alive (impossible before this feature, since
closing the window used to always quit) spawned an independent second process with
its own icon; a second, narrower bug in the tray-destroy ordering was fixed alongside
it. The like button's pre-existing 👍 emoji was also dropped to plain text in the same
pass, per the owner's no-emoji direction, unrelated to D-050 itself.

**Further same-day polish and a live-tested tray fix.** The ●/○ dot glyphs were
replaced with a small inline monochrome SVG bell (`src/ui/icons.tsx`) once emoji were
ruled out for the shape too (Unicode has no non-emoji bell character). Favorite also
moved out of the sidebar's "⋯" menu into its own always-visible ★/☆ row button
(same pattern as the notify icon), leaving only Unsubscribe in the menu. The tray
duplication bug persisted even after the single-instance-lock fix, within one running
process — live D-Bus introspection during a stuck-icon state showed **zero** live
Chronicle tray registrations while ghost icons stayed visible and unresponsive,
narrowing the fault to the tray host (the owner's QuickShell setup) not reliably
processing `destroy()` while the process stays alive, though it does clean up
correctly on full process/connection death. Rather than keep fighting a host-side
limitation with unproven workarounds, **the tray is now created once and never
destroyed until real app quit** — the setting still fully controls whether closing
the window quits the app or just hides it, the one accepted trade-off being that an
already-shown icon lingers until Chronicle actually quits rather than disappearing
the instant the toggle goes off mid-session.

**"Start minimized to tray"** was added as a fourth toggle — relevant when
auto-start and "Run in background" are both also on, so the app can launch straight
to the tray with no window, rather than opening one just to be immediately usable
from the tray anyway. Detecting *why* a launch happened turned out platform-split:
macOS reports it natively (`wasOpenedAtLogin`); Windows has no equivalent per-launch
signal, so a `--hidden` flag is baked into the login item's own arguments (Electron's
`path`/`args` are Windows-only — no equivalent exists for macOS); Linux reuses the
same flag on its hand-written `.desktop` entry. Two more real auto-start bugs were
caught and fixed in the same pass, both found by checking rather than assuming:
`process.execPath` alone only identifies Chronicle in a packaged build — running from
source it's the bare Electron binary with nothing to load, fixed by passing the
project entry point as an argument in dev; and an AppImage's `process.execPath`
resolves *inside its own temporary mount*, which vanishes the moment that run exits —
autostart would have silently broken on the very next login despite working during
the session that enabled it, fixed by preferring `$APPIMAGE` (the runtime's own stable
path to the actual file) whenever present.

**Shorts and notifications, fixed and extended (D-052).** New-video notifications
originally counted Shorts identically to any other video, with no way to exclude
them — turning off "Show Shorts" (`showShorts`, B-028) hid them from the feed but
left them still triggering notifications. Fixed: a Short hidden from the feed now
never notifies either, no matter what else is set. On top of the fix, a new
**"Notify me about new Shorts"** toggle (`notifyShorts`, default on, shown only while
`showShorts` is on) covers the remaining case — some channels post Shorts often
enough that a user may want them in the feed but silent for notifications, without
hiding them outright. Full rationale: `decisions.md` D-052.

### In-feed local search
`/` currently filters loaded rows (`ui.md`); this upgrades it to DB-wide local search
(SQLite FTS across titles/descriptions/notes). Never touches YouTube search
(see `non-goals.md`).

### Multiple accounts
**Implemented 2026-07-12 ([[B-003]]) — shipped design differs from this sketch's
original "separate DB per profile" idea, corrected here.** Rather than a separate
database per profile, several authenticated **accounts share one database**: channel
facts (title, uploads playlist, RSS validators) are deduped in a single `channels`
table, and each account's own subscription list is a row in an `account_channels`
junction table (D-040 in `decisions.md` — a plain `account_id` column on `channels` was
considered and rejected, since it would let a second account's subscribe silently
overwrite the first account's row for a channel both follow). Secret-store keys *are*
per-account as this sketch anticipated (`accountSecretKeys`, one shared OAuth client).
Feeds from all accounts combine in listings by default, with an account filter in the
sidebar. `video_state` (read/favorite/watch-later) stays account-agnostic by design —
one shared unread/favorite state per video, not per account. Not built: fully
accountless mode (D-033) — every account here is still a real, authenticated Google
account.

### Import/restore of exported data
Completes the export story (`local-data.md` §Import) — machine migration.

### ~~Read-only comments (explicitly optional — see non-goals.md)~~ — superseded by D-032
This sketch predated the decision to build full read/write/reply comments, not just
read-only. Superseded 2026-07-12: see "YouTube interactions: like & comment" above,
implemented via [[B-006]].
