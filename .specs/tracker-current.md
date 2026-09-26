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
- [`tracker-history/v0.11.0.md`](tracker-history/v0.11.0.md) — one entry, B-130 (Fixed —
  a removed/private YouTube video no longer misreports as "channel disabled embedding,"
  confirmed live after a same-day round 2). [[B-108]] and [[B-101]] didn't make it in
  and carried their **Target** forward again. Shipped alongside D-064 (comment editing,
  confirmed working live), D-065 (a Settings storage indicator), and D-066 (Settings
  copy shortened with hover info icons, em dashes dropped) — full narrative for all
  three is in `decisions.md`, not this file. Originally tracked toward `0.10.3` (a
  patch), but D-064/D-065/D-066 amounted to real new scope together — shipped as a
  **minor** version instead, per the owner's own explicit direction, skipping `0.10.3`
  entirely (same pattern as `0.3.0` skipping `0.2.3`).
- **v0.12.0** — no bug-tracker batch of its own, same pattern as `v0.4.0`/`v0.4.2`/
  `v0.4.4`/`v0.4.6`/`v0.6.0`/`v0.7.0`/`v0.8.0`/`v0.9.0`/`v0.10.1`/`v0.10.2`: driven
  entirely by D-067 (a Share button on the video's own screen: link + copy + an
  optional current-timestamp checkbox, skipped for a live video), a direct
  product-owner request rather than an item reported here, confirmed working live by
  the owner. [[B-108]] and [[B-101]] didn't make it in and carried their **Target**
  forward again. Full narrative in `decisions.md` D-067, not a dedicated
  tracker-history note of its own. Originally tracked toward `0.11.1` (a patch), but
  shipped as a **minor** version instead, per the owner's own explicit direction (real
  new scope, not a bug-fix batch), skipping `0.11.1` entirely (same pattern as `0.3.0`
  skipping `0.2.3` and `0.11.0` skipping `0.10.3`).
- **v0.13.0** — no bug-tracker batch of its own, same pattern as `v0.4.0`/`v0.4.2`/
  `v0.4.4`/`v0.4.6`/`v0.6.0`/`v0.7.0`/`v0.8.0`/`v0.9.0`/`v0.10.1`/`v0.10.2`/`v0.12.0`:
  driven entirely by D-068 (a like/dislike bar on the player screen — the real YouTube
  like count plus an opt-in, off-by-default dislike estimate via Return YouTube
  Dislike) and D-069 (widening D-066's em-dash ban from Settings copy to every
  user-facing string), both direct product-owner requests rather than items reported
  here. [[B-108]] and [[B-101]] didn't make it in and carried their **Target** forward
  again. Full narrative in `decisions.md` D-068 and D-069, not a dedicated
  tracker-history note of its own. Originally tracked toward `0.12.1` (a patch), but
  D-068 amounted to real new scope on its own — shipped as a **minor** version instead,
  per the owner's own explicit direction, skipping `0.12.1` entirely (same pattern as
  `0.3.0` skipping `0.2.3`, `0.11.0` skipping `0.10.3`, and `0.12.0` skipping `0.11.1`).
- **v0.13.1** — no bug-tracker batch of its own, same pattern as
  `v0.4.0`/`v0.4.2`/`v0.4.4`/`v0.4.6`/`v0.6.0`/`v0.7.0`/`v0.8.0`/`v0.9.0`/`v0.10.1`/
  `v0.10.2`/`v0.12.0`: a same-day amendment to D-068's RYD dislike-estimate cache,
  raised directly by the product owner (routinely leaves the app open for days, so a
  cache cleared only on restart could serve a stale count indefinitely) rather than an
  item reported here. The cache is now time-bounded via the existing `Clock` port — a
  successful lookup expires after 1 hour, a failed one after 5 minutes. [[B-108]] and
  [[B-101]] didn't make it in and carried their **Target** forward again. Full
  narrative in `decisions.md` D-068, not a dedicated tracker-history note of its own.
  Shipped as a **patch** version, per the owner's own explicit direction (a tuning
  amendment to existing scope, not a new feature).
