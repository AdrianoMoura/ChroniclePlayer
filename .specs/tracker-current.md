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
- [`tracker-history/v0.10.0.md`](tracker-history/v0.10.0.md) — a single entry, [[B-129]]
  (Fixed — feed date-bucket headers overlapping/floating at stale positions after
  navigating between screens, needing four same-day rounds before the real
  cross-dataset staleness race in `App.tsx` was found). [[B-108]], [[B-022]],
  [[B-101]] didn't make it in and carried their **Target** forward again. Shipped as a
  **minor** version, driven by D-060 (the sortable channel sidebar list) rather than
  by this batch — full narrative in `decisions.md`, not a dedicated tracker-history
  note of its own. Shipped 2026-08-07.
- [`tracker-history/v0.10.1.md`](tracker-history/v0.10.1.md) — a single entry, [[B-022]]
  (Fixed — delete-all-data now relaunches cleanly, confirmed live after three fix
  attempts spread across many prior releases). [[B-108]] and [[B-101]] didn't make it
  in and carried their **Target** forward again. Shipped alongside D-062 (a comments
  "open in browser" button plus a red-heart indicator for the viewer's own existing
  like state) rather than driven by this batch — full narrative in `decisions.md`, not
  a dedicated tracker-history note of its own. Shipped as a **patch** version, per the
  owner's own explicit direction. Shipped 2026-08-07.
