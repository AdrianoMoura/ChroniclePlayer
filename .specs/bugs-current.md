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
   `bug-history/v<version>.md` and a fresh, empty `bugs-current.md` is started for the
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
  forward into the new `bugs-current.md` untouched, noted as "carried over."
- Version numbers aren't always a minor bump: a batch that's pure bug fixes/adjustments
  (no new milestone-sized feature) ships as a **patch** release (0.2.0 → 0.2.1 → 0.2.2
  → …); a minor bump is reserved for batches that land real new scope. This file's own
  **Target** always states the actual next version, whichever kind it is — don't assume
  a minor bump by default.

## History

Closed-out batches live one per release in **[`bug-history/`](bug-history/)**:

- [`bug-history/v0.1.0.md`](bug-history/v0.1.0.md) — everything resolved from the
  project's start through 2026-07-14 (the first two dogfooding batches, B-001–B-017 and
  B-054–B-066). Shipped 2026-07-11.
- [`bug-history/v0.2.0.md`](bug-history/v0.2.0.md) — the third dogfooding batch
  (B-085–B-104, reported 2026-07-15) plus three items carried over from before 0.1.0
  shipped (B-051, B-046, B-045): 20 entries Fixed, 1 Won't fix (B-046 — hover-preview
  would require exactly the undocumented-endpoint use `youtube-api.md` bans). Shipped
  2026-07-15.
