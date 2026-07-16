# Chronicle Player

Chronicle (Chronicle Player) is a **desktop-first YouTube client** that recreates the
pre-algorithm YouTube experience: a chronological feed of the channels *you* subscribed to,
and nothing else. It is a better client for YouTube content — not a YouTube replacement.
Videos always come from YouTube.

## Vision in one paragraph

The Subscriptions page **is** the application. There is no algorithmic Home, no
recommendations, no Shorts, no infinite scroll, no engagement optimization. The user opens
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
| `.specs/playback.md` | How videos are watched (major pending decision) |
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
from source). Bugs found while dogfooding go to `.specs/bugs-current.md` as B-NNN entries and
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
owner asked for directly, not sourced from `bugs-current.md`. Three independent
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
narrative in `decisions.md` D-050 — no `bug-history/` file, since this didn't come
through the bug tracker. See `.specs/roadmap.md` §Release status for the exact shipped
scope.

**`0.4.1` shipped 2026-07-16 as a same-day revert, no `bug-history/` file of its own**
(same pattern as `0.4.0`/`0.2.1`): B-108's round 2 fix (a frozen-position
`.player-scroll-catcher` strip added to forward wheel scroll into the embedded video)
turned out to sit over the app's own top-of-screen controls during/after a scroll
gesture, silently swallowing clicks meant for them. Removed the whole mechanism on the
owner's request — B-108 reverts to Open, the original cross-origin-iframe scroll gap
unaddressed again. Full narrative in `bugs-current.md`'s B-108 entry.

**D-051 (pop-out-or-pause on tray-close) shipped in `0.4.2`, 2026-07-16** — another
direct product-owner request, not sourced from `bugs-current.md`, same pattern as
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
no `bug-history/` file, since this didn't come through the bug tracker. See
`.specs/roadmap.md` §Release status for the exact shipped scope.

**Bugs/adjustments are tracked one file per release**: `.specs/bugs-current.md` holds
the batch being worked toward the next release, `.specs/bug-history/vX.Y.Z.md` holds
each shipped release's closed-out batch. `0.1.0`, `0.2.0`, `0.2.2`, and `0.3.0` have
shipped and are archived in `bug-history/` (`0.2.1` was a single one-off patch with no
batch of its own — see `bug-history/v0.2.0.md`'s B-045 notes). `0.3.0` (B-109, B-110,
both Fixed) was originally tracked toward a `0.2.3` patch but grew into real new scope
along the way — D-048 removed a whole failure-handling subsystem (channels no longer
get permanently marked "unavailable" off a single transient RSS 404), a
previously-documented-but-never-built per-channel RSS retry-with-backoff was actually
implemented (and tuned live: 3→5 attempts, `RSS_CONCURRENCY` 8→12), and D-049 changed
how sync failures are surfaced (no more banner for ordinary per-cycle noise, only for a
systemic failure) — so it shipped as a **minor** bump instead, skipping `0.2.3`
entirely. `0.4.0` (D-050, above) shipped the same way — real new scope, not a
bug-tracker batch, no `bug-history/` file of its own (same pattern as `0.2.1`). `0.4.1`
(the B-108 revert, above) shipped as a **patch** instead — a revert, not new scope, and
not a fix for anything in the batch below. `0.4.2` (D-051, above) also shipped as a
**patch**, per the owner's own explicit direction this time, even though it lands a new
Settings toggle rather than being a pure bug-fix batch. `bugs-current.md` now targets
**0.4.3**, renumbered from `0.4.2` since that version shipped ahead of it (carries
B-108, B-022, B-086, B-101 forward, untouched, from 0.3.0). Version bumps aren't always
minor — a pure bug-fix batch ships as a patch release, a minor bump is reserved for
batches that land real new scope, but the owner's own explicit call on a given release
always wins. See `.specs/roadmap.md` §Release status for the summary.
