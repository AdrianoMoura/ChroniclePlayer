# Bug & Adjustment Tracker

This is the working list of bugs and adjustments found while testing Chronicle. The
product owner reports items as they dogfood the app; entries are added here first, then
attacked in batches when the owner asks. This file is operational (it changes often) —
requirements and design still live in the other specs, and anything here that turns into
a design change must be reflected in the relevant spec and, when substantive, in
`decisions.md`.

## How this file is used

1. **Report** — the owner describes a bug or desired adjustment; it gets an ID and an
   entry under *Open*, with enough context to reproduce or act on it.
2. **Attack** — when the owner says to work the list, items move to *In progress* and
   then to *Resolved*, with the fixing commit referenced.
3. **Roadmap** — if a batch of items suggests re-sequencing or a new milestone task,
   `roadmap.md` is updated in the same change.

## Conventions

- IDs are `B-NNN`, sequential, never reused. Reference them in commits ("Fix B-003: …").
- **Type**: `bug` (behavior is wrong per spec/expectation) or `adjustment` (behavior is
  as designed but should change — UX polish, copy, tuning).
- **Severity** (bugs only): `blocker` / `major` / `minor`.
- **Status**: `Open` → `In progress` → `Fixed` / `Won't fix` / `Duplicate of B-NNN`.
- Dates are absolute (YYYY-MM-DD): reported date and resolved date.
- Resolved entries move to the *Resolved* section (newest first) and keep their full
  entry — the history is part of the value.

## Versions

Batches of this file map onto app releases (`package.json` version, semver):

- **0.1.0** — everything in *Resolved* below **without a Target field** shipped as part
  of this release; it covers all work from the project's start through 2026-07-14. No
  per-entry version tag needed for that history — the *Resolved* section heading was
  the marker, since 0.1.0 was the only release that existed at the time.