- **v0.10.2** — no bug-tracker batch of its own, same pattern as `v0.4.0`/`v0.4.2`/
  `v0.4.4`/`v0.4.6`/`v0.6.0`/`v0.7.0`/`v0.8.0`/`v0.9.0`/`v0.10.1`: driven entirely by
  D-063 (a comments sort-order toggle, "Top comments"/"Newest first," mapped onto
  `commentThreads.list`'s own `order` param), a direct product-owner request rather
  than an item reported here. [[B-108]] and [[B-101]] didn't make it in and carried
  their **Target** forward again. Full narrative in `decisions.md` D-063, not a
  dedicated tracker-history note of its own. Shipped as a **patch** version, per the
  owner's own explicit direction.

**Current target: 0.10.3.** Carries [[B-108]] and [[B-101]] forward — neither made it
into 0.5.0, 0.6.0, 0.7.0, 0.8.0, 0.8.1, 0.9.0, 0.10.0, 0.10.1, or 0.10.2 either (see
above — 0.5.0/0.6.0/0.7.0/0.8.0/0.9.0/0.10.0/0.10.1/0.10.2 all shipped driven by a
direct product-owner decision instead, and 0.8.1's own batch was a different set of
items).

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
- **Type:** adjustment · **Status:** Open · **Reported:** 2026-07-15 · **Target:** 0.10.3
  (carried over — 0.2.2, 0.3.0, 0.4.0, 0.4.1, 0.4.2, 0.4.3, 0.4.4, 0.4.5, 0.4.6, 0.4.7, 0.4.8, 0.5.0, 0.6.0, 0.7.0, 0.8.0, 0.8.1, 0.9.0, 0.10.0, 0.10.1, and 0.10.2 all shipped without this)
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
- **Status:** Open · **Reported:** 2026-07-16 · **Target:** 0.10.3
  (carried over — 0.2.2, 0.3.0, 0.4.0, 0.4.1, 0.4.2, 0.4.3, 0.4.4, 0.4.5, 0.4.6, 0.4.7, 0.4.8, 0.5.0, 0.6.0, 0.7.0, 0.8.0, 0.8.1, 0.9.0, 0.10.0, 0.10.1, and 0.10.2 all shipped without this; the
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

## Resolved

### B-130 — A removed/private YouTube video stays in the local library and misreports as embed-blocked
- **Type:** bug · **Severity:** minor
- **Status:** Fixed · **Reported:** 2026-09-04 · **Target:** 0.10.3
- **Area:** player, storage
- **What happens:** a video that Chronicle already synced (row in `videos`) gets deleted
  or made private on YouTube's side afterward. Chronicle never re-checks a video it
  already has, so the stale row (and any `video_state`/playlist/watch-later references
  to it) stays in the local library forever, showing up in the feed exactly like any
  other video. Opening it renders the same "embed-blocked" overlay ("open in browser" /
  "back") the app already shows for a channel-owner-disabled embed (`playback.md`'s
  D-006 "clean embed" mandate) — misleading, since the video isn't blocked, it's gone.
  Owner's repro: the most recent video from the "Mitinho Player" channel in their own
  local DB is in this state right now — confirmed by querying `chronicle.db` directly
  (`video_id 3Gk_iGM7x-s`) and then checking that id against YouTube's own public watch
  page: `playabilityStatus` reports `"status":"LOGIN_REQUIRED"`,
  `"reason":"Vídeo privado"` — the video is genuinely **private**, not merely
  embed-restricted by its owner. `playableInEmbed` isn't even present in that response
  (unlike a real embed-restriction case, which sets it to `false`), reinforcing that
  this is a different failure family from the `101`/`150` one the code already handles.
- **Expected:** a genuinely-removed/private video should read as unavailable, distinct
  from "the owner disabled embedding here" — and the user should have a way to clear it
  out of their local library (feed, playlists, Watch Later, favorites) once it's
  confirmed gone, so it stops resurfacing.
- **Code refs:** `src/ui/PlayerSurface.tsx` — the `onError` postMessage handler only
  branches on IFrame error codes `101`/`150` (embed disabled) into a `'embed-blocked'`
  surface; error `100` (video not found/removed/private, per the IFrame API's own
  documented error codes) has no branch at all today. Confirmed live against the real
  Mitinho Player video above that its actual YouTube-side status is "private," which is
  exactly the case error `100` documents — the code path most likely to be firing for
  it (still not observed directly inside the running app/embed, since the Chrome
  extension needed for that wasn't connected this session, but no longer a guess from
  reading the handler alone: the video's real status is independently confirmed via
  YouTube's own public watch-page data). No repository method exists
  today to delete a single video row — `videos` (`local-data.md`) has no
  availability/status column at all (unlike `channels.available`, added for [[D-048]]'s
  channel case), and the closest existing deletes are
  `playlist-repository.ts`'s `removeVideoFromPlaylist` (unlinks from one playlist only,
  never touches `videos`) and `deleteAllData` (wipes the whole local DB).
- **Notes:** recommended shape, not yet implemented or confirmed with the owner:
  (1) branch error `100` (and maybe `2`, invalid id) into its own new surface state,
  separate from `'embed-blocked'`, with copy that says the video is gone rather than
  implying the channel restricted it; (2) offer an explicit "remove from library"
  button on that screen rather than auto-deleting — a transient network hiccup or a
  temporarily-processing/private video could false-positive, and silently deleting the
  user's own local data on a guess cuts against agency ([[chronicle-philosophy-agency]]);
  no periodic re-check of the whole library either way — checking at the moment the
  video is actually opened is the only place this is quota-free and doesn't fight
  [[product-frictionless-over-quota]]'s "no manual gates" bias in the other direction (a
  cleanup-on-open is reactive, not a new manual quota-saving step). [[D-048]] is the
  closest precedent (removed a permanent "channel unavailable" flag in favor of just
  retrying) and argues against inventing a new sticky per-video status column too —
  detecting live at open time, with no persisted "unavailable" state, matches that
  precedent. Removing a video needs to cascade cleanly out of every place it can be
  referenced (`video_state`, playlist membership, Watch Later, favorites) — a new
  repository method, not just one `DELETE FROM videos`.
- **Implementation (2026-09-04):** built as recommended above, unchanged. `PlayerSurface.tsx`'s
  `onError` handler now branches error `100` into a new `'unavailable'` surface (kept
  separate from `'embed-blocked'`; the iframe-gating condition changed from `surface !==
  'embed-blocked'` to `surface === 'playing'` so it hides for either overlay). The new
  overlay offers three actions: "Remove from library" (new), "Open in browser" (kept —
  still a real escape hatch, and matches D-006's "a per-video open-in-browser hatch
  always exists"), and "Back". `CatalogRepository.deleteVideo` (new, `repositories.ts`)
  deletes `playlist_videos` → `video_state` → `videos` for one id in a single transaction
  (Watch Later/favorites are columns on `video_state`, not separate tables, so this one
  delete covers them too — no separate cascade needed there). Wired through a new
  `video:remove` IPC channel (`contract.ts`/`preload.ts`/`main.ts`, same shape as the
  existing single-video IPC calls) and a new `removeUnavailableVideo` handler in
  `App.tsx` that calls it, filters the video out of `videos`/`playlistVideos`, and leaves
  the player the same way Esc/Back would (`closePlayer`). Error `2` (invalid parameter)
  was **not** added, unlike this entry's own earlier note floated — it's a different
  failure (a malformed request, not a valid-but-gone video) and folding it in
  unconfirmed felt like scope creep beyond what was actually observed. `playback.md`
  §Unavailable videos and `local-data.md`'s Retention section were updated in the same
  change. New test: `repositories.test.ts`'s `deleteVideo (B-130)` (cascades correctly,
  leaves the playlist itself and unrelated membership untouched). Checked via `npm run
  typecheck && npm run lint && npm test` (276/276); **not run live** (per
  [[no-live-app-verification]]) — the owner tests live before this moves to Resolved,
  same division of labor as always. The real Mitinho Player video from this entry's own
  repro is the natural first thing to try it against.
- **Owner feedback, round 1 (2026-09-04):** live-tested against the real Mitinho Player
  video — still showed the old "channel disabled embedded playback" message, meaning
  `surface` was landing on `'embed-blocked'`, not the new `'unavailable'` branch. A
  temporary `console.info` logging the raw `onError` code (removed again below) showed
  the actual value: **`150`** — not `100`. Confirmed directly, not guessed
  ([[verify-dom-interaction-bugs-dont-guess]]).
- **Round 2 fix (2026-09-04), same session:** the round-1 design's whole premise — that
  error `100` (video gone) and `101`/`150` (owner disabled embedding) are distinguishable
  signals — doesn't hold in practice: a video independently confirmed private via
  YouTube's own watch page (`playabilityStatus.status === 'LOGIN_REQUIRED'`) still
  raised `150` in the live embed, the same code the "owner disabled embedding" case
  uses. Rather than patch the heuristic again, **merged the two overlays into one**
  (`Surface` narrowed back to `'playing' | 'unavailable'`; `100`/`101`/`150` all land on
  it) with neutral copy that doesn't assert which case it is — "can't be played here —
  may be restricted by its creator, or no longer available." All three actions now live
  on this single overlay: "open in browser" (unchanged — now doubles as the user's own
  way to tell the two cases apart), "remove from library" (unchanged from round 1), and
  "back." The dedicated `player.overlay.embedBlockedTitle`/`unavailableTitle` split in
  `en.ts`/`pt-BR.ts` collapsed to one `unavailableTitle` key with the new neutral copy.
  `playback.md` §Unplayable videos (renamed from §Unavailable videos) and
  `local-data.md`'s Retention note were updated to match — both now describe the
  round-1 two-overlay design as a disproven first attempt, same as this entry's own
  narrative, rather than silently rewriting history. Checked via `npm run typecheck &&
  npm run lint && npm test` (276/276, `deleteVideo` test untouched — the repository/IPC
  layer didn't change, only which `onError` codes route to the one surface).
- **Owner feedback, round 2 (2026-09-04):** confirmed working live against the real
  Mitinho Player video.
- **Resolved:** 2026-09-04 · **Commit:** 8007bed · **Outcome:** Fixed
- **Resolution:** see the Implementation/round-2 notes above — merged into one
  `'unavailable'` overlay (owner-restricted and gone-video causes aren't reliably
  distinguishable by IFrame error code) with an explicit, non-automatic "remove from
  library" action; `playback.md` §Unplayable videos and `local-data.md`'s Retention
  section updated in the same commit.
