# Bug & Adjustment Tracker — Current

This is the working list of bugs and adjustments being worked toward the **next**
release. The product owner reports items as they dogfood the app; entries are added
here first, then attacked in batches when the owner asks. This file is operational (it
changes often) — requirements and design still live in the other specs, and anything
here that turns into a design change must be reflected in the relevant spec and, when
substantive, in `decisions.md`.

## How this file is used

1. **Report** — the owner describes a bug or desired adjustment; it gets an ID and an
   entry under *Open*, with enough context to reproduce or act on it.
2. **Attack** — when the owner says to work the list, items move to *In progress* and
   then to *Resolved*, with the fixing commit referenced.
3. **Roadmap** — if a batch of items suggests re-sequencing or a new milestone task,
   `roadmap.md` is updated in the same change.
4. **Release** — when the owner ships the version this file is targeting, this whole
   file (Open/In progress items still outstanding get their **Target** bumped to the
   next release and stay; everything else) is archived into
   `tracker-history/v<version>.md` and a fresh, empty `tracker-current.md` is started for the
   next release. See **History** below.

## Conventions

- IDs are `B-NNN`, sequential across the whole project (never reused, never reset per
  file). Reference them in commits ("Fix B-003: …").
- **Type**: `bug` (behavior is wrong per spec/expectation) or `adjustment` (behavior is
  as designed but should change — UX polish, copy, tuning).
- **Severity** (bugs only): `blocker` / `major` / `minor`.
- **Status**: `Open` → `In progress` → `Fixed` / `Won't fix` / `Duplicate of B-NNN`.
- Dates are absolute (YYYY-MM-DD): reported date and resolved date.
- Resolved entries move to the *Resolved* section (newest first) and keep their full
  entry — the history is part of the value.
- Every *Open*/*In progress* entry carries a **Target** field for the version it's
  aimed at (normally this file's own current target, but see "carried over" below).
  A fix landed *during* this file's development moves straight to *Resolved* but
  **keeps its Target field** so the entry doesn't read as if it shipped in an earlier
  release than it actually did.
- An item that doesn't make it into this release simply stays *Open*/*In progress* when
  the file is archived — its Target is bumped to the next version number and it carries
  forward into the new `tracker-current.md` untouched, noted as "carried over."
- Version numbers aren't always a minor bump: a batch that's pure bug fixes/adjustments
  (no new milestone-sized feature) ships as a **patch** release (0.2.0 → 0.2.1 → 0.2.2
  → …); a minor bump is reserved for batches that land real new scope. This file's own
  **Target** always states the actual next version, whichever kind it is — don't assume
  a minor bump by default.

## History

Closed-out batches live one per release in **[`tracker-history/`](tracker-history/)**:

- [`tracker-history/v0.1.0.md`](tracker-history/v0.1.0.md) — everything resolved from the
  project's start through 2026-07-14 (the first two dogfooding batches, B-001–B-017 and
  B-054–B-066). Shipped 2026-07-11.
- [`tracker-history/v0.2.0.md`](tracker-history/v0.2.0.md) — the third dogfooding batch
  (B-085–B-104, reported 2026-07-15) plus three items carried over from before 0.1.0
  shipped (B-051, B-046, B-045): 20 entries Fixed, 1 Won't fix (B-046 — hover-preview
  would require exactly the undocumented-endpoint use `youtube-api.md` bans). Shipped
  2026-07-15.
- **v0.2.1** — no bug-tracker batch of its own: a single same-day product-owner request
  (raise the miniplayer's max resizable width from 640px to 1024px) tagged on its own
  right after 0.2.0, folded into [[B-045]]'s "eighth round" narrative in
  `tracker-history/v0.2.0.md` rather than getting a new B-NNN entry. Shipped 2026-07-15.
- [`tracker-history/v0.2.2.md`](tracker-history/v0.2.2.md) — B-105, B-106, B-107 (all Fixed,
  each needing a same-day follow-up once the owner's live test caught a second instance
  of the same bug). Shipped 2026-07-16.
- [`tracker-history/v0.3.0.md`](tracker-history/v0.3.0.md) — B-109, B-110 (both Fixed; B-110
  needed several same-day follow-ups: a live investigation into a high RSS failure
  rate, implementing a previously-documented-but-missing retry, a UX change to how
  sync failures are surfaced, and two tuning follow-ups). Originally tracked toward a
  `0.2.3` patch, but grew into real new scope along the way (a failure-handling
  subsystem removed outright, a new retry mechanism actually implemented, a UX
  decision on failure visibility) — shipped as a **minor** version instead, `0.3.0`,
  skipping the `0.2.3` number entirely. Shipped 2026-07-16.
- **v0.4.0** — no bug-tracker batch of its own, same pattern as `v0.2.1`: driven
  entirely by D-050 (tray-resident mode, auto-start, opt-in notifications), a whole new
  feature the product owner asked for directly rather than an item reported here. Full
  history is in `decisions.md` D-050, not a `tracker-history/` file. Shipped as a **minor**
  version (real new scope, not a bug-fix batch). Shipped 2026-07-16.
- **v0.4.1** — no bug-tracker batch of its own, same pattern as `v0.2.1`/`v0.4.0`: a
  same-day revert, not a fix for any item in this file's own batch. [[B-108]]'s round 2
  (the frozen-position `.player-scroll-catcher` strip) turned out to sit over the app's
  own top-of-screen controls during/after a scroll gesture, swallowing clicks meant for
  them — worse than the scroll gap it was patching. Removed the whole mechanism on the
  owner's request; B-108 itself reverts to **Open**. Shipped as a **patch** version (a
  revert, not new scope). Shipped 2026-07-16.
