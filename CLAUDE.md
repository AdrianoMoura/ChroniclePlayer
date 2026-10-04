# Chronicle Player

Chronicle (Chronicle Player) is a **desktop-first YouTube client** that recreates the
pre-algorithm YouTube experience: a chronological feed of the channels *you* subscribed to,
and nothing else. It is a better client for YouTube content — not a YouTube replacement.
Videos always come from YouTube.

## Vision in one paragraph

The Subscriptions page **is** the application. There is no algorithmic Home, no
recommendations, no Shorts-style swipe feed, no infinite scroll, no engagement
optimization. The user opens
Chronicle and sees their subscriptions grouped chronologically (Today / Yesterday / This
Week / Earlier). The user owns their credentials, their API quota, and their data — all of
it lives locally on their machine.

## Philosophy (non-negotiable)

**The governing principle is agency, not austerity**: Chronicle does not limit what the
user can do — they can watch anything, search all of YouTube, follow, like, comment. What
it removes is the algorithm's will: nothing on screen was put there by an engagement
model. The test for any feature is "who is driving?" — the user, or an algorithm.

These principles override convenience, features, and even performance shortcuts:

1. **Local-first** — all user data lives on the user's machine. No Chronicle servers exist.
2. **Privacy-first** — no telemetry, no analytics, no phoning home. Ever.
3. **User owns the credentials** — each user creates their own Google Cloud project and
   OAuth client. Chronicle ships **zero** embedded credentials.
4. **User owns the quota** — API costs are the user's own Google quota; Chronicle must be
   frugal with it (see `.specs/youtube-api.md` for the quota budget).
5. **No engagement mechanics** — nothing autoplays into unrelated content, nothing is
   promoted, no infinite scroll, no badges/streaks/notifications designed to pull the user back.
6. **Minimal, fast, predictable UI** — RSS-reader aesthetics, keyboard-driven, dark-mode
   first. The same action always produces the same result.

If a proposed feature conflicts with these, the feature loses. Check `.specs/non-goals.md`
before adding anything feed- or discovery-related.

## Where the truth lives

**`.specs/` is the single source of truth for requirements and design.** Do not redefine
requirements in code comments, PR descriptions, or ad-hoc conversations — reference the spec.

| Spec | Covers |
|---|---|
| `.specs/README.md` | Index, document conventions, status labels |
| `.specs/vision.md` | Product vision, target user, experience goals |
| `.specs/non-goals.md` | What Chronicle will never do, and why |
| `.specs/architecture.md` | Layers, module boundaries, process model, IPC |
| `.specs/authentication.md` | Own-credentials OAuth model, token lifecycle, secure storage |
| `.specs/onboarding.md` | The setup wizard (a flagship feature, not a chore) |
| `.specs/youtube-api.md` | Endpoints used, quota budget, RSS strategy, rate limits |
| `.specs/feed.md` | Chronological feed rules, grouping, video states |
| `.specs/local-data.md` | SQLite schema, state model, export/backup |
| `.specs/playback.md` | How videos are watched (embedded YouTube IFrame player, D-006 Final) |
| `.specs/ui.md` | Layout, navigation, keyboard shortcuts, visual language |
| `.specs/features.md` | MVP feature specs + future feature sketches |
| `.specs/roadmap.md` | Milestones and sequencing |
| `.specs/decisions.md` | Decision log (ADR-style): Final / Pending / Assumptions |
| `.specs/code-guidelines.md` | Operational source-code rules found by review: file size, reuse, comments, test coverage |

## Documentation rules

- Every substantive design choice gets an entry in `.specs/decisions.md` with an ID
  (`D-NNN`), a status, and a rationale. Statuses: **Final**, **Pending** (recommendation
  exists, user has not confirmed), **Superseded**.
- Specs distinguish four kinds of statements, labeled inline where ambiguity is possible:
  **Final decision**, **Pending decision**, **Assumption**, **Future idea**.
- When implementation reveals a spec is wrong or incomplete, **update the spec in the same
  change** — the spec must never lag behind reality.
- Never silently resolve a Pending decision in code. Either ask the user or implement the
  recommended option **and** flag in your summary that a Pending decision was exercised.
- Capture *why*, not just *what*. A decision without rationale will be re-litigated.

## How future Claude sessions should behave

1. **Read the relevant spec(s) before implementing anything.** Implementation tasks should
   reference spec sections instead of restating requirements.
2. **Check `.specs/decisions.md` first** when a task touches an area with pending decisions
   (framework, playback, feed source). Do not pick a different option than the recommended
   one without user confirmation.
3. **Respect the quota budget** in `.specs/youtube-api.md`. Any new API call must state its
   quota cost and be justified against the budget.
4. **Never add** algorithmic recommendation logic, trending, engagement mechanics,
   telemetry, or embedded credentials — see `.specs/non-goals.md`. (User-initiated
   capabilities — search, subscribe, like, comment — are in scope; see D-030/D-031/D-032.)
5. **Keep layers clean** per `.specs/architecture.md`: domain logic never imports YouTube
   client code or UI code; the frontend never talks to Google directly.
6. When a task is ambiguous, prefer the interpretation that is simpler, more local, and
   more predictable.

## Coding conventions

(The stack is still Pending — see D-005/D-009 in `.specs/decisions.md`. These conventions
apply regardless of the final stack; refine them once the stack is confirmed.)

- **TypeScript everywhere it applies**: `strict: true`, no `any` in domain code.
- **Module boundaries are enforced by directory structure** — `core/` (domain) has zero
  dependencies on `adapters/` (YouTube, storage, keychain) or `ui/`. Adapters implement
  interfaces defined by `core/`.
- **All external I/O behind interfaces** — YouTube API, RSS, clock, storage, and secret
  store are injectable so the domain is testable offline and every part is replaceable.
- Errors are values at boundaries: adapter failures (network, quota, auth expiry) map to
  typed domain errors; the UI decides presentation.
- No global mutable state; explicit dependency injection at composition root.
- Tests: domain logic gets unit tests (offline, no network); adapters get contract tests
  against recorded fixtures. Never call the real YouTube API in tests.
- Naming: plain, boring, descriptive. No cleverness.
- Comments only for constraints the code cannot express (e.g., quota costs, TOS
  requirements, Google API quirks).

## Implementation workflow

1. Pick a milestone task from `.specs/roadmap.md`.
2. Read the spec sections it references; list any Pending decisions it depends on and get
   them confirmed (or explicitly proceed with the recommendation, flagging it).
3. Implement inside the correct layer; add/adjust tests.
4. Update specs if reality diverged from them (same commit/PR).
5. Verify end-to-end behavior, not just unit tests — especially anything touching OAuth or
   quota, using the developer's own test credentials.
6. Summarize what was built, which spec sections it satisfies, and any decisions exercised.

## Current state of the repository

