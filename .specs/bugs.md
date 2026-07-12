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

## Entry template

```markdown
### B-NNN — short title
- **Type:** bug | adjustment · **Severity:** blocker | major | minor (bugs only)
- **Status:** Open · **Reported:** YYYY-MM-DD
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

### B-039 — Mouse "back" button (XButton1) should exit the player, like Esc or the Back button
- **Type:** adjustment
- **Status:** Open · **Reported:** 2026-07-12
- **Area:** player
- **What happens:** many mice have a dedicated back/side button (browsers bind it to
  history-back); Chronicle doesn't listen for it, so it does nothing in the player.
- **Expected:** pressing the mouse back button while in the player closes the player
  and returns to the previous screen — the same action as pressing Esc or clicking the
  visible Back button ([[B-001]]).
- **Code refs:** `src/ui/PlayerView.tsx` (the `Escape` case in the keydown handler
  around the `onClose()` call — add a `mouseup`/`pointerup` listener checking
  `event.button === 3` for the browser's back mouse button, calling the same
  `onClose`).
- **Notes:** browsers also fire an `auxclick`/`mouseup` with `button === 3` for
  XButton1; some mice map this to a `Backward` "navigate back" browser gesture instead
  of a plain button event — verify empirically which fires in Electron/Chromium
  (owner to verify live, per [[no-live-app-verification]]).

### B-038 — Player should default to the highest available quality (e.g. 1440p), not cap at 1080p
- **Type:** adjustment
- **Status:** Open · **Reported:** 2026-07-12
- **Area:** player
- **What happens:** the embedded player appears to settle on 1080p even when a video
  has higher-resolution renditions (1440p/4K) available; quality is not forced.
- **Expected:** on load, the player should request the highest quality YouTube offers
  for that video, not rely on the iframe's own default selection (which favors
  bandwidth/viewport heuristics over "best available").
- **Code refs:** `src/ui/PlayerView.tsx` (widget protocol `command()` helper +
  `announce()`/`onReady` handling — call `setPlaybackQuality('highres')` or use
  `suggestedQuality`/`vq` once the widget reports ready; also check `onPlaybackQualityChange`
  to confirm it stuck, since YouTube can still downgrade for buffering).
- **Notes:** YouTube's IFrame API only takes a suggested quality, not a hard guarantee
  — confirm behavior empirically (owner to verify live, per
  [[no-live-app-verification]] this isn't tested by running the app here).

### B-037 — Collapsible sidebar: hamburger toggle, default open, auto-collapse in player
- **Type:** adjustment
- **Status:** Open · **Reported:** 2026-07-12
- **Area:** ui-shell / player
- **What happens:** the sidebar has no collapse control; it stays at fixed width on
  every screen, including the player, where it eats into video width.
- **Expected:** a hamburger icon toggles the sidebar collapsed/expanded. Default is
  expanded on every screen. Entering the player view auto-collapses it (more room for
  the video); leaving the player restores the previous state. When collapsed, the
  sidebar fully disappears (width 0) rather than shrinking to an icon rail.
- **Code refs:** `src/ui/Sidebar.tsx` (collapse state, hamburger control);
  `src/ui/App.tsx` (shell layout, player-enter/exit hook to drive auto-collapse);
  `src/ui/styles.css` (collapsed = 0 width, not a narrow rail).
- **Notes:** related to [[B-004]] (player always full width) and [[B-019]] (sidebar
  width) — this adds a third state (hidden) on top of both.

### B-002 — Channel video list is truncated and does not paginate
- **Type:** bug · **Severity:** major
- **Status:** Open · **Reported:** 2026-07-11
- **Area:** feed
- **What happens:** a channel's video list shows only some videos and scrolling does not
  load more.
- **Expected:** scroll pagination per D-027 (keyset), same behavior as the main feed.
- **Code refs:** `src/ui/App.tsx` (`loadView` — check the cursor path when
  `channelFilter` is set); `src/ui/FeedList.tsx` (load-more trigger);
  `src/adapters/storage/repositories.ts` (keyset pagination); `src/ipc/contract.ts`
  (`getFeed`).
- **Notes (diagnosis, 2026-07-11):** keyset pagination with a channel filter is
  **correct** — a regression test now pages a channel-filtered feed end-to-end
  (`repositories.test.ts`). The truncation is the *archive*, not the query: sync
  discovers via RSS (~15 entries/channel — the 2026-07-11 smoke's 3,261 videos across
  229 subs ≈ 14/channel confirms it), so the channel view already shows everything
  Chronicle has locally. The real fix is user-initiated back-catalog fetch (uploads
  playlist paging + hydration, ~2 units per 50 older videos) when scrolling past the
  local archive in a channel view. That is new API surface with quota costs to record
  in `youtube-api.md` — moved to **batch 3** with the channel-screen work ([[B-009]],
  [[B-010]]), out of the local-polish batch 1.

### B-003 — Multi-account model + optional authentication (Accounts in sidebar)
- **Type:** adjustment
- **Status:** Open · **Reported:** 2026-07-11
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
- **Code refs:** `src/adapters/oauth/` + `src/adapters/secrets/` (token storage is
  single-account today); `src/adapters/storage/migrations.ts` (schema needs account
  scoping); `src/core/sync-service.ts` (per-account sync); `src/ui/Sidebar.tsx`
  (Accounts section); `src/ui/onboarding/Wizard.tsx` (modal mode + skip-console path
  for additional accounts); `src/platform/main.ts` (composition root wires it all).
- **Notes:** exact UX is open — owner's sketch: a collapsible section (default open)
  listing connected accounts, each with a `…` menu offering **Remove** and **Sync now**.
  This is milestone-sized: touches schema (account scoping), sync, wizard, sidebar.
  Needs decisions.md entries when attacked (supersedes the single-account assumption).

### B-006 — Comments: read, add, reply; likes on videos and comments
- **Type:** adjustment
- **Status:** Open · **Reported:** 2026-07-11
- **Area:** player
- **Expected:** read the comment thread, post comments, reply to comments, like the
  video and like comments — all user-initiated (in scope per D-030/D-031/D-032 framing).
- **Code refs:** `src/adapters/youtube/api-client.ts` (new `commentThreads` /
  `comments` / `videos.rate` calls + quota accounting); `src/core/ports.ts` (new port);
  `src/ipc/contract.ts`; `src/ui/PlayerView.tsx` (comments UI);
  `src/adapters/oauth/google-oauth.ts` (write scopes, D-032).
- **Notes:** requires new API surface + write scopes (incremental, per D-032 and
  [[B-015]]). Quota costs must be stated in `youtube-api.md` when attacked.

### B-009 — Search all of YouTube, not only synced content
- **Type:** adjustment
- **Status:** Open · **Reported:** 2026-07-11
- **Area:** other (search)
- **What happens:** search/filter only covers synced channels' content.
- **Expected:** a scope option in the search/filter UI choosing between "my channels"
  and "all of YouTube" (D-031). From global results the user can open any video
  (D-029 already hydrates external videos), discover new channels, and subscribe to
  them (D-030).
- **Code refs:** `src/ui/FeedList.tsx` (the local `/` filter gains the scope option);
  `src/adapters/youtube/api-client.ts` (`search.list`); `src/core/ports.ts` +
  `src/ipc/contract.ts` (new search surface); subscribe path shares [[B-010]]'s API.
- **Notes:** `search.list` costs 100 units/call — quota framing in `youtube-api.md`
  must be respected and surfaced when attacked.

### B-010 — Easy unsubscribe: channel screen + sidebar context menu
- **Type:** adjustment
- **Status:** Open · **Reported:** 2026-07-11
- **Area:** ui-shell
- **Expected:** an obvious Unsubscribe option on the channel screen, plus a `…` icon
  button per channel in the sidebar opening a context menu with Unsubscribe.
- **Code refs:** `src/ui/Sidebar.tsx` (`…` context menu); `src/ui/App.tsx` (the
  channel-filtered view is today's "channel screen");
  `src/adapters/youtube/api-client.ts` (`subscriptions.delete`);
  `src/adapters/oauth/google-oauth.ts` (write scope).
- **Notes:** unsubscribing writes to YouTube — needs the write scope path (D-032,
  [[B-015]]).

### B-015 — App wrongly presents itself as read-only
- **Type:** bug · **Severity:** minor
- **Status:** Open · **Reported:** 2026-07-11
- **Area:** other (copy / scopes model)
- **What happens:** app copy states Chronicle is read-only.
- **Expected:** Chronicle is not read-only: subscribe, unsubscribe, comment, and like
  are all in scope (user-initiated — D-030/D-032). What actually happens is that OAuth
  permissions are added incrementally as the user first performs each write action
  (D-032). Fix the copy everywhere it appears (UI, wizard, docs) and make incremental
  scope consent the explicit model.
- **Code refs:** `src/ui/onboarding/Wizard.tsx` (read-only wording, e.g. the step-4b
  publish copy); `docs/setup.md`; `src/adapters/oauth/google-oauth.ts` (scope list —
  incremental consent lands here); grep `read-only` / `readonly` across `src/ui/` and
  docs for the full surface.
- **Notes:** umbrella for the write-action items [[B-006]] and [[B-010]].

### B-017 — Multi-language support via lang files (English only for now)
- **Type:** adjustment
- **Status:** Open · **Reported:** 2026-07-11
- **Area:** ui-shell / other (i18n)
- **Expected:** a language system where all UI strings live in lang files
  (e.g., `en.json`), loaded through an i18n layer — no hardcoded strings in components.
  Only English ships for now; the infrastructure makes future locales a file drop.
- **Code refs:** all of `src/ui/` (hardcoded strings — `src/ui/onboarding/Wizard.tsx`
  is by far the largest surface); new i18n layer + `lang/en.json` to create.
- **Notes:** promotes the "localization is a Future idea" note in `.specs/README.md`
  to infrastructure-now, strings-later. Wizard copy is the biggest surface.

## In progress

### B-022 — Delete all data: app relaunches into a frozen/blank screen instead of a clean state
- **Type:** bug · **Severity:** major
- **Status:** In progress · **Reported:** 2026-07-12
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
  entirely regardless of whether that was the true root cause. **Still needs live
  validation** on the product owner's system in `npm run dev` — this session has no
  display to exercise Electron relaunch/compositor behavior. Keep in "In progress"
  (not Resolved) until confirmed live, per this bug's own established rule.

## Resolved

### B-007 — List vs. grid view toggle, persisted
- **Type:** adjustment
- **Status:** Fixed · **Reported:** 2026-07-11
- **Area:** feed
- **Expected:** the user chooses between the current list layout and a grid layout for
  videos; the choice persists across restarts (settings).
- **Code refs:** `src/platform/settings-store.ts` (`layout: 'list' | 'grid'`, default
  `list`); `src/ipc/contract.ts` (`SettingsDto.layout`); `src/ui/SettingsView.tsx`
  ("Feed layout" select, mirrors the existing density control); `src/ui/App.tsx`
  (default settings state, `FeedList` wiring); `src/ui/FeedList.tsx` (grid rendering:
  `buildCardRows` chunks consecutive video rows into `columns`-wide card rows per
  bucket, column count tracked via `ResizeObserver` on the scroll container at a
  ~220px min card width, virtualizer re-measures on layout/column changes, new
  `VideoCard` component reusing `VideoActions`/thumbnail cache); `src/ui/styles.css`
  (`.grid-row`, `.card` and related classes).
- **Notes:** reverses the "one column; no masonry/grid" clause of `ui.md`'s Layout
  decision — captured as **D-037** (new entry in `decisions.md`, `ui.md` updated in
  the same change). List stays the default; grid is opt-in. Both layouts share the
  same row data, virtualization, row density (D-022) and per-video actions — the grid
  is a rendering mode of `FeedList`, not a second component. No UI component tests
  exist in this repo (`src/ui/` has none); verified via `npm run typecheck && npm run
  lint && npm test` — no live-app check per this session's workflow, owner validates
  live.
- **Resolved:** 2026-07-12 · **Commit:** 61c9563 ·
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