- **v0.2.1** — no bug-tracker batch of its own: a single same-day product-owner request
  (raise the miniplayer's max resizable width from 640px to 1024px) tagged on its own
  right after 0.2.0, folded into [[B-045]]'s "eighth round" narrative in
  `bug-history/v0.2.0.md` rather than getting a new B-NNN entry. Shipped 2026-07-15.
- [`bug-history/v0.2.2.md`](bug-history/v0.2.2.md) — B-105, B-106, B-107 (all Fixed,
  each needing a same-day follow-up once the owner's live test caught a second instance
  of the same bug). Shipped 2026-07-16.
- [`bug-history/v0.3.0.md`](bug-history/v0.3.0.md) — B-109, B-110 (both Fixed; B-110
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
  history is in `decisions.md` D-050, not a `bug-history/` file. Shipped as a **minor**
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
  `decisions.md` D-051, not a `bug-history/` file. Shipped as a **patch** version, per
  the owner's own explicit direction. Shipped 2026-07-16.
- [`bug-history/v0.4.3.md`](bug-history/v0.4.3.md) — a single entry, [[B-111]] (Fixed
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
  on). Full history is in `decisions.md` D-052, not a `bug-history/` file. Shipped as a
  **patch** version, per the owner's own explicit direction. Shipped 2026-07-17.
- [`bug-history/v0.4.5.md`](bug-history/v0.4.5.md) — five entries, all Fixed: B-116
  (all-Shorts channel never backfills older uploads), B-112 (pop-out window video
  switching), B-113 (clickable comment timestamps), B-114 (live badge/duration stuck
  after stream ends), B-115 (Premiere vs. Live badge distinction). Shipped as a
  **patch** version (pure bug-fix/adjustment batch, no new `D-NNN` scope alongside it).
  Shipped 2026-07-17.
- [`bug-history/v0.4.6.md`](bug-history/v0.4.6.md) — no B-NNN entries, driven entirely
  by D-053, a direct product-owner request raised in conversation rather than reported
  here (same pattern as D-050/D-051/D-052 before it). A currently-live video now sorts
  to the top of its date bucket; an ended broadcast sorts and buckets by when it
  actually ended (`liveStreamingDetails.actualEndTime`, newly captured, schema v12)
  rather than its original, older `publishedAt` — including broadcasts discovered only
  after they already ended (e.g. via gap-backfill), which also now get the correct feed
  badge. Full narrative in `decisions.md` D-053. Shipped as a **patch** version, per the
  owner's own explicit direction. Shipped 2026-07-19.

- [`bug-history/v0.4.7.md`](bug-history/v0.4.7.md) — B-117 (Fixed — removed the
  unreliable Premiere-vs-live badge distinction outright, no replacement signal
  confirmed against real data) and B-118 (Won't fix — confirmed YouTube's own RSS/CDN
  latency, not a Chronicle bug). Shipped as a **patch** version (a pure bug-fix batch,
  no new `D-NNN` scope alongside it). Shipped 2026-07-19.

**Current target: 0.4.8.** Carries [[B-108]], [[B-022]], [[B-086]], [[B-101]] forward —
none of the four made it into 0.4.7 either (see above — 0.4.7 shipped B-117/B-118
instead). [[B-119]] (the flip side of B-117: a finished Premiere kept the "ended live
broadcast" badge/sort instead of settling back into a normal video) was reported and
Fixed the same day — see its own entry under Resolved. When 0.4.8 ships, this file's
content moves to `bug-history/v0.4.8.md` and a new `bugs-current.md` starts targeting
whatever comes after it.

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
- **Type:** adjustment · **Status:** Open · **Reported:** 2026-07-15 · **Target:** 0.4.8
  (carried over — 0.2.2, 0.3.0, 0.4.0, 0.4.1, 0.4.2, 0.4.3, 0.4.4, 0.4.5, 0.4.6, and 0.4.7 all shipped without this)
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

### B-086 — Members-only videos never show up in the feed
- **Type:** bug · **Severity:** major
- **Status:** Open (research done 2026-07-15; recommendation below needs the owner's live
  confirmation, not more code, to move further) · **Reported:** 2026-07-15 · **Target:**
  0.4.8 (carried over — 0.2.2, 0.3.0, 0.4.0, 0.4.1, 0.4.2, 0.4.3, 0.4.4, 0.4.5, 0.4.6, and 0.4.7 all shipped without this)
- **Area:** sync
- **What happens:** a video restricted to channel members doesn't appear in
  Chronicle's list at all, even for the owner's own membership on that channel.
- **Expected:** at minimum, members-only videos should be discoverable/listed like any
  other video from a subscribed channel — no special handling needed once discovered
  (per the owner: even if playback turns out not to work, just knowing the video exists
  is the ask).
- **Code refs:** `src/adapters/rss/rss-client.ts` (`parseFeed` — structurally can't
  carry members-only content, unauthenticated); `src/adapters/youtube/api-client.ts`
  (`listUploads` — `playlistItems.list` on the uploads playlist, called with the
  signed-in user's own OAuth token, no client-side filtering by privacy/visibility);
  `src/core/sync-service.ts` (`discoverChannel`'s gap-backfill, `backfillArchive` —
  both page through `listUploads`).
- **Notes (research, 2026-07-15):** confirmed RSS can never carry this (unauthenticated,
  no way for it to know who's asking). The open question was whether the *authenticated*
  path (`playlistItems.list` via `listUploads`, already used by both gap-backfill and
  on-demand archive backfill) can see members-only uploads when called with a genuine
  member's own OAuth token. Checked the code for anything that would filter such videos
  out if the API did return them — found nothing: `listUploads` and `applyHydration`
  pass through whatever `items` the API gives back with no privacy/visibility filtering.
  Whether the API actually *includes* member content for an authenticated member's own
  request isn't confirmed by public documentation and isn't something to guess at by
  writing speculative code against — it needs a live test against a real membership.
  Originally two things looked worth the owner testing directly: (1) scroll to the
  bottom of that channel's screen to trigger `backfillArchive`; (2) if the channel also
  publishes anything public, wait for the next regular sync — [[B-051]]'s fix (any new
  video now triggers a gap-backfill pass, not just an all-new RSS window) may already
  surface member content sitting in the same uploads-playlist window as a side effect,
  with no new code. **Deliberately not implemented:** a routine per-cycle authenticated
  playlist walk for every channel regardless of RSS activity, to catch the case where a
  channel posts *only* member content and nothing public ever triggers a backfill pass —
  at ~1 unit/channel/cycle × 229 channels × 48 cycles/day (30-min interval) that's
  ~11,000 units/day on its own, over the entire 10,000/day budget by itself. Worth
  revisiting only if (1)/(2) above confirm the authenticated path actually works and this
  specific gap (member-only-only channels) turns out to matter in practice.
  **Owner update (2026-07-15):** neither of the two suggested checks can be run yet —
  none of the owner's membership channels has published anything since this was written.
  Staying Open until one of them does.
  **Owner update (2026-07-17):** a real case arrived — a channel the owner has an active
  paid membership on posted a members-only video; the owner ran a manual sync a few
  minutes later and it was not synced, not notified, and did not appear in the list.
  **This confirms the top-level symptom but does not resolve the open research question
  above** — traced through `discoverChannel` (`src/core/sync-service.ts`): the
  authenticated backfill path (`backfillGap`, which calls `listUploads`) is only reached
  when `possibleGap = newIds.length > 0 && …`, i.e. only when RSS's diff already found at
  least one *other* newly-known video for that channel this cycle (`newIds` comes from
  `discoverRecentWithRetry`'s RSS diff). Since the members-only video is invisible to RSS
  and nothing else new was published this cycle, `newIds` stayed empty, `possibleGap` was
  false, and the authenticated `listUploads` call was never made at all — the manual sync
  never touched the code path in question. So this test still doesn't tell us whether an
  authenticated `playlistItems.list` call, if it *had* been made, would have returned the
  members-only video — it confirms sync missed it, for a reason already predicted by the
  research notes above (member-only-only activity never triggers gap-backfill), not a new
  finding about the API's own behavior.
  **Check (1) retracted — scrolling doesn't test this at all:** confirmed by reading
  `backfillArchive` (`src/core/sync-service.ts`) directly — it pages *older*, never
  newer. Its cursor (`account_channels.backfill_page_token`, in
  `src/adapters/storage/sync-repository.ts`) only ever advances forward through the
  playlist, deeper into the past, and is never reset to page 1; the scroll-to-bottom UI
  trigger (`App.tsx`, `backfillChannelArchive`) is explicitly documented in its own code
  comment as fetching older videos on demand. A channel's newest upload — exactly the
  members-only case here — is never something `backfillArchive` would encounter, no
  matter how far the owner scrolls. `backfillGap`, by contrast, *does* always start
  fresh from page 1/newest (confirmed: plain local `pageToken` variable, no persisted
  cursor) and would see a members-only newest upload — but there is currently no UI
  action that triggers `backfillGap` on demand for an already-subscribed channel; it only
  runs automatically, gated by `possibleGap`, as part of routine sync.
  **Actual gap, restated:** the only way to get a real answer to the open research
  question today is check (2) — waiting for a cycle where the same channel also
  publishes something public, so routine sync's own `possibleGap` gate fires naturally.
  There is no on-demand way to force it.
  **Adjustment flagged by the owner (2026-07-17):** independent of the open research
  question, the owner wants this tracked as something to actively improve, not just wait
  on. Two concrete directions once check (2) confirms whether the API can see member
  content at all: (a) a manual "refresh this channel from newest" action for a
  subscribed channel's screen (reusing `backfillGap`'s already-correct newest-first,
  no-cursor walk, just exposed as an on-demand trigger instead of only running
  RSS-gated) — cheap since it's user-initiated, one channel at a time; (b) if that's not
  enough, reconsidering the "deliberately not implemented" per-cycle authenticated walk
  above with a cheaper trigger than "every channel every cycle" (e.g. only for channels
  with an active membership, a small subset of the total), which may sidestep the quota
  objection that ruled out the blanket version.

### B-108 — Mouse-wheel scroll doesn't work on the full-view player screen while hovering the embedded video
- **Type:** bug · **Severity:** minor
- **Status:** Open · **Reported:** 2026-07-16 · **Target:** 0.4.8
  (carried over — 0.2.2, 0.3.0, 0.4.0, 0.4.1, 0.4.2, 0.4.3, 0.4.4, 0.4.5, 0.4.6, and 0.4.7 all shipped without this; the
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

### B-120 — Feed date-bucket headers repeat out of order, and relative-time labels disagree with their bucket, around live/ended broadcasts
- **Type:** bug · **Severity:** major
- **Status:** Open · **Reported:** 2026-07-19 · **Target:** 0.4.8
- **Area:** feed
- **What happens:** scrolling the feed, the owner found the Today/Yesterday/This
  Week/Earlier grouping (`feed.md` §Grouping) badly out of order and internally
  inconsistent:
  1. The first video under "Yesterday" shows "8 hours ago," but it's a 3-hour-long
     livestream that, per YouTube, was broadcast entirely the day before — "8 hours ago"
     doesn't fit either the bucket or the video's own duration.
  2. A video under "Earlier" shows "12 hours ago," but the same video is actually ~11
     days old on YouTube.
  3. After "Earlier", a second "Yesterday" section appears, with different videos than
     the first "Yesterday" section (not merged into it — a separate header).
  4. Further down, a "This Week" section shows videos labeled "yesterday" that are
     actually 2 days old; after that, "Earlier" and "This Week" each appear again.
  Net effect: bucket headers repeat and appear out of the fixed order, and several
  relative-time labels don't match the reality of the video they're on (confirmed by the
  owner against YouTube directly, not just internal inconsistency).
- **Expected:** each bucket (Today/Yesterday/This Week/Earlier) appears at most once, in
  that fixed order (`feed.md` §Grouping), and a video's displayed relative-time label
  agrees with the bucket it's shown under.
- **Code refs:** `src/core/feed.ts` (`effectiveDate`, `bucketOf`, `groupFeed`);
  `src/core/feed-service.ts` (`getSlice`); `src/ui/FeedList.tsx` (`publishedLabel(video.publishedAt)`,
  two call sites); `src/ui/format.ts` (`publishedLabel`).
- **Notes (code analysis, not yet live-verified against the owner's own data — needs
  their live confirmation before this moves past Open):** two distinct defects, likely
  compounding on the videos described above:
  - **Label/bucket mismatch:** bucketing and sort order are driven by `effectiveDate`
    (D-053: `now` while a broadcast is genuinely live, `liveEndedAt` once it's ended,
    `publishedAt` otherwise) in both `feed.ts` and `feed-service.ts`. But `FeedList.tsx`
    renders each row's relative-time text via `publishedLabel(video.publishedAt)` — always
    the raw `publishedAt`, never `effectiveDate`. For any video that was ever live, the two
    can diverge sharply: an ended broadcast buckets/sorts by when it actually wrapped
    (`liveEndedAt`), but its on-row label still counts from the original `publishedAt`
    (when the stream started/was scheduled) — this fits both reported mismatches (#1: bucket
    correct per `liveEndedAt`, label stale from `publishedAt`; #2: same shape, larger gap).
    Likely fix direction: label from the same value used to bucket it
    (`effectiveDate(video, now)`), not `video.publishedAt`, at both `FeedList.tsx` call
    sites.
  - **Repeated/out-of-order section headers:** `feed-service.ts`'s own D-053 comment
    already flags the mechanism this points to: `getSlice` fetches one page at a time from
    the DB in plain `publishedAt` order (`repository.listPage`, D-027's keyset — it can't be
    built on a value like `effectiveDate` that changes between calls), then re-sorts/
    re-buckets *only within that one page* for display. Cross-page order is never
    reconciled. A live/ended video whose `effectiveDate` diverges sharply from its raw
    `publishedAt`-based position in the keyset can land near the top of its own page's
    local re-sort while chronologically "behind" videos the previous page already rendered
    under a later bucket — producing a bucket header a second time, out of
    `BUCKET_ORDER` sequence, once the next page renders. This matches the reported
    "Yesterday" and "This Week" sections reappearing later in the scroll with different
    videos than their first occurrence. Structural, not a one-off: page-local reordering
    can never fully fix a global ordering problem when pages are fetched in a different
    order than they're displayed in. A real fix needs a design call (not just a patch) on
    how far to look ahead before bucketing, or whether a repeated bucket should fold into
    its first occurrence instead of getting a new header — flagging the mechanism here
    rather than picking an approach unilaterally.

## In progress

### B-022 — Delete all data: app relaunches into a frozen/blank screen instead of a clean state
- **Type:** bug · **Severity:** major
- **Status:** In progress · **Reported:** 2026-07-12 · **Target:** 0.4.8 (carried over —
  0.2.2, 0.3.0, 0.4.0, 0.4.1, 0.4.2, 0.4.3, 0.4.4, 0.4.5, 0.4.6, and 0.4.7 all shipped without this)
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

### B-121 — Opening a video in the browser leaves it also playing in Chronicle
- **Type:** adjustment · **Status:** Fixed · **Reported:** 2026-07-19 · **Target:** 0.4.8
- **Area:** player
- **What happens:** using "Open in browser" (the `b` shortcut, the player's own action
  button, or a feed card's inline button) on a video currently playing in Chronicle
  handed it off to the real YouTube tab but left Chronicle's own copy still running —
  both playing at once, audibly competing.
- **Expected:** opening the active video in the browser pauses Chronicle's own copy.
- **Code refs:** `src/ui/PlayerSurface.tsx` (`openInBrowser`, full-view button/`b` key);
  `src/ui/PlayerDetails.tsx` (`openInBrowser`, action-bar button); `src/ui/App.tsx`
  (`actions.openInBrowser`, feed-card button and global `b` shortcut).
- **Resolved:** 2026-07-19 · **Commit:** (pending) · **Outcome:** Fixed
- **Resolution:** all three "open in browser" call sites now pause first if the video
  being opened is the one actually loaded in the player. `PlayerSurface`'s own button/
  `b` key (always the active video, since it's the component playing it) calls
  `command('pauseVideo')` directly, guarded by the existing `isStillGoing()` check.
  `PlayerDetails` (a sibling of `PlayerSurface`, same "always the active video," but
  without direct access to `command()`) gained an `onPause` callback prop, following the
  same pattern as its existing `onSeekTo`/`onExtract` props, wired in `App.tsx` to
  `playerSurfaceRef.current?.pause()`. The feed-card/global-shortcut path
  (`App.tsx`'s `actions.openInBrowser`) isn't always the active video — a docked
  miniplayer can be playing something other than the feed card under the cursor — so it
  only pauses when `currentPlayerVideo?.videoId` matches the video being opened.

### B-119 — A finished Premiere keeps the "ended live broadcast" badge/sort instead of behaving like a normal video
- **Type:** bug · **Severity:** minor
- **Status:** Fixed · **Reported:** 2026-07-19 · **Target:** 0.4.8
- **Area:** feed
- **What happens:** the owner watched a Premiere air (correctly shown as "Live", per
  [[B-117]]'s removal of the Premiere/Live distinction), but once the Premiere finished,
  it did not settle back into behaving like a normal, already-published video — it kept
  the "ended broadcast" treatment instead (gray "ended" badge, sorted by when it wrapped
  rather than its original `publishedAt`).
- **Expected:** a Premiere is just a synchronized watch-along of an already-recorded
  video; once it's done airing it should look exactly like any other normal video, not
  like a livestream that just wrapped.
- **Code refs:** `src/adapters/youtube/api-client.ts` (`hydrate`); `src/core/video.ts`
  (`isPremiere`, `liveEndedAt`); `src/core/feed.ts` (`effectiveDate`); `src/ui/FeedList.tsx`
  (`liveBadgeState`); `src/adapters/storage/sync-repository.ts` (`applyHydration`).
- **Notes:** the flip side of [[B-117]] — since Chronicle couldn't tell a Premiere apart
  from a genuine live broadcast, a Premiere was captured with `liveContent: 'live'` while
  airing exactly like a real stream, and the existing sticky ended-broadcast machinery
  then treated it identically once it ended too. That machinery was correct for a genuine
  livestream but wrong for a Premiere.
  A reliable signal was found and confirmed against real API data the same day:
  `status.uploadStatus` is `'processed'` for a Premiere vs. `'uploaded'` for a genuine
  broadcast, while `liveContent === 'live'`. Investigation trail:
  1. A public YouTube playlist convention (an auto-generated "live videos only"
     playlist per channel, same family as the regular uploads playlist Chronicle already
     resolves via `channels.list`) was checked against a real subscribed channel's recent
     videos and reliably separated confirmed Premieres from confirmed live broadcasts.
     **Not pursued as the fix**: it's a second RSS request that doesn't replace the
     `videos.list` hydration call already happening every cycle for any `live`/`upcoming`
     video, so it would add cost without removing any, and (like the main channel feed)
     is capped at a small recency window — useless for anything backfilled past that.
  2. A proposal to cross-reference `videos.list` against `liveBroadcasts.list` (the
     YouTube *Live Streaming* API, not Data API) was checked against the official docs
     before writing any code: that resource has no `channelId` filter, `mine=true` is
     explicitly "your own broadcasts only", and everything else about it (partner-only
     `onBehalfOfContentOwner`, `insufficientPermissions`/`forbidden` in its own error
     docs) points at a broadcaster self-management API, not public third-party read
     access — confirmed by a dedicated public forum thread on this exact problem never
     mentioning `liveBroadcasts` at all. **Not pursued** — Chronicle is never the owner of
     any subscribed channel's broadcasts, so this would almost certainly 403/return empty
     for every third-party video regardless of Premiere vs. live, non-discriminating even
     if it "worked."
  3. A public forum thread on the same problem surfaced two candidates needing **zero
     additional requests** — both live in fields from the exact `videos.list` hydration
     call already made: `contentDetails.duration` (claimed `"P0D"` for a genuine upcoming
     broadcast vs. already-fixed/non-zero for an upcoming Premiere) and
     `status.uploadStatus` (`"uploaded"` vs. `"processed"`).
  4. Both were tested against three real, currently-live videos via a real, disposable
     OAuth PKCE+loopback grant against the owner's own dev credentials (`youtube.readonly`
     scope, same as D-013/D-032; the grant's access token and client secret were never
     written to disk) hitting the actual `videos.list` endpoint — not the public
     watch-page HTML, which was checked first and **turned out to disagree with the real
     API** on `duration` (the webpage showed a real non-zero number for a Premiere; the
     actual API's `contentDetails.duration` was absent entirely, not `"P0D"` and not a
     real value — a reminder that scraping ≠ the production data path). `duration` didn't
     behave as the forum thread described — not adopted. **`status.uploadStatus` matched
     cleanly and is the confirmed signal**: `"uploaded"` for a genuine broadcast (upcoming
     or live), `"processed"` for a Premiere, verified against the real API Chronicle
     actually calls.
  5. After implementing, the owner live-tested against a real account with existing local
     data and found the signal's known accepted gap in practice: two Premieres whose
     first-ever hydration landed only after they'd already finished airing (following a
     full local-data reset) still showed the gray "ended" treatment, because
     `status.uploadStatus` only discriminates while `liveContent === 'live'` — by the time
     a video is first seen already `'none'`, `uploadStatus` is `'processed'` for any
     finished video regardless of Premiere vs. genuine broadcast.
  6. A candidate fix for that gap was investigated and tested against real API data:
     `liveStreamingDetails.actualStartTime` vs. `scheduledStartTime` — permanent metadata,
     available regardless of when a video is first hydrated, unlike `uploadStatus`. Real
     results were a very clean split (two independently confirmed Premieres from two
     different channels both started within single-digit seconds of their scheduled time;
     two confirmed genuine broadcasts from the same channel both started 20+ minutes late)
     — but the owner flagged a real objection before adopting it: any threshold is a guess
     about future streamer behavior, and a genuine broadcast that happens to start within
     the window would be misclassified as a Premiere permanently, with no later
     correction possible (unlike the routine `uploadStatus` path, which the video would
     never pass through in this exact scenario). **Not adopted**, given that risk against
     a feature (the gray "ended" badge) that only existed to answer a cosmetic question.
  7. Given a made-up threshold could misclassify a real broadcast with no way to correct
     it, and the badge it exists to serve is purely cosmetic, the owner chose to remove
     the gray "ended" badge outright rather than accept that risk or the original
     late-discovery gap: **no badge survives `liveContent` reverting to `'none'`, for
     either a Premiere or a genuine broadcast.** Sort/bucket order for an ended genuine
     broadcast is kept (by explicit owner call — old livestreams are rare enough day to
     day, and an unusually long `durationSeconds` on the card is itself a hint) —
     `liveEndedAt` and its ordering effect are untouched; only the badge, and the flag
     that only ever fed it, are gone.
- **Resolved:** 2026-07-19 · **Commit:** 37a2a1a · **Outcome:** Fixed
- **Resolution:** `status` added to `YouTubeApiClient.hydrate`'s `part=` (free — same call
  already made, no new request or quota cost); `isPremiere = liveContent === 'live' &&
  status.uploadStatus === 'processed'` computed there per-cycle, never sticky at that
  layer (`uploadStatus === 'processed'` is the ordinary terminal state for nearly every
  finished video ever, so it's only meaningful gated on `liveContent === 'live'`). New
  sticky `Video.isPremiere` (schema v14, `is_premiere` column) — only ever set while
  observed `liveContent === 'live'`; stays false for a Premiere whose first-ever
  hydration lands after it already ended, an accepted gap. `sync-repository.ts`
  `applyHydration` gates `live_ended_at` on **not** being a premiere (`is_premiere` read
  from the pre-update row, since SQLite evaluates an `UPDATE`'s `SET` expressions against
  old values) — a finished Premiere never gets it set. `core/feed.ts` `effectiveDate`
  skips the "now" sort override for a currently-airing Premiere — it sorts/buckets by
  `publishedAt` throughout, live or ended, never floating to the top of Today just for
  airing right now. `FeedList.tsx`'s badge now has three states — `'live'`, `'premiere'`
  (both red, picked by `isPremiere`, shown only while `liveContent === 'live'`), and
  `'upcoming'` — with no "ended" state at all anymore; the sticky `wasLive` flag (schema
  v10) that used to feed it is removed entirely (schema v15) as dead code, since the
  badge was its only reader. `isPremiere` threaded end-to-end: `HydratedVideo` → `Video`
  → `FeedVideoDto` → `FEED_SELECT`/`toEntry`. Tests added at every layer covering
  `isPremiere` derivation (including the "`processed` outside `live` must not count"
  trap), sticky persistence, `live_ended_at` suppression for a Premiere, a regression
  guard for genuine broadcasts, and `effectiveDate`/`groupFeed` premiere sort cases.
  `feed.md` §Ordering and `local-data.md`'s schema notes updated in the same change; no
  new `D-NNN` — same precedent as B-115/B-117 themselves, this stays a bug-tracker-only
  record.

