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
│ Favorites│  YESTERDAY                                    │
│ Ignored  │  …                                            │
│ ────────│  THIS WEEK                                    │
│ Channels │  …                                            │
│  (list)  │  EARLIER          (loads as you scroll ·      │
│                    D-027)                     │
│ ────────│                                               │
│ Settings │                                               │
└──────────┴──────────────────────────────────────────────┘
```

- **Sidebar**: views (All, Unread, Watch Later, Favorites, Ignored), then the channel
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
| `gg` / `G` | top / end of loaded feed |
| `1…5` | switch view (All, Unread, WL, Fav, Ignored) |
| `r` | refresh |
| `Ctrl+O` | open a YouTube video by URL (D-029) |
| `/` | filter-in-view (local text filter; not YouTube search) |
| `c` | focus the sidebar's channel-filter field (B-024) |
| `s` | show/hide the sidebar (B-037) — added in the B-043 audit, had no keyboard path at all |
| `?` | shortcut overlay |
| `Esc` | back / close overlay, or cancel the current field |

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
