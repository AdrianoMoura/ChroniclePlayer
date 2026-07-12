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

### B-007 — List vs. grid view toggle, persisted
- **Type:** adjustment
- **Status:** Open · **Reported:** 2026-07-11
- **Area:** feed
- **Expected:** the user chooses between the current list layout and a grid layout for
  videos; the choice persists across restarts (settings).
- **Code refs:** `src/ui/FeedList.tsx` (row rendering + virtualization — grid changes
  the row model); `src/ui/styles.css`; persistence via the M5 settings surface
  (settings.json — not on the M4-based branch at time of writing).

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

*(none)*

## Resolved

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
- **Expected:** a user-initiated "Refresh subscriptions" action (Settings and/or feed
  refresh affordance) that bypasses the weekly gate and re-lists immediately; new
  channels get their normal initial backfill. Cost per run at ~230 subs: ~5 units
  (`subscriptions.list`, 1 unit per 50) plus `channels.list` for new channels only —
  fine for a user-initiated action, which is why the periodic gate stays weekly.
- **Code refs:** `src/core/sync-service.ts` (`syncSubscriptionsIfDue` now takes
  `force`; `SyncService.refresh` takes `RefreshOptions.forceSubscriptions`);
  `src/ipc/contract.ts` (`subscriptions:refresh`); `src/platform/main.ts`
  (`IpcChannel.refreshSubscriptions` handler); `src/ui/SettingsView.tsx` (Sync section
  "Refresh subscriptions" button, reports added/removed).
- **Notes:** verified 2026-07-12 by code inspection: `syncSubscriptionsIfDue` returned
  early unless 7 days had passed since `subscriptions_synced_at`, regardless of
  trigger. Implemented exactly per the spec's existing "manual Refresh subscriptions"
  design (`youtube-api.md` §Subscription import & sync already described this as
  Final — no spec change needed, only the implementation was missing). The periodic
  (launch/timer) gate is untouched — still weekly.
- **Resolved:** 2026-07-12 · **Commit:** 877a30d · **Outcome:** Fixed
- **Resolution:** as described above.

### B-022 — Delete all data: app relaunches into a frozen screen instead of a clean state
- **Type:** bug · **Severity:** major
- **Status:** Fixed · **Reported:** 2026-07-12
- **Area:** ui-shell / storage
- **What happens:** Settings → delete all data wipes and restarts the app, but the
  relaunched app sits on a stuck/blank screen instead of coming back as a fresh
  install.
- **Expected:** after the wipe the app comes back in its clean first-run state. Today
  that means the connect-to-YouTube setup; but [[B-003]] makes authentication optional,
  so the post-wipe landing should be whatever "fresh start without an account" becomes
  once B-003 lands — design the fix so the landing screen is the normal first-run
  entrypoint, not a hardcoded wizard jump.
- **Code refs:** `src/platform/main.ts` (`data:deleteAll` handler).
- **Notes:** three hypotheses were on the table: a relaunch/exit race, startup code
  assuming a DB/settings file exists, or dev-mode `app.relaunch()` not reproducing
  packaged behavior. The DB/settings-missing path is already proven to work (every
  genuine first launch goes through it, per M4 dogfooding), which points at the
  relaunch mechanics themselves. **Needs live validation** — could not be exercised
  headlessly in this session; re-open if the frozen screen recurs.
- **Resolved:** 2026-07-12 · **Commit:** 877a30d · **Outcome:** Fixed
- **Resolution:** swapped `app.exit(0)` for an explicit window `destroy()` +
  `app.quit()`. `app.exit()` skips window teardown and the normal quit sequence, so the
  relaunched window could start before the old instance's GPU/compositor surface was
  gone — plausible root cause on compositors like niri/Wayland, which B-014's
  resolution already flagged as the risky surface for this app's frameless shell.
  `app.relaunch()` is unchanged (still called before quitting, per Electron's
  documented pairing).

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