- **v0.4.2** — no bug-tracker batch of its own, same pattern as `v0.2.1`/`v0.4.0`/
  `v0.4.1`: driven by D-051, a direct product-owner request prompted by a real bug they
  hit live (closing the window to the tray left a still-playing video running silently,
  with no easy way to stop it). New `SettingsDto.popOutOnClose` pops the video into the
  always-on-top extract window on tray-close (default) or pauses it, per the toggle;
  `extractPlayer` gained an `auto` flag and a `title` parameter. Full history is in
  `decisions.md` D-051, not a `tracker-history/` file. Shipped as a **patch** version, per
  the owner's own explicit direction. Shipped 2026-07-16.
- [`tracker-history/v0.4.3.md`](tracker-history/v0.4.3.md) — a single entry, [[B-111]] (Fixed
  same day it was reported): leaving the full-view player or closing the window to the
  tray while the video was genuinely paused still docked/popped it out as if it were
  playing, because `playerStateRef` only updated from the `onStateChange` postMessage
  event. Fixed by also reading `playerState` off the `infoDelivery` heartbeat. Shipped
  as a **patch** version. Shipped 2026-07-16.
- **v0.4.4** — no bug-tracker batch of its own, same pattern as `v0.2.1`/`v0.4.0`/
  `v0.4.1`/`v0.4.2`: driven by D-052, raised directly by the product owner in
  conversation rather than reported here — turning off "Show Shorts" hid Shorts from
  the feed but didn't stop them from triggering new-video notifications. Fixed
  (`SyncRepository.countShorts`), plus a new independent `notifyShorts` toggle (default
  on). Full history is in `decisions.md` D-052, not a `tracker-history/` file. Shipped as a
  **patch** version, per the owner's own explicit direction. Shipped 2026-07-17.
- [`tracker-history/v0.4.5.md`](tracker-history/v0.4.5.md) — five entries, all Fixed: B-116
  (all-Shorts channel never backfills older uploads), B-112 (pop-out window video
  switching), B-113 (clickable comment timestamps), B-114 (live badge/duration stuck
  after stream ends), B-115 (Premiere vs. Live badge distinction). Shipped as a
  **patch** version (pure bug-fix/adjustment batch, no new `D-NNN` scope alongside it).
  Shipped 2026-07-17.
- [`tracker-history/v0.4.6.md`](tracker-history/v0.4.6.md) — no B-NNN entries, driven entirely
  by D-053, a direct product-owner request raised in conversation rather than reported
  here (same pattern as D-050/D-051/D-052 before it). A currently-live video now sorts
  to the top of its date bucket; an ended broadcast sorts and buckets by when it
  actually ended (`liveStreamingDetails.actualEndTime`, newly captured, schema v12)
  rather than its original, older `publishedAt` — including broadcasts discovered only
  after they already ended (e.g. via gap-backfill), which also now get the correct feed
  badge. Full narrative in `decisions.md` D-053. Shipped as a **patch** version, per the
  owner's own explicit direction. Shipped 2026-07-19.
- [`tracker-history/v0.4.7.md`](tracker-history/v0.4.7.md) — B-117 (Fixed — removed the
  unreliable Premiere-vs-live badge distinction outright, no replacement signal
  confirmed against real data) and B-118 (Won't fix — confirmed YouTube's own RSS/CDN
  latency, not a Chronicle bug). Shipped as a **patch** version (a pure bug-fix batch,
  no new `D-NNN` scope alongside it). Shipped 2026-07-19.
- [`tracker-history/v0.4.8.md`](tracker-history/v0.4.8.md) — five entries, all Fixed: B-119 (a
  finished Premiere no longer gets stuck with the "ended live broadcast" treatment),
  B-120 (feed bucket headers/labels now agree with each other around live/ended
  broadcasts — needed a same-day round 2), B-121 (opening the active video in the
  browser now pauses Chronicle's own copy), B-122 (a currently-airing live/Premiere
  shows "Started X ago" instead of a meaningless "0 min ago", feed and player screen
  both), and B-123 (the player screen no longer shows a duration at all, caught by the
  owner while live-testing B-122). Shipped as a **patch** version (a pure bug-fix/
  adjustment batch, no new `D-NNN` scope alongside it). Shipped 2026-07-20.

- [`tracker-history/v0.5.0.md`](tracker-history/v0.5.0.md) — a single entry, [[B-086]] (Won't
  fix — the open research question is resolved: an authenticated `playlistItems.list`
  call, live-tested against a real membership, does not surface members-only content
  either, and no other TOS-compliant endpoint exists). [[B-108]], [[B-022]], [[B-101]]
  didn't make it in and carried their **Target** forward again. Shipped as a **minor**
  version, driven by D-054 (the language/localization system: Settings dropdown,
  locale registry, PT-BR translation) rather than by this batch — full narrative in
  `decisions.md`, not a dedicated tracker-history note of its own. Shipped 2026-07-20.
- **v0.6.0** — no bug-tracker batch of its own, same pattern as `v0.4.0`/`v0.4.2`/
  `v0.4.4`/`v0.4.6`: driven entirely by D-055 (a player "up next" card on video end,
  suggesting the next video from the user's own Watch Later queue, FIFO, no autoplay),
  a direct product-owner request rather than an item reported here. [[B-108]],
  [[B-022]], [[B-101]] didn't make it in and carried their **Target** forward again.
  Full narrative in `decisions.md` D-055, not a dedicated tracker-history note of its
  own. Shipped as a **minor** version, per the owner's own explicit direction (real new
  scope — a new UI surface and IPC, not a bug-fix batch). Shipped 2026-07-22.
- [`tracker-history/v0.7.0.md`](tracker-history/v0.7.0.md) — a single entry, [[B-124]]
  (Fixed — the Comments section no longer renders on a currently-live video or
  Premiere). [[B-108]], [[B-022]], [[B-101]] didn't make it in and carried their
  **Target** forward again. Shipped as a **minor** version, driven by D-056 (the live
  chat panel — a toggle on the player screen opens a docked column showing the video's
  YouTube live chat, with its own extract-to-window and a one-time separate sign-in)
  rather than by this batch. Full narrative in `decisions.md` D-056, not a dedicated
  tracker-history note of its own. Shipped 2026-07-23.