**M0–M5 implemented on 2026-07-11** (M2 exit verified with the product owner's real
account: 229 subs, 76 quota units, 937 Shorts excluded; M3 in dogfooding; M4 awaiting
console screenshots + external acid-testers; M5 done — the MVP is feature-complete
from source). Bugs found while dogfooding go to `.specs/tracker-current.md` as B-NNN entries and
are only fixed when the product owner says so — stack: Electron (D-005) +
React/TypeScript (D-009) via electron-vite, **node:sqlite** (D-034 as amended — no
native modules), npm (D-034 — the product owner uses npm, never pnpm). Layers per
`architecture.md`, boundaries enforced by dependency-cruiser in `npm run lint`. In:
data spine (schema v1 repositories, keyset pagination D-027, D-010 states, five views,
virtualized keyboard-first feed UI); the full M2 machinery — OAuth PKCE + loopback,
safeStorage-backed secret store (D-013), YouTube API + RSS clients, hybrid SyncService
(D-007) with per-channel isolation + gap backfill + Shorts pipeline (D-028), quota
accounting, 30-min refresh timer (D-016), startup connection validation (D-012),
backend→UI events, connect panel + banners + sidebar channel list; `docs/setup.md`.
Also in: the M3 player (clean embed via postMessage widget protocol, universal opening
D-029, navigation stack, thumb:// LRU thumbnail cache, themes, new-videos pill), the
M4 onboarding wizard (10 screens, D-014 checkbox+mapping validation, resumable state,
screenshot pipeline with captures pending) and the M5 surface (schema v2 view counts,
settings.json + Settings view with wizard re-entry points, JSON export per FORMAT.md,
delete-all, README). Everything contract-tested offline (in-memory SQLite, fake fetch —
never the real API). Dev fixtures require `CHRONICLE_FIXTURES=1`.

**M6 (packaging + release pipeline) is in progress** — see `.specs/roadmap.md` for the
authoritative status. Landed: `ci.yml` (typecheck+lint+test on push/PR), `release.yml`
(tag-triggered matrix build across Linux/macOS/Windows, publishes a draft GitHub
Release), `electron-builder` config (AppImage/dmg/nsis), the real branded app icon,
the GitHub-Releases-API update check (D-026), and version 0.1.0. Still open: wizard
screenshots, and cutting a real tag to exercise the release workflow end-to-end on
GitHub Actions. Run `npm run typecheck && npm run lint && npm test` locally before
committing.

**D-050 (tray-resident mode, OS auto-start, opt-in per-channel notifications, "Start
minimized to tray") shipped in `0.4.0`, 2026-07-16** — a post-MVP feature the product
owner asked for directly, not sourced from `tracker-current.md`. Three independent
Settings toggles (none gates another); per-channel `notify` is its own property (schema
v9), scoped All Channels/Selected Channels, with an auto-sync-on-favorite convenience
(confirm-on-disable dialog) rather than a separate "Favorites" scope. Landed in
`platform/` (`tray.ts`, `linux-autostart.ts`) per `architecture.md`'s own reservation.
Several real bugs were caught and fixed only once the product owner live-tested an
actual build: a missing `app.requestSingleInstanceLock()` (root cause of duplicate tray
icons across relaunches once closing the window stopped always quitting the app); a
tray-host staleness bug (confirmed via live D-Bus introspection, not guesswork) worked
around by never destroying the tray mid-session, only at real quit; and three
auto-start bugs — dev mode's bare-Electron-binary launch, an AppImage's
temporary-mount `process.execPath` (would have silently broken on the very next login),
and the platform-split "was this launch from autostart" detection (`wasOpenedAtLogin`
on macOS, a `--hidden` arg on Windows/Linux) needed for "Start minimized." Full
narrative in `decisions.md` D-050 — no `tracker-history/` file, since this didn't come
through the bug tracker. See `.specs/roadmap.md` §Release status for the exact shipped
scope.

**`0.4.1` shipped 2026-07-16 as a same-day revert, no `tracker-history/` file of its own**
(same pattern as `0.4.0`/`0.2.1`): B-108's round 2 fix (a frozen-position
`.player-scroll-catcher` strip added to forward wheel scroll into the embedded video)
turned out to sit over the app's own top-of-screen controls during/after a scroll
gesture, silently swallowing clicks meant for them. Removed the whole mechanism on the
owner's request — B-108 reverts to Open, the original cross-origin-iframe scroll gap
unaddressed again. Full narrative in `tracker-current.md`'s B-108 entry.

**D-051 (pop-out-or-pause on tray-close) shipped in `0.4.2`, 2026-07-16** — another
direct product-owner request, not sourced from `tracker-current.md`, same pattern as
D-050. Prompted by a real bug the owner hit live: closing the window to the tray
(`backgroundMode`, D-050) just hides it, so a still-playing video kept playing silently
with no easy way to stop it short of reopening from the tray. New
`SettingsDto.popOutOnClose` (default true, shown only when `backgroundMode` is on):
true pops the current video into the always-on-top extract window (same as `p`) so
closing *that* window actually stops it; false pauses it in place. `extractPlayer`
gained an `auto` flag (so an auto-popped window's close doesn't restore playback into
the still-hidden main window) and, per the owner's own same-session follow-up, a
`title` parameter so the extract window's OS-level window title differs from the main
window's instead of both reporting "Chronicle" (relevant on Wayland compositors like
the owner's niri, which track per-window `title` separately from the app-wide
`app_id`). One regression was caught by the owner's own live test and fixed the same
session: the on-screen Extract button briefly stopped popping the video out (it just
closed the player) once `extractToWindow` gained a parameter — a raw `onClick={onExtract}`
binding forwards React's `MouseEvent` to the handler regardless of its declared type,
and that event isn't structured-cloneable over IPC. Fixed by splitting the logic into a
parameterized `extractToWindowInternal` plus a permanent zero-arg `extractToWindow`
wrapper safe to bind to any click/key handler. Full narrative in `decisions.md` D-051 —
no `tracker-history/` file, since this didn't come through the bug tracker. See
`.specs/roadmap.md` §Release status for the exact shipped scope.

