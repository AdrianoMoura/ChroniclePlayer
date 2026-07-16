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

**Current target: 0.3.0** (in progress). Carries [[B-022]], [[B-086]], [[B-101]]
forward from 0.2.0 (none of the three made it into that release — see
`bug-history/v0.2.0.md` for why). When 0.3.0 ships, this file's content moves to
`bug-history/v0.3.0.md` and a new `bugs-current.md` starts targeting 0.4.0.

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
- **Type:** adjustment · **Status:** Open · **Reported:** 2026-07-15 · **Target:** 0.3.0
  (carried over — 0.2.0 shipped 2026-07-15 without this)
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
  0.3.0 (carried over — 0.2.0 shipped 2026-07-15 without this)
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

## In progress

### B-108 — Mouse-wheel scroll doesn't work on the full-view player screen while hovering the embedded video
- **Type:** bug · **Severity:** minor
- **Status:** In progress · **Reported:** 2026-07-16
- **Area:** player
- **What happens:** on the full-view player screen, scrolling the mouse wheel while the
  cursor is positioned over the embedded YouTube video does nothing — the page doesn't
  scroll. Moving the mouse off the video first is the only workaround.
- **Expected:** the page scrolls normally regardless of where the cursor is over it,
  video included.
- **Code refs:** `src/ui/PlayerSurface.tsx` (`.player-stage`'s `<iframe>`, and the new
  `.player-scroll-catcher` sibling div added by this fix); `src/ui/styles.css`
  (`.player-scroll-catcher`).
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

### B-022 — Delete all data: app relaunches into a frozen/blank screen instead of a clean state
- **Type:** bug · **Severity:** major
- **Status:** In progress · **Reported:** 2026-07-12 · **Target:** 0.3.0 (carried over —
  0.2.0 shipped 2026-07-15 without this)
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

### B-107 — Pagination never triggers when a filtered/narrow view's content doesn't fill the viewport
- **Type:** bug · **Severity:** minor
- **Status:** Fixed · **Reported:** 2026-07-16
- **Area:** feed / ui-shell
- **What happens:** the owner reported this happening when filtering the feed — depending
  on the window size and the grid item size in effect, the number of matching items could
  be short enough that they didn't fill the visible viewport. With nothing to scroll, no
  further page ever loaded, even if more matching content was available locally or via
  backfill.
- **Expected:** if, after rendering the current results, no scrollable overflow was
  actually produced (content height ≤ viewport height), the system triggers pagination
  itself instead of waiting for a scroll event that can never come.
- **Code refs:** `src/ui/FeedList.tsx` (the existing `onNearEnd`-triggering `useEffect`,
  keyed off `virtualizer.getVirtualItems()`'s last rendered index vs. `displayRows.length`
  — relies on the virtualizer having already produced a settled item list matching the
  current viewport, which can lag a render behind a row-count-shrinking change); `src/ui/App.tsx`
  (`loadMore`, wired in as `onNearEnd`).
