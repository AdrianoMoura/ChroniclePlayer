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

**Current target: 0.2.3** (in progress). Carries [[B-108]], [[B-022]], [[B-086]],
[[B-101]] forward from 0.2.2 (none of the four made it into that release — see
`bug-history/v0.2.2.md` for why). When 0.2.3 ships, this file's content moves to
`bug-history/v0.2.3.md` and a new `bugs-current.md` starts targeting whatever comes
after it.

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
- **Type:** adjustment · **Status:** Open · **Reported:** 2026-07-15 · **Target:** 0.2.3
  (carried over — 0.2.2 shipped 2026-07-16 without this)
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
  0.2.3 (carried over — 0.2.2 shipped 2026-07-16 without this)
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

### B-110 — A channel that hit a single transient RSS 404 silently stops syncing forever
- **Type:** bug · **Severity:** major
- **Status:** In progress · **Reported:** 2026-07-16 · **Target:** 0.2.3
- **Area:** sync
- **What happens:** the owner reported that scrolling to the end of Veritasium's
  channel screen never even attempted to fetch older videos — no network activity, no
  spinner, no console error, nothing (confirmed via temporary diagnostic logging added
  during this investigation, see [[B-109]] below for the unrelated stall that logging
  was originally chasing). Traced to the local DB directly: `channels.available = 0`
  for that channel, despite Veritasium obviously being an active, very much
  un-terminated channel.
- **Expected:** a channel that's actually still active keeps syncing normally forever;
  nothing about it should ever require the owner to notice, let alone manually fix.
