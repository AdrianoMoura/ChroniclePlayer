# Code Guidelines

This document is **operational, not aspirational**: every rule below exists because a
2026-10-03 source review found a concrete instance of the problem it prevents. It
complements — never restates — the layer/boundary model in `architecture.md` and the
process rules in `CLAUDE.md`. Where this file and `architecture.md` disagree,
`architecture.md` wins; file an update here instead of forking the rule.

Status: **Final** unless marked otherwise. Treat a rule the same as any other spec
statement — see `README.md` for the Final/Pending/Assumption/Future-idea labels.

## 1. File size is a smell, not a rule

No hard line count is enforced by tooling, but a non-trivial file above **~500 lines**
should be read as a signal to split by responsibility, not by mechanically slicing in
half. Two files crossed this by 4-5x before anyone noticed:

- `src/ui/App.tsx` — **partially addressed.** Was 2815 lines, 53 `useState` + 64
  `useCallback`/`useMemo` in one component, mixing feed state, player state, dialog
  state, undo state, and navigation in one component tree. Now 2431 lines: the JSX
  return block (692 lines) was split into four new components —
  `GlobalDialogs.tsx` (every App-level dialog reachable from anywhere: Help, the
  write-scope gate, Add Account, URL prompt, Add to Playlist), `Topbar.tsx` (the two
  topbar variants), `MainFeedPanel.tsx` (the three mutually exclusive main-area states:
  search results, channel preview, the synced feed), and `PlayerScreen.tsx` (the
  full-view/docked player plus up-next card and chat) — each taking explicit props,
  defined at module scope so they don't remount on every `App()` render. **Every
  `useState`/`useRef`/`useEffect`/`useCallback` deliberately stayed in `App()` — this was
  not the `useFeedState`/`usePlayerState`-style split this entry originally called for.**
  That fuller split remains open and is now known to be genuinely harder than it looks:
  App.tsx's refs aren't just storage, several exist specifically so one effect can read
  another concern's latest value without resubscribing (`miniplayerRef`,
  `currentPlayerVideoIdRef`, `feedEmptyRef`, `playlistContextRef`) — splitting state
  ownership across hooks means threading those across hook boundaries, which is exactly
  the class of bug (state/effect timing) that `typecheck`/`lint`/`test` cannot catch and
  that this file has already shipped more than once (B-120, two rounds; B-129, four
  rounds). Don't attempt the full split without a live-testing budget to match main.ts's
  equivalent risk, and expect it to need the owner's own hands-on verification the same
  way DOM/focus bugs already do (see rule 2's note on `useDialogDismiss`) — this is not
  a `typecheck`-clean-therefore-safe change.
- `src/platform/main.ts` — **done.** Was 2256 lines, 71 `ipcMain.handle` registrations,
  27 top-level functions, 35 inline `try/catch` blocks, mixing IPC handler registration
  with app bootstrap, tray lifecycle, and auto-start detection. Now 1091 lines — pure
  composition root (builds repositories/services/account stacks) plus the genuinely
  platform-shell concerns (window/tray management, app lifecycle, settings
  persistence, extract/chat windows). The 60 handlers that were just
  request-in/DTO-out against a repository or the YouTube API client, with no Electron
  window/process state, moved to `src/platform/ipc/*-handlers.ts` (feed, video-state,
  channel, search, playlist, account, comments), each a `register*Handlers(ctx)`
  function called once from `boot()`. `ctx: BootContext` (`ipc/context.ts`) is the one
  object every extracted module depends on instead of main.ts's old ambient closure —
  `getSettings`/`isRefreshing` are live getters, not snapshotted fields, because
  `settings`/`refreshing` are reassigned (not mutated) during a session; a plain field
  would have gone stale after the first `setSettings` call. Pure helpers with no
  closure dependencies (DTO mappers, IPC input validators, the Shorts-confirmation
  probe) moved to their own shared files instead of being duplicated per handler
  module. Window-management handlers (`windowControl`, `extractPlayer`,
  `loadInExtractWindow`, `extractChat`, `openYouTubeSignIn`) and the handlers
  tightly coupled to `boot()`'s own teardown/rebuild (`deleteAllData`, settings
  CRUD, wizard state, `exportData`, `getStorageInfo`) stayed in `main.ts` deliberately
  — they're genuine platform/process-lifecycle concerns, not domain logic, and
  extracting them would have meant threading mutable window/timer state across file
  boundaries for little readability gain. Verified by `typecheck`/`lint`/`test`
  (all clean, 291 tests) plus a full manual line-by-line re-read of the resulting
  `main.ts` against the original — there is still no automated test coverage of
  `main.ts`/`boot()` itself (an Electron entrypoint, not easily unit-testable), so this
  needs a live smoke pass (launch, sync, open a video, playlists, add/remove account,
  tray, delete-all-data) before being trusted the way the rest of this repo's changes
  can be trusted from the test suite alone.

**Rule:** when a file crosses ~500 lines, stop and ask "what are the N responsibilities
here, and can each get its own module?" before adding more to it. Don't split
pre-emptively at 200 lines just to hit a number — a cohesive 700-line repository file is
fine; a 700-line file doing five unrelated things is not.

**Specific remediation still open:**
- `App.tsx`: the actual state/effect split by concern (feed/navigation state, player
  state, dialog/undo state) into separate hooks or a reducer — see the note above on
  why this is riskier than it looks, and budget live-testing time for it, not just a
  clean `typecheck`.

## 2. One shared hook for dialog focus/Escape behavior