- **Resolution:** per the owner's own suggested fix, added a second `useEffect` in
  `FeedList.tsx` that checks the scroll container directly after each render where the
  row count, columns, or row height changed (`el.scrollHeight <= el.clientHeight`, guarded
  on `el.clientHeight > 0` so it doesn't fire before the container has been laid out at
  all) and calls `onNearEnd()` if there's no scrollable overflow. Safe against loops:
  `onNearEnd` (`loadMore`) already no-ops once there's genuinely nothing more to fetch
  (`nextCursor === null` and either no channel filter or `archiveExhausted` already has
  it), and against concurrent calls (`loadingRef`/`backfillingRef` guards), both
  pre-existing. No new test file — this codebase has no existing UI component test
  harness for `FeedList.tsx` to extend (domain/adapters get unit/contract tests per
  `CLAUDE.md`; UI relies on the owner's own live check). Checked via
  `npm run typecheck && npm run lint && npm test` (200/200); **not run live this
  session** (per [[no-live-app-verification]]).
- **Follow-up (2026-07-16):** the owner tested by typing into the topbar search box —
  which turned out to be a completely different code path than the one just fixed
  (`FeedList.tsx`'s virtualizer): a YouTube search's results render through a plain,
  non-virtualized `.search-results` `<div>` in `App.tsx`, paged via that div's own
  `onScroll` handler (`if (scrollHeight - scrollTop - clientHeight < 300)
  loadMoreSearchResults()`) — the exact same "depends on a scroll event that may never
  come" shape, just implemented differently, and entirely missed by the first pass since
  it isn't `FeedList` at all. Fixed the same way: a `useEffect` (keyed on `searchResults`/
  `settings.itemSize`/`settings.layout`/`settings.showShorts`) checks
  `searchResultsRef.current`'s `scrollHeight`/`clientHeight` after each render and calls
  `loadMoreSearchResults()` directly if there's no overflow — safe against loops the same
  way, since `loadMoreSearchResults` already no-ops without a `searchNextPageToken` or
  while already loading. While fixing this, found and fixed a **third** instance of the
  identical pattern that wasn't part of any report yet: `channelPreview` (browsing a
  not-yet-subscribed channel's uploads, opened from a search channel result) renders
  through the same `.search-results` markup with its own separate `onScroll` handler
  calling `loadMoreChannelPreview()` — same fix, a second `useEffect` keyed on
  `channelPreview`/`settings.itemSize`/`settings.layout` checking a new
  `channelPreviewRef`. `src/ui/App.tsx` gained both refs (`searchResultsRef`,
  `channelPreviewRef`), wired onto their respective `.search-results` divs. Checked via
  `npm run typecheck && npm run lint && npm test` (200/200); **not run live** — needs the
  owner's own check (search with a small item size / narrow window so the first page
  doesn't overflow, confirm more results load automatically; same for opening an
  unsubscribed channel's preview).
- **Resolved:** 2026-07-16 · **Commit:** 4b05e62 (follow-up: 1720dc4) · **Outcome:** Fixed

### B-106 — Full-view player's video renders on top of the app topbar (on scroll) and the write-scope consent dialog
- **Type:** bug · **Severity:** major · **Status:** Fixed · **Reported:** 2026-07-16 · **Target:** 0.3.0
- **Area:** player / ui-shell
- **What happens:** two symptoms, one root-cause family — `.player-stage` (the
  `position: fixed` box `PlayerSurface.tsx` mirrors onto whichever slot placeholder is
  active, `src/ui/styles.css`) sits at `z-index: 21`, deliberately above the miniplayer
  box so the video renders over it. That same fixed, high z-index box now also wins
  against UI it was never meant to cover: (1) scrolling the full-view player page (which
  scrolls as one block since [[B-045]]'s "Seventh round") moves the video's mirrored rect
  upward: once it scrolls far enough, its top edge sits inside the always-present app
  `.topbar`'s on-screen region (the topbar itself stays rendered — only some of its child
  controls hide via `{(!playerOpen || miniplayer) && ...}`, `App.tsx`), and since
  `.topbar` has no explicit `position`/`z-index` of its own, the video wins the
  comparison and paints over it. (2) opening the write-scope consent dialog (the "sign in
  to like/comment" `.overlay-backdrop`, `src/ui/useWriteScopeGate.tsx`) from inside the
  player — e.g. liking or commenting — renders it invisible and unclickable behind the
  video: `PlayerDetails.tsx` renders `{writeScopeGate.dialog}` *inside* `.player-view`
  (`src/ui/PlayerDetails.tsx`), and `.player-view` is `position: absolute; z-index: 5`
  (`src/ui/styles.css`) — a positioned element with an explicit z-index establishes its
  own stacking context, so the dialog's own `z-index: 30` (normally enough to win against
  everything, per the `.overlay-backdrop` comment referencing [[B-045]]'s miniplayer)
  only competes *inside* that local context; from the outside, the whole `.player-view`
  subtree — dialog included — is capped at effective z-index 5, well below
  `.player-stage`'s 21. The consent dialog is not just visually hidden but genuinely
  unclickable, since the iframe on top intercepts the click — liking/commenting from the
  player cannot complete the consent step at all when this triggers.
- **Expected:** the video never renders above app chrome that's supposed to sit above it
  — the topbar should stay visible/on top regardless of scroll position, and any modal
  (help, write-scope consent, add-account, URL prompt) must always be clickable above the
  video, exactly like the miniplayer case `.overlay-backdrop`'s own comment already
  documents as a required invariant.
- **Code refs:** `src/ui/styles.css` (`.player-stage` z-index 21; `.player-view`
  `position: absolute; inset: 0; z-index: 5`); `src/ui/PlayerDetails.tsx`
  (`{writeScopeGate.dialog}` was nested inside `.player-view`'s `return`);
  `src/ui/useWriteScopeGate.tsx` (the dialog itself); `src/ui/PlayerSurface.tsx` (the
  `alignTarget.getBoundingClientRect()` mirroring effect).
- **Resolution:** two independent fixes, one per symptom, both in the same change. (1)
  `PlayerSurface.tsx`'s scroll-driven `measure()` effect now also measures
  `alignTarget.closest('.player-view')` — the full-view slot's own scroll container,
  which doesn't move on scroll (only its content does) — and computes how far the
  mirrored video rect has scrolled past that container's stable top/bottom edge
  (`clipTop`/`clipBottom`). The `.player-stage` box applies these as a `clip-path: inset()`
  in its inline style, so the portion that would otherwise poke out above the topbar (or
  below the container) is clipped away instead of painted over it — the miniplayer's
  align target isn't nested in a `.player-view`, so it gets no clip-path and is
  unaffected. (2) `PlayerDetails.tsx` no longer renders `{writeScopeGate.dialog}` inside
  `.player-view`'s `return` — wrapped the component's return in a fragment and moved the
  dialog to be a sibling *after* `.player-view` instead, so it's no longer captured by
  `.player-view`'s `z-index: 5` stacking context and its own `z-index: 30` competes
  directly against `.player-stage`'s 21, same as every other modal already does. No spec
  changes needed — `ui.md`/`playback.md` don't describe stacking order at this level of
  detail. Checked via `npm run typecheck && npm run lint && npm test` (200/200). No
  live-app check this session (per [[no-live-app-verification]]).
- **Follow-up (2026-07-16):** the owner live-tested and confirmed scroll and the like
  dialog both fixed, but the comment consent dialog was still hidden. Root cause:
  `CommentsSection` (`src/ui/Comments.tsx`) held its *own* separate `useWriteScopeGate()`
  instance and rendered its own `{writeScopeGate.dialog}` inside `.comments-section`,
  itself nested inside `.player-view` — the exact same trap fixed above for the
  like/subscribe dialog, just in a second, independent instance the first pass missed.
  Rather than lift a second dialog out to another `.player-view` sibling (which would let
  two different consent dialogs pop up for one player), `CommentsSection` now takes
  `runWithWriteScope` as a prop instead of owning a gate — `PlayerDetails` passes its own
  `writeScopeGate.run` (the same instance already backing like/subscribe, whose dialog
  already renders correctly outside `.player-view`), so the whole player shares one gate
  and one dialog. `CommentItem`/`ReplyItem` already took `runWithWriteScope` as a prop one
  level down, so this just extends that existing pattern up one level rather than
  introducing a new one. Re-checked via `npm run typecheck && npm run lint && npm test`
  (200/200).
- **Live-confirmed (2026-07-16):** the owner tested scroll, the like dialog, and the
  comment dialog after the follow-up — all three fixed. Closing.
- **Resolved:** 2026-07-16 · **Commit:** efc9d6b (follow-up: d8561e3) · **Outcome:** Fixed

### B-105 — First-ever sync: today's videos sit unread (and un-badged) until the Shorts pass catches up
- **Type:** adjustment · **Status:** Fixed · **Reported:** 2026-07-15 · **Target:** 0.3.0
- **Area:** sync
- **What happens:** on an account's very first sync, [[B-020]]/[[B-069]] already marked
  every backlog video (published before today) read on arrival, so only *today's*
  freshly-discovered videos landed as unread. But hydration and the Shorts-confirmation
  pass (`confirmShorts`) are separate steps — the Shorts pass runs after hydration and,
  per `sync-service.ts`'s own comment, "first sync probes ~1k candidates," so it can take
  a while. Until it finished, today's videos (exactly the old backlog-cutoff boundary
  case most likely to contain same-day Shorts) showed up unread with no Shorts badge
  yet — the owner had to wait for the Shorts pass to complete before the unread
  list/badge was actually representative of what's real content vs. Shorts.
- **Expected:** on the very first sync only, every newly discovered video is marked read
  on arrival — not just the ones published before today.
- **Code refs:** `src/core/sync-service.ts` (`refresh`, the `firstSync` branch inside the
  hydration loop).
- **Resolution: D-047**, per the owner's own follow-up direction (2026-07-16), which went
  further than this entry's original ask: rather than racing the Shorts pass to close the
  same-day window, the owner decided a first sync should never assume *any* discovered
  video is unread-worthy, today's included — there's no prior visit to judge "new since
  you were last here" against on the very first run, so guessing is unjustified either
  way. Removed the `backlogCutoff`/`startOfToday` date filter entirely rather than
  widening it: the `firstSync` branch in `SyncService.refresh` now calls
  `repo.markVideosReadIfUnset` on every video in each hydrated batch, unconditionally.
  The now-unused `startOfToday` import was dropped. `feed.md` §Backfill rules
  ("First-ever sync") and `decisions.md` (new **D-047**, superseding the B-020/B-069
  rule) updated in the same change. Every subsequent sync (routine or backfill) is
  unaffected. Updated the existing B-069 coverage test
  (`sync-service.test.ts` — "marks every video read as soon as it hydrates on a first
  sync, backlog and same-day alike") to assert both a backlog and a same-day video are
  marked read; one unrelated gap-backfill test ("backfills a gap when the whole RSS
  window is new on a previously synced channel") had never set the account-level
  `subscriptions_synced_at` meta and was incidentally exercising the `firstSync` branch
  by accident — fixed by setting that meta explicitly, matching its actual intent (a
  channel that was previously synced, which implies the account isn't in its first sync
  either). Checked via `npm run typecheck && npm run lint && npm test` (200/200). No
  live-app check this session (per [[no-live-app-verification]]).
- **Resolved:** 2026-07-16 · **Commit:** d63e02a · **Outcome:** Fixed

