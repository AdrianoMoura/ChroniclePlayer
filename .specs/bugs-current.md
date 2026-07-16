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
  version (real new scope, not a bug-fix batch). Shipped 2026-07-16. Since this landed
  ahead of this file's own batch, its `0.3.1` target is renumbered to `0.4.1` below.
- **v0.4.1** — no bug-tracker batch of its own, same pattern as `v0.2.1`/`v0.4.0`: a
  same-day revert, not a fix for any item in this file's own batch. [[B-108]]'s round 2
  (the frozen-position `.player-scroll-catcher` strip) turned out to sit over the app's
  own top-of-screen controls during/after a scroll gesture, swallowing clicks meant for
  them — worse than the scroll gap it was patching. Removed the whole mechanism on the
  owner's request; B-108 itself reverts to **Open** (still carried in this file's own
  batch below, now with the scroll-catcher approach ruled out rather than resolved).
  Shipped as a **patch** version (a revert, not new scope). Shipped 2026-07-16. Since
  this landed ahead of this file's own batch, its `0.4.1` target is renumbered to
  `0.4.2` below.
- **v0.4.2** — no bug-tracker batch of its own, same pattern as `v0.2.1`/`v0.4.0`/
  `v0.4.1`: driven by D-051, a direct product-owner request prompted by a real bug they
  hit live (closing the window to the tray left a still-playing video running silently,
  with no easy way to stop it). New `SettingsDto.popOutOnClose` pops the video into the
  always-on-top extract window on tray-close (default) or pauses it, per the toggle;
  `extractPlayer` gained an `auto` flag and a `title` parameter (distinct OS-level
  window title for the extract window, a same-session owner follow-up). Also fixed the
  same session: a live-tested regression where the on-screen Extract button stopped
  popping the video out once `extractToWindow` gained a parameter (a raw
  `onClick={onExtract}` binding forwards React's `MouseEvent` into it, which isn't
  IPC-cloneable) — split into `extractToWindowInternal(auto)` plus a permanent zero-arg
  `extractToWindow` wrapper. Full history is in `decisions.md` D-051, not a
  `bug-history/` file. Shipped as a **patch** version, per the owner's own explicit
  direction (even though it lands a new Settings toggle, not a pure bug-fix batch).
  Shipped 2026-07-16. Since this landed ahead of this file's own batch, its `0.4.2`
  target is renumbered to `0.4.3` below.

**Current target: 0.4.3** (in progress; renumbered from `0.4.2` — v0.4.2 shipped ahead
of this batch, see above). Carries [[B-108]], [[B-022]], [[B-086]], [[B-101]] forward
from 0.3.0 (none of the four made it into that release — see
`bug-history/v0.2.2.md`/`bug-history/v0.3.0.md` for why). When 0.4.3 ships, this file's
content moves to `bug-history/v0.4.3.md` and a new `bugs-current.md` starts targeting
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
- **Type:** adjustment · **Status:** Open · **Reported:** 2026-07-15 · **Target:** 0.4.3
  (carried over — 0.2.2, 0.3.0, 0.4.0, 0.4.1, and 0.4.2 all shipped without this)
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
  0.4.3 (carried over — 0.2.2, 0.3.0, 0.4.0, 0.4.1, and 0.4.2 all shipped without this)
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
  writing speculative code against — it needs a live test against a real membership. Two
  concrete things worth the owner testing directly, in order of cost: (1) scroll to the
  bottom of that channel's screen to trigger `backfillArchive` (already-shipped, already
  authenticated) and see if the members-only video appears; (2) if the channel also
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

### B-108 — Mouse-wheel scroll doesn't work on the full-view player screen while hovering the embedded video
- **Type:** bug · **Severity:** minor
- **Status:** Open · **Reported:** 2026-07-16 · **Target:** 0.4.3
  (carried over — 0.2.2, 0.3.0, 0.4.0, 0.4.1, and 0.4.2 all shipped without this; the
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
- **Status:** In progress · **Reported:** 2026-07-12 · **Target:** 0.4.3 (carried over —
  0.2.2, 0.3.0, 0.4.0, 0.4.1, and 0.4.2 all shipped without this)
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

### B-111 — Dock/pop-out fires even when the video is actually paused
- **Type:** bug · **Severity:** minor
- **Status:** Fixed · **Reported:** 2026-07-16 · **Target:** 0.4.3
- **Area:** player
- **What happens:** the owner reported that leaving the full-view player while the video
  is paused still docks the miniplayer *playing*; separately, closing the main window to
  the tray (`backgroundMode`, [[D-050]]) while the video is paused still pops it out to
  the always-on-top extract window ([[D-051]]) instead of just leaving it paused. Both
  paths are meant to no-op (or actually stay paused) when the video isn't going, per
  [[D-046]]'s `isStillGoing()` gate. Confirmed live by the owner: it reproduces when
  pausing by clicking the video itself, not with the Space shortcut.
- **Expected:** leaving/closing while genuinely paused should never dock or extract —
  only an in-progress video should. Reference: `playback.md`, [[D-046]], [[D-051]].
- **Code refs:** `src/ui/PlayerSurface.tsx` (`playerStateRef`, `isStillGoing()`, the
  `onStateChange`/`infoDelivery` postMessage handler).
- **Resolved:** 2026-07-16 · **Commit:** ca47aa4 · **Outcome:** Fixed
- **Resolution:** root cause matched the leading hypothesis, refined once the owner's
  live confirmation ruled out a wholesale postMessage failure: Space sets
  `playerStateRef` optimistically the instant it's pressed, so it was never exposed —
  but a pause via the embed's own native controls depends entirely on the
  `onStateChange` postMessage round trip landing, and `playback.md` already documents
  (from D-038's rate-reissue fix) that this specific event isn't reliably observed for
  state changes the embed initiates itself, as opposed to ones triggered by Chronicle's
  own `command()` calls. Same fix shape as that earlier one: `infoDelivery` also carries
  a `playerState` field and fires as a steady heartbeat rather than a one-shot
  transition, so `playerStateRef` now also updates from it on every tick, closing the
  gap without touching the transition-only side effects (ended overlay, resume
  checkpoint, quality/rate reissue) that must still fire exactly once per real
  transition. Checked via `npm run typecheck && npm run lint && npm test` (209/209);
  **not run live** — needs the owner's own live confirmation that clicking the video to
  pause and then leaving/closing no longer docks or pops out.