- **v0.8.0** — no bug-tracker batch of its own, same pattern as `v0.4.0`/`v0.4.2`/
  `v0.4.4`/`v0.4.6`/`v0.6.0`/`v0.7.0`: driven entirely by D-057 (three Watch Later
  refinements — auto-remove on open, up-next wraparound, drag-and-drop reorder) and
  D-058 (user-created local Playlists, a new sidebar screen), both direct
  product-owner requests rather than items reported here. [[B-108]], [[B-022]],
  [[B-101]] didn't make it in and carried their **Target** forward again. Full
  narrative in `decisions.md` D-057 and D-058, not a dedicated tracker-history note of
  its own. Shipped as a **minor** version, per the owner's own explicit direction (real
  new scope across two features, not a bug-fix batch). Shipped 2026-07-23.
- [`tracker-history/v0.8.1.md`](tracker-history/v0.8.1.md) — four entries, all Fixed,
  all reported and closed the same day: [[B-125]] (removing a video from a playlist now
  has the same inline undo ignore already has), [[B-126]]/[[B-127]] (favorite and Watch
  Later toggles now reflect immediately inside a playlist's own video list instead of
  staying stale until it's reopened — same root cause, same fix), and [[B-128]] (the
  ignore action was dropped from a playlist's video-list rows entirely, per the owner's
  own call, rather than made to behave consistently there). [[B-108]], [[B-022]],
  [[B-101]] didn't make it into 0.8.1 either and carried their **Target** forward again.
  Shipped as a **patch** version (a pure bug-fix/adjustment batch, no new `D-NNN` scope
  alongside it). Shipped 2026-07-23.