**Done.** Eight dialogs (`UrlPrompt.tsx`, `AddAccount.tsx`, `ShareDialog.tsx`,
`AddToPlaylistDialog.tsx`, `HelpOverlay.tsx`, `useWriteScopeGate.tsx`, and
`CreatePlaylistDialog`/`ImportPlaylistDialog` inside `PlaylistsView.tsx`) used to each
hand-roll the same focus-on-mount + Escape/`stopPropagation` logic — some of their
comments even pointed at each other ("same fix as AddToPlaylistDialog") instead of at a
shared implementation. All eight now use `useDialogDismiss` (`src/ui/useDialogDismiss.ts`):
spread its return value onto the dialog's outermost `<div>` and it owns `ref`,
`tabIndex`, and the Escape/`stopPropagation` `onKeyDown`. It also fixed a real gap for
free: `SettingsView.tsx`'s "clear notify from favorites?" confirm had no Escape handling
at all (no dialog shares this pattern, it's never been needed before) — now it does,
mapped to "keep" (the non-destructive choice), same as clicking the backdrop.

For a dialog whose only focusable element is an `autoFocus` input (`UrlPrompt`,
`CreatePlaylistDialog`, `ImportPlaylistDialog`), the hook does not steal that focus: it
only calls `container.focus()` if `document.activeElement` isn't already inside the
container, and React applies `autoFocus` before the hook's effect ever runs. For a
dialog whose container never unmounts (`useWriteScopeGate`'s conditionally-rendered
JSX inside an always-mounted hook), pass the open condition as the second argument so
focus is reclaimed every time it opens, not just on first render.

**Rule:** any new modal/dialog uses `useDialogDismiss` — don't hand-roll this again.

Focus/Escape is DOM-timing-sensitive and not covered by the test suite (jsdom doesn't
reproduce real focus/compositor behavior) — this needs a live pass over all eight
dialogs (open each one via click and via its keyboard shortcut where it has one, confirm
Escape closes it and nothing else loses the keypress) before being trusted the way the
rest of this refactor can be trusted from `typecheck`/`lint`/`test` alone.

This is the same lesson D-059 already learned for dialog button CSS (one consolidated
`button.primary` override instead of four separate fixes) — applied here to behavior, not
just style.

## 3. No decision/bug IDs in source comments

`src/**` must never reference `B-NNN` or `D-NNN` in a comment. This was already a
documented project convention and is violated in roughly 60 files today. A comment
should describe the *current* constraint or invariant, never the history of how the
code got that way — history belongs in commit messages, `decisions.md`, and
`tracker-history/`.

```ts
// Wrong — narrates history, rots the moment the bug ID means nothing to a new reader
// Fixed per B-111: playerStateRef must also update from infoDelivery, not just
// onStateChange, because the embed doesn't reliably fire transitions it initiates.
playerStateRef.current = info.playerState;

// Right — states the invariant the code relies on, nothing else
// onStateChange is not reliable for transitions the embed initiates itself;
// infoDelivery's steady heartbeat is the only path guaranteed to observe them.
playerStateRef.current = info.playerState;
```

**Enforcement:** add a CI/pre-commit grep for `\bB-\d{3}\b|\bD-\d{3}\b` scoped to
`src/**/*.ts*` (excluding `*.test.ts`), failing the build on a match. Until that lands,
treat any PR touching a file with an existing violation as a chance to clean that one
comment, not just the line being changed.

## 4. UI and platform code need tests, not just core and adapters

`architecture.md`'s testing strategy (100%-offline `core/`, contract-tested adapters)
is followed correctly — that part of the codebase is in good shape. It says nothing
about `ui/` or the non-trivial parts of `platform/`, and it shows: `src/ui` has 29
source files and 1 test; `main.ts`, `tray.ts`, `preload.ts`, `data-dir.ts`, and
`dev-fixtures.ts` have none.

This isn't "test everything" — a dumb presentational component earns no test. The gap
that matters is **stateful logic that has already caused real, user-visible bugs**:
`PlayerSurface.tsx` (source of B-111, and the `infoDelivery`-heartbeat workaround
D-055 and D-051 both also needed), `App.tsx`'s cross-cutting state, and `FeedList.tsx`'s
virtualization/bucket logic (B-120's two-round bug lived here).

**Rule:** a UI component or platform module with non-trivial state (heuristic: more
than ~5 `useState`/`useRef`/`useCallback`, or any logic reacting to async
events/timers) gets at least one test covering its state-transition logic, independent
of the full component tree where feasible (extract the logic to a plain function/hook
if that's what makes it testable). Backfill priority: `PlayerSurface.tsx` first (highest
bug density), then `App.tsx`'s state helpers, then `FeedList.tsx`.

## 5. Keep doing what's already working

Not everything found was a problem — these are load-bearing and should be defended,
not just left alone:

- `core/` has zero imports from `adapters/` or `ui/` — a real, lint-enforced boundary,
  not just a documented one (`npm run lint` runs dependency-cruiser; keep it in CI).
- Zero `as any` anywhere in `src/`. Keep it that way — a single `as any` in `core/` is
  worth blocking a PR over, per `CLAUDE.md`'s "no `any` in domain code."
- `src/ipc/contract.ts` is the single shared DTO/command definition for main, preload,
  and renderer — no type gets redefined per side. Any new IPC command goes through
  this file first, never a local type that happens to look the same.
- The typed `DomainError`/`DomainErrorKind` model (`architecture.md`'s error-handling
  strategy) is followed consistently at adapter boundaries — extend it, don't bypass it
  with raw thrown strings or `Error` subclasses outside the closed set.

## 6. When this file and reality disagree

If a future change makes a rule here obsolete (e.g. `main.ts` gets split and stays
split), update this file in the same change rather than leaving a stale rule — same
discipline `CLAUDE.md` already requires for the other specs.