- **v0.13.2** — no bug-tracker batch of its own, same pattern as
  `v0.4.0`/`v0.4.2`/`v0.4.4`/`v0.4.6`/`v0.6.0`/`v0.7.0`/`v0.8.0`/`v0.9.0`/`v0.10.1`/
  `v0.10.2`/`v0.12.0`/`v0.13.1`: driven entirely by D-070 (comment/reply author names
  now link to that user's own channel, in-app, reusing the existing channel
  navigation), a direct product-owner request rather than an item reported here.
  [[B-108]] and [[B-101]] didn't make it in and carried their **Target** forward
  again. Full narrative in `decisions.md` D-070, not a dedicated tracker-history note
  of its own. Shipped as a **patch** version, per the owner's own explicit direction.

**Current target: 0.13.3.** Carries [[B-108]] and [[B-101]] forward — neither made it
into 0.5.0, 0.6.0, 0.7.0, 0.8.0, 0.8.1, 0.9.0, 0.10.0, 0.10.1, 0.10.2, 0.11.0, 0.12.0,
0.13.0, 0.13.1, or 0.13.2 either (see above — every one of those shipped driven by a
direct product-owner decision or a different bug batch instead). [[B-131]] (new,
reported 2026-09-25) also targets 0.13.3.

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
- **Type:** adjustment · **Status:** Open · **Reported:** 2026-07-15 · **Target:** 0.13.3
  (carried over — 0.2.2, 0.3.0, 0.4.0, 0.4.1, 0.4.2, 0.4.3, 0.4.4, 0.4.5, 0.4.6, 0.4.7, 0.4.8, 0.5.0, 0.6.0, 0.7.0, 0.8.0, 0.8.1, 0.9.0, 0.10.0, 0.10.1, 0.10.2, 0.11.0, 0.12.0, 0.13.0, 0.13.1, and 0.13.2 all shipped without this)
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
- **Status:** Open · **Reported:** 2026-07-16 · **Target:** 0.13.3
  (carried over — 0.2.2, 0.3.0, 0.4.0, 0.4.1, 0.4.2, 0.4.3, 0.4.4, 0.4.5, 0.4.6, 0.4.7, 0.4.8, 0.5.0, 0.6.0, 0.7.0, 0.8.0, 0.8.1, 0.9.0, 0.10.0, 0.10.1, 0.10.2, 0.11.0, 0.12.0, 0.13.0, 0.13.1, and 0.13.2 all shipped without this; the
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

### B-131 — Non-subscribed channel's video list is missing actions, date grouping, and real Shorts filtering
- **Type:** bug · **Severity:** major
- **Status:** Resolved · **Reported:** 2026-09-25 · **Target:** 0.13.3
- **Area:** feed
- **What happens:** opening a channel via search (a channel you don't follow) shows its
  uploads through the same transient list used for free-text search results, not the
  normal feed. Compared to a subscribed channel's own page: (1) video rows have no
  favorite/Watch Later/ignore buttons at all; (2) videos aren't grouped into date
  buckets (Today/Yesterday/This Week/Earlier) — it's a flat list; (3) "Show Shorts"
  is applied, but against a much weaker signal (duration ≤60s, no HEAD-probe
  confirmation) than the main feed's, so real Shorts between 61s–180s (and anything
  the fast heuristic misjudges) leak through.
- **Expected:** a non-subscribed channel's video list should behave like a subscribed
  one wherever the difference isn't inherent to the video not having synced local
  state yet — actions should work (mirroring what already works once such a video is
  opened into the player, per D-029's "externally opened videos get local state"
  guarantee), videos should bucket by date, and Shorts should be filtered as
  reliably as in the main feed.
- **Code refs:** `src/ui/App.tsx` (`openChannelPreview`, `navigateToChannel`, the
  `channelPreview` render branch), `src/ui/SearchResults.tsx` (`SearchVideoRow`/
  `SearchVideoCard` — no `VideoActions` prop), `src/platform/main.ts` (`channel:getVideos`
  handler — pure YouTube passthrough, no `SyncService`/`upsertExternalVideo`),
  `src/adapters/youtube/api-client.ts` (`search()`'s `isShort: duration <= 60`
  heuristic, duplicated in `main.ts`'s channel-preview handler), `src/core/sync-service.ts`
  (`confirmShorts()` — the real, HEAD-confirmed pipeline this path skips).
- **Notes:** root cause is architectural, not a one-line fix — a non-subscribed
  channel's videos are served through the same transient, YouTube-only passthrough as
  free-text search (never persisted as a `videos` row, never run through
  `SyncService`), rendered with the search-results components, which were never given
  action wiring or date-bucket grouping. `.specs/features.md`'s D-031 section
  previously overstated Shorts parity between search and the main feed; corrected in
  the same change as this entry.
- **Round 1 fix (2026-09-25), same session it was reported:** addressed the missing
  actions (point 1). `SearchVideoRow`/`SearchVideoCard` (`src/ui/SearchResults.tsx`)
  gained an optional `SearchVideoActions` prop (`toggleFavorite`/`toggleWatchLater`/
  `ignore`), wired at both call sites (free-text search results and a non-subscribed
  channel's preview, `src/ui/App.tsx`). On the backend, a new `ensureVideoExists()`
  helper (`src/platform/main.ts`) hydrates (`apiClient.hydrate`, 1 unit) and upserts
  (`syncRepository.upsertExternalVideo`) a video on demand — only when
  `toggleFavorite`/`toggleWatchLater`/`setReadStatus` is actually invoked on a videoId
  with no local `videos` row yet, never during list render — the same on-demand
  pattern D-029 already uses when such a video is opened into the player, so no
  interaction with a video the user never touches writes anything to the database.
  `SearchVideoResultDto` gained `favorite`/`watchLater`/`readStatus` fields (merged
  from `stateRepository.get()` in both the `search:` and `channel:getVideos`
  handlers, the same way `SearchChannelResultDto.subscribed` already was), so the new
  buttons/glyphs reflect real current state rather than a blind toggle. A failed
  hydrate (offline, quota, video removed since listed) surfaces via the existing
  banner pattern (`app.banner.videoActionFailed`) instead of silently no-oping.
  Checked via `npm run typecheck && npm run lint && npm test` (290/290); not run live
  (per [[no-live-app-verification]]) — needs the owner's hands-on check. Points 2
  (date grouping) and 3 (the weak Shorts heuristic) are unaddressed — **status stays
  Open**.
- **Round 2 fix (2026-09-25), same session:** addressed the weak Shorts heuristic
  (point 3). The owner first assumed real confirmation was impossible here since it
  "depends on hydrate" — checked against the code: only the *candidate* signal
  (duration, to know who's worth probing) comes from hydrate, which both handlers
  already call; the actual confirmation (`ShortsProber.isShort`, a zero-quota HEAD
  probe by videoId) is fully independent of it. New `confirmShorts()` in
  `src/platform/main.ts` reuses the exact same mechanism the synced feed's own
  `SyncService.confirmShorts()` (`src/core/sync-service.ts`) already runs: the same
  180s candidate cutoff (was 60s here), the same `SHORTS_CONCURRENCY`-bounded
  `mapPool` probing (that constant is now exported from sync-service.ts so both share
  one source of truth instead of drifting), and the same "a probe failure leaves the
  video visible, never guessed-Short" rule. `shortsProber` (`HeadShortsProber`) is now
  a single account-independent instance shared between every account's `SyncService`
  and this on-demand path, instead of one instance per account stack. Both
  `channel:getVideos` and `search:` await the full confirmation batch before
  returning their page — a deliberate design match verified against the synced feed's
  own real behavior first: `App.tsx`'s `refresh:progress` handler only reloads the
  feed early (before its own Shorts pass finishes) when the feed is still empty
  (first launch, or an all-Shorts channel, [[B-116]]); the ordinary case already waits
  for `refresh:done` — which only fires after `confirmShorts()` has settled — before
  showing anything new, so the search/channel-preview lists now behaving the same way
  (wait, then show) matches the app's actual steady-state UX rather than departing
  from it. `api-client.ts`'s old `isShort: duration <= 60` heuristic in `search()` is
  gone — it always returns `false` now, overwritten downstream by this confirmation,
  never computed twice. Checked via `npm run typecheck && npm run lint && npm test`
  (290/290, including a fixed expectation in `api-client.test.ts`); not run live (per
  [[no-live-app-verification]]). Point 2 (date grouping) remains unaddressed — status
  stays **Open**.
- **Round 3 fix (2026-09-25), same session:** addressed the missing date grouping
  (point 2), for the channel-preview list only — free-text search results stay a flat
  list, deliberately: `search.list` returns relevance order, not chronological, so
  date headers there would jump around nonsensically rather than read top-to-bottom.
  `SearchVideoResultDto` gained a `bucket: FeedBucketDto | null` field
  (`src/ipc/contract.ts`) — always `null` from `search:` (no header rendered), a real
  bucket from `channel:getVideos`. That bucket is the exact same value the synced feed
  itself would compute: `bucketOf(effectiveDate(video, now), now)` (`src/core/feed.ts`,
  D-053's own live-broadcast-aware logic), fed from `HydratedVideo`'s live-broadcast
  fields (`liveContent`/`liveStartedAt`/`liveEndedAt`/`isPremiere`) that
  `channel:getVideos` already had on hand from `apiClient.hydrate()` but wasn't using —
  never persisted, computed fresh per request like the Shorts confirmation above.
  `App.tsx`'s channel-preview render branch now groups consecutive same-bucket videos
  (the list is already chronologically ordered, so no re-sort is needed) and renders a
  `group-header` between groups, in both list and grid layout — the same header markup
  the main feed's own bucket headers and the priority section already use. Checked via
  `npm run typecheck && npm run lint && npm test` (290/290); not run live (per
  [[no-live-app-verification]]). All three original points are now addressed in code —
  needs the owner's hands-on check before this can move to **Resolved** (no commit made
  yet this session, per [[feedback-batch-commits-dont-push-every-edit]]).
- **Owner's live test caught (2026-09-25):** opening a channel preview showed "Searching
  all of YouTube…" while it loaded — a pre-existing bug (predates this entry), not
  something the rounds above introduced: `channelPreview.loading`'s message
  (`App.tsx`) reused the free-text search's own `search.searching` string, wrong for
  loading one specific channel's uploads. Fixed with a dedicated
  `search.channelLoading` key ("Loading channel…" / "Carregando canal…") used only for
  that state. Checked via `npm run typecheck && npm run lint && npm test` (290/290).
- **Round 4 (2026-09-25), owner's own follow-up request:** added Add to Playlist and
  open-in-browser to the same two rows (`SearchVideoActions` gained `addToPlaylist`/
  `openInBrowser`, `src/ui/SearchResults.tsx`) — the owner's own read that these two
  were simpler than the round 1 set held up: open-in-browser needed no backend change
  at all (`shell.openExternal`, no `videos` row involved), and Add to Playlist only
  needed the same `ensureVideoExists` guard round 1 already built, added to
  `addVideoToPlaylist`'s handler (`playlist_videos` has the same FK to `videos` as
  `video_state`). `addToPlaylistVideo` (`App.tsx`) was narrowed from the full
  `FeedVideoDto` to just `{videoId, title}` — all `AddToPlaylistDialog` ever read off
  it — so a `SearchVideoResultDto` satisfies it with no cast. Checked via
  `npm run typecheck && npm run lint && npm test` (290/290); not run live.
- **Round 5 (2026-09-26), owner's own call:** removed ignore from these two rows'
  actions entirely, same precedent as [[B-128]]'s removal from a playlist's own video
  list — ignoring a video from a channel the user doesn't even follow isn't a
  meaningful "hide this," so it's a non-action rather than a bug worth fixing.
  `SearchVideoActions.ignore` and its button are gone (`src/ui/SearchResults.tsx`),
  along with the corresponding handler in `App.tsx`'s `searchVideoActions`. Favorite,
  Watch Later, Add to Playlist, and open-in-browser (round 4) are unaffected. Checked
  via `npm run typecheck && npm run lint && npm test` (290/290).
- **Resolved:** 2026-09-26 · **Commit:** 35b2154 · **Outcome:** Fixed

### B-132 — "No playlists yet" text has no gap before the create-playlist row
- **Type:** bug · **Severity:** minor
- **Status:** Resolved · **Reported:** 2026-09-25 · **Target:** 0.13.3
- **Area:** ui-shell
- **What happens:** in the Add to Playlist dialog, when the account has no local
  playlists yet, the "No playlists yet. Create one below." text sits right against the
  new-playlist name field below it — no visible gap, unlike the normal case where the
  playlist checklist has one.
- **Expected:** the same spacing either way, checklist or empty message.
- **Code refs:** `src/ui/styles.css` (`.add-to-playlist-empty`, `.add-to-playlist-list`).
- **Root cause:** `.add-to-playlist-list` (the `<ul>` shown when there's at least one
  playlist) has `margin-bottom: 12px`; `.add-to-playlist-empty` (the `<p>` that
  replaces it when the list is empty) never had one.
- **Fix (2026-09-25), same session it was reported:** added the same
  `margin-bottom: 12px` to `.add-to-playlist-empty`. A pure CSS change — no
  typecheck/test impact; `npm run lint` still passes. Not run live.
- **Resolved:** 2026-09-26 · **Commit:** (pending) · **Outcome:** Fixed
- **Resolution:** matched `.add-to-playlist-list`'s own `margin-bottom: 12px`.