- **v0.9.0** — no bug-tracker batch of its own, same pattern as `v0.4.0`/`v0.4.2`/
  `v0.4.4`/`v0.4.6`/`v0.6.0`/`v0.7.0`/`v0.8.0`: driven entirely by D-059 (importing a
  YouTube playlist into a local Playlist, plus an add-only Sync action on an imported
  playlist's own screen), a direct product-owner request rather than an item reported
  here. [[B-108]], [[B-022]], [[B-101]] didn't make it in and carried their **Target**
  forward again. Full narrative in `decisions.md` D-059, not a dedicated
  tracker-history note of its own. Shipped as a **minor** version, per the owner's own
  explicit direction (real new scope, not a bug-fix batch). Shipped 2026-07-27.

**Current target: 0.9.1.** Carries [[B-108]], [[B-022]], [[B-101]] forward — none of
the three made it into 0.5.0, 0.6.0, 0.7.0, 0.8.0, 0.8.1, or 0.9.0 either (see above —
0.5.0/0.6.0/0.7.0/0.8.0/0.9.0 all shipped driven by a direct product-owner decision
instead, and 0.8.1's own batch was a different set of items).

## Entry template

```markdown
### B-NNN — short title
- **Type:** bug | adjustment · **Severity:** blocker | major | minor (bugs only)
- **Status:** Open · **Reported:** YYYY-MM-DD · **Target:** 0.N.0
- **Area:** feed | player | sync | onboarding | auth | storage | ui-shell | other
- **What happens:** observed behavior (for bugs: steps to reproduce if known).
- **Expected:** what should happen instead (reference spec sections when they exist).
- **Code refs:** starting points in the source (files/modules, no line numbers — they
  rot). These are hints as of the reported date, not guarantees; verify before relying.
- **Notes:** hypotheses, related decisions (D-NNN), related items (B-NNN).
```

Resolved entries add:

```markdown
- **Resolved:** YYYY-MM-DD · **Commit:** <hash> · **Outcome:** Fixed | Won't fix | Duplicate
- **Resolution:** what was changed, and which specs were updated (if any).
```

---

## Open

### B-101 — Investigate proxying fullscreen into the embed via the widget protocol
- **Type:** adjustment · **Status:** Open · **Reported:** 2026-07-15 · **Target:** 0.9.1
  (carried over — 0.2.2, 0.3.0, 0.4.0, 0.4.1, 0.4.2, 0.4.3, 0.4.4, 0.4.5, 0.4.6, 0.4.7, 0.4.8, 0.5.0, 0.6.0, 0.7.0, 0.8.0, 0.8.1, and 0.9.0 all shipped without this)
- **Area:** player
- **What happens:** [[B-089]] removed Chronicle's own `f` fullscreen shortcut rather
  than keep fighting the embed over which element goes fullscreen — fullscreen is now
  only reachable by clicking the embed's own native button (or however the embed itself
  handles keyboard input while it has focus). Per the owner's own suggestion once
  B-089 was resolved: worth a follow-up investigation into whether the postMessage
  widget protocol Chronicle already speaks to the embed (`enablejsapi=1`) can be used to
  ask the embed to enter fullscreen itself, so a Chronicle-side `f` shortcut could work
  again without needing focus to be inside the iframe.
- **Expected:** not yet known — this is a research spike, not a confirmed feature.
- **Code refs:** `src/ui/PlayerSurface.tsx` (`command()`, the widget protocol's existing
  command surface — `playVideo`/`pauseVideo`/`seekTo`/`setPlaybackRate` today).
- **Notes:** the public YouTube IFrame Player API's documented command set has no
  fullscreen command as of this writing — confirmed by inspecting what Chronicle
  already sends and receives; nothing else in the current `command()` surface hints at
  one. Per `youtube-api.md` §Terms-of-service constraints, only documented endpoints/
  commands are usable — if there's no real, public command, this stays "can't" rather
  than reaching for anything from the private Innertube surface, similar to how
  [[B-046]] concluded. Confirming that absence properly (not just from memory) is the
  actual first step here, not writing speculative code against a command that may not
  exist.

### B-108 — Mouse-wheel scroll doesn't work on the full-view player screen while hovering the embedded video
- **Type:** bug · **Severity:** minor
- **Status:** Open · **Reported:** 2026-07-16 · **Target:** 0.9.1
  (carried over — 0.2.2, 0.3.0, 0.4.0, 0.4.1, 0.4.2, 0.4.3, 0.4.4, 0.4.5, 0.4.6, 0.4.7, 0.4.8, 0.5.0, 0.6.0, 0.7.0, 0.8.0, 0.8.1, and 0.9.0 all shipped without this; the
  scroll-catcher attempted in 0.4.1 was reverted — see below)
- **Area:** player
- **What happens:** on the full-view player screen, scrolling the mouse wheel while the
  cursor is positioned over the embedded YouTube video does nothing — the page doesn't
  scroll. Moving the mouse off the video first is the only workaround.
- **Expected:** the page scrolls normally regardless of where the cursor is over it,
  video included.
- **Code refs:** `src/ui/PlayerSurface.tsx` (`.player-stage`'s `<iframe>`).
- **Root cause:** the embed is a cross-origin `<iframe>` (`youtube.com/embed/...`) —
  mouse/wheel input that physically lands on it is handled entirely within its own
  document; it never reaches this app's event listeners at all, at any level (window,
  document, or an ancestor DOM node), regardless of capture vs. bubble phase — a
  structural limitation of iframes, not something addressable by listening
  "differently." The only way to intercept input over that area is a real, same-origin
  DOM element physically covering it, which then necessarily also blocks whatever the
  embed's own controls needed from that area (play/pause, seek, its own buttons) — there
  is no cross-origin-safe way to "catch wheel but pass through clicks" on the same
  element (wheel and click are independent input streams with no shared signal to key
  off of, and CSS `pointer-events` can't be selective per event type).
- **First-round fix (2026-07-16), started in the same session it was reported:** rather
  than cover the whole video (which would trade away the embed's own click/seek
  interactivity — a bigger loss than the scroll gap itself), added a transparent
  same-origin strip (`.player-scroll-catcher`, `height: 18%`) along the *top* of the
  video only, above the iframe. Its `onWheel` handler manually scrolls `.player-view`
  (found via `alignTarget.closest('.player-view')` — `alignTarget` is the existing slot
  placeholder prop `PlayerSurface` already receives, so no new prop plumbing was
  needed). Only rendered when `active` (full-view, not miniplayer — the reported
  complaint was specifically "a tela do vídeo," the full-view screen) and
  `surface === 'playing'` (the `'ended'`/`'embed-blocked'` states already show a full,
  same-origin `.player-overlay` on top, which has no cross-origin scroll problem of its
  own). This only fixes the top ~18% of the video, not the whole thing — the owner's
  actual reported case (mouse anywhere over the video) is only partially addressed.
  Checked via `npm run typecheck && npm run lint && npm test` (200/200); **not run
  live** (per [[no-live-app-verification]]) — needs the owner's hands-on check (does
  scrolling now work in the top strip; does clicking/seeking anywhere on the video still
  work exactly as before) before deciding whether a further round (e.g. widening the
  strip, or a different area) is warranted, same iterative approach as [[B-045]].
- **Owner feedback on round 1 (2026-07-16):** live-tested — confirmed both problems the
  root-cause writeup above predicted but didn't fully spell out. (1) The strip barely
  worked at all: it's nested inside `.player-stage`, so it moves exactly with the video's
  live scroll position — but a wheel gesture doesn't move the cursor, only the content
  under it, so after the very first scroll tick the video (and the strip glued to it) had
  already moved out from under a stationary cursor, landing back on bare iframe with
  nothing left to catch the rest of the gesture. (2) 18% of the video's height reached
  into real embed controls near the top, which the strip then blocked — a straight
  regression, not a partial win.
- **Second-round fix (2026-07-16), same session:** the actual bug in round 1 wasn't the
  strip's size or position — it was tracking the video's *live* position at all. Split
  `PlayerSurface.tsx`'s existing scroll-tracking `measure()` effect into two update
  paths: the video's own `rect` (clip-path, position) still updates on every scroll tick
  as before ([[B-106]] depends on that), but a new `catcherRect` only updates on resize/
  layout changes (`ResizeObserver`, `window resize`) — never on scroll. The catcher
  (`.player-scroll-catcher`) moved out of `.player-stage` entirely, now an independent
  `position: fixed` sibling positioned from `catcherRect` with its own `z-index: 22`
  (above `.player-stage`'s 21, since it no longer inherits stacking from being nested).
  Practical effect: once a wheel gesture starts, neither the stationary cursor nor the
  now-frozen catcher moves, so the whole gesture stays caught instead of escaping after
  one tick — the catcher only re-syncs to the video's true position between gestures (on
  resize), not mid-gesture. Also shrunk it to a small fixed `40px` band instead of a
  percentage of the video's height, to reduce (not eliminate — still not live-verified)
  the risk of reaching into real controls. Checked via `npm run typecheck && npm run
  lint && npm test` (200/200); **not run live** — needs the owner's hands-on check again
  (does a continuous wheel gesture starting near the video's top edge now keep scrolling
  instead of stopping after one tick; do the video's own controls near the top stay
  clickable) before this can move past "In progress," same iterative shape as [[B-045]].
- **Owner feedback on round 2 (2026-07-16):** not what they wanted — the catcher only
  covers a small fixed band, so hovering the *middle* of the video (a very common resting
  spot, not just near the top edge) still doesn't catch scroll at all. Round 2 fixed the
  "escapes after one tick" defect but didn't address that the catcher's coverage is still
  small relative to where the cursor actually tends to be. **Owner's call: pause here,
  they'll come back to adjust it themselves** — no further rounds attempted this session.
  Left as-is in code (not reverted) rather than rolling back to round 1, since round 2 is
  a strict improvement (no regression on real controls that round 1 introduced, and the
  frozen-position mechanism itself works as designed — it's just too small an area).
  Next round, whenever picked back up, needs to reconsider coverage more fundamentally
  (per this entry's own root-cause notes: full coverage trades away the embed's own
  click/seek interactivity, and there's no cross-origin-safe middle ground CSS alone can
  express) rather than just resizing the same small-band approach again.
- **Round 2 reverted (2026-07-16):** the owner came back and reported the catcher was now
  interfering with the app's own top-of-screen controls, not just real embed controls —
  a `position: fixed` strip spanning the full slot width, sitting above everything else
  (`z-index: 22`) and frozen in place mid-scroll, is more than enough to end up parked
  over the topbar during or after a scroll gesture, silently swallowing clicks there.
  Given that and round 2's already-known undersized-coverage complaint, removed the whole
  scroll-catcher mechanism on request: `catcherRect` state, its measure/scheduleMeasure
  split, the `.player-scroll-catcher` JSX, and its CSS rule in `styles.css`. `rect` (the
  video's own live-scroll-following position, used for the actual video box and clipping)
  is untouched. This restores the original bug — the page still can't be scrolled while
  the cursor is over the embedded video — with no interim workaround in place. Checked via
  `npm run typecheck && npm run lint && npm test` (208/208); not run live (per
  [[no-live-app-verification]]). **Status reset to Open** — back to square one on a fix;
  any next attempt should start from this entry's root-cause notes rather than resuming
  from round 2's approach.

## In progress

### B-022 — Delete all data: app relaunches into a frozen/blank screen instead of a clean state
- **Type:** bug · **Severity:** major
- **Status:** In progress · **Reported:** 2026-07-12 · **Target:** 0.9.1 (carried over —
  0.2.2, 0.3.0, 0.4.0, 0.4.1, 0.4.2, 0.4.3, 0.4.4, 0.4.5, 0.4.6, 0.4.7, 0.4.8, 0.5.0, 0.6.0, 0.7.0, 0.8.0, 0.8.1, and 0.9.0 all shipped without this)
- **Area:** ui-shell / storage
- **What happens:** Settings → delete all data wipes and restarts the app, but the
  relaunched app sits on a stuck/blank screen instead of coming back as a fresh
  install, forcing a manual app restart. **Confirmed still reproducing 2026-07-12** by
  the product owner, live, after the first fix attempt (commit 877a30d) — reopened.
- **Expected:** after the wipe the app comes back in its clean first-run state. Today
  that means the connect-to-YouTube setup; but [[B-003]] makes authentication optional,
  so the post-wipe landing should be whatever "fresh start without an account" becomes
  once B-003 lands — design the fix so the landing screen is the normal first-run
  entrypoint, not a hardcoded wizard jump.
- **Code refs:** `src/platform/main.ts` (`deleteAllData` handler, `devRendererUrl()`,
  `createWindow()`).
- **Notes:** first attempt (commit 877a30d) swapped `app.exit(0)` for explicit window
  `destroy()` + `app.quit()`, on the theory that `app.exit()` skips teardown and races
  the compositor (niri/Wayland) for the next window's surface. That attempt was marked
  Fixed without live validation — the owner's live re-test showed the blank/frozen
  screen still happens, so the teardown-race theory is disproven or at least
  incomplete. **Second attempt (commit 9be2d72):** `createWindow()` picked the renderer
  source with `!app.isPackaged && process.env['ELECTRON_RENDERER_URL'] ?
  loadURL(...) : loadFile(...)`. `app.relaunch()` has no `env` option (only
  `args`/`execPath`) — whether `ELECTRON_RENDERER_URL` (set by electron-vite's dev
  orchestrator) survives into the relaunched process depends on env-inheritance
  behavior the code never controlled explicitly. In dev, a relaunch that lost the
  var would fall through to `loadFile()` against a renderer bundle that only exists
  in a packaged build — exactly a blank window. Fixed by making the URL travel
  explicitly through `args` (a new `devRendererUrl()` helper checks
  `process.argv` for a `--chronicle-renderer-url=` flag as a fallback to the env var,
  and `deleteAllData` now passes `app.relaunch({ args: [...relaunchArgs,
  '--chronicle-renderer-url=...'] })`), removing the dependency on env-inheritance
  entirely regardless of whether that was the true root cause. **Confirmed still
  reproducing 2026-07-12** by the product owner, live, after this second attempt too
  (commit 9be2d72) — "deletei tudo, o app reabriu mas fica numa tela em branco." Two
  attempts down, both aimed at the renderer-URL-not-reaching-the-relaunched-process
  theory; that theory itself may be wrong, or only part of the picture.
  **New working hypothesis, not yet verified — worth checking first on the next
  attempt:** `npm run dev` runs via `electron-vite dev`, which supervises the Electron
  process as its own child and owns the Vite dev server backing
  `ELECTRON_RENDERER_URL`. `deleteAllData` calls `app.relaunch()` (spawns a *new*,
  untracked grandchild Electron process) then `app.quit()`s the original — from
  electron-vite's supervisor's point of view, its child just exited, which may cause it
  to tear down the Vite dev server (thinking the user closed the app) before or shortly
  after the relaunched instance tries to `loadURL()` against it — a dead dev server
  would look exactly like a blank/frozen window, and would explain why fixing the
  renderer-URL *value* twice hasn't helped: the URL was probably always correct, the
  server behind it wasn't necessarily still alive. This would be dev-mode-only — a
  packaged build's `loadFile()` has no such dependency.
  **Third attempt (2026-07-15), implementing exactly the recommendation above rather
  than waiting to confirm the hypothesis first (a live check either way needs the
  owner):** `deleteAllData` no longer calls `app.relaunch()`/`app.quit()` at all.
  `src/platform/main.ts`'s entire composition root (was one large one-shot
  `app.whenReady().then(async () => {...})` closure) is now a callable `async function
  boot()`; `deleteAllData` tears down the current generation (clear both timers,
  `ipcMain.removeHandler` for every `IpcChannel`, `protocol.unhandle('thumb')`, close and
  null the DB handle) and calls `boot()` again in the same process — never exits, so
  there's no child-process-exit event for electron-vite's supervisor to react to,
  regardless of whether that theory is exactly right. Ordering detail that mattered:
  the stale window(s) are destroyed only *after* `boot()`'s fresh one exists, not
  before — destroying every window first would transiently drop
  `BrowserWindow.getAllWindows()` to zero, which fires the existing
  `window-all-closed` → `app.quit()` handler on Linux/Windows and would reproduce the
  same "process exits mid-reset" failure a different way. `timer`/`updateTimer` moved
  from `boot()`-local to module-level `let`s so the module-level `will-quit` cleanup
  (and `deleteAllData` itself) can reach whichever generation is currently live;
  `app.on('activate', ...)` also moved to module scope (registered once) since it was
  previously inside the closure and would otherwise gain a duplicate listener per
  reboot. `createWindow()` now returns the `BrowserWindow` it creates rather than
  relying on `BrowserWindow.getAllWindows()[0]`, which stopped being reliable once two
  windows can transiently coexist during a reboot. The dev-renderer-URL-through-argv
  mechanism from the second attempt is now dead weight (nothing relaunches anymore) and
  was simplified back to reading `process.env['ELECTRON_RENDERER_URL']` directly, which
  stays valid for the process's whole lifetime including across reboots. No unit-test
  coverage exists or is practical here (`main.ts`'s composition root has never been
  tested, consistent with how every prior attempt on this bug was verified) — checked
  via `npm run typecheck && npm run lint && npm test` (199/199) plus `npm run build`
  (electron-vite build succeeds) as an extra sanity check beyond what earlier attempts
  did, but **not run live**, per [[no-live-app-verification]]. Two attempts before this
  one were each marked Fixed without a live check and both were disproven on the
  owner's next live test — keeping this in "In progress" (not Resolved) until the owner
  confirms live is this bug's own established rule, and matters more here than usual
  given that history.

## Resolved

### B-129 — Feed date-bucket headers (Today/Yesterday/This Week/Earlier) overlap or float at stale positions after navigating between screens
- **Type:** bug · **Severity:** major
- **Status:** Fixed · **Reported:** 2026-08-07 · **Target:** 0.9.1
- **Area:** feed / ui-shell
- **What happens:** while navigating between screens (feed views, a playlist's own
  video list, channel filters, etc.), the virtualized list's section headers
  eventually render overlapping each other or floating at positions that don't match
  their content — as if headers from one screen's list were still showing on top of
  another screen's rows. Intermittent; the owner couldn't pin down an exact trigger
  before reporting.
- **Expected:** headers always render at the correct height/offset for the
  currently-displayed row content, regardless of what was shown before.
- **Code refs:** `src/ui/FeedList.tsx` (`useVirtualizer`'s `measure()` effect).
- **Root cause:** `FeedList` is a single, always-mounted component instance reused
  across every screen that shows a video list — main feed views and a channel filter
  share one `<FeedList>` call site in `App.tsx` (channel view is `screen === 'feed'`
  with `channelFilter` set, not a separate screen), and a playlist's own video list is
  a second, separately-mounted `<FeedList>` instance (`PlaylistDetailView.tsx`); no
  call site passes a remount `key`, by design (D-058's "single stable element"
  layout) for the feed/channel case. `@tanstack/react-virtual`'s `getMeasurements()`
  is memoized on `[count, paddingStart, scrollMargin, getItemKey, enabled, lanes,
  laneAssignmentMode]` plus an internal cache-version counter — **not** on
  `estimateSize`'s closure. `FeedList` never calls `measureElement` (fixed-height rows
  via inline `style`), so its `estimateSize` closure (which reads `displayRows[i].kind`
  — header vs. video vs. card-row) is the only thing that reflects which dataset is
  currently showing. The component's own `virtualizer.measure()` effect (which clears
  the cache and forces a fresh recompute) only depended on `[rowHeight, cardRowHeight,
  layout, columns, virtualizer]` — none of which change when switching between two
  different datasets (e.g. "All" and a channel filter) that happen to produce the same
  row count with the same item size/layout/columns settings. In that case none of
  tanstack-virtual's own memo inputs change either, so `getMeasurements()` silently
  returns the *previous* dataset's cached sizes/offsets verbatim — a row that used to
  be a 38px header at some index can keep that stale 38px/offset even though a video
  or card-row (76–420px) is now rendered there, and since `.feed-item` has no
  `overflow: hidden` the mismatched box visually bleeds into neighboring rows.
  Confirmed by reading `node_modules/@tanstack/virtual-core`'s
  `getMeasurementOptions`/`getMeasurements` memoization directly, not guessed.
- **First-round fix (2026-08-07):** added `displayRows` to the `measure()` effect's
  dependency array, so any change to the actual row content (not just item
  size/layout/column count) forces `virtualizer.measure()` to clear the cache and
  bump tanstack-virtual's internal cache-version counter, bypassing its memo and
  forcing a fresh recompute from the current `estimateSize` regardless of whether the
  row count happens to coincide with the previous dataset's. Checked via `npm run
  typecheck && npm run lint && npm test`; not run live.
- **Owner feedback on round 1 (2026-08-07):** live-tested — still reproduces going
  from the "All" feed view to a channel's own video list. Confirms the dependency-array
  fix alone didn't cover the whole mechanism.
- **Second-round fix (2026-08-07), same session:** the round-1 fix does correctly force
  `virtualizer.measure()` to run on a dataset switch, but it ran inside a plain
  `useEffect` — which React schedules *after* the browser has already painted. The
  render that computes `items = virtualizer.getVirtualItems()` (used to build the
  actual `.feed-item` boxes) runs first, still reading whatever stale per-index sizes
  were left in `itemSizeCache` from the *previous* dataset at that point — so the
  browser commits and paints one real frame of mismatched header/row heights and
  offsets before the effect fires and corrects it on the next frame. `.feed-item`
  (`styles.css`) has no `overflow`/`clip`/`contain` to mask that stale frame, so it's
  fully visible rather than hidden — exactly the reported overlap. Switched the effect
  from `useEffect` to `useLayoutEffect` (`FeedList.tsx`), which React flushes
  synchronously after render but *before* the browser paints, so `measure()`'s cache
  clear and the corrective re-render both happen pre-paint instead of one visible
  frame late. Checked via `npm run typecheck && npm run lint && npm test`; **not yet
  run live** — needs the owner's own navigation test (switching from "All" to a
  channel, and between other view/channel/playlist combinations) to confirm the
  overlap no longer reproduces at all, given round 1 already looked plausible on paper
  and still failed live.
- **Owner feedback on round 2 (2026-08-07):** live-tested — still reproduces, same
  screenshot shape: opening a channel from "All" shows two bucket-header labels
  ("TODAY" and "YESTERDAY") visually superimposed right at the top of the list,
  directly under the channel banner, plus a small stray box artifact on the far left
  edge. This is a second disproven fix in a row on this bug — worth being explicit
  about what that means: reasoning from `@tanstack/virtual-core`'s source alone
  predicted a *transient one-frame* flash, correctable by moving the recompute earlier
  in the render cycle. What the owner is seeing reads as more persistent/settled than
  a single-frame flash, which means either the round-1/round-2 mechanism wasn't the
  (whole) actual cause, or there's a second, independent contributor. Per
  [[feedback-verify-dom-interaction-bugs-dont-guess]] — a real DOM/paint bug can't be
  confirmed from source reading alone, and two confident-sounding misses in a row is
  itself the evidence for that — the third attempt below is deliberately a structural
  change robust to *either* explanation, rather than a third guess at the exact
  mechanism.
- **Third-round fix (2026-08-07), same session:** rather than continue trying to
  out-guess tanstack-virtual's internal memoization/cache semantics, gave `FeedList`'s
  call site in `App.tsx` a `key={`${view}|${channelFilter ?? ''}|${accountFilter ?? ''}`}`
  (previously no `key` at all — same mounted instance reused across every
  view/channel/account combination, confirmed in the original investigation). Any
  change to view/channel/account now fully unmounts the old `FeedList` — destroying
  its virtualizer instance, its scroll container, and every DOM node under it — before
  mounting a completely fresh one for the new dataset. This is a strictly stronger
  guarantee than rounds 1–2: it can't leave behind stale tanstack-virtual measurement
  state (round 1/2's theory) *and* it can't leave behind stale painted DOM/pixels from
  the old dataset either, since the old elements are actually removed from the tree
  rather than repositioned — covering the alternative possibility that this is (also,
  or instead) a paint/compositor artifact rather than a pure React state bug, which
  this codebase has hit before in Wayland-specific ways (D-050's tray-host staleness).
  Deliberately scoped to the main feed/channel `<FeedList>` only, not
  `PlaylistDetailView`'s separate instance — that one already fully unmounts when
  entering/leaving a playlist via the Playlists list screen (per the original
  investigation), so there's no confirmed repro there yet; can extend the same `key`
  pattern if the owner ever hits it playlist-to-playlist. Checked via `npm run
  typecheck && npm run lint && npm test` (275/275 — a pre-existing, unrelated new test
  file also appeared in this run). **Not yet run live.** If this *still* doesn't fix
  it, that's a strong signal the bug isn't in `FeedList`/tanstack-virtual at all and
  needs a different investigation angle (e.g. `ChannelHeader`'s own mount/layout
  timing, or a genuine GPU/compositor repaint issue specific to the owner's niri/
  Wayland setup) rather than a fourth attempt in this same area.
- **Owner feedback on round 3 (2026-08-07):** live-tested — still reproduces, same
  shape. This is now three disproven fixes in a row, each targeting `FeedList` itself
  (dependency-array recompute, `useLayoutEffect` timing, and finally a full forced
  remount via `key`). Round 3 in particular is strong evidence `FeedList`/tanstack-
  virtual was never the actual cause: a full unmount+remount destroys every DOM node
  and every piece of internal state the old instance held, so if the bug were
  anything happening *inside* `FeedList`, round 3 would have closed it off entirely
  regardless of the exact mechanism.
- **New scoping clue from the owner, same message:** the glitch **only** happens
  going from the "All" feed view straight to a channel — navigating from one channel
  directly to another does **not** show it. This matters a lot given round 3: my
  `key` change makes `FeedList` fully remount on *every* view/channel/account switch,
  All→channel and channel→channel alike — if a fresh `FeedList` mount were sufficient
  to reproduce or fix this, both transitions would behave identically. They don't. So
  whatever's wrong is tied to something that differs structurally between the two
  transitions, not to `FeedList` remounting at all. The concrete difference:
  `ChannelHeader` (`App.tsx`, gated on `channelFilter !== null`) goes from **absent
  to present** (a fresh mount, new DOM subtree inserted above `.feed-region`) only on
  All→channel; channel→channel it was already mounted and only re-renders with new
  props (same DOM node, `channel.channelId` change re-triggers its own banner-fetch
  effect but doesn't remount the element itself). The priority/favorites section
  (`App.tsx`, `priorityVideos`, D-039/B-042) mirrors this: shown only on
  `view` in `{'all','unread'}` with no channel filter, so it also specifically
  unmounts only on All→channel, not channel→channel. Checked `ChannelHeader.tsx` and
  its CSS (`styles.css` `.channel-header*`): the banner is a plain CSS
  `background-image` on a div with content-driven (not image-driven) height — avatar
  + text + buttons render immediately, so there's no late image-driven height jump to
  explain a layout race; that theory is ruled out. No CSS animation/transition exists
  on `.channel-header` either.
- **Status: paused pending live diagnostic data, not a fourth blind attempt.** Per
  [[feedback-verify-dom-interaction-bugs-dont-guess]] — three misses in a row, each
  reasoned confidently from source/CSS alone and each disproven live, is itself proof
  that static reading isn't enough to pin this down further. Asked the owner to
  inspect the actual overlapping elements live (DevTools) rather than guess a fourth
  mechanism blind — see conversation for the exact ask. Whatever comes back
  (element classNames/computed styles of the two overlapping texts, and whether a
  cheap resize/scroll test clears the glitch without any data change) should point at
  either a real leftover DOM node somewhere outside `FeedList` (React-fixable) or a
  genuine paint/compositor artifact (would need a different kind of fix entirely,
  e.g. forcing a paint-layer boundary) — no further code changes until that's in.
- **The owner's DevTools HTML broke the case open.** Pasted the live `.feed-inner`
  markup instead of a screenshot: two real, separate `.feed-item` elements, `<h2
  class="group-header">Today</h2>` and `<h2 class="group-header">Yesterday</h2>`, each
  independently styled `height: 38px; transform: translateY(0px)` — genuinely the same
  computed position, not a visual illusion. The tell was the *next* row: the following
  `card-row` sits at `translateY(38px)` — consistent with only "Today" contributing to
  the running offset, as if "Yesterday" occupied zero space in whatever computation
  produced these positions, even though its own box is a real 38px-tall element. The
  owner also confirmed, unprompted, that in the cases they hit, the channel has **no**
  video published today at all (only yesterday) — so "Today" shouldn't exist as a
  header in that channel's own data under any circumstance.
- **Root cause, finally confirmed in `App.tsx`, not `FeedList`:** both the client-side
  row builder (`rows`'s `useMemo`) and the backend (`FeedService.getSlice` in
  `core/feed-service.ts`) are structurally incapable of emitting a bucket header
  without a real video in that bucket — confirmed by reading both top to bottom. So a
  "Today" header with zero videos under it can only mean the rows shown briefly
  belonged to a *different* dataset that genuinely does have one. `channelFilter`
  (React state) updates synchronously the instant a channel is opened — `ChannelHeader`
  and (per round 3's `key`) a fresh `FeedList` render immediately. But `videos` (the
  actual row data) only updates once `loadView`'s `getFeed()` IPC call resolves,
  inside a `useEffect` that runs *after* that first commit, and only once the async
  round-trip itself finishes. In between, `filtered` (`= videos` until this fix) was
  still whatever the *previous* screen's data was — "All" almost always has a "Today"
  bucket (some subscription usually posts same-day across dozens of channels), so
  landing on a channel with none produced exactly this: the new `ChannelHeader` paired
  with the old "All" data's leftover "Today" header for one or more frames, positioned
  using the outgoing dataset's own layout math (hence "Today" alone driving the
  offset, with "Yesterday" — the channel's real first bucket, rendered the instant the
  real response arrived, at the same `translateY(0)` starting point a fresh mount
  always uses — landing exactly on top of it). Channel→channel doesn't show it because
  most other channels *also* lack a same-day upload, so the same transient frame looks
  no different from the correct one — not because the race isn't happening, but
  because it's not visually distinguishable there. This also explains why three
  rounds of `FeedList`-internal fixes never touched it: the bug was never inside
  `FeedList`'s virtualizer at all, it was `App.tsx` feeding it genuinely stale `rows`
  input for one or more real, paintable frames.
- **Fourth-round fix (2026-08-07), same session:** added `videosFor` (`App.tsx`), a
  small piece of state recording exactly which `(view, channel, account)` triple the
  current `videos` array was fetched for, set alongside `setVideos(slice.videos)`
  inside `loadView`'s `.then()`. `filtered` (previously `= videos` directly) is now a
  `useMemo` that only trusts `videos` when `videosFor` matches the *current*
  `view`/`channelFilter`/`accountFilter`; every render in between (including the very
  first one, before any effect has even run) sees `[]` instead of the outgoing
  screen's leftover rows. `loadMore`'s own append path (pagination within the same
  session) deliberately never touches `videosFor`, so scrolling for more of the same
  list is unaffected. The existing empty-channel backfill effect
  (`if (filtered.length === 0 && channelFilter !== null) loadMore()`) already checked
  `loadingRef.current` first inside `loadMore()`, which is `true` for this entire gap
  (set synchronously by `loadView`), so it can't misfire into a spurious backfill
  during the transition — verified by reading `loadMore`'s own guard, not assumed.
  Needed a `useMemo` wrap after an eslint `react-hooks/exhaustive-deps` catch (a bare
  conditional would've hurt `filtered`'s referential stability, which matters given
  `FeedList`'s own re-measure effect from round 1 keys off exactly that). Checked via
  `npm run typecheck && npm run lint && npm test` (275/275). Rounds 1–3's changes
  (recompute on content change, `useLayoutEffect` timing, the per-dataset `key`
  remount) are left in place — none of them were wrong, they just weren't reachable
  while `App.tsx` kept handing `FeedList` stale input in the first place; they still
  provide real, independent robustness for other staleness paths within `FeedList`
  itself.
- **Owner feedback on round 4 (2026-08-07):** live-tested — confirmed fixed. Closes a
  bug that took four rounds and, per the owner's own account, was never reachable from
  reading `FeedList`/tanstack-virtual alone — the DevTools HTML the owner pasted after
  round 3 was what actually made the real mechanism (`App.tsx` handing `FeedList`
  stale cross-dataset rows during an async gap) visible.
- **Resolved:** 2026-08-07 · **Commit:** (pending) · **Outcome:** Fixed

