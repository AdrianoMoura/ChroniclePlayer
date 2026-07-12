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
  list (click = filter feed to that channel), then Settings. Collapsible to icons.
- **Feed**: the grouped chronological list (`feed.md`). List rows are the default —
  calmer, rank information (title first) over imagery — but **D-037** adds an optional
  thumbnail grid, since a masonry/grid view is a layout preference, not an engagement
  mechanic; the same rows and actions render either way.
  **D-022 (Pending):** row density — compact list vs. comfortable rows with larger
  thumbnails. Recommendation: comfortable default with a compact-density setting; both
  are the same component, so cost is low.
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
| `?` | shortcut overlay |
| `Esc` | back / close overlay |

- Vim-flavored because the audience overlaps heavily; **all** bindings also exist as
  visible UI affordances (hover actions on rows) — keyboard-first, not keyboard-only.
- Rebindable via `settings.json` (documented format); no in-app remap UI in MVP.

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
