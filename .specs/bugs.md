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

### B-043 — Keyboard-first as a standing design rule; audit current shortcut coverage
- **Type:** adjustment
- **Status:** Open · **Reported:** 2026-07-12
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
- **Code refs:** `.specs/ui.md` (§Keyboard shortcuts, §Accessibility — the table and
  principle to update); `src/ui/App.tsx` (the global keydown handler and the `?` help
  overlay content); `src/ui/Sidebar.tsx`, `src/ui/SettingsView.tsx`, `src/ui/FeedList.tsx`,
  `src/ui/PlayerView.tsx` (per-component handlers and hover-only affordances to check).
- **Notes:** this is as much a standing rule as a fix — no single commit "resolves" the
  process half. Treat the audit as attackable in one batch (produces the `ui.md`/help
  overlay update and whatever bindings it adds), but the "every new feature states its
  keyboard path" rule stays in force afterward rather than closing with the batch.

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