- **0.2.0** — the release currently being assembled. Every *Open*/*In progress* entry
  carries a **Target** field for the version it's aimed at; entries reported before
  0.1.0 shipped but not fixed in time carry over with their target bumped to 0.2.0. A
  fix landed *during* 0.2.0's development moves straight to *Resolved* but **keeps its
  Target field** (now meaning "shipped in" rather than "aimed at") so the entry doesn't
  read as if it shipped in 0.1.0 before that version actually cuts.
- When a release ships, add a new versioned bullet here with its date and a one-line
  summary of the batch, same as above.

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

### B-086 — Members-only videos never show up in the feed
- **Type:** bug · **Severity:** major
- **Status:** Open (research done 2026-07-15; recommendation below needs the owner's live
  confirmation, not more code, to move further) · **Reported:** 2026-07-15 · **Target:**
  0.2.0
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

### B-022 — Delete all data: app relaunches into a frozen/blank screen instead of a clean state
- **Type:** bug · **Severity:** major
- **Status:** In progress · **Reported:** 2026-07-12 · **Target:** 0.2.0
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

### B-099 — Extract-to-window button only reachable from the miniplayer, not the full-view player screen
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-15 · **Target:** 0.2.0
- **Area:** player / ui-shell
- **What happens:** [[B-045]] added an "extract to always-on-top window" action, but it
  only ever existed in `MiniPlayerBar`'s docked chrome — the full-view player screen
  (`PlayerDetails`) had no such button, so extracting required first docking to the
  miniplayer.
- **Expected:** the extract action is also reachable directly from the full-view player
  screen, not only after docking.
- **Code refs:** `src/ui/PlayerDetails.tsx` (topbar); `src/ui/MiniPlayerBar.tsx`
  (existing `onExtract` button this mirrors); `src/ui/App.tsx` (`extractToWindow`,
  already defined and already wired to `MiniPlayerBar`, now also passed to
  `PlayerDetails`).
- **Notes:** `PlayerDetails` gained an `onExtract` prop and a topbar button (`⧉`,
  right-aligned via `.player-topbar` becoming a flex row) that calls the same
  `extractToWindow` callback `MiniPlayerBar` already used — no new extraction logic,
  just a second entry point to the existing one. The shared copy string moved from
  `player.miniplayer.extractTitle` to a non-miniplayer-scoped `player.extractTitle`
  since it's no longer miniplayer-only. Checked via `npm run typecheck && npm run lint
  && npm test` and `npm run build`. **Live-tested by the owner (2026-07-15):** the new
  topbar button worked but was too small to comfortably hit — `.player-topbar-extract`'s
  `font-size` raised 13px→22px and padding widened to match (`src/ui/styles.css`). The
  owner then asked for the same treatment on the miniplayer's own icon row (extract/
  maximize/close, not just extract) — `.miniplayer-actions button`'s `font-size` raised
  13px→20px with matching padding, same file. **Owner confirmation (2026-07-15):**
  live-tested again together with the rest of [[B-045]] — extracting from the full-view
  screen behaves the same as extracting from the miniplayer, icon sizes are comfortable.
  Moving to Resolved.
- **Resolved:** 2026-07-15 · **Commit:** (pending) · **Outcome:** Fixed

### B-045 — Miniplayer: detach to a corner mini-view, extract to an always-on-top window
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-12 · **Target:** 0.2.0
- **Area:** player / ui-shell
- **What happens:** the player view was full-view only — leaving it went back to the feed
  and stopped playback (no background/PiP mode).
- **Expected:** (1) leaving the player screen while a video is playing docks it into a
  small persistent miniplayer instead of stopping playback, automatically — no manual
  button; (2) an "extract" action on the miniplayer pops the video into its own
  always-on-top OS window; (3) the miniplayer is resizable.
- **Code refs:** `src/ui/PlayerSurface.tsx` (the live iframe + widget protocol, split
  out so it can stay mounted across the layout swap — renders at one fixed tree
  position and measures/aligns to a slot rather than portaling into one, see Notes);
  `src/ui/PlayerDetails.tsx` (renamed from the old `PlayerView.tsx` — full-view chrome
  only, no iframe); `src/ui/MiniPlayerBar.tsx` (docked chrome); `src/ui/
  ExtractedPlayerWindow.tsx` (the minimal always-on-top window's content); `src/
  platform/main.ts` (`createExtractWindow`, `loadRenderer`, `IpcChannel.extractPlayer`);
  `src/ui/main.tsx` (`?extract=` query-param routing); `src/ui/styles.css`
  (`.player-view` flex-column restructure, `.miniplayer` resize).
- **Notes: D-046.** First implementation (2026-07-15) used a React portal to move
  `PlayerSurface`'s rendered iframe between a full-view slot and a corner-box slot.
  **The owner's live test caught two real bugs and one design miss in that pass:**
  (1) the video restarted from zero on every dock — moving an `<iframe>` to a
  different DOM parent, which is exactly what a portal does even without ever
  detaching it from the document, makes Chromium reload it; not a React bug, not
  fixable by portaling more carefully. Fixed by dropping the portal entirely:
  `PlayerSurface` now renders at one permanently stable position in the tree (a
  sibling of `PlayerDetails`/`MiniPlayerBar`, never conditionally nested inside
  either) and measures whichever slot placeholder the active layout provides
  (`ResizeObserver` + resize listener), mirroring its on-screen rect via `position:
  fixed` inline styles — the iframe's DOM parent never changes, only numbers do. This
  also required restructuring `.player-view` from one scrolling block into a
  non-scrolling topbar+stage row with only `.player-info` scrolling, so the
  placeholder's rect doesn't shift on every scroll tick. (2) the corner box was too
  small with no way to adjust — default width raised 260px→360px and given a native
  `resize: horizontal` handle. (3) the explicit "Miniplayer" button was removed —
  the owner's actual ask was purely automatic docking on leaving a playing video, and
  the manual button next to that read as redundant clutter, not a second useful path.
  Separately (also live-caught): B-093's session-partition change (same day) broke
  every thumbnail in the app — see that entry. A `patch()` staleness bug surfaced
  during the original implementation and was fixed alongside it: `playerStack`
  entries were never updated after the initial open, which the miniplayer toggle
  would have exposed as read/favorite/watch-later state flickering back to whatever
  it was when the video was first opened (`App.tsx`'s `patch` now updates
  `playerStack` too, not just `videos`). Also fixed while wiring the miniplayer's
  stacking: `.overlay-backdrop` (help, add-account, URL prompt, and write-scope
  consent dialogs) had no explicit `z-index`, which `.miniplayer`'s `z-index: 20`
  would have rendered above — bumped to `z-index: 30` so a modal always wins.
  Extraction (a genuinely different renderer process, no portal involved either way)
  hands off a playback snapshot to a fresh, minimal instance, accepting the reload as
  an inherent cost of that process boundary, per the owner's explicit direction.
  **Third round, same day:** the owner's next live test found automatic docking didn't
  fire at all — neither the Back button/Esc nor sidebar navigation. Two distinct causes:
  (1) every "hard" navigation-away action (sidebar view/channel/settings clicks,
  submitting a search, switching accounts) called `setPlayerStack([])` directly,
  bypassing the dock-vs-close decision entirely — those paths never had a chance to
  dock, mid-playback or not. Fixed with a shared `leavePlayerForNavigation()` in
  `App.tsx` that all of those call instead, collapsing the stack to just the current
  video and docking it if still going, otherwise clearing exactly as before. (2) even
  the Back/Esc path's own decision was gated on `playerStateRef.current === 1` (the
  IFrame API's literal PLAYING state, updated only when the iframe's own
  `onStateChange` postMessage arrives) — too strict: that round trip firing promptly
  (or being distinctly observable at all) for the *autoplay-initiated* state, as
  opposed to a state change our own `command()` triggered, isn't reliable enough to
  gate a core feature on. Loosened to "still going" — true unless explicitly paused
  (2) or ended (0) — so unstarted/buffering/cued all dock too, erring toward keeping
  playback going rather than silently never docking. Exposed as
  `PlayerSurfaceHandle.isStillGoing()`, used by both the automatic Esc/Back path and
  `leavePlayerForNavigation()`. Checked via `npm run typecheck && npm run lint &&
  npm test` (199/199) and `npm run build`; **not run live this round either** (per
  [[no-live-app-verification]]) — needs the owner's own hands-on validation again
  (dock via Back/Esc, dock via sidebar navigation, maximize, resize, extract, close,
  modal-over-miniplayer stacking) before this can move to Resolved.
  **Fourth round, same day:** the owner's next live test found six more issues, all now
  fixed. (1) Closing the extracted always-on-top window didn't restore the miniplayer in
  the main window — extraction had no notion of "coming back." Fixed with a
  `window.on('closed', ...)` handler in `createExtractWindow` (`src/platform/main.ts`)
  that broadcasts a new `player:restoreFromExtract` event (`src/ipc/contract.ts`); the
  main window's event handler re-opens that video in mini mode (`openVideo(videoId,
  'replace', true)`). (2) The extracted window's video needed a manual play click —
  `ExtractedPlayerWindow.tsx` now speaks the same postMessage widget protocol as the
  main player (`enablejsapi=1`, `command()`/`announce()`) and issues an explicit
  `command('playVideo')` once the handshake completes, rather than relying solely on the
  embed's own `autoplay=1` param under Electron's stricter top-level-navigation autoplay
  policy; `createExtractWindow` also sets `webPreferences.autoplayPolicy:
  'no-user-gesture-required'`. This is also what makes issue 1's restore resume close to
  where playback actually was: the same widget protocol now tracks `currentTime` via
  `infoDelivery` messages and persists it (`setResumePosition`) on `beforeunload`. (3) The
  extract window showed Electron's native menu bar, which nothing else in the app does —
  added `window.removeMenu()` to `createExtractWindow` (and, noticing the same gap, to
  the B-093 sign-in window too). (4)–(5) The resize handle used the browser's native CSS
  `resize: horizontal`, which anchors its own grab handle to the box's bottom-right
  corner — exactly where the whole miniplayer already sits against the screen's corner,
  making the handle nearly impossible to grab predictably. Replaced with a custom
  top-left drag handle in `MiniPlayerBar.tsx` (raw `mousedown`/`mousemove`/`mouseup`,
  growing the box when dragged away from its anchored right edge) and made the resulting
  width a persisted setting: `miniplayerWidth` on `SettingsDto`/`AppSettings`, clamped
  between new shared `MINIPLAYER_MIN_WIDTH`/`MINIPLAYER_MAX_WIDTH` constants
  (`src/ipc/contract.ts`, mirroring the existing `PLAYBACK_RATES` pattern so the
  ui-layer component isn't reaching into `platform/`), committed to `settings.json` once
  per drag (on mouseup) rather than on every mousemove. (6) Docking a video to the
  miniplayer and then opening a *different* video pushed the new video onto the
  navigation stack instead of replacing the docked one — Back would then return to the
  previous *video* instead of the previous *screen*, because every "fresh browsing
  action" call site (`openFromFeed`, search results, priority/channel-preview sections,
  the URL prompt) was calling `openVideo(videoId)` with its default push mode, the same
  mode correctly used for in-description video links (a genuine "dive deeper" case per
  D-029). `openVideo` gained an explicit `mode: 'push' | 'replace'` parameter; every
  fresh-browsing call site now passes `'replace'` (collapsing the stack to just the
  newly opened video), while the in-description-link call site is untouched. Checked via
  `npm run typecheck && npm run lint && npm test` (200/200) and `npm run build`; **not
  run live this round either** (per [[no-live-app-verification]]) — needs the owner's own
  hands-on validation again before this can move to Resolved.
  **Fifth round, same day:** the owner's next live test found the fourth round's resize
  handle and extract-autoplay fixes themselves didn't work. (1) The resize handle was
  invisible and unclickable — it was `position: absolute; top: 0; left: 0` *inside*
  `.miniplayer` (z-index 20), but the actual video is a separate, always-mounted element
  (`.player-stage` in `PlayerSurface.tsx`) that mirrors the stage slot's rect at
  `z-index: 21` — one layer *above* the miniplayer box, painted directly over that same
  top-left corner, swallowing both the pixels and the clicks. No z-index on the handle
  itself could fix this: a child capped at its stacking-context parent's z-index (20)
  can never paint above a sibling context at z-index 21, however it's tuned. Fixed by
  giving the handle real layout instead of an absolute overlay: `.miniplayer` is now a
  flex row of a fixed-width left-edge strip (`.miniplayer-resize-handle`) plus a
  `.miniplayer-content` column holding the stage slot and title bar — since the video
  iframe only ever mirrors `.miniplayer-stage-slot`'s rect (now inset by the strip's
  width, not the whole box's), it structurally cannot cover the handle anymore. Cursor
  changed from a diagonal `nwse-resize` to `ew-resize` to match that only width actually
  changes. (2) The explicit `command('playVideo')` added last round for extract-window
  autoplay still required a manual play — root cause was a different bug entirely,
  upstream of the extract window: `extractToWindow` (`App.tsx`) hands the extract window
  a `playing` flag from `PlayerSurface`'s `getPlaybackSnapshot().playing`, which read
  `playerStateRef.current === 1` — the exact same overly strict check that round 2 of
  this same bug already found and loosened for the *docking* decision
  (`isStillGoing()`), because the autoplay-initiated `onStateChange` round trip isn't
  guaranteed to have landed by the time the user acts. `getPlaybackSnapshot` just hadn't
  been updated to match, so a video extracted before that round trip landed handed off
  `playing: false` — the extract window then correctly, faithfully honored `autoplay=0`;
  nothing was wrong in the extract window itself. Fixed by having
  `getPlaybackSnapshot().playing` reuse `isStillGoing()` instead of the strict check.
  Checked via `npm run typecheck && npm run lint && npm test` (200/200) and `npm run
  build`; **not run live this round either** — needs the owner's own hands-on validation
  again (grab the resize handle, confirm extract autoplay) before this can move to
  Resolved.
  **Sixth round, same day** (plus a cosmetic tweak: the resize handle now shows a
  six-dot drag-grip glyph, `MiniPlayerBar.tsx`/`styles.css`): the owner found D-038's
  default playback speed setting wasn't reaching the extracted window at all — it would
  always open at 1x regardless of Settings. Root cause: `extractPlayer`
  (`src/ipc/contract.ts`'s `ChronicleApi`) never had a `defaultPlaybackRate` parameter in
  its signature to begin with, so nothing downstream (`preload.ts`, the `main.ts` IPC
  handler, `createExtractWindow`, the `?extract=` query string, `ExtractedPlayerWindow`)
  had any way to know the setting even existed — unlike the main player
  (`PlayerSurface.tsx`), which gets it as a normal React prop from `App.tsx`'s own
  `settings` state. Fixed by threading it through every layer: `extractPlayer` gained a
  fourth parameter, validated server-side against `PLAYBACK_RATES` (falling back to 1x
  for anything outside that list, same pattern as `normalizeSettings`), carried across the
  query string as `rate=`, and applied in `ExtractedPlayerWindow` the same way
  `PlayerSurface` applies it for D-038: `command('setPlaybackRate', ...)` once on the
  widget-protocol handshake, and reissued on the `onStateChange` transition to `1`
  (playing), since YouTube can reset the rate back to 1x the moment the stream actually
  starts. Checked via `npm run typecheck && npm run lint && npm test` (200/200) and `npm
  run build`; **not run live** — needs the owner's own hands-on validation (extract a
  video with a non-1x default rate set in Settings, confirm it opens already at that
  speed) before this can move to Resolved.
  **Seventh round, same day:** the owner reported the full-view player screen no longer
  scrolled as one page — only `.player-info` (description/comments) scrolled, with the
  video itself pinned in place above it. This was a deliberate trade-off from the first
  round of this fix (a non-scrolling topbar+stage flex row, so the stage slot's on-screen
  rect never moved and `PlayerSurface`'s `position: fixed` mirroring never needed to
  re-measure on scroll) that the owner, having now actually used it, didn't want — they
  want the whole page, video included, to scroll together like a normal page. Fixed by
  reverting `.player-view` to one normally-flowing scrolling block (`overflow-y: auto` on
  the view itself, not a separate scroll region below a pinned stage) and teaching
  `PlayerSurface`'s rect-measurement effect (`src/ui/PlayerSurface.tsx`) to also re-measure
  on scroll, not just resize — using `window.addEventListener('scroll', ..., { capture:
  true })`, since scroll events don't bubble but do fire during the capture phase on
  ancestors including `window`, which is what lets one listener there catch `.player-view`
  scrolling without needing a direct reference to it. Re-measuring is throttled to one
  `requestAnimationFrame` per scroll tick rather than running synchronously on every
  event, to keep it cheap. Checked via `npm run typecheck && npm run lint && npm test`
  (200/200) and `npm run build`; **not run live** — needs the owner's own hands-on
  validation (scroll the full-view player and confirm the video now scrolls smoothly with
  the rest of the page, in both directions and at different scroll speeds) before this
  can move to Resolved.
  **Eighth round, same day** (plus a product-owner-requested adjustment, not a bug: the
  miniplayer's max resizable width was raised from 640px to 1024px, `MINIPLAYER_MAX_WIDTH`
  in `src/ipc/contract.ts`, with the settings-store test's out-of-range case moved from
  1000 to 2000 and a new in-range boundary check added at exactly 1024): the sixth round's
  extract-window default-speed fix still wasn't working live — the extracted window kept
  opening at 1x regardless of the configured setting. The wiring from Settings through to
  `ExtractedPlayerWindow` was correct (confirmed by re-reading every layer), but the
  reissue mechanism protecting against YouTube resetting the rate on playback start relied
  on the same event this whole feature already found unreliable once before: the fifth
  round's fix reissued `setPlaybackRate` on the iframe's `onStateChange(playing)` message —
  but the third round of this same bug already established that the *autoplay-initiated*
  `onStateChange` isn't reliably observed at all (it's exactly why `isStillGoing()` had to
  stop trusting a strict state check, and exactly why the fifth round's extract-autoplay
  fix had the same root cause). The rate reissue had never been given the same treatment.
  Fixed by reissuing on every `infoDelivery` message instead — a steady heartbeat that
  fires once the widget is genuinely up, independent of which `onStateChange` events
  happened to land — for the first 3 seconds after the iframe loads (wall-clock time, not
  video position, since most extractions hand off mid-video rather than starting near
  0:00). Checked via `npm run typecheck && npm run lint && npm test` (200/200) and `npm
  run build`; **not run live** — needs the owner's own hands-on validation (extract a
  video with a non-1x default rate configured, confirm it's actually applied within the
  first couple of seconds) before this can move to Resolved.
  **Owner confirmation (2026-07-15):** live-tested everything from all eight rounds —
  automatic docking, resize handle, extract, extract-window autoplay, extract-window
  default speed, full-view scroll — and confirmed it all works. Moving to Resolved.
- **Resolved:** 2026-07-15 · **Commit:** (pending) · **Outcome:** Fixed
- **Resolution:** see the eight in-progress rounds above for the full history; no
  further changes made at resolution time.

### B-093 — Player shows YouTube's "Sign in to confirm you're not a bot"; no in-app way to authenticate the embed
- **Type:** adjustment (feasibility unclear)
- **Status:** In progress · **Reported:** 2026-07-15 · **Target:** 0.2.0
- **Area:** player / auth
- **What happens:** the embedded IFrame player started showing YouTube's bot-check
  ("Sign in to confirm you're not a bot… Sign in") on some videos; the in-player Sign
  in link does nothing. Manual workaround the owner found: click the YouTube icon in
  the player corner (opens the video's YouTube page in an Electron window), sign in
  there, close it — the embed then starts working again, and stays working.
- **Expected:** a friendlier explicit "Sign in to YouTube" action, discoverable in
  Settings rather than an accidentally-found corner-icon click.
- **Code refs:** `src/platform/main.ts` (`createWindow`, `IpcChannel.openYouTubeSignIn`);
  `src/ui/SettingsView.tsx` (Connection section).
- **Notes: D-045, implementing option (b) from this entry's original two ideas, not
  (a).** The corner-icon workaround already showed that a *shared* session between the
  popup and the iframe is sufficient once actually signed into — the iframe is a plain
  `<iframe>`, which always inherits its embedding page's session, and neither the main
  window nor that popup ever specified a custom partition, so they were already
  sharing Electron's unnamed default session. The actual gap was never session
  isolation needing a bridge (option a, cookie injection between two separate
  sessions) — it was that nothing *deliberately triggers* signing into that session,
  so the owner had to stumble onto the corner-icon click. Settings → Connection gained
  a plain "Sign in to YouTube" button that opens a window at youtube.com in that same
  default session — no automation, no cookie extraction, the user signs in themselves
  exactly like the workaround already did. **First attempt (same day) named that
  session explicitly** (`persist:chronicle`) instead of leaving it as the default —
  the owner's live test showed this broke every thumbnail in the app: `thumb://`'s
  `protocol.handle()` registers on `session.defaultSession` specifically, and a custom
  partition is a different session with no handler on it at all. Reverted to the
  default session everywhere (main window, sign-in window, extractor window — see
  [[B-045]]) in the same fix pass; no functional loss, since the default session was
  already what everything here implicitly shared before this entry touched any of it.
  Checked via `npm run typecheck && npm run lint && npm test`; **not run live this
  round either** (per [[no-live-app-verification]]) — the owner's own plan is to
  validate by opening that window, confirming it looks authenticated, then checking
  the player itself, and separately confirming thumbnails are back. Staying
  "In progress" (not Resolved) until that live check confirms both, matching how
  [[B-022]] is tracked in this file.
  **Owner confirmation (2026-07-15):** live-tested — the "Sign in to YouTube" button
  opens an authenticated window and the player works again; incidentally validated
  more strongly than planned, since the owner's YouTube Premium account unlocked the
  3x playback-speed option (previously unselectable, unsigned-in) once signed in.
  Thumbnails also confirmed unaffected. The owner notes this may not be the *ideal*
  sign-in experience long-term, but it's good enough for now — no further design
  changes requested. Moving to Resolved.
- **Resolved:** 2026-07-15 · **Commit:** (pending) · **Outcome:** Fixed
- **Resolution:** see the notes above for the full history (D-045, option (b)); no
  further changes made at resolution time.

### B-046 — Thumbnail hover preview (video scrub preview)
- **Type:** adjustment (feasibility unclear)
- **Status:** Won't fix · **Reported:** 2026-07-12 · **Target:** 0.2.0
- **Area:** feed / player
- **What happens:** the owner would like hovering a thumbnail in the feed to preview the
  video (like youtube.com's hover-scrub).
- **Expected:** was flagged as needing a research spike before scoping.
- **Code refs:** `.specs/youtube-api.md` (§Terms-of-service constraints).
- **Resolution:** research spike concluded **not feasible within Chronicle's own rules**,
  not just technically hard. YouTube's site-side hover preview is served by storyboard
  sprite sheets / short muted clips through endpoints that were never part of the public
  Data API — they're Innertube/internal-only. `youtube-api.md` §Terms-of-service
  constraints already states, as a permanent project rule: "Use documented, official
  endpoints... No scraping of youtube.com internals, no Innertube private API, no cookie
  extraction." Powering this feature would require exactly what that rule bans. The
  fallback idea (a second, muted IFrame player instance per hovered thumbnail) was
  already flagged in the original report as likely too heavy for a virtualized feed, and
  doesn't sidestep the rule anyway since seeking a hidden player still needs metadata the
  Data API doesn't expose per-timestamp. No code changes; the ask itself was always fine
  by the "who is driving?" test (a user-initiated hover, not algorithmic) — only the data
  source was ever in question, and it's now settled as unavailable.
- **Resolved:** 2026-07-15 · **Commit:** (pending) · **Outcome:** Won't fix

### B-089 — Fullscreen (F) and Space behave differently depending on whether the iframe or the app has focus
- **Type:** bug · **Severity:** minor (root cause unconfirmed — may be a YouTube embed
  quirk)
- **Status:** Fixed · **Reported:** 2026-07-15 · **Target:** 0.2.0
- **Area:** player
- **What happens:** pressing `F` while focus is inside the iframe goes fullscreen but
  the player's own controls disappear; pressing `F` while focus is on the app
  (Chronicle's own keydown handler) goes fullscreen correctly, controls intact.
  Similarly, Space while focus is in the iframe toggles play/pause reliably every
  press; Space while focus is on the app works once, then stops responding to further
  presses.
- **Expected:** consistent behavior regardless of where focus happens to be.
- **Code refs:** `src/ui/PlayerView.tsx` (app-focused keydown map).
- **Resolution:** the Space half was a real bug, confirmed and fixed: `playerStateRef`
  only updates once the iframe posts back its own `onStateChange`, a round trip not
  guaranteed to land before the next keypress — a rapid second press read the still-
  stale pre-command state and reissued the same command as a no-op. Now updates the
  ref optimistically the instant the command is sent; the real `onStateChange` event
  still arrives and reconciles it either way. The fullscreen half is **not** a
  Chronicle bug: pressing a key while focus is genuinely inside the cross-origin
  YouTube iframe never reaches the parent frame's keydown listener at all (a browser
  same-origin security boundary), so that keypress is handled entirely by YouTube's
  own embedded player — which can behave differently — with no way for Chronicle's JS
  to intercept or override it short of disabling the iframe's own legitimate
  focus/interaction (its native controls, seek bar, volume), which would be a worse
  regression. Documented as an accepted platform limitation in `playback.md`. No
  live-app check this session (per [[no-live-app-verification]]); verified via
  `npm run typecheck && npm run lint && npm test` (199/199).
- **Resolved:** 2026-07-15 · **Commit:** (pending) · **Outcome:** Fixed

### B-051 — Some subscribed channels show up with zero videos
- **Type:** bug · **Severity:** major
- **Status:** Fixed · **Reported:** 2026-07-12 · **Target:** 0.2.0
- **Area:** sync
- **What happens:** the owner reported several subscribed channels appearing with no
  videos at all; a fresh report on 2026-07-15 narrowed it to a specific mechanism (a
  sync that reported failures, followed by a clean-looking resync that still never
  caught up the missed videos — only a full wipe + reconnect recovered them).
- **Expected:** a resync must be able to catch up any video from any subscribed
  channel that was never actually captured, regardless of why it was missed last time
  — not require a full data wipe to recover.
- **Code refs:** `src/core/sync-service.ts` (`discoverChannel` — `possibleGap`).
- **Resolution:** hypothesis 6 confirmed as the root cause: gap-backfill's trigger
  (`possibleGap`) only paged the uploads playlist when **every** entry in the current
  RSS window was new (`newIds.length === ids.length`). A window that's a *mix* of
  known and new entries could still hide a real gap — RSS only ever returns the ~15
  most recent entries, so a video missed on a day the sync failed (nothing gets
  inserted or marked known that day) silently falls out of every future window the
  moment enough newer videos push it out, regardless of whether *that* cycle's window
  happens to still contain some unrelated already-known entry too. Changed the
  trigger to `newIds.length > 0` — any newly discovered video is reason enough to
  check. `backfillGap` itself already checks the real DB-wide known set per page (not
  just the current window), so in the common gap-free case it stops at the very first
  overlapping page — one extra bounded `playlistItems.list` call, not a deep walk.
  `youtube-api.md` and `feed.md` §Backfill rules updated with the revised quota
  reasoning. Also closes the other five hypotheses' worth of triage this entry
  accumulated: none of them were ruled out, but hypothesis 6 was the one with a fresh,
  dated, confirmed report behind it. Covered by two new `sync-service.test.ts` cases
  (mixed-window gap-backfill, and no-op when nothing new was discovered). No live-app
  check this session (needs the owner's actual account per
  [[no-live-app-verification]]); verified via `npm run typecheck && npm run lint &&
  npm test` (199/199).
- **Resolved:** 2026-07-15 · **Commit:** (pending) · **Outcome:** Fixed

### B-097 — Sync failure banner gives no way to see what actually went wrong
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-15 · **Target:** 0.2.0
- **Area:** sync / ui-shell
- **What happens:** when a refresh reports failed channels, the banner just showed a
  count with no way to find out which channels, or why.
- **Expected:** an info affordance on the banner opens per-channel error detail.
- **Code refs:** `src/core/sync-service.ts` (`SyncReport`); `src/ipc/contract.ts`
  (`SyncReportDto`); `src/ui/App.tsx` (banner).
- **Resolution:** `SyncReport`/`SyncReportDto` gained `failures:
  { channelId, channelTitle, message }[]` (`channelId`/`channelTitle` null for
  account-level failures — the subscription re-list, or a hydration batch spanning
  more than one channel). Populated at every existing `channelsFailed += 1` site in
  `sync-service.ts`'s `refresh`, including the per-channel `discoverChannel` failures
  (now attributed by zipping the `mapPool` results back to their source channels).
  Multi-account's `mergeReports` (`main.ts`) concatenates failures across accounts.
  `App.tsx`'s partial-refresh banner gained a "Details" toggle (new shared `BannerBar`
  component, used by both the main and Settings-screen banner render sites) that
  discloses the list on demand rather than cluttering the one-line count. Directly
  closes the per-channel-error-detail gap [[B-051]] hypothesis 5 and this entry's own
  notes both pointed at. New `sync-service.test.ts` case asserts a per-channel failure
  is attributed correctly. No live-app check this session (per
  [[no-live-app-verification]]); verified via `npm run typecheck && npm run lint &&
  npm test` (199/199).
- **Resolved:** 2026-07-15 · **Commit:** (pending) · **Outcome:** Fixed

### B-096 — Clicking a channel name in the feed should open the channel, not the video
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-15 · **Target:** 0.2.0
- **Area:** feed
- **What happens:** every part of a feed row/card — including the channel name text —
  opened the video.
- **Expected:** clicking the channel name specifically navigates to that channel.
- **Code refs:** `src/ui/FeedList.tsx` (`VideoRow`/`VideoCard`).
- **Resolution:** `FeedVideoDto` gained a `channelId` field (the data was already
  available server-side — `entry.video.channelId` — just never surfaced in the read
  model). The channel name in both `VideoRow` and `VideoCard` is now its own
  `.channel-link` span with a `stop()`-wrapped click handler, matching the pattern
  already used for the row's action buttons. `App.tsx` gained a shared
  `navigateToChannel` callback (extracted from what `PlayerView`'s existing
  "click the channel name" handler already did) used by both the feed and the player.
  No live-app check this session (per [[no-live-app-verification]]); verified via
  `npm run typecheck && npm run lint && npm test` (199/199).
- **Resolved:** 2026-07-15 · **Commit:** (pending) · **Outcome:** Fixed

### B-095 — Grid view: smallest item sizes overlap; add a size larger than xl
- **Type:** bug · **Severity:** minor
- **Status:** Fixed · **Reported:** 2026-07-15 · **Target:** 0.2.0
- **Area:** ui-shell
- **What happens:** at grid + `xs`/`small` item sizes, cards overlapped each other and
  their badges/action-bar collided on top of the tiny thumbnail.
- **Expected:** no overlap at any grid size; a size ceiling above the old `xl`.
- **Code refs:** `src/ui/FeedList.tsx` (`GRID_CARD_SIZES`); `src/ui/styles.css`.
- **Resolution:** the actual rendered card height (thumbnail + padding + gap + two-line
  title + meta line) at `xs`/`small` was taller than `GRID_CARD_SIZES`' `height`
  estimate — since the virtualizer never re-measures individual cards
  (`useVirtualizer` with no `measureElement`), an underestimate meant consecutive
  virtualized rows overlapped. Recomputed the height budgets with a generous margin
  (`xs` 108→144, `small` 150→176, `medium` 210→214) and scaled the badges/duration/
  action-bar down (smaller font/padding, tighter corner offsets) at `xs`/`small` only,
  where the thumbnail itself is barely taller than the full-size versions of those
  elements. Added a sixth `xxl` item-size step (`ItemSize`/`ITEM_SIZES`/
  `GRID_CARD_SIZES`/`ROW_HEIGHTS`), threaded through `SettingsDto`/`AppSettings` and
  their validation. No live-app check this session — this is inherently hard to get
  pixel-perfect without seeing it rendered, so the fix leans generous on the height
  margins rather than exact (per [[no-live-app-verification]]); verified via
  `npm run typecheck && npm run lint && npm test` (199/199).
- **Resolved:** 2026-07-15 · **Commit:** (pending) · **Outcome:** Fixed

### B-094 — "Reconnect Google Account" in Settings doesn't say which account
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-15 · **Target:** 0.2.0
- **Area:** auth / ui-shell
- **What happens:** Settings → Connection's "Reconnect Google Account" action gave no
  indication of which account it reconnects, now that multiple accounts exist (D-041).
- **Expected:** the label makes it unambiguous which account is being reconnected.
- **Code refs:** `src/ui/SettingsView.tsx` (Connection section, Reconnect action).
- **Resolution:** copy-only, confirming D-041(a) is being followed correctly (Settings'
  Reconnect only ever touches the primary account). The button now reads `Reconnect
  "{account}"`, naming the primary account's label (`accounts.find(a => a.isPrimary)`,
  already available in `App.tsx`'s `accounts` state). No live-app check this session
  (per [[no-live-app-verification]]); verified via `npm run typecheck && npm run lint
  && npm test` (199/199).
- **Resolved:** 2026-07-15 · **Commit:** (pending) · **Outcome:** Fixed

### B-092 — Video description doesn't always come through complete
- **Type:** bug · **Severity:** minor
- **Status:** Fixed · **Reported:** 2026-07-15 · **Target:** 0.2.0
- **Area:** sync / player
- **What happens:** the description shown in the player was sometimes not the full
  text.
- **Expected:** the full `videos.list` description, not a truncated one.
- **Code refs:** `src/platform/main.ts` (`getVideo` handler); `src/adapters/storage/
  sync-repository.ts` (`DESCRIPTION_LIMIT = 500`, `truncate`).
- **Resolution:** root cause was simpler than the original hypotheses (RSS-vs-API
  description mismatch, hydration timing): storage has *always* capped descriptions at
  500 chars for every video ever synced (`local-data.md` documents this as intentional
  — "truncated (first ~500 chars) — full text on demand"), and `getVideo`'s local-video
  branch was serving that stored (truncated) copy straight to the player with no
  "on demand" fetch ever actually implemented, despite the code comment promising one.
  Now re-fetches the full description via `apiClient.hydrate([id])` (`videos.list`,
  1 unit) whenever a known video is opened, falling back to the stored copy on any
  failure (offline, quota) rather than blocking playback — same trivial per-open cost
  precedent as `getRating`. `youtube-api.md` documents the new call's quota cost. No
  live-app check this session (per [[no-live-app-verification]]); verified via
  `npm run typecheck && npm run lint && npm test` (199/199).
- **Resolved:** 2026-07-15 · **Commit:** (pending) · **Outcome:** Fixed

### B-090 — Onboarding: "go to app" button stays locked after first sync finishes; the wait shouldn't be required at all
- **Type:** bug · **Severity:** major
- **Status:** Fixed · **Reported:** 2026-07-15 · **Target:** 0.2.0
- **Area:** onboarding
- **What happens:** the first-sync wizard step's "open feed" button could stay disabled
  even after sync had actually finished.
- **Expected:** the owner's stronger ask, taken as the fix: the waiting step shouldn't
  exist at all — connecting should go straight to the app, sync running in background.
- **Code refs:** `src/ui/onboarding/Wizard.tsx` (`FirstSyncStep`, `STEP_SEQUENCE`).
- **Resolution: D-044 (new decision).** Removed the wizard's `first-sync` step
  entirely rather than fixing the stuck-button mechanism — `connectGoogle` (`main.ts`)
  already auto-triggers a background sync the instant the connection succeeds (the
  same path every later refresh uses), so the wizard step was a second, redundant
  trigger for the same sync, gated on an event stream a not-yet-mounted step could
  easily miss entirely (the actual root cause the stuck button traced back to).
  `ConnectStep`'s success now calls `onDone` directly, finishing the wizard and landing
  on the feed screen with sync continuing in the background. `onboarding.md` Step 8
  and `decisions.md` updated (D-044); this is a Pending-decision-style product call
  exercised with the owner's own stated preference rather than a mere recommendation,
  flagged here per project convention. No live-app check this session (per
  [[no-live-app-verification]]); verified via `npm run typecheck && npm run lint &&
  npm test` (199/199).
- **Resolved:** 2026-07-15 · **Commit:** (pending) · **Outcome:** Fixed

### B-091 — First sync: rename "Filtering Shorts" to "Identifying Shorts"; show discovered videos before Shorts identification finishes
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-15 · **Target:** 0.2.0
- **Area:** sync / onboarding
- **What happens:** (1) sync status copy said "Filtering Shorts" though Shorts are
  shown, not filtered (D-035); (2) the feed stayed blank until the whole sync,
  including the slow Shorts-identification phase, finished.
- **Expected:** (1) "Identifying Shorts" copy; (2) the feed renders as soon as videos
  are hydrated, independent of Shorts-identification finishing.
- **Code refs:** `src/ui/App.tsx` (`refresh:progress` handler); `src/ui/i18n/en.ts`
  (`app.status.filteringShorts`).
- **Resolution:** part (1) — despite an earlier note claiming this copy change was
  already done, `app.status.filteringShorts` still read "filtering Shorts" in the
  actual code; fixed to "identifying Shorts". Part (2) — videos are already hydrated
  and persisted well before the Shorts phase starts (it's a separate pass over rows
  already in the DB), so a feed that's still empty when that phase begins no longer
  waits for the full `refresh:done` event: a new `feedEmptyRef`/
  `emptyFeedLoadTriggeredRef` pair triggers one `loadView()`/`loadChannels()` the
  moment the channels→shorts phase transition is observed with nothing on screen yet.
  Scoped to the empty-feed case specifically (not every refresh with new videos) to
  avoid a misleading "new videos" signal on a cycle that's just retrying old
  unconfirmed Shorts candidates with nothing actually new. `feed.md`/`youtube-api.md`
  references to the now-removed onboarding "step 8" updated alongside [[B-090]]. No
  live-app check this session (per [[no-live-app-verification]]); verified via
  `npm run typecheck && npm run lint && npm test` (199/199).
- **Resolved:** 2026-07-15 · **Commit:** (pending) · **Outcome:** Fixed

### B-088 — Submitting a search from inside the player doesn't leave the video
- **Type:** bug · **Severity:** major
- **Status:** Fixed · **Reported:** 2026-07-15 · **Target:** 0.2.0
- **Area:** player / ui-shell
- **What happens:** running an actual search while a video played updated search
  state but the player view stayed on screen.
- **Expected:** submitting a search while playing takes the user to search results.
- **Code refs:** `src/ui/App.tsx` (`runSearch`).
- **Resolution:** fixed together with [[B-087]] — the two were opposite sides of the
  same navigation-vs-focus gap. `runSearch` now clears `playerStack` itself whenever
  it actually runs a non-empty query, regardless of which entry point (the topbar
  Enter handler, or anywhere else) triggered it — submitting a search is a real
  navigation, on par with any other. No live-app check this session (per
  [[no-live-app-verification]]); verified via `npm run typecheck && npm run lint &&
  npm test` (199/199).
- **Resolved:** 2026-07-15 · **Commit:** (pending) · **Outcome:** Fixed

### B-087 — Pressing "/" inside a video exits playback immediately, before any search happens
- **Type:** bug · **Severity:** minor
- **Status:** Fixed · **Reported:** 2026-07-15 · **Target:** 0.2.0
- **Area:** player
- **What happens:** pressing `/` while playing immediately cleared the player stack
  and returned to the feed, before the user had typed or submitted anything.
- **Expected:** `/` should just focus the search field and keep playback running;
  only submitting a search should leave the video.
- **Code refs:** `src/ui/PlayerView.tsx` (`case '/'`); `src/ui/App.tsx`
  (`exitPlayerToSearch`).
- **Resolution:** `exitPlayerToSearch` (which cleared the player stack *and* focused
  the field) was renamed to `focusSearch` and now only focuses the field — the topbar
  filter stays visible above the player at all times (the topbar itself never hides
  while a video is open), so focusing it doesn't require leaving anything. Leaving the
  player is now solely [[B-088]]'s job, triggered only by actually submitting a query.
  `PlayerView`'s `onSearch` prop renamed to `onFocusSearch` to match the new,
  narrower contract. No live-app check this session (per
  [[no-live-app-verification]]); verified via `npm run typecheck && npm run lint &&
  npm test` (199/199).
- **Resolved:** 2026-07-15 · **Commit:** (pending) · **Outcome:** Fixed

### B-085 — Upcoming videos never transition to "live"; premiere behavior unverified
- **Type:** bug · **Severity:** major
- **Status:** Fixed · **Reported:** 2026-07-15 · **Target:** 0.2.0
- **Area:** sync
- **What happens:** a video that was `upcoming` at hydration stayed `upcoming`
  forever, even long after the broadcast actually went live.
- **Expected:** an `upcoming` video should flip to `live` once the broadcast starts.
- **Code refs:** `src/core/sync-service.ts` (`refresh`); `src/core/ports.ts`
  (`SyncRepository`).
- **Resolution:** took the owner's proposed fix directly. New `SyncRepository.
  upcomingVideoIds(channelId?)` (SQLite: `SELECT video_id FROM videos WHERE
  live_content = 'upcoming'`, scoped like `shortCandidates`); new
  `SyncService.refreshUpcomingLiveStatus` re-hydrates just those (bounded by however
  many are actually flagged upcoming) every refresh cycle, tolerant of failure the
  same way `confirmShorts` is (a video left at `upcoming` just retries next cycle).
  `applyHydration` already unconditionally overwrites `live_content` on conflict, so
  no separate write path was needed. Premiere behavior remains unverified (no reported
  case to test against) — left as a documented open question, not addressed by this
  fix. Covered by new `sync-service.test.ts` and `sync-repository.test.ts` cases. No
  live-app check this session (per [[no-live-app-verification]]); verified via
  `npm run typecheck && npm run lint && npm test` (199/199).
- **Resolved:** 2026-07-15 · **Commit:** (pending) · **Outcome:** Fixed

### B-098 — Can't type space or "f" (or several other letters) into the comment box — player shortcuts eat the keystroke
- **Type:** bug · **Severity:** major
- **Status:** Fixed · **Reported:** 2026-07-15 · **Target:** 0.2.0
- **Area:** player
- **What happens:** typing in the comment/reply/edit textarea while a video is open —
  Space and `f` (and by the same mechanism: ArrowLeft/ArrowRight, `b`, `/`, Escape)
  never reached the textarea. They were instead intercepted as player shortcuts
  (play/pause, fullscreen, seek, open in browser, search, close), so a normal sentence
  was basically untypeable.
- **Expected:** the player's global keyboard shortcuts should not fire while focus is
  inside a comment/reply text field — same as they already don't fire while focus is
  in the search/filter `<input>`.
- **Code refs:** `src/ui/PlayerView.tsx` (the shortcut `onKeyDown` guard); `src/ui/Comments.tsx`
  (comment/reply/edit boxes are all `<textarea>` elements, which the guard didn't cover).
- **Resolution:** the guard was `if (event.target instanceof HTMLInputElement) return`
  — it only exempted `<input>` elements, not `<textarea>`. Now also exempts
  `HTMLTextAreaElement`. Comments only render inside `PlayerView`, so no other screen's
  shortcut handler was affected.
- **Resolved:** 2026-07-15 · **Commit:** (pending) · **Outcome:** Fixed

### B-084 — Player shows YouTube Error 153 in the packaged AppImage (works fine under `npm run dev`)
- **Type:** bug · **Severity:** blocker
- **Status:** Fixed · **Reported:** 2026-07-13
- **Area:** player
- **What happens:** every video fails to load in the packaged build with YouTube's own
  "Error 153 — Video player configuration error" overlay, while the identical code
  works under `npm run dev`.
- **Expected:** the embedded player works the same in a packaged build as it does from
  source.
- **Code refs:** `src/platform/main.ts` (`createWindow` picked `loadFile()` for any
  packaged build, `loadURL()` only in dev); `src/ui/PlayerView.tsx` (`enablejsapi=1`
  embed — playback.md, D-006).
- **Resolved:** 2026-07-13 · **Commit:** (pending) · **Outcome:** Fixed
- **Resolution:** root cause: the embedded YouTube player's postMessage widget
  protocol (`enablejsapi=1`) needs the top frame to have a real, stable origin to
  validate — `file://` (what `loadFile()` gives a packaged build) has no such origin,
  which YouTube surfaces as Error 153. Dev mode never hit this because electron-vite
  serves the renderer from its own `http://localhost` dev server. New
  `src/platform/renderer-server.ts`: a minimal loopback-only (`127.0.0.1`, OS-assigned
  port) static file server, hand-rolled on `node:http`/`node:fs` (no new dependency,
  consistent with the project's dependency-frugal stance) that serves the built
  `out/renderer` directory. Packaged builds now `loadURL('http://127.0.0.1:<port>/index.html')`
  instead of `loadFile()` — same kind of origin dev mode already had. Started once at
  app boot, awaited before the first window is created; closed on `will-quit`.

### B-083 — Comments pagination was a "Load more" click instead of auto-pagination
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-13
- **Area:** player
- **What happens:** same inconsistency as [[B-075]] — the comments list's pagination
  used a clickable "Load more comments" link instead of loading automatically on scroll
  like the main feed and (now) search results.
- **Expected:** scrolling near the end of the loaded comments triggers the next page
  automatically; a plain non-interactive "Loading more comments…" line while a page is
  in flight.
- **Code refs:** `src/ui/Comments.tsx` (new sentinel `div` + `IntersectionObserver`
  effect calling `loadMore`, which is now a `useCallback` so the effect can depend on
  it cleanly; dropped the `comments-load-more` button/CSS class and the now-unused
  `comments.loadMore` string). Different mechanism from [[B-075]]'s `onScroll` handler
  because the comments list isn't its own scroll container — it flows inside the
  player's page-level scroll (`.player-view`), so there's no single element's
  `scrollTop` to check; a sentinel element crossing into view works regardless of which
  ancestor actually scrolls.
- **Resolved:** 2026-07-13 · **Commit:** (pending) · **Outcome:** Fixed

### B-082 — No way to favorite a channel from its own screen
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-13
- **Area:** ui-shell
- **What happens:** the channel-level priority marker ([[B-042]]) was only reachable from
  the sidebar's right-click context menu — no way to favorite/unfavorite while actually
  on that channel's own screen.
- **Expected:** a favorite toggle in the channel header, next to Unsubscribe, for
  subscribed channels.
- **Code refs:** `src/ui/ChannelHeader.tsx` (new `onToggleFavorite` prop, a
  `favorite-channel-btn` rendered only when `subscribed`, mirroring the sidebar's ★/☆
  convention); `src/ui/App.tsx` (wires the existing `toggleChannelFavorite` callback);
  `src/ui/styles.css` (`.favorite-channel-btn`, plus the banner-mode override list).
- **Notes:** not shown for a not-yet-subscribed channel-preview screen ([[B-055]]/
  [[B-061]]) — favoriting is meaningless before you're actually subscribed. No live-app
  check this session (per [[no-live-app-verification]]); verified via
  `npm run typecheck && npm run lint && npm test` (179/179).
- **Resolved:** 2026-07-13 · **Commit:** (pending) · **Outcome:** Fixed

### B-081 — Reading comments 403s with no explanation; unsubscribe still opens the browser with no warning dialog
- **Type:** bug
- **Status:** Fixed · **Reported:** 2026-07-13
- **Area:** auth / player
- **What happens:** two related reports from live use. (1) Clicking "Show comments"
  reliably 403'd — the owner confirmed by direct testing that granting the write scope
  via Like (which does show the explanatory dialog) is what makes comment-reading start
  working afterward: the same scope is actually required for both, contradicting the
  assumption recorded in [[B-006]]/D-032 that `commentThreads.list` needs only the
  readonly scope granted at initial connect. (2) Unsubscribe still opens the system
  browser straight to Google's consent screen with no in-app warning first — the exact
  gap [[B-067]] left open (its notes: converting unsubscribe needed the dialog flow to
  know *which* account's consent was pending, which the shared `write-scope-required`
  error shape has no room for).
- **Expected:** any action needing a not-yet-granted permission shows the explanatory
  in-app dialog first, with zero exceptions — this is a core interaction pattern, not a
  per-feature choice.
- **Code refs:** `src/platform/main.ts` (`getComments` now returns `write-scope-required`
  proactively, same as `rateVideo`; new `requestWriteScopeForChannel` IPC resolving the
  owning account via the existing `resolveOwningAccountId`; `unsubscribeChannel` now
  returns `write-scope-required` instead of calling `stack.authFlow.requestWriteScope()`
  inline); `src/ui/useWriteScopeGate.tsx` (`run()` gained an optional second
  `requestScope` argument, defaulting to the primary-account `requestWriteScope`);
  `src/ui/App.tsx` (`unsubscribeChannel` now wraps the call in `writeScopeGate.run(...,
  () => window.chronicle.requestWriteScopeForChannel(channelId))`); `src/ui/Comments.tsx`
  (`load`/`loadMore` wrapped in `writeScopeGate.run`).
- **Notes:**
  - Closes [[B-067]]'s "known gap, not addressed" note on unsubscribe — see that entry's
    amendment.
  - The comment-reading scope requirement contradicts Google's own published docs (which
    say `commentThreads.list` is readonly-safe) — trusting the owner's direct empirical
    test over the docs here, since the observed behavior (403 until a write-scope grant,
    then it works) is unambiguous from actual use. `youtube-api.md`/D-032 updated to
    record this as the actual observed requirement, flagged as contradicting the
    documented API behavior in case it's project-specific (e.g. OAuth consent screen
    configuration) rather than universal.
  - No live-app check this session (the actual consent/browser flow and the real
    comments 403 both need a live account per [[no-live-app-verification]]); verified via
    `npm run typecheck && npm run lint && npm test` (179/179 — this is UI/IPC wiring, no
    new domain logic to unit test). Owner should validate live: comments now show the
    dialog and load successfully after granting; unsubscribe shows the dialog instead of
    jumping straight to the browser.
- **Resolved:** 2026-07-13 · **Commit:** 7bfedf2 · **Outcome:** Fixed
- **Amended 2026-07-13 (commit 7132f2b):** missed a second unsubscribe call site —
  `PlayerView.tsx`'s own subscribe/unsubscribe toggle ([[B-061]]'s player half) called
  `unsubscribeChannel` directly, unwrapped, so once the IPC started returning
  `write-scope-required` proactively instead of silently opening the browser, this call
  site just showed the raw error with no dialog and no way to actually grant the scope
  and complete the unsubscribe. Wrapped it in `writeScopeGate.run(...,
  requestWriteScopeForChannel)`, same as `App.tsx`'s call site.

### B-080 — Channel header stays visible over search results and the player screen
- **Type:** bug · **Severity:** minor
- **Status:** Fixed · **Reported:** 2026-07-13
- **Area:** ui-shell
- **What happens:** `ChannelHeader` rendered whenever `channelFilter !== null`, with no
  regard for whether a search was active or the player was open — so opening search or a
  video while on a channel screen left the old channel's header strip visible above the
  search results / video player instead of being replaced by them.
- **Expected:** the channel header only shows while actually viewing that channel's own
  screen — hidden during search and while the player is open.
- **Code refs:** `src/ui/App.tsx` (the `channelFilter !== null && (...)` header block).
- **Notes:** gated the header's render on `!playerOpen && searchResults === null` in
  addition to the existing `channelFilter !== null` check. No live-app check this session
  (per [[no-live-app-verification]]); verified via `npm run typecheck && npm run lint &&
  npm test`.
- **Resolved:** 2026-07-13 · **Commit:** d6cf58e · **Outcome:** Fixed

### B-079 — Search placeholder text is unnecessarily verbose
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-13
- **Area:** ui-shell
- **What happens:** the search field's placeholder read "Search all of YouTube — Enter to
  search," longer than it needs to be for a control the user already knows how to use.
- **Expected:** just "Search."
- **Code refs:** `src/ui/i18n/en.ts` (`app.topbar.searchYouTubePlaceholder`).
- **Resolved:** 2026-07-13 · **Commit:** d6cf58e · **Outcome:** Fixed

### B-078 — Search doesn't close when navigating via the sidebar to a view/channel/account already selected
- **Type:** bug · **Severity:** minor
- **Status:** Fixed · **Reported:** 2026-07-13
- **Area:** ui-shell / search
- **What happens:** search results were cleared by a `useEffect` keyed on
  `[view, channelFilter, accountFilter]` — but clicking a sidebar item that happened to
  already match the current value (e.g. re-clicking the channel you were already
  filtered to before you searched) sets the same primitive value, so the effect never
  re-fires and the stale search results stayed on screen. The owner had to explicitly
  clear the search field (✕) before a sidebar click would take effect.
- **Expected:** any explicit navigation (a view, channel, account, or Settings click)
  always leaves search, regardless of whether the destination state happens to be
  unchanged — entering search is itself a navigation away from wherever you were.
- **Code refs:** `src/ui/App.tsx` (new `closeSearch()`, called explicitly from
  `onSelectView`/`onSelectChannel`/`onSelectAccount` (`selectAccount`)/`onOpenSettings`,
  in addition to — not instead of — the existing effect).
- **Resolved:** 2026-07-13 · **Commit:** d6cf58e · **Outcome:** Fixed

### B-077 — Search channel result's grid card looks broken: content hugs the top, Subscribe button not centered
- **Type:** bug · **Severity:** minor
- **Status:** Fixed · **Reported:** 2026-07-13
- **Area:** ui-shell / search
- **What happens:** `.search-result-channel-card` set `align-items: center` but no
  `justify-content`, so with `flex-direction: column` its content packed against the top
  of the card whenever the grid row stretched it taller than its own content (e.g. next
  to a taller video card). Separately, `button.primary`'s global `align-self: flex-start`
  overrode the card's horizontal centering for the Subscribe/Subscribed button.
- **Expected:** avatar/title/subscriber-count/button vertically centered in the card,
  button horizontally centered too.
- **Code refs:** `src/ui/styles.css` (`.search-result-channel-card`, new
  `.search-result-channel-card .primary { align-self: center }`).
- **Resolved:** 2026-07-13 · **Commit:** d6cf58e · **Outcome:** Fixed

### B-076 — Item-size slider and grid/list toggle don't respect what screen they're on
- **Type:** bug · **Severity:** minor
- **Status:** Fixed · **Reported:** 2026-07-13
- **Area:** ui-shell
- **What happens:** two separate contextual mismatches: (1) the grid/list toggle was
  deliberately hidden during search ([[B-055]]) — but that reads as "I can't change
  layout while searching," which the owner explicitly didn't want; (2) both the toggle
  and the item-size slider stayed visible (and functionally inert, having no grid/list
  concept) while the player was open, since the topbar renders unconditionally regardless
  of `playerOpen`.
- **Expected:** the toggle stays available during search (search results already honor
  grid/list, per [[B-055]]) and both controls hide while a video is playing, where
  neither has anything to control.
- **Code refs:** `src/ui/App.tsx` (topbar's `.size-slider`/`.layout-toggle`, now gated on
  `!playerOpen` instead of `searchResults === null`).
- **Resolved:** 2026-07-13 · **Commit:** d6cf58e · **Outcome:** Fixed

### B-075 — Search/channel-preview pagination is a "Load more" link instead of auto-pagination, and isn't centered
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-13
- **Area:** ui-shell / search
- **What happens:** [[B-055]]'s search-result pagination (and the channel-preview video
  list it shares its markup with) used a clickable "Load more results" link/button —
  inconsistent with the rest of the app, where every other paginated list (the main feed,
  a channel's archive) auto-loads as you scroll near the bottom, no click required.
- **Expected:** scrolling near the bottom of the list triggers the next page
  automatically, the same as everywhere else; a plain centered "Loading more…" line
  (no click target) shows while a page is in flight, matching the main feed's
  `feed-loading-more` treatment — nothing to click, nothing left off-center.
- **Code refs:** `src/ui/App.tsx` (the `.search-results` container's new `onScroll`
  handler calling `loadMoreSearchResults`/`loadMoreChannelPreview` within 300px of the
  bottom; swapped the `comments-load-more` button for a conditionally-rendered
  `feed-loading-more` div); `src/ui/i18n/en.ts` (dropped the now-unused
  `search.loadMore` string).
- **Resolved:** 2026-07-13 · **Commit:** d6cf58e · **Outcome:** Fixed

### B-070 — Sync after adding an account can silently no-op, leaving the UI stale until an unrelated refresh happens to succeed
- **Type:** bug · **Severity:** major
- **Status:** Fixed · **Reported:** 2026-07-13
- **Area:** sync / auth
- **What happens:** the owner reported that after adding the initial account or a new
  additional account, the triggered sync appears to start but the listings never
  populate — a click into some other view is what eventually shows the videos. Root
  cause: `runRefresh` (`src/platform/main.ts`) guarded on a single module-level
  `refreshing` boolean — `if (refreshing) return { ok: false, errorKind: 'busy', ... }`
  — with no queueing or retry. Both `connectGoogle` and `connectAccount` trigger their
  post-connect sync as `void runRefresh('manual', ...)` (fire-and-forget, result never
  inspected). If any other refresh happened to already be in flight at that moment —
  launch-time `validateConnectionAndCatchUp()`, the 30-minute timer, or another
  account's own connect-triggered refresh — the call returned `busy` and vanished
  silently: no `refresh:started`/`refresh:done` ever fired for it, so the renderer's
  event-driven `loadView()`/`loadChannels()` never ran for that account's new data.
- **Expected:** connecting an account reliably triggers (and the UI reliably reflects)
  that account's sync, regardless of what else happens to be refreshing at that exact
  moment.
- **Code refs:** `src/platform/main.ts` (`runRefresh` renamed to `runRefreshNow`; a new
  `runRefresh` wraps it, chaining every call onto a module-level `refreshQueue` promise
  instead of racing the `refreshing` boolean).
- **Notes:**
  - Took this bug's own recommended fix: every `runRefresh` call now chains onto
    `refreshQueue` (`run = refreshQueue.then(() => runRefreshNow(...), () =>
    runRefreshNow(...))`, queue advanced past failures via `.catch(() => undefined)` so
    one queued failure can't poison requests queued behind it) — a call arriving while
    another is in flight now always eventually runs, with its own
    `refresh:started`/`refresh:done` pair, instead of returning `busy` and being
    dropped. The `refreshing` boolean is untouched (still drives `getFeedMeta`'s
    spinner state); the `'busy'` `errorKind` is now unreachable from `runRefresh` — the
    UI already treated it as a silent no-op (`src/ui/App.tsx`), so this is strictly a
    behavior improvement, not a contract change callers depended on.
  - No live-app check this session (needs a live account and real timing — launch-time
    refresh racing a fresh connect — per [[no-live-app-verification]]); verified via
    `npm run typecheck && npm run lint && npm test` (179/179 — no existing unit-test
    harness covers `main.ts`'s composition root, consistent with how this file has
    always been verified). Owner should validate live: adding an account while a launch
    refresh or another account's connect-sync is still running, and confirming the new
    account's videos populate without needing to click into an unrelated screen first.
- **Resolved:** 2026-07-13 · **Commit:** 6442513 · **Outcome:** Fixed

### B-069 — First sync shows backlog videos as unread for the whole sync duration, not just briefly
- **Type:** bug · **Severity:** minor
- **Status:** Fixed · **Reported:** 2026-07-13
- **Area:** sync / feed
- **What happens:** B-020's rule ("on an account's very first subscription sync, videos
  already published before today start read") was implemented as a single retroactive
  `feedRepository.markManyRead(...)` call in `runRefresh` (`src/platform/main.ts`),
  which only ran after `stack.syncService.refresh(...)` fully resolved — i.e. after
  every subscribed channel had been polled. `SyncService.refresh`
  (`src/core/sync-service.ts`) discovers and hydrates videos as it goes, each new row
  starting unread — so a feed reload during a long first sync (hundreds of channels)
  showed backlog videos as unread for the entire remaining sync duration, only flipping
  to read once the whole thing completed.
- **Expected:** backlog videos (published before today) never render as unread during a
  first sync, even transiently.
- **Code refs:** `src/core/sync-service.ts` (`refresh`'s hydration loop — now computes
  a `backlogCutoff` from `startOfToday(clock.now())` when `firstSync` is true, and
  calls `repo.markVideosReadIfUnset(...)` on each hydrated batch's backlog videos right
  after `applyHydration`, instead of waiting for the whole sync to finish);
  `src/platform/main.ts` (`runRefresh`'s post-loop `markManyRead` call kept as a safety
  net, comment updated to say so).
- **Notes:**
  - Took the fix this bug's own notes recommended: moved the "backlog defaults to read"
    decision inside `SyncService` itself, applied per hydrated batch (mirroring how
    [[B-058]]'s `markVideosReadIfUnset` works for archive backfill) rather than staying
    a single retroactive pass in `main.ts`. Gap-backfilled videos (genuinely missed
    uploads since the last sync, not deep-archive history) are unaffected — they're
    filtered by `publishedAt`, same as any other newly-hydrated video, so only videos
    that actually predate today get marked read; a gap-backfilled video published
    earlier today still stays unread, matching the existing gap-backfill test's
    expectation.
  - `main.ts`'s original retroactive `markManyRead` call is kept, not removed — it's now
    a safety net for any video whose hydration got interrupted by a quota hit this
    cycle (mid-sync `ctx.quotaHit`), rather than the primary mechanism.
  - No live-app check this session (needs a live account with a large-enough
    subscription list to observe the window, per [[no-live-app-verification]]);
    verified via `npm run typecheck && npm run lint && npm test` (179/179 — two new
    `sync-service.test.ts` cases cover the backlog-marked-read and
    not-first-sync-so-untouched paths). Owner should validate live: watching a large
    first sync in progress and confirming backlog videos never flash as unread, even
    mid-sync.
- **Resolved:** 2026-07-13 · **Commit:** 6442513 · **Outcome:** Fixed

### B-055 — Search results UX: item size, hide the grid/list toggle, pagination, video/channel distinction, Short badge/filter
- **Type:** adjustment (bundles one UX gap that reads as a bug — the inert grid/list
  toggle — with several polish asks)
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** search / ui-shell
- **What happens:** search results rendered via a bespoke block ignoring item-size/
  grid-list settings (with the layout toggle visibly inert during search); one page only,
  no pagination; video/channel results looked alike (same square thumb); no Short badge
  or Show-Shorts filtering.
- **Expected:** (1) item-size/layout parity with the main feed; (2) hide the grid/list
  toggle during search (size slider stays); (3) pagination; (4) circular avatar +
  subscriber count for channel results; (5) Short badge + Show-Shorts filtering for video
  results.
- **Code refs:** `src/ui/SearchResults.tsx` (new — `SearchVideoRow`/`SearchVideoCard`/
  `SearchChannelRow`/`SearchChannelCard`); `src/ui/App.tsx` (search-results container now
  `size-`-scoped and grid/list-aware; layout toggle hidden while `searchResults !== null`;
  `loadMoreSearchResults`); `src/adapters/youtube/api-client.ts` (`search()` — now takes
  `pageToken`, returns `nextPageToken`, and batch-fetches video durations + channel
  subscriber counts via two additional 1-unit calls); `src/ipc/contract.ts`
  (`SearchVideoResultDto.durationSeconds`/`.isShort`, `SearchChannelResultDto
  .subscriberCount`, `searchYouTube`'s new pageToken/return shape).
- **Notes:**
  - **Short badge is duration-heuristic only (≤60s), not HEAD-probe-confirmed** like the
    synced feed's D-028 pipeline — a transient, non-persisted result list doesn't
    warrant that pipeline's cost/complexity; noted as a deliberate simplification.
  - Subscriber counts and video durations are each fetched with **one batched call for
    the whole result page** (`channels.list`/`videos.list`, 1 unit each, comma-joined
    ids) — not per-result — resolving this bug's own quota-cost concern before it became
    a real cost.
  - Pagination is a "Load more results" button (mirroring the comments/priority-section
    pattern already used elsewhere), not scroll-triggered infinite-scroll — search
    results aren't virtualized, so this was simpler and consistent with how comment
    pagination was done.
  - `youtube-api.md`/`features.md` updated with the new endpoint costs and shipped
    results-UX description.
  - No live-app check this session (a real `search.list` query needs a live account per
    [[no-live-app-verification]]); verified via `npm run typecheck && npm run lint && npm
    test`. Owner should validate live: a real search with both video and channel
    results, in both list and grid layout, at a few item sizes, with a query likely to
    surface Shorts.
- **Resolved:** 2026-07-13 · **Commit:** 1ddd506 · **Outcome:** Fixed

### B-061 — Subscribe/unsubscribe from inside the player and the channel detail screen
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** player / ui-shell
- **What happens:** the player's action bar had no subscribe/unsubscribe — blocked on
  `PlayerVideoDto` having no `channelId` field.
- **Expected:** a subscribe/unsubscribe toggle in the player's action bar, and the same
  on the channel screen.
- **Code refs:** `src/ipc/contract.ts` (`PlayerVideoDto.channelId`/`.isSubscribed`);
  `src/platform/main.ts` (`getVideo` — populates both, cross-referenced via the existing
  `feedRepository.isSubscribed`); `src/ui/PlayerView.tsx` (new Subscribe/Unsubscribe
  `ActionButton`).
- **Notes:**
  - **Player half: done.** Subscribing goes through the write-scope gate ([[B-067]]);
    unsubscribing follows the existing (not gate-converted) behavior used elsewhere.
  - **Channel-screen half: covered by [[B-056]]'s Unsubscribe button** — a real
    *Subscribe* button there still has no entry point, since every way to reach the
    channel screen today (sidebar) is already-subscribed by definition. That needs
    [[B-055]]'s search-result channel results to land first.
  - No live-app check this session (real subscribe/unsubscribe needs a live account per
    [[no-live-app-verification]]); verified via `npm run typecheck && npm run lint && npm
    test` (177/177). Owner should validate live: the player's new toggle against a real
    account, both directions.
- **Resolved:** 2026-07-13 · **Commit:** 62b8e69 · **Outcome:** Fixed (partial)
- **Amended 2026-07-13 (commit dbe8df3):** the remaining channel-screen gap is closed —
  clicking a search channel result now opens that channel's screen even when unsubscribed
  (`ChannelHeader` gained a `subscribed`/`onSubscribe` pair, showing a real Subscribe
  button instead of assuming every visited channel is already followed); see [[B-056]]'s
  amendment for the video-list half of this. Status promoted from partial to full Fixed.

### B-056 — Channel detail screen (avatar, banner, subscribe button, video list)
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** ui-shell / feed
- **What happens:** no dedicated channel-detail screen existed — clicking a channel only
  set a filter over the normal feed view; the topbar showed just the title as text plus
  Unsubscribe — no avatar, no banner, no subscriber count.
- **Expected:** a channel screen with avatar, banner, subscriber count, and the video
  list (reusing the existing channel-filtered feed + archive pagination).
- **Code refs:** `src/ui/ChannelHeader.tsx` (new); `src/adapters/youtube/api-client.ts`
  (`fetchChannelDetail`); `src/ipc/contract.ts` (`ChannelDetailDto`, `getChannelDetail`);
  `src/ui/App.tsx` (renders `ChannelHeader` above the feed region when `channelFilter`
  is set; topbar simplified since the channel title moved into the new header).
- **Notes:**
  - Deliberately a compact strip, not YouTube's full-height banner — `ui.md`/D-004 both
    say content should fill the available screen; a giant banner eating vertical space
    would be exactly the kind of imposed-aesthetic the product's "who is driving?" test
    pushes back on.
  - Banner/subscriber count are fetched live via a new `channels.list`
    (`part=brandingSettings,statistics`, 1 unit) call every time the channel screen
    opens, not persisted — cheap enough to just always be fresh, no staleness policy to
    design. `youtube-api.md` updated with the new endpoint entry per project convention.
  - **Not done: Subscribe button for not-yet-followed channels.** Every entry point
    today (sidebar) is already-subscribed by definition, so only Unsubscribe was needed;
    a real Subscribe toggle needs [[B-055]]'s search-result channel results to actually
    reach an unfollowed channel's screen first — sequencing unchanged from this bug's
    original notes.
  - No live-app check this session (real channel banner/subscriber data needs a live
    account per [[no-live-app-verification]]); verified via `npm run typecheck && npm
    run lint && npm test` (177/177 — this is UI/IPC wiring, no new domain logic to unit
    test). Owner should validate live: opening a channel with and without a real banner
    image, in both light and dark themes, and confirming Unsubscribe/open-in-browser
    still work from the new location.
- **Resolved:** 2026-07-13 · **Commit:** 79c6199 · **Outcome:** Fixed
- **Amended 2026-07-13 (commit dbe8df3):** the "not done" Subscribe gap is closed — a new
  `getChannelVideos` IPC (`channels.list` + `playlistItems.list` + `videos.list`, 1 unit
  each, batched, never persisted to the local DB) lets the channel screen show a
  not-yet-subscribed channel's uploads via the existing `SearchVideoRow`/`SearchVideoCard`
  components (`src/ui/App.tsx`'s `channelPreview` state, `openChannelPreview`/
  `loadMoreChannelPreview`), reached by clicking a search channel result
  (`SearchChannelRow`/`SearchChannelCard` gained an `onOpen` alongside `onSubscribe`).
  `ChannelHeader` now takes `subscribed`/`onSubscribe` and shows a real Subscribe button
  instead of assuming every visited channel is already followed. See [[B-061]]'s matching
  amendment. `youtube-api.md` updated with the new endpoint costs. No live-app check this
  session (needs a live account with an unsubscribed channel to browse, per
  [[no-live-app-verification]]); verified via `npm run typecheck && npm run lint && npm
  test` (179/179). Owner should validate live: opening a search channel result not yet
  followed, browsing/paginating its videos, subscribing from that screen, and confirming
  it flips to the normal subscribed channel screen (Unsubscribe button, synced feed)
  once the post-subscribe sync catches up.

### B-067 — Auth/consent errors give no explanation or path to fix; write-scope consent jumps straight to the browser with no warning
- **Type:** bug
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** auth / player
- **What happens:** two related gaps found live by the owner. (1) Comments' errors
  showed raw API text with no `errorKind` check or recovery path. (2) every write
  action (Like, Subscribe, post/reply comment) opened the system browser for Google's
  consent screen the instant it was needed, with zero in-app warning first.
- **Expected:** (1) a clearer message + path for `auth-expired`; (2) an in-app dialog
  explaining what's about to happen before the browser opens, proceeding only on confirm.
- **Code refs:** `src/ui/useWriteScopeGate.tsx` (new hook — the dialog + retry logic,
  shared by `App.tsx`/`PlayerView.tsx`/`Comments.tsx`); `src/ipc/contract.ts` +
  `src/platform/main.ts` (new `requestWriteScope` IPC method; `rateVideo`,
  `subscribeChannel`, `postComment`, `replyToComment` now return `write-scope-required`
  instead of triggering consent inline); `src/ui/Comments.tsx`
  (`commentsErrorMessage` — `auth-expired` gets its own copy, not the raw API text).
- **Notes:**
  - **Known gap, not addressed:** `unsubscribeChannel`'s write-scope check uses a
    per-owning-account `stack.authFlow`, not the shared primary-account `authFlow` the
    other four call sites use — converting it needs the dialog flow to know *which*
    account's consent is pending, which the current `write-scope-required` shape (no
    account id in the error) doesn't carry. Left as its original inline behavior;
    unsubscribe can still surprise-open the browser with no warning.
  - Declining the dialog resolves the action's promise with `errorKind: 'cancelled'`
    rather than leaving callers hanging or showing a spurious error banner.
  - `decisions.md` D-032 updated to record this revision to the incremental-consent flow.
  - No live-app check this session (the actual consent/browser flow needs a real OAuth
    setup per [[no-live-app-verification]]); verified via `npm run typecheck && npm run
    lint && npm test` (177/177 — this is UI/IPC wiring, no new domain logic to unit
    test). Owner should validate live: clicking Like/Subscribe/post-comment without
    write scope granted shows the dialog first, Continue actually opens the browser and
    retries the action after consent, and Cancel is a clean no-op.
- **Resolved:** 2026-07-13 · **Commit:** cdc509c · **Outcome:** Fixed (partial)
- **Amended 2026-07-13 (commit 7bfedf2):** the "known gap" is closed — unsubscribe now
  goes through the same dialog. Solved the account-ambiguity this note called out by
  adding a channel-scoped `requestWriteScopeForChannel(channelId)` IPC (resolves the
  owning account the same way `unsubscribeChannel` itself already did) instead of trying
  to thread an account id through the generic `write-scope-required` error shape;
  `useWriteScopeGate.run()` now takes an optional second `requestScope` argument so a
  caller can supply this narrower request instead of the default primary-account one.
  `unsubscribeChannel`'s handler (`src/platform/main.ts`) returns `write-scope-required`
  proactively instead of calling `stack.authFlow.requestWriteScope()` inline. Status
  promoted from partial to full Fixed.

### B-073 — Sidebar's per-channel unread count doesn't update immediately after toggling a video's read status
- **Type:** bug · **Severity:** minor
- **Status:** Fixed · **Reported:** 2026-07-13
- **Area:** ui-shell / feed
- **What happens:** `patch()` refreshed the topbar's unread count (`syncMeta()`) after a
  read-status toggle but never `loadChannels()` — the sidebar's per-channel badge comes
  from a separate data source and went stale until something unrelated refreshed it.
- **Expected:** the sidebar's per-channel unread count updates immediately, same as the
  topbar count.
- **Code refs:** `src/ui/App.tsx` (`patch` — added `loadChannels()`).
- **Notes:** took the simple option flagged in this bug's own notes (call
  `loadChannels()`, refetching the whole list) rather than a targeted client-side bump —
  it's a local SQLite read, not an API call, so the cost is negligible; consistent with
  how [[B-064]] was fixed. No live-app check this session; verified via
  `npm run typecheck && npm run lint && npm test` (177/177). Owner should validate live:
  toggling read/unread and confirming the sidebar number moves immediately.
- **Resolved:** 2026-07-13 · **Commit:** df7c96e · **Outcome:** Fixed

### B-068 — Selecting a channel keeps the previous view's scope (Unread/Watch Later/Favorites/Ignored), usually showing nothing
- **Type:** bug · **Severity:** major
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** ui-shell / feed
- **What happens:** `onSelectChannel` only set `channelFilter`, never `view` — so
  clicking a channel while on Unread/Watch Later/Favorites/Ignored combined that view
  with the channel filter, usually showing nothing.
- **Expected:** clicking a channel resets to `'all'` rather than carrying over an
  unrelated view's filter.
- **Code refs:** `src/ui/App.tsx` (`onSelectChannel` — added `setView('all')`).
- **Notes:** exactly the one-line fix flagged going in. No live-app check this session;
  verified via `npm run typecheck && npm run lint && npm test` (177/177). Owner should
  validate live: clicking a channel while on Watch Later/Favorites/Ignored/Unread shows
  the channel's full video list, not an empty screen.
- **Resolved:** 2026-07-13 · **Commit:** df7c96e · **Outcome:** Fixed

### B-074 — Channel pagination duplicates the first page after backfill; loading can silently stop working; cross-channel visual glitches while switching mid-scroll
- **Type:** bug · **Severity:** major
- **Status:** Fixed (2 of 3 symptoms — see notes) · **Reported:** 2026-07-13
- **Area:** ui-shell / feed
- **What happens:** three related reports, all traced to the same area
  (`App.tsx`'s `loadView`/`loadMore`).
  1. **Pagination repeats the first page:** `loadMore`'s backfill-retry branch used
     `lastCursorRef.current` as the resume cursor — but that ref was only ever set inside
     the "there's another local page" branch of `loadMore` itself. For a channel whose
     entire local archive fits in one page (the common case: RSS only ever gives ~15
     items), `nextCursor` comes back `null` immediately after the very first load, that
     branch never runs, and `lastCursorRef.current` stays at its initial `null` forever.
     Retrying `getFeed` with a `null` cursor after backfill re-requests page one from
     scratch, appending it as a duplicate "next page."
  2. **Pagination silently stops working, sometimes fixed by leaving and re-entering the
     channel:** `loadView`'s success handler only reset the shared `loadingRef` guard on
     the path where its response was still current — the early-return ("this response is
     stale, a newer view/channel load already started") skipped resetting it. Once a
     `loadView` call got superseded before its fetch resolved, `loadingRef` stayed `true`
     permanently, and `loadMore`'s very first line (`if (loadingRef.current) return`)
     then silently no-ops on every subsequent scroll-to-bottom for that channel — until
     the *next* `loadView` call (e.g. leaving and re-entering) happened to resolve
     without being superseded, resetting the flag.
  3. **Cross-channel visual glitch while switching channels mid-scroll** (old channel's
     thumbnails/titles rendering stacked under the new channel's, accumulating): not
     independently reproduced this session, but both bugs above are exactly the kind of
     state corruption (duplicated rows, a stuck loading flag masking further corruption)
     that would produce exactly this symptom once a channel switch lands in the middle of
     it — plausible the same fix resolves it, not confirmed live.
- **Expected:** pagination and backfill retries always resume from the actual end of
  what's currently displayed, and a superseded request never partially or permanently
  affects the loading state of whatever load replaced it.
- **Code refs:** `src/ui/App.tsx` (`loadView`, `loadMore` — both rewritten; removed
  `lastCursorRef` entirely).
- **Notes:**
  - Replaced the ad-hoc `viewRef.current !== X || channelRef.current !== Y` staleness
    checks (present in three separate places, one of which — `loadView`'s — didn't reset
    `loadingRef` on the stale path) with a single incrementing `requestGenerationRef`:
    `loadView` bumps it and captures the new value; `loadMore`/the backfill retry capture
    the *current* value without bumping (they're continuing the current session, not
    starting a new one) and compare on resolve. A mismatch means a newer `loadView`
    happened meanwhile, and the response is discarded outright — before touching
    `loadingRef`, `videos`, or `nextCursor` — rather than partially handled.
  - The resume cursor after a channel-archive backfill is now derived from
    `videos.at(-1)` (the last video actually on screen) instead of a separately-tracked
    ref that could never be set for a single-page channel — always correct regardless of
    how the local archive got exhausted.
  - No live-app check this session (needs a live account with multiple channels of
    varying archive depth, and rapid channel-switching under load, to fully exercise);
    verified via `npm run typecheck && npm run lint && npm test` (177/177 — this is
    renderer-state logic with no existing unit-test harness for `App.tsx`). Owner should
    validate live: paginating a channel whose archive is exactly one RSS page deep (the
    duplicate-first-page case), scrolling to the end of several different channels in a
    row without leaving between them (the stuck-loadingRef case), and switching channels
    rapidly mid-scroll (the visual glitch, to confirm or rule out).
- **Resolved:** 2026-07-13 · **Commit:** 32b3ed5 · **Outcome:** Fixed (partial)

### B-072 — Grid card's floating action bar and duration badge look closer to the bottom edge than to the left/right edges
- **Type:** adjustment
- **Status:** Fixed (second attempt — see notes) · **Reported:** 2026-07-13
- **Area:** ui-shell / feed
- **What happens:** the owner reported the action-button bar overlaid on a grid card's
  thumbnail reads as glued to the bottom of the thumb, inconsistent with its left-edge
  spacing; same for the duration counter's bottom/right spacing. The absolute-position
  offsets themselves were already identical on every side (`bottom`/`left`/`right: 6px`
  on both `.card-actions` and `.card-duration`) — the actual cause was each element's own
  *internal* padding being asymmetric (`.row-actions button`'s shared `padding: 4px 7px`;
  `.card-duration`'s `padding: 1px 5px`), so the visible content sat noticeably closer to
  the bottom edge than to the left/right edges even though the outer position offset was
  equal.
- **Expected:** the visible gap from the thumb's edge to the bar/badge's content reads as
  the same amount in every direction.
- **Code refs:** `src/ui/styles.css` (`.card-duration` padding now uniform `5px`; new
  `.card-actions button` override at uniform `6px`, scoped to the grid card so the
  shared list-row button padding is untouched; `bottom` offset on both `.card-actions`
  and `.card-duration` bumped from `6px` to `12px`).
- **Notes:**
  - **First attempt (commit 69e07e7):** made the *internal padding* symmetric on the
    theory that equal position offsets (6px) plus asymmetric inner padding explained the
    look. The owner's live re-test showed it still reads as tighter on the bottom —
    disproving (or at least showing incomplete) that theory: equal-on-paper offsets
    apparently still don't render as equal, for reasons this session can't observe
    directly (no live app access).
  - **Second attempt (this commit):** per the owner's own live observation, bumped the
    `bottom` offset specifically (not `left`/`right`/`top`, which the owner didn't flag)
    to `12px` — double the sides — while keeping the padding-symmetry fix from the first
    attempt. This is a pragmatic, observation-driven adjustment rather than a fully
    explained one; if it still doesn't look right, the next step should probably be a
    screenshot/measurement rather than another guess.
  - No live-app check this session (visual-only CSS change, no test coverage
    applicable); verified via `npm run lint`. Owner should validate live again: does
    `bottom: 12px` finally read as visually even with the sides now?
- **Resolved:** 2026-07-13 · **Commit:** 32b3ed5 · **Outcome:** Fixed

### B-071 — Primary account's sidebar label stays "My account" after connecting, instead of the real channel name
- **Type:** bug · **Severity:** minor
- **Status:** Fixed · **Reported:** 2026-07-13
- **Area:** auth / ui-shell
- **What happens:** the owner reported that a newly added *additional* account picks up
  its real Google account name correctly, but the *first* (primary) account's sidebar
  entry stays labeled "My account" indefinitely. Found in code: `connectGoogle`'s
  post-connect label lookup (`apiClient.getOwnChannel()`) already wrote the real channel
  title to the DB via `syncRepository.addAccount(...)`, but never updated the in-memory
  `AccountStack.label` field the sidebar actually reads (`toAccountDto(stack)`) — so it
  kept showing the placeholder until the next app restart, at which point
  `listAccounts()` would rebuild the stack from the (correct) stored label.
  `connectAccount` (additional accounts) never had this bug — it already did
  `stack.label = channel.title` in place.
- **Expected:** the primary account's sidebar label reflects the real channel title
  immediately after connecting, same as any additional account.
- **Code refs:** `src/platform/main.ts` (`connectGoogle` handler — added the same
  `stack.label = label` mutation `connectAccount` already had).
- **Notes:** one-line fix once diagnosed, mirroring an existing, already-correct pattern
  in the same file. No live-app check this session (needs a real OAuth connect flow per
  [[no-live-app-verification]]); verified via `npm run typecheck && npm run lint && npm
  test` (177/177). Owner should validate live: connecting the primary account for the
  first time and confirming the sidebar shows the real channel name right away, not
  after a restart.
- **Resolved:** 2026-07-13 · **Commit:** bd36bdc · **Outcome:** Fixed

### B-044 — Resume playback position per video
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** player / storage
- **What happens:** `playback.md` flagged this as a Future idea, not MVP — the owner
  asked for it explicitly, promoting it off the future-ideas list.
- **Expected:** reopening a partially-watched video resumes from where playback last
  stopped, instead of always starting at 0:00.
- **Code refs:** `src/adapters/storage/migrations.ts` (schema v7,
  `video_state.resume_position_seconds`); `src/core/state.ts`
  (`VideoState.resumePositionSeconds`, `setResumePosition`); `src/adapters/storage/
  repositories.ts` (`SqliteStateRepository.setResumePosition`, `get`/`apply` threading
  the column); `src/ipc/contract.ts` + `src/platform/main.ts` (`setResumePosition` IPC);
  `src/ui/PlayerView.tsx` (`resumeValueFor`, the `start=` embed param, save-on-pause/
  ended/switch-away).
- **Notes:**
  - **Resolved the two product decisions this bug flagged as needed, per this batch's
    "resolve everything, redirect if needed" instruction:** "finished, don't resume"
    threshold = under 10s played, or within the last 30s of known duration; persistence
    cadence = checkpoint-based (pause, ended, switching to another video, closing the
    player) rather than a periodic tick, consistent with the app's existing
    reissue-on-start style (D-038) rather than continuous polling.
  - Reopening a video passes the saved position as the embed's `start=` query parameter
    — simpler than issuing a `seekTo()` command after the fact, and avoids a visible
    jump once playback begins.
  - `resumePositionSeconds` was added to `VideoState`/`VideoStateDto` broadly (like
    `favorite`/`watchLater`) rather than a parallel player-only type — the main feed
    query doesn't need it, but sharing the type keeps the diff smaller; `playback.md`
    updated to reflect the implementation (no longer a Future idea).
  - No live-app check this session (real playback/seeking needs a live embed per
    [[no-live-app-verification]]); verified via `npm run typecheck && npm run lint && npm
    test` (177/177, including new contract tests for `setResumePosition` and its
    round-trip through `findVideo`, the player's read path). Owner should validate live:
    watching partway through a video, closing/reopening it, and confirming it resumes;
    also that a finished video does *not* resume.
- **Resolved:** 2026-07-13 · **Commit:** bd36bdc · **Outcome:** Fixed

### B-062 — Comments: pagination unused, no comment likes (permanent API limitation), reply-to-reply doesn't prefill @mention
- **Type:** bug (pagination) + adjustment (reply UX) · note on the likes ask below
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** player
- **What happens:** three separate issues reported together. (1) pagination dead on the
  renderer side despite IPC already supporting `pageToken`. (2) no like button on
  comments — confirmed permanent API limitation (D-032), nothing to fix. (3) no way to
  reply to a reply, let alone prefill `@username`.
- **Expected:** (1)/(3) fixed; (2) closed as Won't-fix (API limitation).
- **Code refs:** `src/ui/Comments.tsx` (`loadMore`/`nextPageToken` state; new `ReplyItem`
  component for replies-to-replies).
- **Notes:**
  - (1) `load()`/`loadMore()` now thread `nextPageToken` through, with a "Load more
    comments" button at the bottom of the thread once one exists.
  - (3) replies now get their own reply action (`ReplyItem`, parallel to `CommentItem`),
    opening a composer pre-filled with `@{authorDisplayName}` of the specific reply being
    answered. Still posts via `replyToComment(topLevelId, text)` — the top-level
    comment's id, not the reply's — since `comments.insert` only supports one level of
    nesting; the `@mention` is a text convention, not a structural third level.
  - (2) **closed as Won't-fix**, per this bug's own framing — the public YouTube Data
    API v3 has no endpoint to like a comment, only videos (D-032, unchanged since B-006).
  - No live-app check this session (posting real comments/replies needs the owner's real
    account per [[no-live-app-verification]]); verified via `npm run typecheck && npm run
    lint && npm test` (175/175 — this is a UI-only change, no new domain logic to unit
    test). Owner should validate live: loading a second page of comments on a
    heavily-commented video, and replying to a reply end-to-end.
- **Resolved:** 2026-07-12 · **Commit:** 25b04ea · **Outcome:** Fixed

### B-049 — Settings copy about signing into the player for Premium may be misleading
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** ui-shell / player
- **What happens:** Settings promised "sign in once inside the player for ad-free
  playback," but the player is a plain sandboxed `<iframe>` with no address bar or
  navigation surface to reach a Google sign-in page — unclear how a user could actually
  do this.
- **Expected:** verify the actual session/partition setup, then either build a real
  sign-in path or fix the copy to stop promising one that doesn't exist.
- **Code refs:** `src/platform/main.ts` (checked `createWindow`'s `BrowserWindow` config
  — no `partition` set anywhere); `src/ui/i18n/en.ts`
  (`settings.connection.playerSessionNote`); `.specs/playback.md` (§Player view spec, the
  Login quirk note and the earlier "ad-free automatically" claim).
- **Notes:** **verified, not assumed:** no `partition` option is set on the window or its
  webContents, so the iframe uses Electron's own default session — genuinely isolated
  from any OS browser (Firefox/Chrome), ruling out the owner's "reusing the OS browser"
  theory. But there is no sign-in surface anywhere in the app that could authenticate
  that session — OAuth explicitly uses the *system* browser via the loopback flow
  (`adapters/oauth/auth.ts`), never this one. So option (b) from this bug's own framing:
  the copy was promising a flow that doesn't exist, not describing one that was just
  hard to find. Fixed the copy in both Settings and `playback.md` (which had the same
  claim, worse — "ad-free automatically"). **Left unexplained:** why the owner reports
  never seeing an ad despite this — likely a YouTube-side embed ad-serving quirk outside
  Chronicle's control, not something this session could investigate further. No live-app
  check this session; verified via `npm run typecheck && npm run lint && npm test`
  (175/175 — this is a copy-only change, no test coverage needed). Owner should validate
  live: the new Settings copy reads correctly, and whether ads ever actually appear.
- **Resolved:** 2026-07-12 · **Commit:** 7c363a0 · **Outcome:** Fixed

### B-048 — Premieres/scheduled videos sort by capture time, not air time; no live/upcoming indicator
- **Type:** bug · **Severity:** minor
- **Status:** Fixed (partial — see notes) · **Reported:** 2026-07-12
- **Area:** feed / sync
- **What happens:** `snippet.liveBroadcastContent` was captured and persisted
  (`live_content` column) but dropped before reaching the feed — absent from
  `FEED_SELECT`, the domain `Video` type, and the IPC DTO, so no badge could ever render.
- **Expected:** (1) verify the `publishedAt`-reflects-air-time assumption; (2) wire
  `live_content` through to the feed query/domain type/IPC; (3) render a badge.
- **Code refs:** `src/adapters/storage/repositories.ts` (`FEED_SELECT`, `toEntry`);
  `src/core/video.ts` (`Video.liveContent`); `src/ipc/contract.ts` (`FeedVideoDto`);
  `src/platform/main.ts` (`toVideoDto`); `src/ui/FeedList.tsx` (new `.live-badge`,
  mirroring `.short-badge`).
- **Notes:** (2) and (3) done; (1) — the ordering assumption itself — is **not
  addressed**, and can't be without real premiere/livestream data to observe, which this
  session has no way to exercise. `feed.md`'s §Ordering section still carries it as an
  open Assumption; only the visibility half of this bug is closed. No live-app check this
  session; verified via `npm run typecheck && npm run lint && npm test` (175/175,
  including a new hydration→feed contract test for `liveContent`). Owner should validate
  live: a real premiere or livestream shows the "Upcoming"/"Live" badge, and whether feed
  order for one actually looks wrong in practice (which would confirm the ordering half
  still needs work).
- **Resolved:** 2026-07-12 · **Commit:** 2127c4b · **Outcome:** Fixed

### B-063 — Favorites Home section should follow the feed's layout/size settings; sidebar should list favorited channels first
- **Type:** bug (layout) + adjustment (ordering)
- **Status:** Fixed (partial — see notes) · **Reported:** 2026-07-12
- **Area:** feed / ui-shell
- **What happens:** three related points reported together. (1) The Home priority section
  rendered via a plain `VideoRow` list, ignoring the feed's `itemSize`/`layout` settings.
  (2) The sidebar channel list was freshest-first only, no favorite-first tiebreak. (3) a
  clarification-not-a-confirmed-bug about favoriting seeming to mark videos unread.
- **Expected:** (1)/(2) fixed; (3) needs a concrete repro before it can be scoped.
- **Code refs:** `src/ui/App.tsx` (priority section now branches on `settings.layout`,
  rendering `VideoCard`/`VideoRow` sized via `GRID_CARD_SIZES`/`settings.itemSize`);
  `src/ui/FeedList.tsx` (`VideoCard` exported, gained the same `focusable` prop `VideoRow`
  already had); `src/adapters/storage/repositories.ts` (`listFollowedChannels`'s
  `ORDER BY favorite DESC, ...`).
- **Notes:**
  - Part (3) is **not addressed** — code review (repeated from the original report)
    still finds no path where `toggleChannelFavorite` touches `video_state`; it only
    flips the `favorite` column. Left open pending a concrete repro; may well be
    [[B-058]] (now also fixed this batch) producing a similar-looking symptom.
  - The priority section isn't virtualized (capped at 20 rows) — grid mode uses a plain
    CSS `repeat(auto-fill, minmax(...))` track list sized from `GRID_CARD_SIZES` rather
    than `FeedList`'s `ResizeObserver`-computed column count, since there's no
    virtualizer row-height math to feed here.
  - `feed.md`'s "favoriting does not change sidebar sort order" line (written for D-039)
    is superseded — the owner reported this defeated the point of favoriting a channel
    in a long list; `decisions.md`/`feed.md` updated in the same change.
  - No live-app check this session; verified via `npm run typecheck && npm run lint &&
  npm test` (174/174, including a new sidebar-ordering contract test). Owner should
  validate live: the priority section in grid mode at a few item sizes, and that a
  favorited channel jumps to the top of a long sidebar list.
- **Resolved:** 2026-07-12 · **Commit:** 2a9c31c · **Outcome:** Fixed

### B-058 — Paginating a channel's archive marks all newly-discovered videos as unread
- **Type:** bug · **Severity:** major
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** sync / feed
- **What happens:** `backfillArchive` hydrated old videos via `applyHydration`, which only
  touches `videos` (metadata), never `video_state` — every backfilled video defaulted to
  unread regardless of age or whether the user already watched it on YouTube.
- **Expected:** needed a product decision on the right default for a channel's
  back-catalog; the recommended option (default to read, since these predate the user
  following/using Chronicle) was implemented per this batch's "resolve everything"
  instruction, flagged here as a Pending decision exercised.
- **Code refs:** `src/core/ports.ts`/`src/adapters/storage/sync-repository.ts`
  (`markVideosReadIfUnset` — new); `src/core/sync-service.ts` (`backfillArchive` calls it
  after hydration).
- **Notes:** exercises **D-042** (new, Final) — documented in `feed.md`/`decisions.md`.
  Only inserts a `video_state` row when none exists yet (`ON CONFLICT DO NOTHING`), so it
  never overwrites a real read/unread preference from another path (e.g. hydrate-on-open).
  Deliberately does **not** touch routine gap-backfill (`backfillGap`) — those videos are
  genuinely missed uploads since the last sync, not archive history, and stay unread.
  Doesn't resolve [[B-063]]'s separate "favoriting seems to mark videos unread" report —
  that still needs its own repro. No live-app check this session; verified via
  `npm run typecheck && npm run lint && npm test` (173/173, two new contract tests against
  a real in-memory SQLite db). Owner should validate live: paginating a deep channel
  archive no longer bumps the unread count for those old videos.
- **Resolved:** 2026-07-12 · **Commit:** 8eee0b7 · **Outcome:** Fixed

### B-059 — No loading indicator while paginating/scrolling to load more
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** ui-shell / feed
- **What happens:** the scroll-triggered `loadMore` path showed no loading/spinner state
  while a request was in flight — the in-flight refs were used only to dedupe concurrent
  calls, never rendered.
- **Expected:** a spinner at the bottom of the scrolled list while a page/backfill request
  is in flight.
- **Code refs:** `src/ui/App.tsx` (new `loadingMore` state, set around both the
  cursor-page fetch and the channel-archive backfill in `loadMore`); `src/ui/FeedList.tsx`
  (new `loadingMore` prop, rendered as a `.feed-loading-more` footer after the virtualized
  list).
- **Notes:** kept as a plain text footer (mirrors the existing `searching` state's
  `.empty` text used for YouTube search) rather than a CSS spinner animation — consistent
  with the rest of the app's minimal, text-first loading states. No live-app check this
  session; verified via `npm run typecheck && npm run lint && npm test` (171/171). Owner
  should validate live: scrolling to the end of a long feed and to the end of a deep
  channel archive.
- **Resolved:** 2026-07-12 · **Commit:** 0b2cb06 · **Outcome:** Fixed

### B-054 — Search should always search YouTube directly; drop the "Mine"/"YouTube" toggle
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** search / ui-shell
- **What happens:** the filter input kept re-filtering the *locally loaded* feed on every
  keystroke regardless of scope, and only fired the remote `search.list` call on Enter
  when "YouTube" scope was selected — confusing, since the local cache isn't necessarily
  up to date with YouTube.
- **Expected:** remove the "Mine"/"YouTube" toggle entirely; the filter field's only
  behavior is searching YouTube directly on Enter — browsing locally cached subscriptions
  stays the sidebar's job.
- **Code refs:** `src/ui/App.tsx` (removed `searchScope` state and the `.search-scope`
  toggle; `filtered` is now just `videos`, no local substring match; the filter input
  always shows the YouTube-search placeholder and always searches on Enter);
  `.specs/decisions.md` (D-031), `.specs/features.md`, `.specs/ui.md` (`/` shortcut
  description) updated to match.
- **Notes:** the local substring-match `useMemo` is gone entirely, not just the toggle
  button — the bug's root cause was the live re-filtering behavior itself, not merely the
  two-button UI for choosing a scope. No live-app check this session; verified via
  `npm run typecheck && npm run lint && npm test` (171/171). Owner should validate live:
  typing in the filter no longer changes the visible feed, and Enter always hits YouTube.
- **Resolved:** 2026-07-12 · **Commit:** 0b2cb06 · **Outcome:** Fixed

### B-050 — Button to open a channel's YouTube page in the browser
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** ui-shell
- **What happens:** the per-video action bar has "Open in browser," but nothing
  equivalent existed for the channel itself.
- **Expected:** a button on the channel-filtered topbar that opens the channel's YouTube
  page.
- **Code refs:** `src/ui/App.tsx` (new `.open-channel-btn` next to the channel title,
  calling `window.chronicle.openExternalUrl` with `https://www.youtube.com/channel/{id}`).
- **Notes:** lands on the current channel-filtered topbar rather than a dedicated channel
  screen, since [[B-056]] (the real channel-detail screen) doesn't exist yet — this is the
  channel view as it exists today. No live-app check this session; verified via
  `npm run typecheck && npm run lint && npm test` (171/171). Owner should validate live:
  the link opens the correct channel page in the system browser.
- **Resolved:** 2026-07-12 · **Commit:** 0b2cb06 · **Outcome:** Fixed

### B-066 — Removing the only remaining account silently does nothing
- **Type:** bug · **Severity:** major
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** auth
- **What happens:** `main.ts`'s `removeAccount` handler threw when `id ===
  primaryAccountId()`, but only guarded that specific case — `Sidebar.tsx` rendered the
  same generic Remove option for every account, and `App.tsx`'s `removeAccount` had no
  `.catch()`, so the throw became a silent unhandled promise rejection.
- **Expected:** disable/explain the Remove option on the primary account, and handle
  failure with a visible error if removal is attempted anyway.
- **Code refs:** `src/ipc/contract.ts` (`AccountDto.isPrimary`); `src/platform/main.ts`
  (`toAccountDto`); `src/ui/Sidebar.tsx` (Remove button `disabled`/`title` when primary);
  `src/ui/App.tsx` (`removeAccount` — added `.catch()` → banner).
- **Notes:** `AccountDto` gained an explicit `isPrimary` flag (`accountId ===
  primaryAccountId()`) rather than having the UI infer it — the sidebar has no other way
  to know which account is primary. No live-app check this session; verified via
  `npm run typecheck && npm run lint && npm test` (171/171). Owner should validate live:
  the disabled state/tooltip on the primary account's Remove button, and that a forced
  failure (if reachable at all now) shows the new banner instead of nothing.
- **Resolved:** 2026-07-12 · **Commit:** fe2ed88 · **Outcome:** Fixed

### B-065 — Context menu (accounts/channels) renders clipped inside the scrollable sidebar
- **Type:** bug · **Severity:** minor
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** ui-shell
- **What happens:** both `…` menus were plain positioned `<div>`s, direct DOM children of
  rows inside scrollable list containers — no portal, no viewport-aware placement, so the
  menu got clipped whenever it opened near the edge of the visible scroll area.
- **Expected:** the menu renders fully visible regardless of scroll position, via a portal
  positioned against the trigger button's viewport coordinates.
- **Code refs:** `src/ui/Sidebar.tsx` (new `ContextMenu` component — `createPortal` to
  `document.body`, `useLayoutEffect` measures the rendered menu and flips above the
  trigger / clamps horizontally when there isn't room).
- **Notes:** one shared component now backs both the channel and account menus, as
  expected going in. Existing close-on-outside-click/Escape (`document`-level listeners)
  needed no changes — they were never scoped to the scroll container. No live-app check
  this session; verified via `npm run typecheck && npm run lint && npm test` (171/171).
  Owner should validate live: opening a menu near the bottom of a long scrolled channel
  list, and near screen edges generally.
- **Resolved:** 2026-07-12 · **Commit:** fe2ed88 · **Outcome:** Fixed

### B-064 — Switching the active account doesn't refresh the sidebar/app state; a zero-channel account breaks the sidebar layout
- **Type:** bug · **Severity:** major
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** auth / ui-shell
- **What happens:** `selectAccount` set `accountFilter` and refetched the feed, but never
  called `loadChannels()` — the sidebar's channel list stayed stale until an unrelated
  action refreshed it. Separately, an account with zero followed channels made
  `Sidebar.tsx` omit the entire Channels section, silently breaking the `c` shortcut too.
- **Expected:** switching accounts refreshes sidebar + feed together immediately; a
  zero-channel account renders a proper empty state instead of hiding the section.
- **Code refs:** `src/ui/App.tsx` (new effect calling `loadChannels()` on `accountFilter`
  change); `src/ui/Sidebar.tsx` (Channels section always renders; empty state via
  `sidebar.noChannels` when `channels.length === 0`, distinct from `noChannelMatch`).
- **Notes:** the channel-filter input (and its `c` shortcut target) now always mounts,
  so that gap closes as a side effect of the fix rather than needing separate handling.
  No live-app check this session; verified via `npm run typecheck && npm run lint && npm
  test` (171/171). Owner should validate live: switching between two real accounts with
  different channel sets, and a fresh/empty account's Channels section.
- **Resolved:** 2026-07-12 · **Commit:** fe2ed88 · **Outcome:** Fixed

### B-060 — Filter and `/` shortcut don't work while a video is playing
- **Type:** bug · **Severity:** minor
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** player / ui-shell
- **What happens:** the global keydown handler's `if (playerOpen || urlPromptOpen)
  return` disabled the entire shortcut set, including `/`, while the player was open;
  `PlayerView.tsx`'s own keydown handler had no `/` binding either.
- **Expected:** `/` works while viewing a video — at minimum escaping back to the feed
  and focusing the filter, mirroring what Esc/Back already does.
- **Code refs:** `src/ui/App.tsx` (`exitPlayerToSearch` — clears the player stack fully
  and focuses the filter, passed down as `onSearch`); `src/ui/PlayerView.tsx` (new `/`
  case in its own keydown handler, calling `onSearch`).
- **Notes:** deliberately exits the *whole* player stack (not just one level, like Esc
  does for queue navigation) since starting a new search is a bigger context switch than
  going back one queued video. No live-app check this session; verified via
  `npm run typecheck && npm run lint && npm test` (171/171). Owner should validate live:
  pressing `/` mid-playback lands back on the feed with the filter focused and ready to
  type.
- **Resolved:** 2026-07-12 · **Commit:** fe2ed88 · **Outcome:** Fixed

### B-057 — Unread count in top bar not scoped to the current channel view
- **Type:** bug · **Severity:** minor
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** ui-shell / feed
- **What happens:** the topbar's status text always read `meta.unreadCount` (global/
  account-wide), even inside a channel-filtered view, while a correctly channel-scoped
  value (`currentUnreadCount`) already existed and was only used for the "Mark all read"
  visibility check.
- **Expected:** the top-bar unread count reflects the current scope.
- **Code refs:** `src/ui/App.tsx` (`statusText` now reads `currentUnreadCount`).
- **Notes:** exactly the one-line fix flagged going in — no new state needed. No live-app
  check this session; verified via `npm run typecheck && npm run lint && npm test`
  (171/171). Owner should validate live: the count shown while inside a channel filter
  vs. the main feed.
- **Resolved:** 2026-07-12 · **Commit:** fe2ed88 · **Outcome:** Fixed

### B-053 — `?` shortcut overlay doesn't open when focus is inside a text input
- **Type:** bug · **Severity:** minor
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** ui-shell
- **What happens:** the global keydown handler's input-focus branch only special-cased
  `Escape`/`Enter` and returned for everything else, so `?` typed into the filter/search
  input never reached the `case '?': setHelpOpen(true)` branch — it just typed a literal
  "?" into the field.
- **Expected:** `?` opens the shortcuts overlay regardless of where focus currently sits.
- **Code refs:** `src/ui/App.tsx` (input-focus branch — added a `?` case that
  `preventDefault()`s and toggles `helpOpen`).
- **Notes:** implemented as a small, targeted allowlist addition rather than restructuring
  the whole input-focus branch — only `?` needed to fall through per the bug's actual ask.
  No live-app check this session; verified via `npm run typecheck && npm run lint && npm
  test` (171/171). Owner should validate live: pressing `?` while the filter/search or
  channel-query inputs have focus.
- **Resolved:** 2026-07-12 · **Commit:** fe2ed88 · **Outcome:** Fixed

### B-052 — README's "Shorts are never displayed" line is stale (contradicts D-035)
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** other (docs)
- **What happens:** `README.md` still said "Shorts are never displayed. Not now, not
  ever. There is no toggle," contradicting D-035 (shown, badged, toggle in Settings).
- **Expected:** README's bullet matches D-035's actual behavior.
- **Code refs:** `README.md` (Principles list, the Shorts bullet).
- **Notes:** already fixed by the prior dogfooding-batch commit (7531da4, "reconcile docs
  with shipped features") before this session started — this entry just closes the loop
  in the tracker. No further change needed.
- **Resolved:** 2026-07-12 · **Commit:** 7531da4 · **Outcome:** Fixed

### B-047 — Grid layout: per-video action buttons never appear
- **Type:** bug · **Severity:** major
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** ui-shell
- **What happens:** the action buttons rendered in the DOM for grid cards too, but never
  became visible — `.row-actions`'s hover/selected visibility rule only matched `.row`
  (list mode), not `.card` (grid mode).
- **Expected:** grid cards get the same hover/selected visibility as list rows.
- **Code refs:** `src/ui/styles.css` (added `.card:hover .row-actions, .card.selected
  .row-actions` alongside the existing `.row` selector).
- **Notes:** exactly the one-rule CSS fix diagnosed going in. No live-app check this
  session; verified via `npm run typecheck && npm run lint && npm test` (171/171). Owner
  should validate live: hovering/selecting a grid card shows the action buttons.
- **Resolved:** 2026-07-12 · **Commit:** fe2ed88 · **Outcome:** Fixed

### B-043 — Keyboard-first as a standing design rule; audit current shortcut coverage
- **Type:** adjustment
- **Status:** Fixed (the audit — the process half stays a standing rule, see notes) ·
  **Reported:** 2026-07-12
- **Area:** ui-shell / other (process)
- **What happens:** `ui.md`'s keyboard shortcuts table (§Keyboard shortcuts) was written
  for the v1 surface and states the right principle ("full keyboard operability is a
  requirement, not an enhancement... all bindings also exist as visible UI affordances —
  keyboard-first, not keyboard-only"), but several controls added since (sidebar
  collapse/expand [[B-037]], the layout/item-size toolbar controls [[B-007]], the
  inline field-clear buttons [[B-033]], the sidebar channel filter [[B-024]], Settings
  navigation and its rows, the mouse-back-button request [[B-039]]) were built
  mouse-first without an explicit check for a matching keyboard path, and the shortcut
  table/help overlay (`?`) was not consistently revisited when they landed. The owner
  finds today's shortcuts "nem sempre super acessíveis" (not always easy to
  discover/reach).
- **Expected:** two parts. (1) **Process, going forward:** every new interactive
  feature's design/implementation must state its keyboard path (a binding, or
  reachability via existing focus/arrow navigation) alongside its mouse affordance,
  before it's considered done — not bolted on after the owner notices a gap. (2)
  **One-time audit:** walk the current UI surface control by control (sidebar toggle,
  layout/size controls, field-clear buttons, channel filter, Settings rows and its
  back/reconnect actions, context menus as they land per [[B-010]]/[[B-042]]) and either
  confirm each has a discoverable keyboard path or add one; refactor bindings that are
  inconsistent or hard to reach (e.g. no visible hint, buried behind a mouse-only
  hover). Update `ui.md`'s shortcut table and the in-app `?` help overlay to match
  whatever the audit lands on.
- **Code refs:** `.specs/ui.md` (§Keyboard shortcuts, §Accessibility — table + standing
  rule + audit note added); `src/ui/App.tsx` (new `s` sidebar-toggle binding; the
  priority-section/search-result rows made keyboard-reachable); `src/ui/FeedList.tsx`
  (`VideoRow`'s new `focusable` prop); `src/ui/HelpOverlay.tsx` +
  `src/ui/i18n/en.ts` (`s` added to the `?` overlay); `src/ui/AddAccount.tsx` (Esc-to-close,
  matching every other overlay).
- **Notes:**
  - **Audit findings, control by control:**
    - **Sidebar collapse/expand (B-037):** genuinely had zero keyboard path — fixed,
      bound to `s`.
    - **Layout/item-size toolbar (B-007):** the layout toggle is a real button (Tab +
      Enter); the size slider is a native `<input type="range">`, already arrow-key
      operable once focused — no code change needed, just confirmed.
    - **Field-clear buttons (B-033), channel filter (B-024):** already fine — real
      buttons, plus `Esc`-to-clear on the field itself. `c` (channel-filter focus)
      already existed in code and in the `?` overlay; it was only missing from
      `ui.md`'s table, now added.
    - **Settings rows, back/reconnect actions:** all real `<button>`/`<a>` elements,
      Tab-reachable — no gap, but see the new standing note in `ui.md` making this
      "Tab is a sufficient keyboard path for secondary screens" policy explicit rather
      than implicit.
    - **Channel/account `…` context menus (B-010/B-042/B-003, built this session):**
      already keyboard-operable without extra work — the trigger and every menu item
      are real `<button>`s (Tab + Enter/Space), and both menus already close on `Esc`
      (built alongside B-010/B-003, not new here).
    - **One real violation found and fixed:** the priority section's and search
      results' video rows (both built this session, B-042/B-009) were plain
      `<div onClick>` with **no keyboard path at all** — unlike the main `FeedList`,
      which has an equivalent (global `j`/`k`/`Enter` cursor navigation), these two
      lists have nothing else reaching them. Fixed via `VideoRow`'s new `focusable`
      prop (`role="button"`, `tabIndex`, Enter/Space activation) for the priority
      section, and the same pattern applied directly to the search-result row.
      Deliberately **not** applied to `VideoRow`/`VideoCard` inside the main virtualized
      `FeedList` itself — adding `tabIndex` there would make Tab cycle through
      potentially thousands of rows, which the existing cursor-navigation model is
      correctly designed to avoid.
    - Also fixed in passing: `AddAccount.tsx` (built alongside B-003, same session) had
      no `Esc`-to-close, inconsistent with every other overlay (Help, URL prompt) — added.
  - **The process half does not close with this batch, by design** — per the bug's own
    framing, "every new interactive control states its keyboard path before it's
    considered done" is now written into `ui.md` itself as a standing rule, not a
    one-time checklist item. Future sessions should treat it the same way CLAUDE.md's
    other standing conventions are treated.
  - No live-app check this session (keyboard reachability was verified by reading the
    DOM/handler structure, not by physically tabbing through a running window per
    [[no-live-app-verification]]); verified via
    `npm run typecheck && npm run lint && npm test` (171/171). The owner should validate
    live: actually Tab through the priority section and search results, confirm `s`
    toggles the sidebar, and skim the updated `?` overlay/`ui.md` table for accuracy.
- **Resolved:** 2026-07-12 · **Commit:** 9236344 · **Outcome:** Fixed

### B-003 — Multi-account model + optional authentication (Accounts in sidebar)
- **Type:** adjustment
- **Status:** Fixed (partial — see notes) · **Reported:** 2026-07-11
- **Area:** auth / ui-shell
- **What happens:** the app forces the connection wizard on first launch; only one
  account is supported.
- **Expected:** the app is usable authenticated or not (relates to D-033, accountless
  mode). Sidebar gains an **Accounts** section (placed before Settings) where the user
  adds one or several accounts. The wizard opens **in a modal**: first account ever gets
  the full Google Cloud console walkthrough (project + OAuth key); additional accounts
  skip that — just remind the user to add the new e-mail as a test user on the existing
  project, then run the connect flow. Feeds from all accounts are combined in listings,
  with the option to filter by account.
- **Code refs:** `src/adapters/storage/migrations.ts` (schema v6: `accounts` +
  `account_channels` junction table — D-040); `src/core/ports.ts` +
  `src/adapters/storage/repositories.ts`/`sync-repository.ts` (every feed/channel query
  threaded with an optional `accountId`, `EXISTS` subqueries not `JOIN`s, so a channel
  followed by two accounts never fans out into duplicate rows); `src/core/sync-service.ts`
  (`refresh`/`backfillArchive` take an `accountId`); `src/adapters/oauth/auth.ts`
  (`accountSecretKeys` — per-account refresh token/scopes, one shared `oauthClient`);
  `src/platform/main.ts` (the `AccountStack` registry — one `authFlow`/`authProvider`/
  `apiClient`/`syncService` per account, sharing the repo and quota counter; new
  `accounts:*` IPC surface); `src/ui/Sidebar.tsx` (the Accounts section); `src/ui/
  AddAccount.tsx` (new — the short add-account flow); `src/ui/App.tsx` (`accountFilter`,
  a second independent filter dimension alongside `channelFilter`).
- **Notes:**
  - **Not fully built as specced — scoped down deliberately, not by oversight:** "the app
    is usable authenticated or not" (fully accountless browsing) is D-033's territory, a
    separate, still-unimplemented decision — this bug's real, load-bearing ask was
    genuine **multi**-account support (several authenticated accounts), which is what's
    built. Zero-account/local-only-follow browsing remains future work.
  - **The wizard itself was never touched.** Rather than adding a "modal mode" with
    conditional step-skipping to the existing multi-step `Wizard.tsx` component, additional
    accounts get their own small, separate flow (`AddAccount.tsx`) — a reminder to add the
    new email as a Test user on the *same* Google Cloud project, then Connect. This still
    satisfies the bug's actual requirement (skip the console walkthrough for accounts
    after the first) without refactoring the wizard's step-sequencing logic to support two
    modes — see [[D-041]] for the reasoning.
  - **Schema (D-040):** the first design considered — a plain `account_id` column added to
    `channels` — was rejected mid-implementation: it would let a second account's
    subscribe silently overwrite the first account's row for the same channel (channel_id
    stays a single-owner primary key). The `account_channels` junction table is the only
    one of the two that's actually correct for two accounts following the same channel;
    channel facts (title, uploads playlist, RSS validators) stay shared/deduped in
    `channels`, matching D-029's existing "external channel" precedent.
  - **`video_state`/`videos` stay account-agnostic (D-003 extended, not superseded):**
    read/favorite/watch-later are the Chronicle user's own facts, not tied to whichever
    account's subscription surfaced a video. Two accounts following the same channel share
    one unread/favorite state per video, which is the intended behavior for one person
    running multiple YouTube accounts.
  - **One Google Cloud project, one quota pool, per-account tokens only** — this is what
    makes "just add a Test user" additional-account onboarding possible at all; confirmed
    against D-030's own framing, not a new assumption.
  - **[[D-041]] simplifications, all deliberate:** Settings' Connection section and the
    first-run wizard keep managing one "primary" account only, completely unchanged;
    the primary account can't be removed from the new Accounts section (Settings' existing
    Sign Out covers that case); subscribing to a channel found via search always
    subscribes under the primary account (no account picker); an action on a channel
    followed by more than one account (favorite/unsubscribe) applies to whichever account
    owns it first if there's more than one — a narrow edge case (two of *your own*
    accounts both following the identical channel).
  - No live-app check this session (needs the owner's second real Google account to
    verify end-to-end); verified via `npm run typecheck && npm run lint && npm test`
    (171/171), including new cross-account isolation tests (a channel followed by two
    accounts dedupes in the combined sidebar list but stays independent per account —
    unsubscribing one account never affects another following the same channel). The
    owner should validate live: adding a real second account (Test-user step included),
    the combined vs. account-filtered feed, and Remove/Sync now from the Accounts menu.
- **Resolved:** 2026-07-12 · **Commit:** 3b13f25 · **Outcome:** Fixed

### B-015 — App wrongly presents itself as read-only
- **Type:** bug · **Severity:** minor
- **Status:** Fixed · **Reported:** 2026-07-11
- **Area:** other (copy / scopes model)
- **What happens:** app copy states Chronicle is read-only.
- **Expected:** Chronicle is not read-only: subscribe, unsubscribe, comment, and like
  are all in scope (user-initiated — D-030/D-032). What actually happens is that OAuth
  permissions are added incrementally as the user first performs each write action
  (D-032). Fix the copy everywhere it appears (UI, wizard, docs) and make incremental
  scope consent the explicit model.
- **Code refs:** `src/ui/i18n/en.ts` (`wizard.step.enableApi.why`,
  `settings.connection.scopeName.*`/`scopeGrantedSuffix.*` — now two variants each,
  switched on granted scope); `src/ui/SettingsView.tsx` (renders the matching
  variant); `src/ui/App.tsx` (`onOpenSettings` refetches auth status so the copy
  never lags behind the last write action used); `src/ipc/contract.ts` +
  `src/platform/main.ts` (`AuthStatusDto.writeScopeGranted`, from
  `authFlow.hasWriteScope()`); `docs/setup.md` (§What Chronicle does and never
  does); `.specs/onboarding.md` (step 2's "why" copy).
- **Notes:**
  - **This was the last piece of D-032's settings-screen requirement** ("shows
    which scopes are currently granted... with a revoke link") — [[B-010]]'s notes
    had explicitly deferred the display half of that to this bug; the revoke link
    itself already existed.
  - **What was actually wrong, precisely:** not every "read-only" mention was
    false — the *initial* OAuth grant genuinely is readonly-only (D-032), so
    `docs/setup.md`'s Step 6 wording ("Grant the readonly scope") stayed
    untouched. The false claims were the ones stating or implying Chronicle can
    *never* write: `settings.connection.scopeGrantedSuffix` ("Chronicle never
    writes to your YouTube account"), the wizard's step-2 "why" copy ("read-only
    YouTube data" describing the *enabled API*, not just the initial scope — the
    same API also serves every write call), and `docs/setup.md`'s "That's all the
    readonly scope allows" line.
  - **Grep for the word alone would have over-corrected:** several hits were
    TypeScript's `readonly` keyword (arrays, class fields) or accurate
    descriptions of a specific *read* endpoint's scope requirement (e.g.
    `commentThreads.list`/`videos.getRating` genuinely only need the readonly
    scope) — left untouched, since flagging every occurrence of the substring
    would have been noise, not signal.
  - Settings' scope description was previously a **static string**, unable to
    ever reflect reality once write scope was granted — now it's derived from
    `authFlow.hasWriteScope()` live, refetched on every Settings open (not just
    app launch), so it can't silently go stale again the way the static copy did.
  - No live-app check this session; verified via
    `npm run typecheck && npm run lint && npm test` (162/162). The owner should
    validate live: that the Settings scope line actually flips after using
    Unsubscribe/Subscribe/Like/Comment, and re-read the wizard's step 2 copy for
    tone (it's necessarily a longer sentence now than the original one-liner).
- **Resolved:** 2026-07-12 · **Commit:** 4f786ce · **Outcome:** Fixed

### B-006 — Comments: read, add, reply; likes on videos and comments
- **Type:** adjustment
- **Status:** Fixed (partial — see notes) · **Reported:** 2026-07-11
- **Area:** player
- **Expected:** read the comment thread, post comments, reply to comments, like the
  video and like comments — all user-initiated (in scope per D-030/D-031/D-032 framing).
- **Code refs:** `src/adapters/youtube/api-client.ts` (`listComments`/`postComment`/
  `replyToComment` — `commentThreads`/`comments`; `rateVideo`/`getVideoRating` —
  `videos.rate`/`.getRating`); `src/ipc/contract.ts` (`CommentDto`, `VideoRatingDto`,
  five new channels); `src/platform/main.ts` (handlers — write actions gate on
  [[B-010]]'s incremental write-scope consent, reads don't); `src/ui/Comments.tsx`
  (new — the comment thread UI, one level of nesting per YouTube's own model);
  `src/ui/PlayerView.tsx` (Like action button + silent rating pre-fetch on open).
- **Notes:**
  - **Not fully buildable as specced — API gap, not a scope cut:** the public
    YouTube Data API v3 has **no endpoint to like a comment**, only videos
    (`videos.rate`). This was discovered while implementing, not assumed going in.
    Comment `likeCount` is shown (read from the API response) but there is no like
    button on a comment — there is nothing to call. Recorded as a permanent
    limitation in `decisions.md` (D-032), not a future TODO, since no amount of
    further work on Chronicle's side unlocks it.
  - **Read needs no write scope:** `commentThreads.list` works on the existing
    `youtube.readonly` grant — only posting a comment/reply and rating a video
    trigger [[B-010]]'s incremental write-scope flow (shared `AuthFlow` mechanism,
    same `youtube.force-ssl` scope covers subscribe/unsubscribe/comment/like).
  - **Rating fetch is silent by design:** `getVideoRating` runs automatically on
    every video open (1 unit, trivial even at high viewing volume — no manual gate,
    consistent with [[product-frictionless-over-quota]]) but failures (e.g. not
    connected) are swallowed rather than shown as a banner, since it's a passive
    background check, not a direct user action. Explicit actions (posting, rating)
    do surface errors — inline near the action bar for rating, inline in the
    comment composer for posting/replying.
  - **Comments are never stored locally** — always fetched live per player open,
    consistent with the local-only-state boundary (comments are YouTube's data,
    not Chronicle's).
  - No live-app check this session; verified via
    `npm run typecheck && npm run lint && npm test` (162/162). The owner should
    validate live: posting a real comment/reply, the Like button against a real
    account, and that the comment-like gap doesn't read as a bug to testers (worth
    a line in `docs/setup.md` or the help overlay if it comes up).
- **Resolved:** 2026-07-12 · **Commit:** 627f371 · **Outcome:** Fixed

### B-009 — Search all of YouTube, not only synced content
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-11
- **Area:** other (search)
- **What happens:** search/filter only covers synced channels' content.
- **Expected:** a scope option in the search/filter UI choosing between "my channels"
  and "all of YouTube" (D-031). From global results the user can open any video
  (D-029 already hydrates external videos), discover new channels, and subscribe to
  them (D-030).
- **Code refs:** `src/adapters/youtube/api-client.ts` (`search()` — `search.list`,
  100 units; `subscribe()` — `subscriptions.insert`, 50 units); `src/ipc/contract.ts`
  (`SearchResultDto`, `youtube:search`, `channel:subscribe`); `src/adapters/storage/
  repositories.ts` (`isSubscribed` — cross-references result channels against local
  state); `src/adapters/storage/sync-repository.ts` (`upsertSubscribedChannel`,
  reusing `applySubscriptions`' single-row upsert shape); `src/platform/main.ts`
  (both IPC handlers; subscribe fetches the uploads playlist and runs a
  channel-scoped sync right after, so videos appear without waiting); `src/ui/App.tsx`
  (the "Mine"/"YouTube" scope toggle next to the existing `/` filter, and a
  transient search-results list that replaces the feed while active).
- **Notes:**
  - **Explicit action, not live search:** per D-031, `search.list` only fires on
    Enter (never per keystroke) — it costs 100 units/call, ~100/day headroom at
    default quota. The scope toggle is hidden in a channel-filtered view (global
    search doesn't apply there); switching back to "Mine" or clearing the field
    drops any results.
  - **Search results are intentionally minimal:** video results are click-to-open
    only (no favorite/watch-later/mark-read buttons) — those actions upsert a
    `video_state` row with a foreign-key dependency on the `videos` table, which a
    fresh, never-opened search result doesn't have yet. Opening the video first
    (via the existing D-029 hydrate-on-open path) is what creates that row; acting
    on it from the player afterward already works unchanged. Channel results show
    only a Subscribe/Subscribed button, not a full channel view — browsing an
    unfollowed channel's own catalog is future scope, not this bug's ask.
  - **D-030's "Follow locally" mechanism is still not built** — this only
    implements "Subscribe on YouTube." Flagged in `decisions.md`.
  - Subscribing reuses [[B-010]]'s incremental write-scope consent
    (`AuthFlow.requestWriteScope()`/`hasWriteScope()`) — the same mechanism, same
    scope (`youtube.force-ssl` covers both insert and delete), so a user who's
    already unsubscribed something once won't see a second consent prompt when
    they later subscribe from search (or vice versa).
  - No live-app check this session; verified via
    `npm run typecheck && npm run lint && npm test` (156/156). The owner should
    validate live: a real `search.list` query against quota, the incremental
    write-scope popup on first subscribe (if not already granted via unsubscribe),
    and that a freshly subscribed channel's videos actually appear after the
    triggered sync.
- **Resolved:** 2026-07-12 · **Commit:** 76bf78e · **Outcome:** Fixed

### B-002 — Channel video list is truncated and does not paginate
- **Type:** bug · **Severity:** major
- **Status:** Fixed · **Reported:** 2026-07-11
- **Area:** feed
- **What happens:** a channel's video list shows only some videos and scrolling does not
  load more.
- **Expected:** scroll pagination per D-027 (keyset), same behavior as the main feed.
- **Code refs:** `src/core/sync-service.ts` (`backfillArchive` — the on-demand
  back-catalog fetch); `src/adapters/storage/migrations.ts` (schema v5,
  `channels.backfill_page_token`/`backfill_exhausted`); `src/core/ports.ts` +
  `src/adapters/storage/sync-repository.ts` (`getBackfillState`/`setBackfillState`);
  `src/ipc/contract.ts` (`channel:backfillArchive`); `src/ui/App.tsx` (`loadMore` —
  now triggers backfill when `nextCursor` is null in a channel-filtered view, then
  resumes the same page rather than resetting to the top).
- **Notes (diagnosis, 2026-07-11):** keyset pagination with a channel filter is
  **correct** — a regression test now pages a channel-filtered feed end-to-end
  (`repositories.test.ts`). The truncation is the *archive*, not the query: sync
  discovers via RSS (~15 entries/channel — the 2026-07-11 smoke's 3,261 videos across
  229 subs ≈ 14/channel confirms it), so the channel view already shows everything
  Chronicle has locally. The real fix is user-initiated back-catalog fetch (uploads
  playlist paging + hydration, ~2 units per 50 older videos) when scrolling past the
  local archive in a channel view — exactly what `feed.md`'s Backfill rules section
  had already sketched (`playlistItems.list` deeper-history-on-demand), now built.
- **Notes (fix, 2026-07-12):**
  - `SyncService.backfillArchive(channelId)` pages the channel's uploads playlist
    from a stored per-channel continuation cursor, skips already-known video ids
    (dedup against concurrent routine syncs), hydrates whatever is genuinely new,
    and persists both the next cursor and an `exhausted` flag once the whole
    playlist has been walked (checked client-side before every future call — no
    wasted request once exhausted).
  - Bounded at 4 pages (200 videos, 4 units) per scroll-triggered call — mirrors
    the existing `backfillGap`'s 200-video bound (`GAP_BACKFILL_MAX`) but as its
    own constant, since this is a distinct, resumable, on-demand path rather than
    routine sync's one-shot gap detection.
  - **UX detail worth flagging:** naively reloading the channel view after a
    successful backfill (`getFeed(view, null, channel)`) would have reset the
    user's scroll position to the top. Fixed by tracking the last cursor actually
    requested (`lastCursorRef`, distinct from `nextCursor`, which the backend sets
    to `null` once local data runs out) and resuming that exact page afterward, so
    backfilled results append seamlessly where the user was scrolling.
  - No live-app check this session (needs a real account with a channel whose
    archive exceeds the RSS window); verified via
    `npm run typecheck && npm run lint && npm test` (151/151). The owner should
    validate live: scrolling to the end of a deep channel's archive, that it
    resumes without jumping, and that quota accounting matches expectations.
- **Resolved:** 2026-07-12 · **Commit:** b9b6e00 · **Outcome:** Fixed

### B-042 — Favorite channels; a priority section for their recent videos at the top of the main feed
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** feed / ui-shell
- **What happens:** videos can be favorited (existing `favorite` video state, D-010),
  but channels cannot — there is no way to mark a whole channel as a priority, and the
  main feed has no way to surface favorited channels' videos ahead of everything else.
- **Expected:** the per-channel `…` context menu built in [[B-010]] (sidebar +
  channel screen, previously just Unsubscribe) gains a **Favorite** toggle. The main
  feed gains a section at the very top listing recent videos from favorited channels
  first, ahead of the normal chronological grouping (Today / Yesterday / This Week /
  Earlier, `feed.md`) — favorited-channel videos get priority placement, not a separate
  exclusive view.
- **Code refs:** `src/adapters/storage/migrations.ts` (schema v4, `channels.favorite`);
  `src/core/ports.ts` (`FollowedChannel.favorite`, `FeedRepository.toggleChannelFavorite`/
  `listPriorityVideos`); `src/adapters/storage/repositories.ts` (implementations);
  `src/core/feed-service.ts` (`FeedService.getPriorityVideos`, bucket-less like the
  watch-later queue); `src/ipc/contract.ts` (`ChannelDto.favorite`,
  `channel:toggleFavorite`, `feed:priority`); `src/ui/Sidebar.tsx` (Favorite/Unfavorite
  entry in the `…` menu, plus a ★ indicator on favorited channel rows);
  `src/ui/FeedList.tsx` (`VideoRow` exported for reuse); `src/ui/App.tsx` (the
  top-of-feed priority section — a small non-virtualized list reusing `VideoRow`
  directly, not merged into the main virtualized `FeedList`).
- **Notes:**
  - **D-039 (new decision, exercised in this change):** a favorited channel's video
    appears in **both** the priority section and its normal chronological bucket —
    duplicated, not moved. Consistent with D-010's orthogonal-flags model; see
    `decisions.md` and `feed.md`'s new "Favorited channels" subsection for the full
    rationale. This was the ambiguity the original bug entry flagged as needing a
    decision — resolved per the product owner's "resolve everything, I'll redirect if
    needed" instruction for this batch, not asked about individually.
  - **Architecture choice:** the priority section is a *separate* query
    (`listPriorityVideos`, capped at 20, unread-only) rendered as a plain list above
    the main `FeedList`, not spliced into the keyset-paginated feed's row/index space.
    Mirrors the existing Watch Later queue precedent (already a separate,
    non-paginated list) — far simpler than trying to merge two orderings into one
    cursor-paginated, keyboard-navigable index, and avoids a cross-page video-index
    resolution problem (a favorited channel's unread video could in principle sit
    outside the currently-loaded feed page).
  - Favoriting a channel does not change its sidebar sort order (still B-008
    freshest-first) and does not affect Favorites/Watch Later/Ignored views or a
    channel-filtered screen — it's specifically a main-feed ("all"/"unread")
    affordance, per `feed.md`.
  - No live-app check this session; verified via
    `npm run typecheck && npm run lint && npm test` (144/144). The owner should
    validate live: the priority section's placement/visibility, and that favoriting
    doesn't reorder the sidebar.
- **Resolved:** 2026-07-12 · **Commit:** 3880228 · **Outcome:** Fixed

### B-010 — Easy unsubscribe: channel screen + sidebar context menu
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-11
- **Area:** ui-shell
- **Expected:** an obvious Unsubscribe option on the channel screen, plus a `…` icon
  button per channel in the sidebar opening a context menu with Unsubscribe.
- **Code refs:** `src/ui/Sidebar.tsx` (`…` context menu, double-arm confirm, now fully
  i18n'd — its remaining hardcoded strings were folded in here rather than left for
  later, per the file being rewritten anyway); `src/ui/App.tsx` (topbar Unsubscribe
  button on the channel screen, same double-arm confirm as Settings' delete-all);
  `src/adapters/youtube/api-client.ts` (`unsubscribe()` — `subscriptions.delete`, 50
  units; `findSubscriptionId()` fallback lookup, 1 unit); `src/adapters/oauth/auth.ts`
  (`AuthFlow.requestWriteScope()`/`hasWriteScope()` — D-032 incremental consent, now
  implemented, not just specified); `src/adapters/oauth/google-oauth.ts`
  (`YOUTUBE_FORCE_SSL_SCOPE`, `include_granted_scopes`); `src/platform/main.ts`
  (`channel:unsubscribe` IPC handler ties it together); schema v3
  (`src/adapters/storage/migrations.ts` — `channels.subscription_id`).
- **Notes:** unsubscribing writes to YouTube — needed the write scope path (D-032),
  which this bug is the first caller of. Design points worth recording:
  - **`subscription_id` vs `channel_id`:** `subscriptions.delete` needs YouTube's
    subscription resource id, not the channel id — a gap the original code-refs
    didn't anticipate. Added as an optional `Channel.subscriptionId` field
    (`src/core/video.ts`) populated by `listSubscriptions()` and persisted in schema
    v3, so it costs nothing extra (same call already returns it). Channels synced
    before this migration have no cached id yet; `findSubscriptionId()` is a 1-unit
    fallback lookup (`subscriptions.list?mine=true&forChannelId=`) used only then —
    self-healing after this point since every future subscription sync populates it.
  - **Granted-scope tracking:** rather than a bare boolean, `AuthFlow` stores the
    scope string Google actually returned (`SECRET_KEYS.grantedScopes`) and
    `hasWriteScope()` checks it for `youtube.force-ssl` — truthful to what Google
    granted instead of trusting our own request succeeded exactly as asked.
    `signOut()` clears it, so reconnecting starts read-only again.
  - **Deferred to [[B-015]] on purpose:** the settings screen's granted-scopes
    display + revoke link (documented in `authentication.md` D-032) and the
    read-only copy fix are explicitly that bug's scope, not repeated here.
  - Confirmation UX reuses Settings' delete-all pattern (click arms, click again
    within 6s fires) rather than a native `confirm()` dialog, everywhere a
    destructive action needs a guard rail.
  - No live-app check this session (OAuth/quota need the owner's real credentials
    per [[no-live-app-verification]]) — verified via
    `npm run typecheck && npm run lint && npm test` (141/141). The owner should
    validate live: the incremental-consent browser popup, the fallback lookup path
    for pre-existing subscriptions, and that unsubscribing actually reflects on
    youtube.com.
- **Resolved:** 2026-07-12 · **Commit:** 54a90fb · **Outcome:** Fixed

### B-017 — Multi-language support via lang files (English only for now)
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-11
- **Area:** ui-shell / other (i18n)
- **Expected:** a language system where all UI strings live in lang files, loaded
  through an i18n layer — no hardcoded strings in components. Only English ships for
  now; the infrastructure makes future locales a file drop.
- **Code refs:** `src/ui/i18n/index.ts` (the `t(key, vars?)` function + `Dict`/
  `MessageKey` types), `src/ui/i18n/en.ts` (the single dict, ~200 keys); every
  component in `src/ui/` now imports `t` instead of inlining copy, plus
  `src/ui/format.ts`'s relative-date/view-count helpers.
- **Notes:** shipped as TypeScript dict modules (`en.ts`) rather than the originally
  sketched `lang/en.json` — same effect (one file holds every string, `Dict`'s keys
  are enforced at compile time so a locale file missing a key is a build error, not a
  silent runtime miss), but keeps strict-TypeScript parity checking instead of an
  untyped JSON import. A future locale is a new file with the same keys, switched in
  `activeDict` (`index.ts`) — no component changes. `Wizard.tsx` was indeed the
  largest surface (95 keys); `App.tsx` (32), `FeedList.tsx` (10), `PlayerView.tsx`
  (20), plus the smaller `HelpOverlay`/`Titlebar`/`UrlPrompt`/`ConnectPanel`/
  `SettingsView` (~45 combined) round it out. `Sidebar.tsx`'s few remaining literals
  are left for [[B-010]], which rewrites that file anyway (new copy is born
  localized from the start, per the batch-2-before-batch-3 rationale in
  `roadmap.md`). No UI component tests exist in this repo; verified via
  `npm run typecheck && npm run lint && npm test` (133/133) — no live-app check per
  this session's workflow, owner validates live.
- **Resolved:** 2026-07-12 · **Commit:** d4acaea · **Outcome:** Fixed

### B-041 — Settings screen sits flush left, almost touching the hamburger when the sidebar is collapsed
- **Type:** bug · **Severity:** minor
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** ui-shell
- **What happens:** with the sidebar collapsed ([[B-037]]), opening Settings renders
  `.settings-view` (and the banner above it, when present) almost touching the
  floating `.sidebar-expand` hamburger button in the top-left corner — the two nearly
  overlap.
- **Expected:** the same left clearance the feed screen already gets when collapsed
  (the hamburger has clear room, nothing crowds it), regardless of which screen
  (`feed` or `settings`) is showing.
- **Code refs:** `src/ui/styles.css` — generalized the `.app.sidebar-collapsed
  .topbar { padding-left: 52px }` reservation with two new rules:
  `.app.sidebar-collapsed .feed > .banner:first-child { margin-left: 52px }` (the
  banner only needs it when it's the very first thing in `.feed`, i.e. no topbar
  precedes it — which only happens on the Settings screen) and
  `.app.sidebar-collapsed .settings-view { padding-left: 52px }`.
- **Notes:** same root shape as [[B-037]]'s original overlap, just on the Settings
  screen instead of the feed topbar. No live-app check this session, owner validates
  live.
- **Resolved:** 2026-07-12 · **Commit:** d4acaea · **Outcome:** Fixed

### B-040 — More space between the Settings button and the channel list above it
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** ui-shell
- **What happens:** the Settings button sits in `.sidebar-footer`, a sibling right
  after `.channel-list` in the sidebar's flex column; `.sidebar-footer` had no CSS
  rule at all, so the visual gap between the last channel row and the Settings button
  was purely emergent from `.sidebar`'s `justify-content: space-between` and
  `.channel-list`'s `flex: 1` — with a long channel list (scrolled or not) the two
  ended up reading as touching.
- **Expected:** a visible, fixed margin/gap between the channel list and the Settings
  button, consistent with the sidebar's other section spacing.
- **Code refs:** `src/ui/styles.css` — new `.sidebar-footer { margin-top: 14px;
  border-top: 1px solid var(--border); padding-top: 10px }`, mirroring
  `.channel-list`'s own separator above it exactly.
- **Notes:** purely a spacing/polish tweak, no behavior change. No live-app check
  this session, owner validates live.
- **Resolved:** 2026-07-12 · **Commit:** d4acaea · **Outcome:** Fixed

### B-039 — Mouse "back" button (XButton1) should exit the player, like Esc or the Back button
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** player
- **What happens:** many mice have a dedicated back/side button (browsers bind it to
  history-back); Chronicle didn't listen for it, so it did nothing in the player.
- **Expected:** pressing the mouse back button while in the player closes the player
  and returns to the previous screen — the same action as pressing Esc or clicking the
  visible Back button ([[B-001]]).
- **Code refs:** `src/ui/PlayerView.tsx` — new `mouseup` listener (separate `useEffect`
  from the keydown handler) checking `event.button === 3`, calling the same `onClose`
  as Esc.
- **Notes:** browsers also fire an `auxclick`/`mouseup` with `button === 3` for
  XButton1; some mice map this to a "Backward" "navigate back" browser gesture instead
  of a plain button event. **Still needs live verification** of which event actually
  fires in Electron/Chromium on the owner's hardware, per
  [[no-live-app-verification]] — flagging here in case the owner finds the listener
  doesn't fire on their mouse, which would mean swapping to an `auxclick` listener or
  handling both.
- **Resolved:** 2026-07-12 · **Commit:** d4acaea · **Outcome:** Fixed

### B-037 — Collapsible sidebar: hamburger toggle, default open, auto-collapse in player
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** ui-shell / player
- **What happens:** the sidebar had no collapse control; it stayed at fixed width on
  every screen, including the player, where it ate into video width.
- **Expected:** a hamburger icon toggles the sidebar collapsed/expanded. Default is
  expanded on every screen. Entering the player view auto-collapses it (more room for
  the video); leaving the player restores the previous state. When collapsed, the
  sidebar fully disappears (width 0) rather than shrinking to an icon rail.
- **Code refs:** `src/ui/Sidebar.tsx` (`sidebar-header` hamburger button, `onToggleCollapse`
  prop); `src/ui/App.tsx` (`sidebarCollapsed` state, `toggleSidebar`, the `playerOpen`
  effect that auto-collapses on entry and restores the pre-player state via
  `sidebarBeforePlayerRef` on exit); `src/ui/styles.css` (`.sidebar-header`,
  `.sidebar-toggle`/`.sidebar-expand` — collapsed renders no `<aside>` at all, so there
  is no icon rail; a small floating `.sidebar-expand` button anchored to `.app`, now
  `position: relative`, is the only persistent control while collapsed).
- **Notes:** related to [[B-004]] (player always full width) and [[B-019]] (sidebar
  width) — this adds a third state (hidden) on top of both. No UI component tests exist
  in this repo; verified via `npm run typecheck && npm run lint && npm test` — no
  live-app check per this session's workflow, owner validates live.
  **Correction (2026-07-12, same day, from owner screenshots):** the floating
  `.sidebar-expand` button (`position: absolute; top: 10px; left: 10px` on `.app`)
  landed directly on top of `.topbar`'s own refresh button once the sidebar
  collapsed to width 0 — both icons rendered stacked in the same spot, reading as
  one garbled glyph. Fixed by giving `.app` a `sidebar-collapsed` class (`App.tsx`)
  that reserves left padding on `.topbar` (`padding-left: 52px`) so the two icons no
  longer overlap; also resized `.sidebar-toggle`/`.sidebar-expand` to match
  `.refresh` exactly (16px, `2px 6px` padding) and nudged `.sidebar-header`'s
  vertical position to line up with `.topbar`'s row when expanded, since the two
  were reading as visibly different heights.
- **Resolved:** 2026-07-12 · **Commit:** 6e6f674, e1c2c35 ·
  **Outcome:** Fixed

### B-038 — Player should default to the highest available quality (e.g. 1440p), not cap at 1080p
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** player
- **What happens:** the embedded player appeared to settle on 1080p even when a video
  has higher-resolution renditions (1440p/4K) available; quality was not forced.
- **Expected:** on load, the player should request the highest quality YouTube offers
  for that video, not rely on the iframe's own default selection (which favors
  bandwidth/viewport heuristics over "best available").
- **Code refs:** `src/ui/PlayerView.tsx` (`announce()` now sends `setPlaybackQuality`
  with `'highres'` right after the `listening` handshake; the `onStateChange` handler
  re-issues the same command when state becomes `1` (playing), the widget protocol's
  `onMessage` effect now depends on `command`).
- **Notes:** YouTube's IFrame API only takes a suggested quality, not a hard guarantee
  — the re-issue on playback start is a best-effort hedge against YouTube resetting to
  a bandwidth heuristic once the stream actually begins, since a single call right after
  `onReady` was the originally-suspected gap. **Needs live verification** (owner to
  confirm quality actually sticks across a real video) — per
  [[no-live-app-verification]] this isn't tested by running the app here.
- **Resolved:** 2026-07-12 · **Commit:** 6e6f674 ·
  **Outcome:** Fixed

### B-007 — List vs. grid view toggle + item-size control, inline in the listing
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-11
- **Area:** feed
- **Expected:** the user chooses between the current list layout and a grid layout for
  videos, persisted across restarts; plus a file-explorer-style control for item size,
  shared by both layouts, controllable from the listing itself (not buried in Settings).
- **Code refs:** `src/platform/settings-store.ts` (`layout: 'list' | 'grid'` default
  `list`, `itemSize: 'small' | 'medium' | 'large'` default `medium` — supersedes the
  old two-step `density`); `src/ipc/contract.ts` (`SettingsDto.layout`/`.itemSize`);
  `src/ui/App.tsx` (default settings state; `.layout-toggle` icon button and
  `.size-slider` range input, both in the feed topbar); `src/ui/FeedList.tsx` (grid
  rendering: `buildCardRows` chunks consecutive video rows into `columns`-wide card
  rows per bucket, column count tracked via `ResizeObserver` on the scroll container,
  `ROW_HEIGHTS`/`GRID_CARD_SIZES` keyed by `ItemSize`, virtualizer re-measures on
  layout/size/column changes, new `VideoCard` component reusing
  `VideoActions`/thumbnail cache); `src/ui/styles.css` (`.grid-row`, `.card`,
  `.layout-toggle`, `.size-slider`, `.feed-scroll.size-*` and related classes);
  `src/ui/SettingsView.tsx` (the old "Feed density"/"Feed layout" Settings rows were
  removed — both controls now live only in the topbar).
- **Notes:** reverses the "one column; no masonry/grid" clause of `ui.md`'s Layout
  decision and supersedes D-022's two-step density — captured together as **D-037**
  (`decisions.md`, `ui.md` updated in the same change). List/medium stay the
  defaults; grid and the size steps are opt-in. Both layouts share the same row
  data, virtualization, and per-video actions — grid is a rendering mode of
  `FeedList`, not a second component. No UI component tests exist in this repo
  (`src/ui/` has none); verified via `npm run typecheck && npm run lint && npm test`
  — no live-app check per this session's workflow, owner validates live.
  **Two same-day corrections from live owner feedback:** (1) the first pass put the
  layout choice in Settings → Appearance, mirroring the old density select — the
  owner wanted it in the listing itself, so it moved to an icon toggle (`⊞`/`☰`) in
  the topbar and the Settings row was removed; (2) the owner then asked for an
  item-size control too, "like a file explorer," covering both layouts — added as a
  small/medium/large slider next to the layout toggle, replacing the old
  list-only density setting entirely rather than keeping two overlapping controls.
  **Third same-day follow-up (2026-07-12):** the owner reported grid-mode thumbnails
  not fitting their card at non-medium sizes, and asked for finer size granularity
  (5 steps, largest step bigger than the rest) and a pointer cursor over video items.
  Root cause of the fit bug: `.feed-scroll.size-small .thumb`/`.size-large .thumb`
  (3-class selectors) beat `.card-thumb-wrap .thumb` (2-class, meant to keep the grid
  thumbnail at `width: 100%`) by CSS specificity — `.thumb` is shared by both the list
  row and the grid card, so the row-only override was leaking into the grid and
  forcing the grid thumbnail to a small fixed pixel width. Fixed by scoping those
  overrides to `.row .thumb`. Steps widened from 3 (`small/medium/large`) to 5
  (`xs/small/medium/large/xl`); `xl` is a deliberately bigger jump than the other,
  roughly-uniform steps. Also added `cursor: pointer` to `.row`/`.card` (both open the
  video on click), with `cursor: default` kept on the non-clickable "ignored, undo"
  strip.
- **Resolved:** 2026-07-12 · **Commit:** 61c9563, 462b054 ·
  **Outcome:** Fixed

### B-028 — Show Shorts in the feed, marked and filterable (reverses D-028)
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** feed
- **What happens:** Shorts from subscribed channels were unconditionally excluded from
  every view per D-028 (Final) — detected via duration + `/shorts/{id}` HEAD check and
  dropped before they ever reached the UI (`feed.md` §Shorts exclusion).
- **Expected:** owner's proposal — since the feed only ever shows content from channels
  the user chose to follow, excluding Shorts outright works against the "agency, not
  austerity" test (who is driving — the user, or the app filtering on their behalf?).
  Keep Shorts in the feed, tag them visibly in the listing (a "Short" badge next to the
  duration), and add a user-controlled filter/toggle to show or hide them.
- **Code refs:** `src/core/video.ts` (`Video.isShort`); `src/adapters/storage/repositories.ts`
  (`shortsFilter`, threaded through `listPage`/`listWatchLaterQueue`/`countWatchLater`/
  `countUnread`/`countUnreadSince`/`listFollowedChannels`); `src/core/ports.ts`
  (`FeedRepository` — new `showShorts?` param); `src/core/feed-service.ts` (`getSlice`);
  `src/ipc/contract.ts` (`FeedVideoDto.isShort`, `SettingsDto.showShorts`);
  `src/platform/main.ts` (`toSliceDto`, `getFeed`/`getFeedMeta`/`getChannels` handlers
  read `settings.showShorts`); `src/platform/settings-store.ts` (`showShorts`, default
  `true`); `src/ui/SettingsView.tsx` ("Show Shorts" toggle); `src/ui/FeedList.tsx`
  (`.short-badge`); `src/ui/App.tsx` (`changeSettings` re-fetches on toggle, since this
  setting affects server-side counts, unlike the display-only settings).
- **Notes:** this directly reverses **D-028 (Final)**, now superseded by **D-035** —
  see `decisions.md`, `non-goals.md`, and `feed.md` §Shorts (renamed from §Shorts
  exclusion), all updated in the same change. The detection pipeline itself (duration
  candidate + HEAD confirmation, `is_short` caching) is untouched — only the display
  policy reversed, from unconditional exclusion to shown-by-default-with-a-toggle,
  mirroring [[B-029]]'s "on by default, toggle to hide" shape. Dev fixtures
  (`src/platform/dev-fixtures.ts`) now seed ~8% confirmed Shorts so the badge/toggle
  have something to exercise in `npm run dev`.
- **Resolved:** 2026-07-12 · **Commit:** 9be2d72 · **Outcome:** Fixed

### B-036 — Refresh while viewing a channel should sync only that channel
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** sync
- **What happens:** clicking Refresh always ran the full subscription sync
  (`window.chronicle.refreshFeed()` → `feed:refresh` → `SyncService.refresh()` over
  every followed channel), even when the user was inside a single channel's filtered
  view.
- **Expected:** when a channel filter is active, Refresh syncs only that channel
  instead of the whole subscription list.
- **Code refs:** `src/ui/App.tsx` (`doRefresh` passes `channelFilter`);
  `src/ipc/contract.ts` (`refreshFeed(channelId?)`); `src/platform/preload.ts`;
  `src/platform/main.ts` (`runRefresh(trigger, channelId?)`, the `feed:refresh`
  handler parses it via `parseChannelId`); `src/core/sync-service.ts`
  (`refresh(trigger, channelId?)` skips `syncSubscriptions()` and scopes
  `listSubscribedChannels`/`shortCandidates` to the one channel when set);
  `src/core/ports.ts` + `src/adapters/storage/sync-repository.ts` (`channelId?` param
  on both).
- **Resolution:** matches the diagnosis in the original report — internals already
  isolated per-channel work, so this was exposing a scoped path through the IPC
  contract and repository queries, not new sync logic. Covered by a new
  `sync-service.test.ts` case asserting no subscription re-list and no cross-channel
  Shorts-candidate touch when scoped.
- **Resolved:** 2026-07-12 · **Commit:** 9be2d72 · **Outcome:** Fixed

### B-022 — Delete all data: app relaunches into a frozen/blank screen instead of a clean state

See **In progress** above — a second fix attempt landed this session (dev renderer URL
now travels through relaunch `args`, not just env-inheritance) but stays open pending a
live re-test; not moved to Resolved.

### B-032 — Video description: overflow sometimes cut off with no expand toggle
- **Type:** bug · **Severity:** minor
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** player
- **What happens:** the clamp-with-"Show more" behavior delivered for [[B-005]] wasn't
  always showing the toggle — the description got visually cut off at the clamp with
  no way to expand it.
- **Expected:** whenever the description text actually overflows the clamped height,
  the Show more/Show less toggle must appear.
- **Code refs:** `src/ui/PlayerView.tsx` (`Description` component's overflow-measuring
  `useEffect`).
- **Resolution:** the single synchronous measurement right after mount could run
  before web fonts finished loading or before the container's final width settled
  (sidebar toggle, window resize) — both change line-wrapping and therefore whether
  the clamp actually cuts text off. Now re-measures via `requestAnimationFrame`, on
  `document.fonts.ready`, and on a `ResizeObserver` watching the element, in addition
  to the immediate measurement.
- **Resolved:** 2026-07-12 · **Commit:** 9be2d72 · **Outcome:** Fixed

### B-033 — Clear ("×") button inside filter/search fields when they have text
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** ui-shell
- **What happens:** the sidebar channel-filter box and the topbar feed-filter box
  (`/`) only cleared via Escape or manual backspacing — no visible affordance.
- **Expected:** an inline × button appears inside the field once it has text, clicking
  it clears the field (and refocuses it), mirroring the existing Escape behavior.
- **Code refs:** `src/ui/Sidebar.tsx`, `src/ui/App.tsx` (both inputs wrapped in a new
  `.field-wrap`); `src/ui/styles.css` (`.field-wrap`, `.field-clear`).
- **Resolution:** as described; both fields share the same wrapper/button pattern.
- **Resolved:** 2026-07-12 · **Commit:** 9be2d72 · **Outcome:** Fixed

### B-034 — Thumbnail opacity: keep at full opacity, not dimmed by default
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** feed
- **What happens:** feed-row thumbnails rendered at `opacity: 0.72` by default, rising
  to `1` only on hover/selection (the D-023 "muted thumbnail" prototype).
- **Expected:** thumbnails render at normal (full) opacity always — no dimmed resting
  state.
- **Code refs:** `src/ui/styles.css` (`.thumb`).
- **Resolution:** dropped `opacity: 0.72` and the now-moot hover/selected override.
  Revisits **D-023**, updated in `decisions.md` from Pending to Final (rejected — see
  `ui.md`).
- **Resolved:** 2026-07-12 · **Commit:** 9be2d72 · **Outcome:** Fixed

### B-035 — "All caught up" message duplicated (topbar status + banner below)
- **Type:** bug · **Severity:** minor
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** ui-shell / feed
- **What happens:** when caught up, the same message rendered twice: once as the
  topbar status text next to the view title, and again as a `.caught-up` block at the
  top of the feed region.
- **Expected:** keep only the first occurrence (topbar status); remove the second.
- **Code refs:** `src/ui/App.tsx` (removed the `.caught-up` block); `src/ui/styles.css`
  (removed the now-unused `.caught-up` rule).
- **Resolved:** 2026-07-12 · **Commit:** 9be2d72 · **Outcome:** Fixed

### B-030 — Enter in the channel-filter search opens the first matching channel
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** ui-shell
- **What happens:** typing in the sidebar's "Find channel" box (B-024) filtered the
  channel list; pressing Enter just blurred the field and did nothing else.
- **Expected:** pressing Enter opens (selects) the first channel in the filtered
  results, same intent as a normal search-and-go field.
- **Code refs:** `src/ui/Sidebar.tsx` (`onKeyDown` on `.channel-query`).
- **Resolution:** Enter now calls `onSelectChannel(visibleChannels[0].channelId)` when
  there's a match, then blurs (unchanged when there's no match).
- **Resolved:** 2026-07-12 · **Commit:** 9be2d72 · **Outcome:** Fixed

### B-031 — System-wide scrollbar: minimalist style
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** ui-shell
- **What happens:** scrollbars used the OS/Electron default everywhere.
- **Expected:** a slim, minimalist scrollbar treatment applied app-wide (thin track,
  subtle thumb, no arrow buttons), consistent with the RSS-reader aesthetic in
  `ui.md`.
- **Code refs:** `src/ui/styles.css` (new global `::-webkit-scrollbar` rule set plus
  the standards-track `scrollbar-width`/`scrollbar-color` for Firefox parity).
- **Resolution:** thin (10px) scrollbars, transparent track, a subtle
  `var(--border)`-colored thumb that darkens on hover — theme-aware via the existing
  custom properties, so light/dark both fall out for free.
- **Resolved:** 2026-07-12 · **Commit:** 9be2d72 · **Outcome:** Fixed

### B-029 — View counts should show by default, not be an opt-in setting
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** ui-shell / feed
- **What happens:** the "Show view counts" toggle in Settings defaulted to off, so
  feed rows hid view counts unless the user found and flipped the setting.
- **Expected:** view counts show by default; the toggle stays, to hide them if wanted.
- **Code refs:** `src/platform/settings-store.ts` (`DEFAULT_SETTINGS.showViewCounts`);
  `src/ui/App.tsx` (matching initial state).
- **Resolution:** flipped the default to `true`, kept the toggle. Revisits D-018,
  updated in `decisions.md` from Pending to Final (view counts on by default).
- **Resolved:** 2026-07-12 · **Commit:** 9be2d72 · **Outcome:** Fixed

### B-027 — Refresh button spin animation rotates the whole button, not just the icon
- **Type:** bug · **Severity:** minor
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** ui-shell
- **What happens:** while a sync was in progress, the `spinning` class applied
  `animation: spin` to the `.refresh` button element itself — background, border and
  all — instead of just the glyph inside it.
- **Expected:** only the icon/glyph rotates; the button's background, border, and
  hit-area stay static during refresh.
- **Code refs:** `src/ui/App.tsx` (glyph wrapped in its own `<span className="refresh-
  icon">`); `src/ui/styles.css` (`.refresh-icon`, `.refresh-icon.spinning` — the spin
  animation moved off `.refresh`).
- **Resolved:** 2026-07-12 · **Commit:** 9be2d72 · **Outcome:** Fixed

### B-026 — Minimize button is broken on niri (Wayland)
- **Type:** bug · **Severity:** minor
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** ui-shell
- **What happens:** clicking the custom titlebar's Minimize button (B-014) does not
  work correctly on the product owner's system (niri, a scrolling-tiling Wayland
  compositor).
- **Expected:** either minimize works, or the control isn't offered where it can't.
- **Code refs:** `src/platform/preload.ts` (`minimizeSupported`); `src/ipc/contract.ts`
  (`ChronicleApi.minimizeSupported`); `src/ui/Titlebar.tsx` (conditional render).
- **Notes:** scrolling/tiling Wayland compositors (niri, and by the same documented
  design stance sway/i3) don't implement window minimization — there's no "iconified"
  state in a model built around columns/workspaces rather than a taskbar, so an
  `xdg_toplevel.set_minimized` request there is at best a silent no-op and at worst
  leaves the window in a state the user can't get back from (matches "quebra" — it
  doesn't just fail quietly). Native GTK/Qt apps solve this by querying the
  compositor's `xdg_toplevel.wm_capabilities` (part of newer xdg-shell versions) and
  hiding controls it doesn't support; Electron does not expose that capability query
  to app code, so a real capability check isn't available here. This mirrors why B-014's
  own resolution already flagged niri/Wayland as the risky surface for this app's
  frameless shell.
- **Resolved:** 2026-07-12 · **Commit:** (pending — implemented same session as the
  B-021 revision above) · **Outcome:** Fixed
- **Resolution:** best-effort, not a real capability check: `preload.ts` detects niri
  via the `NIRI_SOCKET` env var it sets for its own IPC, and `Titlebar.tsx` hides the
  Minimize button when set (Maximize/restore and Close are unaffected — both are
  meaningful even in niri's scrolling model). **Needs live validation** on the product
  owner's system — this session has no display to exercise it against.

### B-018 — Settings gear icon is too small
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** ui-shell
- **What happens:** the ⚙ gear glyph on the Settings sidebar entry renders too small.
- **Expected:** the gear reads at a glance, sized consistently with the sidebar's other
  key-slot glyphs.
- **Code refs:** `src/ui/Sidebar.tsx` (Settings entry key slot); `src/ui/styles.css`
  (sidebar key-slot sizing).
- **Notes:** follow-up to [[B-013]], which introduced the glyph.
- **Resolved:** 2026-07-12 · **Commit:** 877a30d · **Outcome:** Fixed
- **Resolution:** `.view-key.gear` bumps the glyph to label-size, full opacity.

### B-019 — Sidebar column should be ~50% wider
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** ui-shell
- **What happens:** the left sidebar column is too narrow for comfortable reading of
  channel names and counts.
- **Expected:** widen the sidebar by roughly 50% over today's width (210px → ~315px).
- **Code refs:** `src/ui/styles.css` (`.sidebar` width; check dependent widths in the
  sidebar block, e.g. channel-name truncation).
- **Notes:** with [[B-008]] the sidebar now carries per-channel unread counts, which
  makes the extra room more valuable.
- **Resolved:** 2026-07-12 · **Commit:** 877a30d · **Outcome:** Fixed
- **Resolution:** `.sidebar` width is now 315px; channel-name ellipsis truncation
  already handled the new width, no further changes needed.

### B-020 — Mark all as read (global and per channel); auto-read backlog on first connect
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** feed
- **What happens:** there is no bulk way to clear unread state — a new user (or a user
  returning after a while) faces hundreds of unread videos and can only mark them one
  by one.
- **Expected:** a "mark all as read" action on the full feed and on a channel-filtered
  view (sets `read_status: unread → read` for the visible scope, D-010). Additionally,
  when connecting a new account, mark all videos published before today as read, so the
  user starts from "what's new" instead of an unclearable backlog.
- **Code refs:** `src/adapters/storage/repositories.ts` (`markManyRead`, a bulk
  insert-or-update over `video_state`); `src/core/ports.ts` (`FeedRepository`);
  `src/ipc/contract.ts` (`state:markAllRead`); `src/ui/App.tsx` (topbar "Mark all as
  read" button, scoped to the current view/channel); `src/core/sync-service.ts`
  (`SyncReport.firstSync`); `src/platform/main.ts` (`runRefresh` applies the backlog
  read right after a `firstSync` report, before broadcasting `refresh:done`).
- **Notes:** consistent with D-010 semantics (manual and automatic marking are
  indistinguishable). **Product owner confirmed 2026-07-12: the connect-time backlog
  auto-read is silent** (no confirmation prompt) — the user opens straight onto "what's
  new". The cutoff is `core/feed.ts`'s new `startOfToday()`, the same local-calendar-day
  boundary `bucketOf` uses for "Today", so the auto-read and the feed agree on what
  counts as "before today". Gated on `SyncReport.firstSync` (true only when
  `subscriptions_synced_at` was null before the run), so it never re-fires on later
  syncs. Relates to [[B-008]] (sidebar unread counts).
- **Resolved:** 2026-07-12 · **Commit:** 877a30d · **Outcome:** Fixed
- **Resolution:** as described above; covered by repository + sync-service tests.

### B-021 — New subscriptions take up to a week to appear; no manual subscription refresh
- **Type:** bug · **Severity:** major
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** sync
- **What happens:** subscribing to a new channel on YouTube is only picked up by the
  automatic weekly subscription re-list — up to 7 days of latency. The manual feed
  refresh does not help: it goes through the same weekly gate. The manual "Refresh
  subscriptions" action specced in `youtube-api.md` §Subscription import & sync was
  never implemented.
- **Expected:** subscriptions are re-listed on every sync — no gate, no separate manual
  action, so a new channel shows up on the very next sync (launch, manual, or timer
  alike). Cost per run at ~230 subs: ~5 units (`subscriptions.list`, 1 unit per 50) —
  cheap enough at any reasonable refresh interval to just always do it.
- **Code refs:** `src/core/sync-service.ts` (`syncSubscriptions`, called
  unconditionally from `refresh` — no more `syncSubscriptionsIfDue` gate);
  `src/ui/SettingsView.tsx` (Sync section copy only, no button/action).
- **Notes:** verified 2026-07-12 by code inspection: `syncSubscriptionsIfDue` returned
  early unless 7 days had passed since `subscriptions_synced_at`, regardless of
  trigger. **First iteration** added a gated weekly re-list plus a manual "Refresh
  subscriptions" button (per the then-current `youtube-api.md` text) — the **product
  owner rejected that as friction** ("não gostei de ter uma opção separada... precisa
  ser automática junto com qualquer sync") and separately said not to over-index on
  quota conservatism ("vc tá se prendendo mto a regra de limitar uso de API... eu
  preciso que a ferramenta seja simples"). Revised same day to always re-list on every
  sync, gate and button both removed; `youtube-api.md` §Subscription import & sync
  updated to match and records the rationale.
- **Resolved:** 2026-07-12 · **Commit:** 877a30d, amended same day (see note above) ·
  **Outcome:** Fixed

### B-023 — First sync after a fresh setup doesn't refresh the UI; spinner spins forever
- **Type:** bug · **Severity:** major
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** sync / ui-shell
- **What happens:** starting from scratch, the initial sync fetches the channels and
  finishes, but the list never appears — the refresh button keeps spinning and only a
  manual reload (F5) shows the feed.
- **Expected:** when the first sync completes, the feed and sidebar populate on their
  own and the spinner stops — same behavior as any later `refresh:done`.
- **Code refs:** `src/platform/main.ts` (`runRefresh`); `src/ipc/contract.ts`
  (`ChronicleEventDto`, new `refresh:failed` variant); `src/ui/App.tsx` (`onEvent`,
  new `syncMeta()` helper); `src/ui/onboarding/Wizard.tsx` (`FirstSyncStep`).
- **Notes:** found the actual defect by code inspection, not guesswork: `runRefresh`'s
  generic error path (any failure that isn't `auth-expired`) returned
  `{ok:false, errorKind:'internal', ...}` to the caller but **never broadcast any
  event**. Since first syncs are almost always triggered fire-and-forget
  (`void window.chronicle.refreshFeed()` from the wizard's `FirstSyncStep`, or
  `connectGoogle`'s internal `void runRefresh('manual')`), nobody was awaiting that
  return value — the renderer had already flipped `refreshing` to `true` on
  `refresh:started` and then never got a terminal event to flip it back on an
  unexpected internal error (very plausible on an account's first sync: 229 channels,
  ~937 Shorts probes, more surface for a transient failure than any later sync).
- **Resolved:** 2026-07-12 · **Commit:** 877a30d · **Outcome:** Fixed
- **Resolution:** added `refresh:failed` to the event union, broadcast from that
  previously-silent catch branch; `App.tsx` handles it (clears the spinner, shows a
  banner) and gained a `syncMeta()` helper that reconciles `refreshing` against a new
  `FeedMetaDto.refreshing` field on every feed-meta fetch — a self-healing net for any
  other case a terminal event goes missing. Wizard's `FirstSyncStep` also handles
  `refresh:failed` (shows the error, offers "Try again") instead of hanging on
  "Working…" forever.

### B-024 — Small search/filter field at the top of the sidebar channel list
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** ui-shell
- **What happens:** with a couple hundred subscriptions, finding one channel in the
  sidebar means scrolling the whole list.
- **Expected:** a small text field at the top of the channel list that filters it as
  you type (local, name substring match — this is a filter over the user's own
  subscriptions, not YouTube search, which is [[B-009]]).
- **Code refs:** `src/ui/Sidebar.tsx` (channel list rendering); `src/ui/styles.css`
  (sidebar block); channel list data already comes sorted from `listFollowedChannels`
  (`src/core/ports.ts` / `src/adapters/storage/repositories.ts`) — filtering can stay
  in the UI.
- **Notes:** keyboard-first (ui.md): the field should be reachable by shortcut and
  Escape should clear it. Pairs with [[B-019]] (wider sidebar).
- **Resolved:** 2026-07-12 · **Commit:** 877a30d · **Outcome:** Fixed
- **Resolution:** local substring filter over `channels` in `Sidebar.tsx`; `c` focuses
  the field app-wide (added to the help overlay), Escape (handled locally on the input,
  not App's global handler, so it doesn't also clear the feed's `/` filter) clears it
  and blurs.

### B-025 — Counter on the Watch Later sidebar entry
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** ui-shell
- **What happens:** the Watch Later entry in the sidebar gives no hint of how many
  videos are queued.
- **Expected:** the Watch Later entry shows its queue size, in the same visual style as
  the per-channel unread counts ([[B-008]]).
- **Code refs:** `src/ui/Sidebar.tsx` (views list — `watch-later` entry);
  `src/ipc/contract.ts` + `src/core/ports.ts` (`FeedRepository.countWatchLater`);
  `src/adapters/storage/repositories.ts` (`countWatchLater`, mirrors the queue
  predicate); `src/platform/main.ts` (`getFeedMeta` now returns `watchLaterCount`).
- **Notes:** update on `refresh:done` and on `toggleWatchLater`, so the number never
  goes stale. This is a static queue-size count, not an engagement nudge — it changes
  only by the user's own actions.
- **Resolved:** 2026-07-12 · **Commit:** 877a30d · **Outcome:** Fixed
- **Resolution:** folded into `FeedMetaDto` (alongside the new `refreshing` field from
  [[B-023]]) rather than a separate IPC round-trip, since `App.tsx` already refreshes
  feed meta on every state change and on `refresh:done`.

### B-014 — Remove Electron toolbar; custom window controls in the layout
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-11
- **Area:** ui-shell
- **What happens:** the app shows the default Electron/system toolbar.
- **Expected:** frameless window; close and maximize buttons rendered as part of
  Chronicle's own layout instead of the system chrome.
- **Code refs:** `src/platform/main.ts` (`new BrowserWindow(...)` — `frame` /
  `titleBarStyle` options); new window-controls component under `src/ui/`;
  `src/ui/styles.css` (`-webkit-app-region` drag zones).
- **Resolved:** 2026-07-11 · **Commit:** 983e6b5 · **Outcome:** Fixed
- **Resolution:** `frame: false` (macOS keeps native traffic lights via
  `titleBarStyle: 'hidden'`); a 34px drag-strip titlebar (`src/ui/Titlebar.tsx`) hosts
  minimize / toggle-maximize / close through a validated `window:control` IPC channel.
  **Needs live validation on niri/Wayland** (drag regions and client-side decorations
  are the risky part).

### B-012 — Settings → Reconnect drops into wizard step 7
- **Type:** bug · **Severity:** minor
- **Status:** Fixed · **Reported:** 2026-07-11
- **Area:** auth / onboarding
- **What happens:** clicking Reconnect in Settings routes to the onboarding wizard at
  step 7 (reconnection).
- **Expected:** the button starts the Google login directly — no wizard detour.
- **Code refs:** the M5 Settings view (not on the M4-based branch at time of writing);
  `src/ui/onboarding/Wizard.tsx` (step-7 reconnect entry being bypassed);
  `src/adapters/oauth/auth.ts` (direct login flow to call instead).
- **Resolved:** 2026-07-11 · **Commit:** 16da3e8 · **Outcome:** Fixed
- **Resolution:** Settings → Reconnect now calls the direct Google login (`connect`),
  bypassing the wizard. This amends the M5 re-entry design ("Reconnect→7") —
  `onboarding.md` §Re-entry points updated in the same change; step 7 stays reachable
  through wizard failure routing.

### B-011 — Always sync on launch; expired connection shows a direct Reconnect button
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-11
- **Area:** sync / auth
- **Expected:** every launch triggers a sync (launch refresh exists per D-016 — verify
  it always fires). If the connection is expired, show a Reconnect button that goes
  straight into the reconnect flow (Google login), not into the wizard. Same direct
  flow as [[B-012]].
- **Code refs:** `src/platform/main.ts` (startup validation + refresh timer wiring);
  `src/core/sync-service.ts`; `src/ui/ConnectPanel.tsx` + `src/ui/App.tsx`
  (auth-expired banner / reconnect button); `src/adapters/oauth/auth.ts` (login flow).
- **Resolved:** 2026-07-11 · **Commit:** 16da3e8 · **Outcome:** Fixed
- **Resolution:** the launch refresh had a 10-minute staleness guard — removed, so
  every launch syncs (RSS conditional GETs make a no-change pass ~0 quota;
  `youtube-api.md` §Refresh policy updated). The auth-expired banner already ran the
  direct login; no change needed there.

### B-008 — Sidebar channel list: sort by most recent video + unseen count
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-11
- **Area:** ui-shell / feed
- **What happens:** the left channel list is sorted alphabetically.
- **Expected:** sorted by most recent video (channels with fresh content on top), with
  the channel's unseen-video count shown next to it.
- **Code refs:** `src/ui/Sidebar.tsx` (channel list); `src/adapters/storage/repositories.ts`
  (channel listing query — needs latest-video ordering + unseen count);
  `src/ipc/contract.ts` (channel DTO).
- **Resolved:** 2026-07-11 · **Commit:** 708c286 · **Outcome:** Fixed
- **Resolution:** `listFollowedChannels` returns `FollowedChannel` (latest non-Short
  `published_at` + unread count mirroring the unread view predicate), freshest-first
  with empty channels last; sidebar shows the count badge. Covered by a repository
  test.

### B-005 — Description always visible, clamped to N lines with expand
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-11
- **Area:** player
- **Expected:** the video description is always visible up to a fixed number of lines;
  a "show more" affordance expands it when it is longer.
- **Code refs:** `src/ui/PlayerView.tsx` (description block); `src/ui/styles.css`
  (line clamp).
- **Resolved:** 2026-07-11 · **Commit:** b857f40 · **Outcome:** Fixed
- **Resolution:** description renders clamped to 5 lines by default; Show more / Show
  less appears only when the text actually overflows the clamp.

### B-004 — Content should fill the available screen; player always theater-width
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-11
- **Area:** ui-shell / player
- **What happens:** the usable area is not well optimized; content doesn't occupy the
  available width.
- **Expected:** main content stretches to the available area. The video player always
  renders in the equivalent of theater mode, taking the full horizontal width.
- **Code refs:** `src/ui/styles.css` (shell/layout widths); `src/ui/App.tsx` (shell
  structure); `src/ui/PlayerView.tsx` (player sizing).
- **Resolved:** 2026-07-11 · **Commit:** 4ac18c4 · **Outcome:** Fixed
- **Resolution:** dropped the 900px feed column cap and the 1080px player caps; the
  stage spans full width with a viewport height cap (YouTube letterboxes inside the
  iframe on wide/short windows — theater behavior).

### B-013 — Settings button gets a gear icon
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-11
- **Area:** ui-shell
- **Expected:** the Settings entry in the sidebar shows a gear icon.
- **Code refs:** `src/ui/Sidebar.tsx` (Settings entry — a disabled placeholder on the
  M4 base; the M5 Settings surface is the real target).
- **Resolved:** 2026-07-11 · **Commit:** 10e0a1c · **Outcome:** Fixed
- **Resolution:** ⚙ glyph in the entry's key slot, matching the app's text-glyph
  iconography.

### B-001 — Back button inside the player view
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-11
- **Area:** player
- **What happens:** while watching a video there is no visible control to return to the
  previous screen.
- **Expected:** a Back button in the player view that pops the navigation stack (the
  stack already exists per D-029; this is about making it visible/clickable, not only
  keyboard-driven).
- **Code refs:** `src/ui/PlayerView.tsx` (player chrome); `src/ui/App.tsx`
  (`playerStack` / `closePlayer` — the pop already exists, wire a visible button to it).
- **Resolved:** 2026-07-11 · **Commit:** bcc706b · **Outcome:** Fixed
- **Resolution:** topbar above the stage with a Back button on the same `onClose` path
  as Esc; label reflects stack depth like the end-overlay button.

### B-016 — Theme mode setting: dark, light, and auto (system default)
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-11
- **Area:** ui-shell
- **What happens:** themes follow the system preference only (M3).
- **Expected:** an explicit setting with three modes — dark, light, auto — where auto
  follows the system and is the default. Persisted in settings.
- **Code refs:** `src/ui/styles.css` (`prefers-color-scheme` block — needs an explicit
  theme attribute/class override); `src/ui/App.tsx` (apply the mode); persistence via
  the M5 settings surface.
- **Resolved:** 2026-07-11 · **Commit:** 64124e4 · **Outcome:** Fixed
- **Resolution:** already delivered by the M5 settings surface, which landed after this
  was reported: Settings → Appearance offers `system | dark | light` (`system` is the
  default and follows the OS), applied via the `data-theme` attribute and persisted in
  `settings.json`. No additional change needed — closed during the 2026-07-11
  reconciliation of this list against M5.
