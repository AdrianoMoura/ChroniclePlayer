# UI

Chronicle's interface is closer to an RSS reader or mail client than to a video site.
Guiding words: **minimal, quiet, fast, keyboard-first, dark-first.**

## Layout (Final in shape)

Three-region desktop layout:

```
┌──────────┬──────────────────────────────────────────────┐
│          │  ⟳ refresh   ·   All caught up / N unread     │
│ Sidebar  ├──────────────────────────────────────────────┤
│          │  TODAY                                        │
│ Feed     │  ▢ thumb  Title of the video          12:34  │
│ Unread   │           Channel · 3 h ago                   │
│ Watch    │  ▢ thumb  Another video               8:02   │
│  Later   │           Channel · 5 h ago                   │
│ Playlists│  YESTERDAY                                    │
│ Favorites│  …                                            │
│ Ignored  │                                               │
│ ────────│  THIS WEEK                                    │
│ Channels │  …                                            │
│  (list)  │  EARLIER          (loads as you scroll ·      │
│                    D-027)                     │
│ ────────│                                               │
│ Settings │                                               │
└──────────┴──────────────────────────────────────────────┘
```

- **Sidebar**: views (All, Unread, Watch Later, **Playlists** (D-058, position 4 —
  user-created local playlists; its own screen, not a `FeedView`, so it sits between
  the five views without being one of them), Favorites, Ignored), then the channel
  list (click = filter feed to that channel, `…` menu = Favorite/Unfavorite,
  Unsubscribe — B-010/B-042), then an **Accounts** section (B-003, implemented
  2026-07-12: connected accounts, each with a `…` menu for Sync now/Remove, click =
  filter the combined feed to that account, "+ Add account" opens a short reminder+
  Connect flow — no Google-console walkthrough, since additional accounts reuse the
  first account's OAuth client), then Settings. Collapsible to icons.
- **Feed**: the grouped chronological list (`feed.md`). List rows are the default —
  calmer, rank information (title first) over imagery — but **D-037** adds an optional
  thumbnail grid, since a masonry/grid view is a layout preference, not an engagement
  mechanic; the same rows and actions render either way. Both the list/grid toggle
  and an xs/small/medium/large/xl item-size slider (**D-037**, supersedes D-022's two-step
  "density"; widened from three steps to five in the 2026-07-12 follow-up, with the xl
  step a bigger jump than the rest) live as inline controls in the feed topbar itself — not in Settings —
  since these are properties of the listing the user is looking at, not
  general preferences to hunt for on another screen.
- **Player view** replaces the feed region when watching (sidebar persists);
  esc returns. See `playback.md`.
- No third pane, no tabs, no dashboard. Every screen answers one question.

## Visual language (Final in direction)

- **Dark mode first**: designed dark, light theme derived second. Follow system theme by
  default, manual override in settings.
- Palette: near-black surfaces, one restrained accent (used for unread markers and focus
  rings — not for decoration). No brand-red, nothing YouTube-like.
- Typography: the platform's native UI font stack; two sizes + weight for hierarchy.
  Titles are the loudest element on screen.
- Thumbnails render at normal (full) opacity always (**D-023**) — a muted-opacity-at-rest
  prototype was tried in M3 and dropped after dogfooding as an unwanted default.
- Motion: essentially none. Instant view swaps; no skeleton shimmer (local reads are
  instant, `architecture.md`); at most a 100 ms fade on the new-videos pill.
- No badges/red dots anywhere except the mechanical unread count in the sidebar.

## Keyboard shortcuts (Final in shape; exact map v1)

Full keyboard operability is a requirement, not an enhancement. Feed is a focusable list
with a visible cursor row.

| Key | Action |
|---|---|
| `j` / `k` or ↓/↑ | next / previous video row |
| `Enter` or `o` | play (player view) |
| `b` | open in browser |
| `m` | toggle read/unread |
| `i` | ignore (with 5 s inline undo) |
| `u` | undo the last ignore (within its undo window) |
| `f` | toggle favorite |
| `w` | toggle watch later |
| `M` | mark all as read (current view) — added in the B-103 audit |
| `v` | toggle grid/list layout — added in the B-103 audit |
| `e` | maximize the docked miniplayer back to the full player (only while docked) — B-104 |
| `x` | close the docked miniplayer (only while docked) — B-104 |
| `gg` / `G` | top / end of loaded feed |
| `1…6` | switch view/screen (All, Unread, WL, **Playlists** — D-058, opens the Playlists screen's list rather than a `FeedView` — Fav, Ignored) |
| `r` | refresh |
| `Ctrl+O` | open a YouTube video by URL (D-029) |
| `/` | focus the search field — Enter searches YouTube directly (D-031); also works while a video is playing, exiting fully back to the feed first |
| `c` | focus the sidebar's channel-filter field (B-024) |
| `s` | show/hide the sidebar (B-037) — added in the B-043 audit, had no keyboard path at all |
| `?` | shortcut overlay — also reachable from the full-view player as of B-102 |
| `Esc` | back / close overlay, or cancel the current field |

The full-view player has its own extended key map for the video currently open (`m`/`i`/`f`/`w` mirror
their feed meaning, plus `l`/`s`/`c`/`n`/`p` for actions that only exist in the player) — see
`playback.md` §Player view spec, not duplicated here since it acts on "the open video," not "the
cursor row." `e`/`x` above are the exception: they act on the docked miniplayer, but — unlike the
full-view player's own map — are handled by *this* table's keydown map, since docking hands keyboard
control back to the feed (`playback.md` §Miniplayer).

- Vim-flavored because the audience overlaps heavily; **all** bindings also exist as
  visible UI affordances (hover actions on rows) — keyboard-first, not keyboard-only.
- Rebindable via `settings.json` (documented format); no in-app remap UI in MVP.
- **Secondary screens and menus (Settings, the sidebar's Accounts/channel "…" menus,
  wizard/dialog buttons) intentionally have no single-key bindings of their own** — they
  rely on standard Tab/Shift+Tab focus order and Enter/Space activation on real
  `<button>`/`<a>`/`<input>` elements, which is itself a complete keyboard path per the
  Accessibility section's "no div-soup buttons" rule. This is not a gap: single-key
  bindings are reserved for the main feed's high-frequency actions (the table above);
  everything else being reachable by Tab is the intended, sufficient keyboard path.
- **B-043 audit (2026-07-12):** walked every control added since this table was last
  current — sidebar collapse (B-037, now `s`), the layout/item-size toolbar (B-007, the
  size slider is a native `<input type=range>`, already arrow-key operable once focused),
  field-clear buttons (B-033, real buttons, plus `Esc`-to-clear on the field itself),
  the channel-filter field (B-024, now documented as `c` above — it already existed in
  code and in the `?` overlay, just missing from this table), Settings rows, and the
  channel/account `…` context menus (B-010/B-042/B-003). Found and fixed one real
  violation of the "no div-soup buttons" rule: the priority section's and search
  results' video rows (`App.tsx`) were plain `<div onClick>` with no keyboard path
  at all — unlike the main `FeedList`, they have no cursor-navigation equivalent, so
  Tab-reachability is their *only* keyboard path. Fixed by making them focusable
  (`role="button"`, `tabIndex`, Enter/Space activation) — see `VideoRow`'s `focusable`
  prop in `FeedList.tsx`. **Standing rule going forward, not just this one-time fix:**
  every new interactive control must state its keyboard path (a binding, or which
  existing mechanism — Tab order, cursor navigation — already covers it) before it's
  considered done.
- **B-102/B-103 audit (2026-07-15):** the `?` overlay silently did nothing while the
  full-view player owned the keydown map ([[B-102]], same root-cause shape as B-045's
  earlier `if (playerOpen && !miniplayer) return` in the feed's own handler — the
  player's own keydown map just had no `?` case at all). Fixing that exposed a second,
  broader gap: several of the player's mouse-only actions (mark read/unread, favorite,
  watch later, ignore, like, subscribe, comments) had a feed-level keyboard equivalent
  that simply stopped working the moment the player took over — or, for like/subscribe/
  comments/pop-out/next-in-queue, never had one anywhere. `m`/`i`/`f`/`w` now work
  identically in the player (`f` was free to reuse for favorite there once B-089 removed
  Chronicle's own fullscreen shortcut); `l`/`s`/`c`/`n`/`p` are new, player-only bindings
  (full list: `playback.md` §Player view spec). Added `M`/`v` to the feed table above for
  the same reason B-043 added `s`: real controls (mark-all-read's button, the grid/list
  toggle) that had shipped with a mouse path only. The shortcuts overlay itself was split
  into labeled Feed/Player sections (`HelpOverlay.tsx`) rather than one flat list, since
  several keys now mean different things per screen (`s` toggles the sidebar in the feed,
  subscribe in the player) and the overlay is reachable from both.
- **B-104 (2026-07-15, same day):** the B-102/B-103 audit above still missed one thing —
  the docked miniplayer's own maximize/close buttons (`MiniPlayerBar.tsx`), caught by the
  owner right after. Added `e`/`x` (table above) and a third "Miniplayer" section to the
  overlay, kept separate from "Player" since these route through the feed's own keydown
  map (docking hands keyboard control back to it), not `PlayerSurface`'s.

## States & feedback (Final)

- **Caught up**: calm full-width message in the feed ("You're all caught up · last
  refresh 14:02") — no illustration spam, no suggestions.
- **Refreshing**: subtle spinner on the refresh control + per-phase text in the status
  line ("checking 142 channels…"). Never a blocking overlay.
- **Errors** (quota, auth, offline): single dismissible banner slot above the feed,
  worded per `youtube-api.md` failure table, always with the one relevant action
  ("Reconnect", "Fix in settings…"). Never modal, never stacked toasts.
- **Empty states** teach: fresh install with 0 subs explains that subscriptions come from
  the user's YouTube account and offers "Refresh subscriptions."
- Destructive-ish actions (ignore, remove from WL) use inline undo, not confirm dialogs.

## Localization (Final in shape — D-054)

- Every UI string is a key in `src/ui/i18n` (`t(key, vars)`, B-017), never inline in a
  component — this is what makes translation possible without touching component code.
- Settings' **first section** (above Connection) is a **Language** dropdown: "Follow
  system" plus every locale currently shipped. Default is "Follow system," which resolves
  to the OS locale (`navigator.languages`), falling back to English if no shipped locale
  matches.
- Locales are **discovered, not hand-registered**: each one is a file at
  `src/ui/i18n/locales/<code>.ts` (`meta: { code, nativeName }` + a `Partial` dict of
  translated keys), picked up automatically at build time. Contributing a translation is a
  PR adding one file — the dropdown, the fallback, everything else already handles it. A
  translation may be incomplete; any key it doesn't have falls back to English rather than
  showing blank or breaking the build.
- English (`locales/en.ts`) is the only dict required to be complete — it's the source of
  truth for which keys exist at all.
- The onboarding wizard's Welcome screen carries the same dropdown (Settings isn't
  reachable yet at that point) — same options, same persisted setting, just a second
  place to reach it.
- Any `t()` call must sit inside a component's render body (or something that re-runs
  on every render/language change), never baked into a module-level constant evaluated
  once at import — that constant would freeze at whatever language happened to be active
  the moment the module first loaded and never update again.

## Onboarding wizard UI

Sequential full-window flow (no sidebar), one step per screen: progress indicator
(step n/8), explanation column left, screenshot right, action buttons bottom
(open page ↗ / copy / validate / next). Annotation style for screenshots: single accent
outline + arrow, drawn into the asset (spec in `onboarding.md`).

## Accessibility (Final in principle)

- Full operability by keyboard (above) and by pointer independently.
- Visible focus indicators everywhere; feed cursor ≠ focus ring confusion (one model,
  documented in component specs at implementation).
- Respect OS reduced-motion (trivial — we barely animate) and OS text scaling.
- Contrast: WCAG AA minimum for text on both themes.
- Screen-reader: sensible roles/labels on MVP surfaces (list, rows, actions); full audit
  is post-MVP (**Future idea**), but no MVP choice may be *hostile* to it (e.g., no
  div-soup buttons).

## Performance budgets (Final targets, verify in M3)

- Cold start → interactive feed: **< 2 s** on a mid-range machine (local DB read only).
- Feed scroll: 60 fps with 10,000+ rows → virtualized list required.
- Keystroke → visible response: < 50 ms for local actions.
- Thumbnails lazy-load with fixed layout (zero layout shift), cached on disk with an LRU
  cap (default 500 MB, setting) — cache lives in the platform cache dir, not app data.
