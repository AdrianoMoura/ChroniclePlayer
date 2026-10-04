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
- [`tracker-history/v0.13.3.md`](tracker-history/v0.13.3.md) — two entries, both Fixed:
  [[B-131]] (a non-subscribed channel's video list now has real actions, HEAD-confirmed
  Shorts filtering, and date-bucket grouping, matching the main feed — five same-session
  rounds plus one pre-existing bug the owner's own live test caught along the way) and
  [[B-132]] (a CSS spacing gap in the Add to Playlist dialog's empty state). [[B-108]]
  and [[B-101]] didn't make it in and carried their **Target** forward again. No new
  `D-NNN` scope this cycle. Shipped as a **patch** version (a pure bug-fix batch).
  Shipped 2026-09-26.
- **v0.14.0** — no bug-tracker batch of its own, same pattern as
  `v0.4.0`/`v0.4.2`/`v0.4.4`/`v0.4.6`/`v0.6.0`/`v0.7.0`/`v0.8.0`/`v0.9.0`/`v0.10.1`/
  `v0.10.2`/`v0.12.0`/`v0.13.1`/`v0.13.2`: driven entirely by D-071 (a channel screen's
  own search — the topbar `/` field scopes to that channel's own videos, subscribed or
  not, instead of all of YouTube, reusing D-031's `search.list` call with an added
  `channelId` param), a direct product-owner request rather than an item reported here.
  [[B-108]] and [[B-101]] didn't make it in and carried their **Target** forward again.
  Full narrative in `decisions.md` D-071, not a dedicated tracker-history note of its
  own. Shipped as a **minor** version, per the owner's own explicit direction (real new
  scope, not a bug-fix batch).
- [`tracker-history/v0.14.1.md`](tracker-history/v0.14.1.md) — a single entry, [[B-133]]
  (Fixed — the mouse "back" side button, previously wired up only inside the full-view
  player by [[B-039]], now steps back one level anywhere Esc already does across the
  whole app). [[B-108]] and [[B-101]] didn't make it in and carried their **Target**
  forward again. No new `D-NNN` scope this cycle. Shipped as a **patch** version (a pure
  bug-fix batch). Shipped 2026-10-01.
- [`tracker-history/v0.15.0.md`](tracker-history/v0.15.0.md) — a single entry, [[B-134]]
  (Fixed — resume playback position now saves on a real app quit, not just React's own
  lifecycle events, and a pause the embed initiates on its own is no longer missed).
  [[B-108]] and [[B-101]] didn't make it in and carried their **Target** forward again.
  Shipped alongside D-072 (five new AI-translated, unreviewed interface languages) and
  D-073 (a local Watch History view, confirmed working live) — full narrative for both
  is in `decisions.md`, not this file. Originally tracked toward a `0.14.2` patch, but
  D-072/D-073 amounted to real new scope — shipped as a **minor** version instead,
  skipping `0.14.2` entirely (same pattern as `0.11.0` skipping `0.10.3`, `0.12.0`
  skipping `0.11.1`, and `0.13.0` skipping `0.12.1`). Shipped 2026-10-04.

**Current target: 0.15.1.** Carries [[B-108]] and [[B-101]] forward — neither made it
into 0.5.0, 0.6.0, 0.7.0, 0.8.0, 0.8.1, 0.9.0, 0.10.0, 0.10.1, 0.10.2, 0.11.0, 0.12.0,
0.13.0, 0.13.1, 0.13.2, 0.13.3, 0.14.0, 0.14.1, or 0.15.0 either (see above — every one
of those shipped driven by a direct product-owner decision or a different bug batch
instead).

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
- **Type:** adjustment · **Status:** Open · **Reported:** 2026-07-15 · **Target:** 0.15.1
  (carried over — 0.2.2, 0.3.0, 0.4.0, 0.4.1, 0.4.2, 0.4.3, 0.4.4, 0.4.5, 0.4.6, 0.4.7, 0.4.8, 0.5.0, 0.6.0, 0.7.0, 0.8.0, 0.8.1, 0.9.0, 0.10.0, 0.10.1, 0.10.2, 0.11.0, 0.12.0, 0.13.0, 0.13.1, 0.13.2, 0.13.3, 0.14.0, 0.14.1, and 0.15.0 all shipped without this)
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
- **Status:** Open · **Reported:** 2026-07-16 · **Target:** 0.15.1
  (carried over — 0.2.2, 0.3.0, 0.4.0, 0.4.1, 0.4.2, 0.4.3, 0.4.4, 0.4.5, 0.4.6, 0.4.7, 0.4.8, 0.5.0, 0.6.0, 0.7.0, 0.8.0, 0.8.1, 0.9.0, 0.10.0, 0.10.1, 0.10.2, 0.11.0, 0.12.0, 0.13.0, 0.13.1, 0.13.2, 0.13.3, 0.14.0, 0.14.1, and 0.15.0 all shipped without this; the
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

### B-135 — A livestream whose broadcast was scheduled days in advance never surfaces in the feed
- **Type:** bug · **Severity:** major
- **Status:** Fixed · **Reported:** 2026-10-04 · **Target:** 0.15.1
- **Area:** feed, sync
- **What happens:** the owner noticed a subscribed channel (Veim dos Game) had done a
  live stream the day before — visible on that channel's own screen — but it never
  appeared on the main feed/Home at all. Investigated directly against the owner's own
  `chronicle.db` (no app changes made). Confirmed: the video (`p0VcxyQP74I`,
  "LIVE DO VÉIO - MUITA COISA NOVA E BOA PARA O VELHO MEGÃO!") has `published_at =
  2026-09-30T17:51:24Z` but `live_started_at = 2026-10-03T22:59:00Z` /
  `live_ended_at = 2026-10-04T02:56:44Z` — the broadcast was created/scheduled on YouTube
  three days before it actually went live. D-053's `effectiveDate()` (`core/feed.ts`)
  would correctly place it at the top of Today once fetched — but `repositories.ts`'s
  keyset pagination (`FEED_ORDER`, `ORDER BY v.published_at DESC`) fetches pages in raw
  `published_at` order, and `FeedService.getSlice()` only re-sorts by `effectiveDate`
  *within* whatever page was already fetched (confirmed in code, `feed-service.ts`). At
  the time this video aired, 327 other videos from the owner's subscribed channels had a
  later raw `published_at`, so it sits on roughly page 7 of the feed (`FEED_PAGE_SIZE =
  50`) — never reached by normal scrolling, and even if reached, would render a
  duplicate/out-of-order "Today" header in the middle of older content rather than at
  the top.
- **Scope — confirmed systemic, not a one-off:** queried the whole local DB for every
  video where `live_started_at` is more than ~12h after `published_at`, among subscribed
  channels. At least 8 channels are affected (Veim dos Game, Canal do Pirulla, Dan, FIAP,
  Loop Infinito, Sorta Stupid, Renan Santos | VOTE 14, ACF). Severity varies by how many
  other channels post in between: "Dan" alone has streams buried 500–1600 videos deep in
  raw order (effectively never reachable); the reported Veim dos Game video was 327 deep.
  This is a different, much larger-magnitude case of the same gap D-053 already flagged
  and deliberately left open ("never touches the keyset pagination cursor, since a
  keyset cursor can't be built on a value like `now`") — D-053's own narrative only
  anticipated an hours-scale divergence (a stream crossing midnight), not a days-scale
  one from advance scheduling.
- **Root cause confirmed via subagent code trace:** `published_at` is NOT write-once —
  `sync-repository.ts`'s `applyHydration` unconditionally overwrites it every hydration
  cycle from the YouTube Data API's `snippet.publishedAt` (`api-client.ts`). That field
  itself is the stale value for a scheduled broadcast — it reflects when the broadcast
  resource was *created*, not `liveStreamingDetails.scheduledStartTime` or
  `actualStartTime`, and YouTube never updates it once set. Chronicle never reads
  `scheduledStartTime` at all. This falsifies `feed.md` §Ordering's own flagged
  "Assumption, still unverified: RSS `published` reflects [when the video became
  publicly available]" — for a livestream, it does not; it reflects scheduling/creation
  time, sometimes days early. No existing code path corrects `published_at` once the
  real air date is known (unlike `live_ended_at`/`is_premiere`, which D-053 made sticky
  via `COALESCE`/`CASE` specifically for this kind of divergence).
- **Also checked while investigating (ruled out, not a bug):** a stale-looking channel,
  "República Coisa de Nerd" (`last_synced_at` frozen at 2026-09-17, 17 days behind every
  other channel) turned out to be `subscribed = 0` in `account_channels` — the owner
  unsubscribed from it around that date, so it correctly stopped being polled. Sync log
  outcomes (`ok`/`partial`/`failed` over the last ~1000 cycles) show the normal per-cycle
  RSS noise pattern D-048/D-049 already accept as expected, not a new failure mode.
- **Expected:** a livestream (or any video) sorts and surfaces by when it actually
  happened, not by a stale scheduling timestamp — reachable on the first feed load, not
  buried hundreds of pages deep.
- **Code refs:** `src/adapters/storage/repositories.ts` (`FEED_ORDER`, `listPage`'s
  keyset cursor), `src/core/feed-service.ts` (`getSlice`, page-local sort only),
  `src/core/feed.ts` (`effectiveDate`, `compareFeedOrder`), `src/adapters/storage/
  sync-repository.ts` (`applyHydration`'s unconditional `published_at` overwrite),
  `src/adapters/youtube/api-client.ts` (`snippet.publishedAt` read, `scheduledStartTime`
  never read).
- **Notes:** discussed live with the owner across three design rounds (none of the three
  original options above was picked as-is): the owner first confirmed the upcoming →
  airing → ended staging was already the intended model, then caught a real gap in a
  "just order by `live_started_at`" approach — a live that's *currently* airing needs to
  outrank everything regardless of date, not just sort by when it started — and finally
  insisted Premiere follow the identical treatment in every stage, reversing B-119's
  exclusion. Implemented as **D-074**: a two-tier sort key (a stable `live_content =
  'live'` boolean tier, then the existing effective-date tiebreak) baked directly into
  `repositories.ts`'s `FEED_ORDER` and keyset cursor (`FeedCursor` gained a `liveNow`
  field) — no new column, reusing `live_started_at`/`live_ended_at`, which were already
  persisted. `sync-repository.ts`'s `applyHydration` no longer blocks `live_ended_at`
  from being captured for a Premiere. Full narrative, including the
  mid-conversation design revisions: `decisions.md` D-074 /
  [decisions-history/D-074.md](decisions-history/D-074.md). Checked via `npm run
  typecheck && npm run lint && npm test` (305/305, including 5 new regression tests in
  `repositories.test.ts` reproducing this exact burial scenario, and 3 existing B-119
  tests updated for the reversed Premiere behavior). Related: [[D-053]], [[D-027]],
  [[D-074]].
- **Resolved:** 2026-10-04 · **Commit:** 8071ca3 · **Outcome:** Fixed
- **Resolution:** two-tier sort key (D-074) shipped as described above. Confirmed
  working live by the owner after a relaunch.

### B-136 — A live/upcoming video that disappears from YouTube entirely stays stuck forever, now dominating the feed's top (D-074 fallout)
- **Type:** bug · **Severity:** major
- **Status:** Fixed · **Reported:** 2026-10-04 · **Target:** 0.15.1
- **Area:** sync, feed
- **What happens:** the owner noticed, live-testing D-074's build, that several
  livestreams that had already ended "a good while ago" sat pinned at the very top of
  the feed, still showing as "Live." Confirmed directly against the owner's real
  `chronicle.db`: 5 videos (3 from "Partido Missão," 2 from "ACF," plus 2 more from an
  already-unsubscribed channel) have `live_content = 'live'` with `live_started_at`
  anywhere from 21h to 664h (~28 days) in the past and `live_ended_at` never set. The
  owner independently checked one on YouTube directly: **the video no longer exists
  there at all.**
- **Root cause, confirmed against the data (not guessed):** `refreshLiveStatus`
  (`sync-service.ts`) re-hydrates every `upcoming`/`live` video every sync cycle — but
  `api-client.ts`'s `hydrate()` just does `page.items.map(...)` over whatever
  `videos.list` returns, with no check for a requested id that didn't come back.
  YouTube's `videos.list` deterministically omits an id it can't serve (deleted,
  privated, or otherwise gone) rather than erroring the batch — unlike a transient
  single-poll RSS 404 (D-048), this is a reliable, repeatable signal. `applyHydration`
  only ever touches rows for ids actually present in its input array, so a vanished
  video's row is simply never touched again — frozen at whatever `live_content` it had
  the last time it was still reachable. Quantified: the oldest stuck video's
  `hydrated_at` predates **540 consecutive sync cycles** (every one `outcome: 'ok'`,
  no quota exhaustion) with zero updates — if YouTube were instead just reporting
  `liveBroadcastContent: 'live'` forever on a real, still-existing video,
  `hydrated_at` would refresh every cycle regardless; the fact that it's frozen
  confirms the row stopped being returned at all, not that it's genuinely still live.
- **Why D-074 made this so much worse:** before D-074, a stuck `live_content = 'live'`
  row only affected its own badge and its position among videos sharing its (possibly
  very old) `publishedAt` — easy to miss, buried wherever its stale date put it. D-074's
  new top-priority tier (`live_content = 'live'` outranks every date comparison) now
  promotes *any* row with that flag straight to the very top of the feed, with no upper
  bound on how long it can have been wrong — turning an easy-to-miss stale badge into
  the single most prominent thing in the feed, indefinitely.
- **Fix:** `refreshLiveStatus` now diffs each hydrate() batch's requested ids against
  the ids actually returned; anything missing goes through a new
  `SyncRepository.clearLiveStatus(videoIds)` (`UPDATE videos SET live_content = 'none'
  WHERE video_id IN (...)`), reverting it to ordering by its own `publishedAt` like any
  other video — `live_ended_at` is deliberately left untouched (`null`) rather than
  fabricating a guessed end time nobody actually knows. Covers both `live` and
  `upcoming` (a canceled/deleted scheduled stream has the exact same gap).
- **Code refs:** `src/core/sync-service.ts` (`refreshLiveStatus`), `src/adapters/storage/
  sync-repository.ts` (`clearLiveStatus`), `src/core/ports.ts` (`SyncRepository.
  clearLiveStatus`), `src/adapters/youtube/api-client.ts` (`hydrate`).
- **Notes:** checked via `npm run typecheck && npm run lint && npm test` (308/308,
  including 2 new `sync-service.test.ts` cases simulating a video missing from
  `hydrate()`'s response, and 1 new `sync-repository.test.ts` contract test against
  real SQLite). Related: [[D-074]], [[B-135]].
- **Resolved:** 2026-10-04 · **Commit:** 8071ca3 · **Outcome:** Fixed
- **Resolution:** `clearLiveStatus` shipped as described above. The owner relaunched the
  app to validate (backend changes need a real relaunch, not just a hot-reload) and
  confirmed moving forward with the commit; the 5 already-stuck rows in the owner's real
  `chronicle.db` self-correct on their next sync cycle against this code, no manual
  database edit was made.

