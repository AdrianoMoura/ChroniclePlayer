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

**Bugs/adjustments are tracked one file per release**: `.specs/tracker-current.md` holds
the batch being worked toward the next release, `.specs/tracker-history/vX.Y.Z.md` holds
each shipped release's closed-out batch. `0.1.0`, `0.2.0`, `0.2.2`, `0.3.0`, `0.4.3`,
`0.4.5`, `0.4.7`, `0.4.8`, and `0.5.0` have shipped and are archived in `tracker-history/`
(`0.2.1` was a single one-off patch with no batch of its own — see
`tracker-history/v0.2.0.md`'s B-045 notes). `0.3.0` (B-109, B-110, both Fixed) was
originally tracked toward a `0.2.3` patch but grew into real new scope along the way —
D-048 removed a whole failure-handling subsystem (channels no longer get permanently
marked "unavailable" off a single transient RSS 404), a
previously-documented-but-never-built per-channel RSS retry-with-backoff was actually
implemented (and tuned live: 3→5 attempts, `RSS_CONCURRENCY` 8→12), and D-049 changed
how sync failures are surfaced (no more banner for ordinary per-cycle noise, only for a
systemic failure) — so it shipped as a **minor** bump instead, skipping `0.2.3`
entirely. `0.4.0` (D-050), `0.4.6` (D-053), and `0.5.0`'s driving decision (D-054,
above) all shipped real new scope with no bug-tracker batch of their own — `0.4.0` and
`0.4.6` have no `tracker-history/` file at all; `0.5.0` has one, but only because B-086
also happened to close out during the same cycle, not because the batch itself drove
the version bump. `0.4.1` (the B-108 revert) shipped as a **patch** instead — a revert,
not new scope. `0.4.2` (D-051) and `0.4.4` (D-052) also shipped as **patches**, per the
owner's own explicit direction, even though each lands a new Settings toggle rather
than being a pure bug-fix batch. `0.4.3` (B-111), `0.4.5`, `0.4.7`, and `0.4.8` (all
above) are the normal case this file's "pure bug-fix batch ships as a patch" rule
describes. `tracker-current.md` now targets **0.5.1**, carrying [[B-108]], [[B-022]],
[[B-101]] forward untouched (B-086, the fourth item carried since 0.3.0, closed as
Won't fix in `0.5.0` — see `tracker-history/v0.5.0.md`). Version bumps aren't always
minor — a pure bug-fix batch ships as a patch release, a minor bump is reserved for
batches that land real new scope, but the owner's own explicit call on a given release
always wins. See `.specs/roadmap.md` §Release status for the summary.