- **Code refs:** `src/adapters/rss/rss-client.ts` (`discoverRecent`'s 404 handling);
  `src/core/sync-service.ts` (`discoverChannel`); `src/adapters/storage/sync-repository.ts`
  (`listSubscribedChannels`'s `available = 1` filter, `markChannelUnavailable`).
- **Root cause:** `youtube-api.md`'s failure-handling table had a "Channel
  deleted/terminated" row — an RSS 404 was treated as definitive, permanent proof of
  deletion: `markChannelUnavailable` flips `channels.available` to 0, and
  `listSubscribedChannels` (used by both routine sync and the on-demand scroll-triggered
  backfill, [[B-002]]) filters on `available = 1`. Once flipped, the channel is excluded
  from the very query that would ever check it again — there was no self-healing path
  at all, so a single transient 404 (YouTube's RSS edge can return one for reasons
  unrelated to the channel actually being gone) froze that channel's sync permanently.
  The spec's own promised mitigation ("show in a settings list") was never actually
  built, so the state was completely invisible — nothing in the UI ever indicated a
  channel had stopped updating. Turned out, on inspection, this row was never a real,
  owner-confirmed product decision either — just an assumption from earlier
  development that had slipped into the spec without a `decisions.md` entry.
- **Resolution: D-048.** Per the owner's own framing (2026-07-16) — Chronicle's
  experience should work like YouTube's own pagination: keep trying until a result
  genuinely comes back empty, a single failed attempt proves nothing permanent, and RSS
  calls are free so there's no cost reason to ever stop asking — the whole mechanism is
  removed outright rather than patched: `rss-client.ts` no longer special-cases 404
  (falls through to the same `internal(...)` failure every other non-2xx response
  already threw); `channel-unavailable` is gone from `DomainErrorKind`;
  `markChannelUnavailable` and the `available` column/filter are gone from
  `SyncRepository`/`sync-repository.ts` (schema v8 drops the column outright — nothing
  reads or writes it anymore, so leaving it dead wasn't an option). A 404 now falls
  through to `discoverChannel`'s pre-existing generic per-channel failure handling
  (logged, retried next cycle, exactly like a network hiccup) — no new retry logic was
  needed, only removing the special case that pre-empted the one already there. The
  owner also declined building the "settings list for unavailable channels" UI the old
  spec row promised (never actually discussed, and no longer needed since there's no
  "unavailable" state left to surface). `youtube-api.md`'s failure table and
  `decisions.md` (new **D-048**) updated in the same change. Checked via
  `npm run typecheck && npm run lint && npm test` (199/199, one test rewritten for the
  new "just an ordinary failure" behavior, one dropped since the feature it covered no
  longer exists); **not run live** (per [[no-live-app-verification]]) — the owner's own
  local DB is what surfaced this (Veritasium's `available` row), so the schema-v8
  migration dropping the column is itself the fix for that specific channel; needs the
  owner's hands-on confirmation that Veritasium (and any other channel that hit this)
  resumes syncing/backfilling normally after upgrading.

### B-109 — Scrolling to the end of a channel's video list can permanently stall (no more videos ever load)
- **Type:** bug · **Severity:** major
- **Status:** In progress · **Reported:** 2026-07-16 · **Target:** 0.2.3
- **Area:** feed / sync
- **What happens:** the owner opened a subscribed channel's screen and scrolling to the
  end never loaded more videos — neither automatically (the [[B-107]] no-overflow case)
  nor by manually scrolling to the bottom. YouTube search results paginate fine; this is
  specific to a subscribed channel's own video list.
- **Expected:** scrolling to the end of a channel's list keeps loading older videos
  (local archive, then on-demand YouTube backfill) until the channel's whole archive is
  genuinely exhausted.
- **Code refs:** `src/ui/App.tsx` (`loadMore`'s channel-backfill branch); `src/core/
  sync-service.ts` (`backfillArchive`, `ARCHIVE_BACKFILL_PAGE_LIMIT`).
- **Root cause:** `backfillArchive` (B-002) deliberately caps itself at
  `ARCHIVE_BACKFILL_PAGE_LIMIT` (4) `playlistItems.list` pages per call — a pacing
  device, per its own comment "resumable across calls" and `youtube-api.md`'s "bounded
  at 4 pages/call, resumable" — and saves a resume `pageToken` server-side
  (`setBackfillState`) so the *next* call continues from where this one stopped. If
  all 4 pages in a batch turn out to be videos Chronicle already knows about (plausible
  for any channel where routine sync has already caught a lot of the recent upload
  history, so the next deeper slice is mostly overlap before reaching genuinely older,
  unseen videos), the call returns `{ videosNew: 0, exhausted: false }` — correctly
  *not* exhausted, but with nothing to show yet either. `App.tsx`'s `loadMore` only
  acted on `result.value.exhausted` (mark done) or `result.value.videosNew > 0` (append)
  — the third, entirely valid outcome (neither) fell through both branches silently.
  Since nothing changed (`videos`/`nextCursor` untouched), `FeedList.tsx`'s two
  onNearEnd triggers ([[B-107]]'s no-overflow check and the virtualizer's normal
  scroll-position check) both stayed quiet too, since their dependencies are keyed off
  row count/columns, not "did the last fetch attempt come back empty." Nothing was left
  to prompt a further attempt — the channel was stuck until the owner navigated away
  and back (which restarts the whole `loadView` cycle and gets one more 4-page batch,
  possibly landing on the same dead stretch again).
- **Resolution (not yet live-verified):** `loadMore`'s channel-backfill branch now
  loops (`runBackfill`, self-invoking on the `videosNew === 0 && !exhausted` outcome)
  instead of stopping after one call, continuing to walk `backfillArchive` — which
  keeps resuming from its own saved `pageToken` — until it either finds new videos to
  append or the channel is genuinely exhausted. Bounded by the channel's own finite
  upload count either way; the existing `backfillingRef`/generation guards are
  unchanged, so concurrency/stale-response safety carries over as before. Per
  [[product-frictionless-over-quota]] this loop is deliberately not gated behind any
  manual "load more" affordance — quota isn't the scarce resource here
  (`youtube-api.md`'s own budget math leaves ample headroom), a silently stuck channel
  is a worse experience. Checked via `npm run typecheck && npm run lint && npm test`
  (200/200); **not run live** (per [[no-live-app-verification]]) — needs the owner's
  hands-on check scrolling to the bottom of a channel with enough history to have hit
  this stall before.
- **Note:** live-testing this fix is what surfaced [[B-110]] — a channel-freezing bug
  entirely unrelated to this one (it short-circuits before `backfillArchive` ever runs
  a real API call, so this loop never even gets a chance to matter for an affected
  channel). Both are real, independent bugs; fixing one doesn't fix the other.

### B-108 — Mouse-wheel scroll doesn't work on the full-view player screen while hovering the embedded video
- **Type:** bug · **Severity:** minor
- **Status:** In progress · **Reported:** 2026-07-16 · **Target:** 0.2.3
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
- **Status:** In progress · **Reported:** 2026-07-12 · **Target:** 0.2.3 (carried over —
  0.2.2 shipped 2026-07-16 without this)
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

*(none yet this cycle)*