**B-111 (dock/pop-out firing on a genuinely paused video) shipped in `0.4.3`,
2026-07-16** — a normal bug-tracker fix, reported and Fixed the same day. Leaving the
full-view player, or closing the window to the tray (D-050's `backgroundMode`), while
the video was actually paused still docked the miniplayer or popped it into the
always-on-top extract window (D-051) as if it were still playing. The owner's own live
narrowing was the key clue: it reproduced when pausing by clicking the video itself, but
not with the Space shortcut. Root cause: `isStillGoing()`'s `playerStateRef` only
updated from the `onStateChange` postMessage event, which `playback.md` already
documented (from D-038's playback-rate reissue fix) as unreliable for state changes the
embed initiates on its own rather than ones Chronicle triggers via `command()` — Space
never hit the gap because it updates the ref optimistically the instant it's pressed.
Fixed the same way D-038's own bug was: `infoDelivery` also carries a `playerState`
field and fires as a steady heartbeat rather than a one-shot transition, so
`playerStateRef` (`src/ui/PlayerSurface.tsx`) now also updates from it on every tick,
without touching the transition-only side effects (ended overlay, resume checkpoint,
quality/rate reissue) that must still fire exactly once per real transition. Full
narrative in `tracker-history/v0.4.3.md`'s B-111 entry.

**D-052 (notifications now respect Shorts, plus a notifyShorts toggle) shipped in
`0.4.4`, 2026-07-17** — raised directly by the product owner in conversation, not
sourced from `tracker-current.md`, same pattern as D-050/D-051. The owner asked whether
turning off "Show Shorts" (`showShorts`) also silenced Shorts notifications — it
didn't: `SyncService.refresh()`'s `newVideosByChannel` tally (D-050) was built from
RSS-discovery counts *before* `confirmShorts()` ever ran, so a notification counted a
Short exactly like any other new video with no path to exclude it regardless of any
setting. Fixed by resolving a `shortsCount` per channel — a new
`SyncRepository.countShorts(videoIds)` query, called right after `confirmShorts()`
settles that cycle's verdicts, still inside the same refresh — so `main.ts`'s
`maybeNotifyNewVideos` now always excludes Shorts from the notified count whenever
`showShorts` is off. On top of the fix, per the owner's own same-conversation request:
a new `SettingsDto.notifyShorts` (default true, matching pre-fix behavior; shown in
Settings only while `showShorts` is also on) covers the case the feed toggle alone
can't express — some channels post Shorts often enough that a user wants them visible
in the feed but silent for notifications, without hiding them outright. Combined rule:
`includeShorts = settings.showShorts && settings.notifyShorts` — a Short hidden from
the feed never notifies regardless of `notifyShorts`. Full narrative in `decisions.md`
D-052 — no `tracker-history/` file, since this didn't come through the bug tracker. See
`.specs/roadmap.md` §Release status for the exact shipped scope.

**`0.4.5` shipped 2026-07-17** — a normal bug-tracker batch, five entries all Fixed the
same day they were reported: B-116 (an all-Shorts channel with "Show Shorts" off
showed empty and never backfilled further back, because `App.tsx` never rendered
`FeedList` — and therefore never ran its scroll-triggered `loadMore` — once the page
was empty; fixed with a dedicated empty-state effect), B-115 (Premieres got their own
"Premiere" badge instead of masquerading as "Live", via a `concurrentViewers`-presence
heuristic explicitly flagged as unconfirmed against real data — later disproven and
replaced, see B-117/B-119 below), B-114 (a live badge/duration no longer gets stuck
once a broadcast ends — new sticky `was_live`, `refreshLiveStatus` now re-hydrates live
videos every cycle for free), B-112 (opening a new video while the extract/pop-out
window is open now loads into that window instead of double-playing in the main
window), and B-113 (clickable `mm:ss` comment timestamps that seek the player, plus
scrolling back to the top on click, per the owner's same-day follow-up). Shipped as a
**patch** version. Full narrative in `tracker-history/v0.4.5.md`.

**D-053 (live-sort ordering) shipped in `0.4.6`, 2026-07-19** — a direct
product-owner request, not sourced from `tracker-current.md`, same pattern as D-050–D-052.
A currently-live video now sorts to the top of its date bucket instead of sinking under
its original (possibly hours-old) `publishedAt`; an ended broadcast sorts and buckets
by when it actually ended (`liveStreamingDetails.actualEndTime`, new sticky
`videos.live_ended_at`, schema v12) rather than its stale start time — including
broadcasts discovered only after they'd already ended (e.g. via gap-backfill), which
also now get the feed's existing gray "ended" badge for free. One design was rejected
mid-conversation (a separate bucket-less "Live now" section, mirroring D-039's
favorites section — the owner wanted this to stay "just ordering," no new section) and
one gap was caught by the owner's own follow-up (a broadcast crossing midnight sorting
right but bucketing under the wrong day) before landing on a single `effectiveDate(video,
now)` value driving both bucket assignment and sort order, applied display-only in
`FeedService.getSlice()` — never touching the keyset pagination cursor itself (D-027),
which deliberately stays on raw `publishedAt`. Shipped as a **patch** version, per the
owner's own explicit direction. Full narrative in `decisions.md` D-053 — no
`tracker-history/` file, since this didn't come through the bug tracker.

**`0.4.7` shipped 2026-07-19** — a normal bug-tracker batch, two entries: B-117 (a
genuine live broadcast was transiently misidentified as a Premiere right as it went
live, self-correcting a while later — rather than patch the heuristic again, the owner
chose to remove the whole Premiere/Live distinction outright, since neither of two
replacement-signal candidates could be verified against a real Premiere in the session;
the feed shows only "Live"/"Upcoming"/ended again) and B-118 (a video the owner
reported missing 11 minutes after upload turned out to be genuine YouTube RSS/CDN
latency, confirmed by checking the raw feed directly — Won't fix, not a Chronicle
bug). Shipped as a **patch** version (a pure bug-fix batch, no new `D-NNN` scope
alongside it). Full narrative in `tracker-history/v0.4.7.md`.

**`0.4.8` shipped 2026-07-20** — a normal bug-tracker batch, five entries all Fixed:
B-119 (the flip side of B-117's removal — a finished Premiere kept the "ended live
broadcast" treatment instead of settling back into a normal video; fixed via a
newly-confirmed signal, `status.uploadStatus === 'processed'` while `liveContent ===
'live'`, found and verified against real API data through a disposable OAuth grant
after two other candidates — a public "live videos" playlist, and `liveBroadcasts.list`
— were ruled out by checking the docs first; a known gap, a Premiere first hydrated
only after it already ended, led the owner to remove the gray "ended" badge outright
rather than accept a made-up start-time threshold that could misclassify a real
broadcast permanently), B-120 (feed bucket headers repeating out of order and
relative-time labels disagreeing with their bucket — needed a same-day round 2 once the
first fix's forward-only clamp turned a cosmetic bug into a data-mangling one; the
owner's own suggestion to check the real `chronicle.db` directly, rather than reason
from code alone, found the actual root cause — some channels publish a VOD listing
hours after the broadcast itself ended, violating an assumption D-053's `effectiveDate`
made implicitly — fixed with a `Math.max(liveEndedAt, publishedAt)` clamp), B-121
(opening the active video in the browser now pauses Chronicle's own copy instead of
both playing at once), B-122 (a currently-airing live/Premiere shows "Started X ago"
instead of a meaningless "0 min ago", on both the feed and the player screen, off a
newly-captured `liveStreamingDetails.actualStartTime` riding free on the existing
hydration call), and B-123 (the player screen no longer shows a duration at all, caught
by the owner while live-testing B-122 — always wrong for a live/Premiere and redundant
with the embed's own controls otherwise). Shipped as a **patch** version (a pure
bug-fix/adjustment batch, no new `D-NNN` scope alongside it). Full narrative in
`tracker-history/v0.4.8.md`.

**D-054 (localization: a Language setting) shipped in `0.5.0`, 2026-07-20** — a direct
product-owner request, not sourced from `tracker-current.md`, same pattern as D-050–D-053.
Turns the existing single-locale `t(key, vars)` lookup (B-017) into a real multi-locale
system: a Settings dropdown (first section on the screen), defaulting to "Follow
system," backed by a locale registry discovered at build time via `import.meta.glob`
over `src/ui/i18n/locales/*.ts` — contributing a translation is only a PR adding one
file, no registry to edit. Ships with English (the complete source-of-truth dict) and
Portuguese (Brazil) at launch; any other locale file is allowed to be a partial `Dict`,
falling back to English per missing key. A pure-string `AppSettings.language`
(`'system'` sentinel or a locale code) keeps `settings-store.ts` decoupled from which
locales happen to exist. Applying a change with no restart needed careful placement:
`App.tsx` calls `setLocale()` synchronously before its own `setSettings()` re-render, at
both points that ever change the setting. **Revised the same day, the owner's own live
catch:** three call sites (`Sidebar.tsx`'s view labels, `App.tsx`'s feed date-bucket
headers, `onboarding/Wizard.tsx`'s console-step text) had baked `t()` into a
module-level constant evaluated once at import time, so they stayed stuck in whichever
language loaded first — fixed by converting all three into plain functions called
fresh at render time; one of them needed a second fix beyond that, adding
`settings.language` to a `useMemo`'s dependency array the linter couldn't see was
affected. **Also added, prompted by the owner noticing they had no way to change the
language before ever reaching Settings:** a language dropdown on the onboarding
wizard's own Welcome screen. Checked via `npm run typecheck && npm run lint && npm
test` plus a production build. Shipped as a **minor** version (real new scope, not a
bug-fix batch). Full narrative in `decisions.md` D-054 — no `tracker-history/` file, since
this didn't come through the bug tracker.

**D-055 (a Watch Later "up next" card on video end) shipped in `0.6.0`, 2026-07-22** — a
direct product-owner request, not sourced from `tracker-current.md`, same pattern as
D-050–D-054. On video end, a floating, dismissible, bottom-right card — thumbnail +
title + an explicit Open button — suggests the next video from the user's own Watch
Later queue, if one exists: the oldest-queued video (FIFO) when the video that just
ended wasn't itself queued, otherwise whichever entry follows it
(`nextWatchLaterAfter`, `core/feed.ts`, unit tested offline). Distinct from the
existing `n`-key "next in queue" shortcut (D-021), which only works when the player was
opened *from* the Watch Later feed view itself — this one is derived purely from data,
so it also covers a video reached by any other path. Full player view only, never the
miniplayer or the pop-out extract window; no timer, no countdown, no auto-advance — a
click is the only way anything plays. **Fixed the same day, the owner's own live
catch:** the card never appeared at all — reaching "ended" is always embed-initiated
(Chronicle never issues a command to stop a video), and the one-shot `onStateChange`
postMessage event doesn't reliably report state changes the embed initiates on its own,
exactly the bug class B-111 already found for `isStillGoing()`. Fixed the same way:
`PlayerSurface.tsx`'s `infoDelivery` heartbeat is now also a detection path for
`playerState === 0`, guarded to fire the ended side effects (resume-checkpoint clear,
the up-next lookup) exactly once per real transition regardless of which event notices
it first. Checked via `npm run typecheck && npm run lint && npm test`; not yet
live-verified past the owner's own catch above. Full narrative in `decisions.md` D-055 —
no `tracker-history/` file, since this didn't come through the bug tracker.

**D-056 (a live chat panel on the player screen) shipped in `0.7.0`, 2026-07-23** — via
YouTube's own public `live_chat` embed iframe (zero quota cost, no new scope): a toggle
next to the title (shown only while `liveContent === 'live'`, covering Premieres too)
opens a 500px docked column, always starting closed. Closes automatically only when the
video docks to the miniplayer; a separate manual "extract chat" action pops it to its
own titled window, fully decoupled from the video's own extract (D-051). Typing
requires the same signed-in embedded-player session (B-093) — a hint links to the
existing sign-in IPC. **Fixed during the owner's own live test:** the docked column
rendered blank — the iframe was missing `embed_domain` (required when framed,
`embed_domain=localhost`, since Chronicle's renderer always runs there). Also relabeled
the toggle, repositioned the column's own extract button, and added a tooltip
explaining the separate sign-in. Shipped as a **minor** version — real new scope, driving
the `0.7.0` release even though its only accompanying bug-tracker item, B-124 (Comments
no longer rendering on an active live video/Premiere, where regular comments aren't
active anyway), was a single Fixed entry. Full narrative in `decisions.md` D-056; the
`0.7.0` batch itself is in `tracker-history/v0.7.0.md`.

**D-057 (three Watch Later refinements) shipped in `0.8.0`, 2026-07-23, all direct
product-owner requests in the same session** — after `0.7.0` shipped. (1)
`SettingsDto.watchLaterAutoRemove` (default off) — opening a
queued video removes it from Watch Later immediately, the same effect a manual
untoggle has. (2) The up-next card (D-055) now wraps around past the last queued video
instead of going silent once the user reaches the end of the queue. (3) Drag-and-drop
reorder in the Watch Later view, list and grid alike — the whole row/card is the drag
source; drop-target hit-testing lives on `FeedList`'s own per-item wrapper (the exact
virtualized slot, no dead zone), with a container-level fallback for empty space past
the last item. Each video's own drop zone means "insert after it"; only the first video
also accepts "insert before" (nothing else can become the new first item). Went through
several same-day revision rounds live before landing on this shape (an earlier pass's
separate end-of-list drop zone and two-indicators-per-video design were both dropped as
unnecessary once the simpler version proved to work). Confirmed working live. Full
narrative in `decisions.md` D-057 — no `tracker-history/` file, since this didn't come
through the bug tracker.

**D-058 (user-created local Playlists) shipped in `0.8.0`, 2026-07-23, a direct
product-owner request, same pattern as D-050–D-057** — built and live-tested in its own
worktree, then merged straight to `main`. A new sidebar
screen at position 4 (`Sidebar.tsx`'s `NAV_ORDER` interleaves it with the five
`FeedView`s so keyboard `1`-`6` still map 1:1 to the rendered list): every local
playlist as a card/row (name, video count, `h:mm` total duration, a composite cover
built from its own first 1-6 video thumbnails arranged in a grid inside the same
`.thumb` footprint a single video occupies at every itemSize). Playlists are 100% local
(schema v17) — never a YouTube playlist, never synced, same Chronicle-only-state rule
as D-003. A playlist's own detail screen mirrors `ChannelHeader`'s compact style with
inline name/description editing and a delete confirm; its video list reuses `FeedList`
directly with drag-and-drop reorder (D-057's same mechanism). Opening a video from a
playlist never removes it (unlike Watch Later's opt-in auto-remove, D-057) — only an
explicit "remove from playlist" action does. Every video card/row everywhere, plus the
player, gained a new "Add to Playlist" action opening a checklist dialog with an inline
create-and-add field. The player's "up next" card (D-055) now also covers a playlist
context, suggesting that playlist's own next video instead of Watch Later's — but
deliberately does **not** wrap around like Watch Later's own up-next does: a playlist is
a curated collection with a real end, not a rotation, so its last video ending suggests
nothing further. **Two real bugs caught only via the owner's own live testing, not
guessable from code alone:** the Playlists screen had started as its own top-level
render branch with its own copy of the player JSX, which meant the live YouTube iframe
literally unmounted and remounted (a visible reload) every time the screen switched
between the main feed and Playlists while a video was docked, and the miniplayer's own
`e`/`x` shortcuts (B-105) were unreachable from the Playlists screen entirely — fixed by
unifying both screens into one shared, always-mounted layout with the player as a single
stable element within it; and every dialog's Escape handling (Add to Playlist, Help,
write-scope consent, Add Account) only worked if focus happened to already be inside it
(an autoFocus text input), so a dialog opened via a plain click or keyboard shortcut with
no such input left focus on a sibling element and Escape bubbled straight past it —
fixed by having each dialog focus its own container on mount. Full narrative in
`decisions.md` D-058 — no `tracker-history/` file, since this didn't come through the
bug tracker.

**`0.8.1` shipped 2026-07-23** — a normal bug-tracker batch, four entries all Fixed the
same day they were reported: B-125 (removing a video from a playlist's own video list
now has the same inline undo affordance ignore already has, via a dedicated
playlist-scoped undo mechanism in `App.tsx` — `playlistUndoable`/`playlistUndoInfo`/
`undoRemoveFromPlaylist`, separate from ignore's own since a playlist row is never
undoable via ignore), B-126/B-127 (favoriting or adding to Watch Later from inside a
playlist's own video list now updates that row's icon immediately — `patch()` now also
writes into `playlistVideos`, the same way it already did for `playerStack`, instead of
only reflecting the change once the playlist was reopened), and B-128 (per the owner's
own call, made mid-report: dropped the ignore action from a playlist's video-list rows
entirely — `VideoActions.ignore` is now optional — rather than fix its
previously-stale-and-silent behavior there, since a video being in a playlist reads as
the opposite intent from "hide this"). Shipped as a **patch** version (a pure bug-fix/
adjustment batch, no new `D-NNN` scope alongside it). Full narrative in
`tracker-history/v0.8.1.md`.

**D-059 (import a YouTube playlist into a local Playlist, plus a Sync action) shipped
in `0.9.0`, 2026-07-27** — a direct product-owner request, not sourced from
`tracker-current.md`, same pattern as D-050–D-058. The Playlists screen gained a second
toolbar action, "Import from YouTube": paste a playlist URL, and Chronicle creates a
new local playlist — pre-named from the source's own title/description — populated
with the same videos in the same order, reusing D-029's external-video hydration
(`upsertExternalVideo`) and the existing channel-backfill `listUploads`
(`playlistItems.list`) call completely unmodified, since it already worked against any
public playlist id, not just an uploads playlist. Deliberately a one-time snapshot, not
a background sync, matching D-058's "playlists are 100% local, never synced" rule. A
second piece, added by the owner mid-conversation once the base import was already
speced: an imported playlist's own screen gains a **Sync** action (new
`playlists.source_playlist_id` column, schema v18, gates its visibility) — checks live
whenever that screen opens how many videos the source has that the local copy is
missing, and a click pulls just those in. Sync is deliberately add-only — never
removes, reorders, or renames anything the user has since done to their own copy,
consistent with D-058's "removal is its own explicit action" rule. **Several real
issues surfaced only through the owner's own live testing, all fixed the same
session:** an import that appeared to hang with zero feedback (the app turned out to
just need a restart, but the underlying gap was real regardless) — fixed with a
running progress log fed by a new `playlist:importProgress` backend→UI event (mirroring
`refresh:progress`'s existing precedent) at each real step, plus a missing `.catch()`
on the import call that could otherwise leave the dialog's spinner stuck forever on an
unexpected rejection; the new toolbar button not vertically aligning with "+ New
Playlist" and reading as too visually prominent for a secondary action — root-caused to
`button.primary`'s own `align-self: flex-start`/`margin-top: 6px` (meant for a
column-flex dialog context) fighting `align-items: center` in the toolbar's row layout,
not a one-off fix but a bug confirmed to affect *every* dialog's action row in the app
(Create/Import Playlist, write-scope consent, Add Account, Settings) once the owner
asked to check further, resolved with one consolidated CSS override instead of four
separate ones; and the disabled "Up to date" Sync button still looking fully clickable,
since the base `button` reset never styles `:disabled` at all. Full narrative in
`decisions.md` D-059 — no `tracker-history/` file, since this didn't come through the
bug tracker. See `.specs/roadmap.md` §Release status for the exact shipped scope.

**D-060 (sortable channel sidebar list) shipped in `0.10.0`, 2026-08-07** — a direct
product-owner request, not sourced from `tracker-current.md`, same pattern as
D-050–D-059. `listFollowedChannels` (`repositories.ts`) still hardcodes one backend
order (favorite DESC, latest-video DESC, name ASC), but the sidebar now has a small
control next to the "Channels" header (same "inline in the view, not Settings"
precedent as D-037) offering four modes, resorted client-side in `Sidebar.tsx` off the
same `ChannelDto[]` already fetched — a new `latestPublishedAt` field on `ChannelDto`
is the only backend-facing change: **Favorites** (default, the backend's own order
passed through), **Recent** (all channels by most recent video, favorite ignored),
**Unread** (most unread videos first, off the existing `unreadCount`), **Name**
(alphabetical). Deliberately session-only React state, not persisted to
`settings.json` — the owner's own framing was that the sidebar always *starts* on
Favorites regardless of what was picked last session, matching the "same action always
produces the same result" principle over "remember my last choice." **Three issues
surfaced only through the owner's own live testing:** a native `<select>`'s option
popup ignored the app's dark theme entirely (OS-drawn on Linux/GTK), replaced with a
custom button + the existing `ContextMenu` portal component; a "Recent just sorts by
name" report that traced to a stale, un-restarted Electron main process rather than a
real bug (`getChannels`'s new field needs a full relaunch, not just the renderer's
hot-reload, to reach a running dev session); and two rounds on the custom popup's own
positioning — an EN/PT-BR button-width difference (`"Favorites"` vs. `"Favoritos"`)
tripping `ContextMenu`'s threshold-based flip logic in one language only, replaced with
a single left-based formula clamped to the viewport, which then needed a second fix
(`right: 'auto'`) once the popup started spanning the full window width. Confirmed
working live in both languages. Same release: [[B-129]] (feed date-bucket headers
overlapping/floating after navigating from "All" straight into a channel) closed after
four same-day rounds — the first three, all inside `FeedList`/tanstack-virtual's own
measurement/remount machinery, were each disproven live in turn; the owner's own
DevTools HTML (pasted markup, not a screenshot) was what actually broke the case open,
showing the real cause lived in `App.tsx`: `videos` stayed stale for one or more real,
paintable frames during the async gap between a channel switch (synchronous) and its
`getFeed()` response resolving (async), so a fresh `ChannelHeader` briefly paired with
the outgoing screen's leftover row data. Fixed with a `videosFor` guard recording which
`(view, channel, account)` triple the current `videos` array was actually fetched for,
so `filtered` only trusts it once confirmed current. Full narrative in `decisions.md`
D-060 and `tracker-history/v0.10.0.md`. Shipped as a **minor** version, per the owner's
own explicit direction (D-060 is real new scope, not a bug-fix batch).

**D-061 (backup export/import, i.e. turning the existing one-way "Export data" into a
real leave-with-everything/restore-elsewhere flow) was designed and confirmed live in
conversation, with a full implementation plan approved** — but **remains unimplemented
as of `0.15.0`**: no code written, no `data:import` channel, no restore step in the
wizard. Resolved design (credentials never travel in the backup, D-013; an
account-mismatch confirm dialog; merge-by-`statusChangedAt` conflict rules;
`playlists`/`playlist_videos` finally included in the export, closing a gap that
predates D-058/D-059) is on file in `decisions.md` D-061 and a saved plan at
`/home/adriano/.claude/plans/idempotent-pondering-bear.md` for whenever it's actually
built — don't assume it exists just because the design is settled.

**`0.10.1` shipped 2026-08-07, the same day as `0.10.0`** — [[B-022]] (Fixed —
delete-all-data now relaunches cleanly; the third fix attempt across many prior
releases, an in-process `boot()` reboot in `src/platform/main.ts`, is the one that
held, confirmed live by the owner as part of their own regular test routine). Shipped
alongside D-062 (a comments "open in browser" ↗ button mirroring `ChannelHeader`'s
existing icon-button pattern, plus a red ♥ indicator surfacing the viewer's own
existing `viewerRating`, both free on fields `commentThreads.list` already fetched and
previously discarded; a same-conversation live catch fixed the open-in-browser link
leaving Chronicle's own copy still playing behind the new tab, same `onPause`-threading
shape as B-121) rather than driven by this bug. Shipped as a **patch** version, per the
owner's own explicit direction. See `tracker-history/v0.10.1.md`.

**`0.10.2` shipped 2026-09-01, no bug-tracker batch of its own** — driven entirely by
D-063 (a comments sort-order toggle, "Top comments" default vs. "Newest first," mapped
directly onto `commentThreads.list`'s own `order` param, previously hardcoded to
`relevance`; a small two-button segmented control, same "inline in the view, not
Settings" precedent as D-037/D-060), a direct product-owner request rather than an item
from `tracker-current.md` — same pattern as D-050–D-062. Confirmed working live by the
owner. Shipped as a **patch** version, per the owner's own explicit direction.

**`0.11.0` shipped 2026-09-04.** Originally tracked toward a `0.10.3` patch, but three
decisions together amounted to real new scope: D-064 (an Edit action on the viewer's
own comments/replies via `comments.update`, gated by comparing the comment's own
`authorChannelId` — free on the existing `snippet` part — against the connected
account's own channel id; a same-day live catch fixed the new Edit button sitting flush
against the existing Reply button with no gap), D-065 (a Settings storage indicator —
`chronicle.db` + WAL/SHM + the thumbnail cache + video count, via a new
`getStorageInfo` IPC call, display-only), and D-066 (every long Settings explanatory
paragraph shortened to one line plus a hover ⓘ via a new `InfoNote` component, reusing
the topbar's existing tooltip pattern; em dashes dropped from Settings copy only, per
the owner's own stated dislike — later widened project-wide by D-069). Shipped as a
**minor** version instead, per the owner's own explicit direction, skipping `0.10.3`
entirely (the same "batch grew past a patch" shape `0.3.0` set skipping `0.2.3`). Also
closed the same cycle: [[B-130]] (Fixed — a removed/private YouTube video no longer
misreports as "channel disabled embedding"; a neutral "can't be played here" overlay
with an explicit "remove from library" action, needing a same-day round 2 once the
owner's live test disproved the error-code distinction round 1 depended on). See
`tracker-history/v0.11.0.md`.

**`0.12.0` shipped 2026-09-06.** Originally tracked toward a `0.11.1` patch, but shipped
as a **minor** version instead, per the owner's own explicit direction, skipping
`0.11.1` entirely (same pattern as `0.3.0`/`0.11.0` above) — driven entirely by D-067 (a
Share button on the full-view player's topbar: the video's canonical
`youtube.com/watch?v=<id>` URL, a Copy button, and an off-by-default `&t=<seconds>s`
timestamp checkbox off the live playback snapshot; opening the dialog pauses the video
via the existing `onPause` prop and resumes on close via a new
`PlayerSurfaceHandle.play()`. **Revised the same day, the owner's own request before
any live testing:** none of the pause/resume/timestamp machinery makes sense for a live
broadcast — there's no single "current position" of a stream everyone else is also
watching live — so `openShare`/`closeShare` now skip all three for `liveContent ===
'live'`), a direct product-owner request rather than an item from
`tracker-current.md` — same pattern as D-050–D-066. Confirmed working live by the
owner.

**`0.13.0` shipped 2026-09-12.** Originally tracked toward a `0.12.1` patch, but D-068
amounted to real new scope on its own — shipped as a **minor** version instead, per the
owner's own explicit direction, skipping `0.12.1` entirely. D-068 (a like/dislike bar on
the player screen): the real YouTube like count was free all along
(`statistics.likeCount` was never removed, only the dislike aggregate; threaded onto
`PlayerVideoDto.likeCount` off the existing `hydrate()` call, zero extra quota) but an
opt-in dislike *estimate* needed Return YouTube Dislike (RYD), a free third-party
service — **explicitly weighed against Local-first/Privacy-first first, in
conversation, before any code**, since calling RYD means sending an opened video's id
to a server that isn't YouTube. Resolved by making it opt-in and off by default
(`SettingsDto.showDislikeEstimate`): with the setting off, Chronicle calls nothing but
YouTube, exactly as before this decision. New `DislikeEstimateSource` core port,
`adapters/ryd/ryd-client.ts` (contract-tested offline, same convention as every other
adapter), an in-memory-only cache (per the owner's own explicit call — never written to
disk), and attribution per RYD's own usage-rights policy. `rateVideo` gained a real
Dislike button (the write path already round-tripped `'dislike'` as a value). UI pulled
into its own `LikeDislikeBar.tsx` after several live-iterated rounds: the real like
count and its own side of the bar never disappear because of a third-party outage; the
dislike side degrades to a neutral placeholder split plus an ⓘ (clickable to Settings
when "disabled," a plain hover when "error") rather than hiding anything. Same release:
D-069 (widened D-066's em-dash ban from Settings copy to every user-facing string,
wizard included — ~84 strings hand-rewritten across `en.ts`/`pt-BR.ts`, case by case;
code comments and `.specs/*.md` keep their own em-dash-heavy style, deliberately not
touched). Full narrative in `decisions.md` D-068/D-069.

**`0.13.1` shipped 2026-09-15, no bug-tracker batch of its own** — a same-day amendment
to D-068's RYD cache, raised directly by the owner (routinely leaves the app open for
days, so a cache cleared only on restart could serve a stale count indefinitely): the
cache is now time-bounded via the existing `Clock` port instead of app-lifetime — a
successful lookup expires after 1 hour, a failed one after 5 minutes. Shipped as a
**patch** version, per the owner's own explicit direction (a tuning amendment to
existing scope, not a new feature).

**`0.13.2` shipped 2026-09-22, no bug-tracker batch of its own** — driven entirely by
D-070 (comment/reply author names in the comments panel now link to that user's own
channel in-app, reusing the exact `onOpenChannel`/`navigateToChannel` navigation the
video's own channel-title link already drives rather than opening a browser tab; no new
data or IPC call, off the `authorChannelId` field D-064 already surfaces — renders as a
`button.comment-author` when present, a plain `span` when YouTube doesn't return one,
e.g. a deleted channel), a direct product-owner request rather than an item from
`tracker-current.md` — same pattern as D-050–D-069. Shipped as a **patch** version, per
the owner's own explicit direction.

**`0.13.3` shipped 2026-09-26** — a normal bug-tracker batch, two entries both Fixed:
[[B-131]] (a non-subscribed channel's video list, opened via a channel search result,
gained real favorite/Watch Later/Add-to-Playlist/open-in-browser actions, HEAD-confirmed
Shorts filtering matching the main feed's own D-028 pipeline, and date-bucket
grouping — five same-session rounds plus one pre-existing bug the owner's own live test
caught along the way) and [[B-132]] (a CSS spacing gap in the Add to Playlist dialog's
empty state). No new `D-NNN` scope this cycle. Shipped as a **patch** version (a pure
bug-fix batch). See `tracker-history/v0.13.3.md`.

**`0.14.0` shipped 2026-09-28, no bug-tracker batch of its own** — driven entirely by
D-071 (a channel screen's own search: the topbar `/` field now scopes to that channel's
videos, subscribed or not, instead of all of YouTube whenever a channel screen is open;
reuses D-031's `search.list` call unchanged except an added `channelId` param and `type`
narrowed to video-only, same 100-unit cost, same Enter-only gate — raised after
confirming the sidebar's local "Find channel" filter and D-031's own global search were
each the wrong tool for "find a video within one channel I don't even follow"), a
direct product-owner request rather than an item from `tracker-current.md` — same
pattern as D-050–D-070. Fixed as part of the same change, not a separate bug:
`closeSearch()` no longer clears `channelPreview`, which used to strand a non-subscribed
channel's preview screen once its leftover search text was cleared. Shipped as a
**minor** version, per the owner's own explicit direction (real new scope, not a
bug-fix batch).

**`0.14.1` shipped 2026-10-01** — a single entry, [[B-133]] (Fixed — the mouse "back"
side button, which [[B-039]] had only wired up inside the full-view player, now steps
back one level anywhere Esc already does: the main feed's channel filter, the
Playlists screen and its own detail view, Settings, the shortcuts help overlay; a new
`mouseup` listener alongside `App.tsx`'s existing keydown effect, gated the same way as
keyboard input). No new `D-NNN` scope this cycle. Shipped as a **patch** version (a pure
bug-fix batch). See `tracker-history/v0.14.1.md`.

**`0.15.0` shipped 2026-10-04.** Originally tracked toward a `0.14.2` patch (carrying
only [[B-134]]), but two decisions together amounted to real new scope — shipped as a
**minor** version instead, skipping `0.14.2` entirely (same "batch grew past a patch"
shape as `0.3.0`/`0.11.0`/`0.12.0`/`0.13.0` above). D-072 (five new interface languages —
Spanish, German, French, Italian, Japanese — translated by AI and explicitly marked
**unreviewed**: a new required `LocaleMeta.reviewed: boolean`, `true` only for the
existing human-reviewed `en`/`pt-BR`; selecting an unreviewed locale shows the existing
`InfoNote` pattern below the dropdown rather than a badge in the list itself, per the
owner's own call to keep that list uncluttered). D-073 (a local Watch History view —
every video Chronicle has ever played, most recently watched first, subscribed or not,
reached from the feed/search/a channel preview/a description link alike; new
`video_state.last_watched_at`, schema v19, stamped by a new `markWatched` piggybacking
the existing `apply()` upsert rather than an append-only log; a new `HistoryView.tsx`
sidebar screen appended as a 7th entry after Ignored specifically so it doesn't renumber
the `1`-`6` digit shortcuts; local-only free-text search, deliberately separate from the
topbar's real-YouTube `/` field; a "Clear History" button and per-video removal via the
same inline-undo mechanism Playlists already uses. **Several live-feedback rounds the
same session** — search-box gutter styling, date-bucket grouping added to match the
main feed, remove/clear actions added, and two reports of "not working" that turned out
to be a stale un-restarted Electron main process rather than a code bug, the same false-
alarm class D-060 already hit. Confirmed working live by the owner). Also closed:
[[B-134]] (Fixed — resume playback position now also saves on a real app quit, via the
same `beforeunload` mechanism `ExtractedPlayerWindow.tsx` already used for the pop-out
window, and the save-on-pause checkpoint now also reads off the `infoDelivery` heartbeat
instead of trusting only the one-shot `onStateChange` event — the same reliability gap
[[B-111]] already found and fixed elsewhere). Alongside the tracked scope, this cycle
also landed `.specs/code-guidelines.md`'s own rules against the existing source tree
(no behavior change): a shared `useDialogDismiss` hook replacing eight dialogs' own
duplicated Escape-handling logic, `main.ts`'s IPC handlers split into per-domain
modules, `App.tsx`'s JSX split into four presentational components, and every `B-NNN`/
`D-NNN` reference stripped from source comments per this file's own "comments describe
current state, not history" rule — plus one small untracked UI adjustment, raised
directly by the owner: the miniplayer's resizable width is now clamped to the window's
own size, with its max resize cap scaled to the monitor instead of a fixed pixel
ceiling. Full narrative in `decisions.md` D-072/D-073 and `tracker-history/v0.15.0.md`
(B-134 only).

**`0.15.1` shipped 2026-10-04, the same day as `0.15.0`.** Driven by D-074 (a
currently-airing live or Premiere now outranks every other video at the feed's actual
fetch/pagination level, not just an already-fetched page's display order — a new
two-tier sort key baked directly into `repositories.ts`'s `FEED_ORDER` and keyset
cursor, `FeedCursor` gaining a `liveNow` field; a Premiere also now follows the
identical upcoming/airing/ended ordering a genuine broadcast gets, reversing B-119's
own exclusion), raised after a concrete symptom: a subscribed channel's livestream from
the day before never showed on the main feed at all. Root cause, confirmed directly
against the owner's own `chronicle.db` rather than guessed: [[B-135]] (a livestream
scheduled on YouTube days ahead of actually airing keeps a stale `publishedAt` —
`sync-repository.ts`'s `applyHydration` isn't write-once on that column — burying the
video hundreds of pages deep in the raw-`publishedAt`-keyed keyset cursor; D-053's
display-only `effectiveDate` (`core/feed.ts`) never reaches that deep, since it only
re-sorts *within* whatever page was already fetched, not across the cursor itself — a
much larger-magnitude case of the exact gap D-053's own narrative had already flagged
and deliberately left open; confirmed systemic across 8+ affected channels, one with
streams buried 500–1600 videos deep). Found live-testing B-135's own build: [[B-136]]
(a live/upcoming video that disappears from YouTube entirely — deleted or privated —
never got corrected, since `videos.list` just omits a gone id rather than erroring on
it; D-074's new top-priority tier turned this from an easy-to-miss stale badge into the
single most prominent row in the feed, confirmed against real data as 540 consecutive
sync cycles with zero update on one stuck row). Both Fixed, confirmed working live
after a relaunch. Shipped as a **patch** version, per the owner's own explicit
direction, even though D-074 is real new scope that reverses a prior decision
(B-119's own exclusion) — same pattern as several earlier patches driven by a `D-NNN`
(D-053 in `0.4.6`, D-063 in `0.10.2`, among others). Full narrative in `decisions.md`
D-074 and `tracker-history/v0.15.1.md`.

**Bugs/adjustments are tracked one file per release**: `.specs/tracker-current.md` holds
the batch being worked toward the next release, `.specs/tracker-history/vX.Y.Z.md` holds
each shipped release's closed-out batch. `0.1.0`, `0.2.0`, `0.2.2`, `0.3.0`, `0.4.3`,
`0.4.5`, `0.4.7`, `0.4.8`, `0.5.0`, `0.7.0`, `0.8.1`, `0.10.0`, `0.10.1`, `0.11.0`,
`0.13.3`, `0.14.1`, `0.15.0`, and `0.15.1` have shipped and are archived in
`tracker-history/`
(`0.2.1` was a single one-off patch with no batch of its own — see
`tracker-history/v0.2.0.md`'s B-045 notes). `0.3.0` (B-109, B-110, both Fixed) was
originally tracked toward a `0.2.3` patch but grew into real new scope along the
way — D-048 removed a whole failure-handling subsystem (channels no longer get
permanently marked "unavailable" off a single transient RSS 404), a
previously-documented-but-never-built per-channel RSS retry-with-backoff was actually
implemented (and tuned live: 3→5 attempts, `RSS_CONCURRENCY` 8→12), and D-049 changed
how sync failures are surfaced (no more banner for ordinary per-cycle noise, only for a
systemic failure) — so it shipped as a **minor** bump instead, skipping `0.2.3`
entirely. `0.4.0` (D-050), `0.4.6` (D-053), `0.5.0`'s driving decision (D-054),
`0.6.0`'s driving decision (D-055, above), `0.7.0`'s driving decision (D-056, above),
`0.8.0`'s driving decisions (D-057 and D-058, above), `0.9.0`'s driving decision
(D-059, above), `0.10.0`'s driving decision (D-060, above), `0.10.2`'s driving decision
(D-063, above), `0.12.0`'s driving decision (D-067, above), and `0.13.2`'s driving
decision (D-070, above) all shipped real new scope alongside at most one unrelated
closed bug, or none — `0.4.0`, `0.4.6`, `0.6.0`, `0.8.0`, `0.9.0`, `0.10.2`, `0.12.0`,
and `0.13.2` have no `tracker-history/` file at all; `0.5.0`, `0.7.0`, `0.10.0`, and
`0.15.0` each have one, but only because a single bug (B-086, B-124, B-129, and B-134
respectively) happened to close out during the same cycle, not because any of those
releases' driving decisions needed the version bump. `0.4.1` (the B-108 revert) shipped
as a **patch** instead — a revert, not new scope. `0.4.2` (D-051), `0.4.4` (D-052),
`0.13.1` (D-068's RYD cache amendment), and `0.15.1` (D-074, reversing B-119's prior
exclusion while also fixing B-135/B-136) also shipped as **patches**, per the owner's
own explicit direction, even though each lands real behavior change (or, for `0.15.1`,
reverses an earlier decision outright) rather than being a pure bug-fix batch. `0.4.3`
(B-111), `0.4.5`, `0.4.7`, `0.4.8`, `0.8.1`, `0.13.3`, and `0.14.1` (all above) are the
normal case this file's "pure bug-fix batch ships as a patch" rule describes. `0.11.0`
(D-064/D-065/D-066), `0.13.0` (D-068/D-069), and `0.15.0` (D-072/D-073) each shipped as
**minor** versions after outgrowing an originally smaller planned patch number
(`0.10.3`, `0.12.1`, and `0.14.2` respectively, all skipped entirely) — the same pattern
`0.3.0` set skipping `0.2.3`. `tracker-current.md` now targets **0.15.2**, carrying
[[B-108]] and [[B-101]] forward untouched — neither made it into any release from
`0.5.0` through `0.15.1` (B-022, the third item carried since `0.3.0`, closed Fixed in
`0.10.1` above; B-086, the fourth, closed Won't fix in `0.5.0` — see
`tracker-history/v0.5.0.md`). Version bumps aren't always minor — a pure bug-fix
batch ships as a patch release, a minor bump is reserved for batches that land real new
scope, but the owner's own explicit call on a given release always wins. See
`.specs/roadmap.md` §Release status for the summary.
