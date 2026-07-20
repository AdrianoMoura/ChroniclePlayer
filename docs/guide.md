# Using Chronicle

A walkthrough of everything Chronicle can do, once you're past first-time setup
(see `docs/setup.md` for connecting your Google account).

## The feed

The feed is the whole app. It's your subscriptions, in strict chronological
order, grouped into **Today**, **Yesterday**, **This Week**, and **Earlier**.
Nothing is ranked, promoted, or recommended — new videos just appear where
their publish date puts them.

- **Caught up**: when there's nothing new, Chronicle just tells you so. That's
  the end state, not a dead end to escape.
- **Refresh**: happens automatically in the background (interval configurable
  in Settings, see below) and on launch, or any time with `r` / the refresh
  button.
- **Favorited channels** get a small priority section pinned above the normal
  chronological feed, showing their unread videos first — in addition to,
  never instead of, their normal place in the timeline.
- **Layout and item size**: the topbar above the feed has a list/grid toggle
  and a size slider (xs → xl). These are display preferences for what you're
  currently looking at, so they live right there instead of in Settings.

### Video states

Every video row supports:

| Action | What it does |
|---|---|
| Mark read / unread | Toggles the unread marker; opening a video also marks it read |
| Ignore | Removes it from view, with a few seconds to undo |
| Favorite | Marks it for later reference (its own view in the sidebar) |
| Watch Later | Adds it to an ordered queue (its own view in the sidebar) |
| Open in browser | Opens the video on youtube.com instead of Chronicle's player |

All of this is **local-only** state — it lives in your database, never on
YouTube, regardless of what permissions you've granted.

## Watching videos

Opening a video plays it in Chronicle's own embedded player view — the
official YouTube player, just without YouTube's surrounding page. Any YouTube
video can be opened this way, not only ones in your feed:

- Links inside a video's description open in the player too, with a back
  stack to return to where you came from.
- `Ctrl+O` lets you paste any YouTube URL directly.
- Videos opened from outside your subscriptions (search, pasted URLs, channel
  pages) behave the same as feed videos — you can favorite or queue them for
  Watch Later, they just don't appear in the chronological feed itself.

When a video ends, playback simply stops — no autoplay into something else.
Chronicle remembers your position in a video and resumes from there if you
come back to it later.

### Leaving a video without losing it

- Leaving the full player while a video is still playing (Esc, Back, or
  navigating elsewhere) docks it into a small corner **miniplayer** instead of
  stopping it. The feed becomes interactive again underneath.
- Click the miniplayer (or press `e`) to bring it back to the full view.
- Press `x` to close the miniplayer outright.
- The miniplayer's left edge is a drag handle to resize it; the width is
  remembered across launches.
- Press `p` — from either the full player or the miniplayer — to pop the
  video out into its own always-on-top window, independent of the main
  Chronicle window. Useful for keeping a video visible while you do
  something else. Closing that window docks the video back into the main
  window rather than losing it.

## Search and channels

- Press `/` to focus search, then Enter to search all of YouTube — videos and
  channels, including ones you don't follow. This never filters your already
  loaded feed; browsing what you follow is the sidebar's job.
- Pasting a video/channel/@handle URL into search resolves it directly.
- Clicking any channel — from a video, the sidebar, or search — opens an
  in-app channel page: avatar, banner, subscriber count, and that channel's
  uploads in the same strict chronological order as the main feed. No
  "popular uploads" or "for you" tab.
- Subscribing from a channel page is a real YouTube subscription, kept in
  sync with your account. Chronicle is upfront that this also affects
  YouTube's own algorithm for that account, since it's a real write to
  YouTube, not a local-only follow.

## Comments and likes

From the player's action bar you can like a video, load its comments (never
loaded automatically — it's a deliberate click), and post a top-level comment
or reply. There's no like button on individual comments — YouTube's API
doesn't expose one.

Subscribing, liking, and commenting each need one extra Google permission
beyond the basic read-only connection from setup. The **first** time you do
any of these, your default browser opens for a quick consent screen; once
granted, it applies to all of these actions from then on — you won't be
asked again.

## Multiple accounts

You can connect more than one Google account. Their feeds combine into one
list by default. Clicking an account in the sidebar's Accounts section
filters the feed down to just that account — click the same account again to
deselect it and go back to the combined view. Read state, favorites, and
Watch Later are shared per video, not per account — if you've watched
something on one account, it shows watched everywhere.

## Shorts

Shorts show up in the feed like any other upload, tagged with a "Short"
badge — Chronicle doesn't hide them by default, and there's no separate
swipe-based Shorts feed. If you'd rather not see them at all, **Settings →
Appearance → Show Shorts** hides them from every view, including Watch Later
and Favorites.

## Settings

### Language

- **Language**: "Follow system" (the default, based on your OS language) or
  pick one explicitly. A translation can be incomplete — any string it's
  missing just falls back to English.

Chronicle's translations live in
[`src/ui/i18n/locales/`](https://github.com/AdrianoMoura/ChroniclePlayer/tree/main/src/ui/i18n/locales)
in the repo — one file per language. Translation contributions for new
languages are welcome; open a PR adding a locale file there.

### Connection

Shows your connection state, the permissions you've granted, and whether
your credentials are in your OS keychain or an encrypted fallback file.
Reconnect, replace your OAuth client file, fix the "reconnect weekly" issue
(see `docs/setup.md`), or sign out entirely.

### Sync

- **Background refresh**: every 15/30/60 minutes, or manual only.
- **Check for updates**: periodically checks GitHub for a newer release
  (never downloads or installs anything automatically).

### Playback

- **Default speed**: the playback rate new videos open at.

### Appearance

- **Theme**: follow system, or force dark/light.
- **Show view counts**: display each video's view count in the feed.
- **Show Shorts**: include or hide Shorts everywhere (see above).

### Startup

- **Auto-start**: launch Chronicle when you log into your computer.
- **Run in background**: closing the window minimizes to a tray icon instead
  of quitting, so background refresh (and notifications) keep working with no
  window open.
- **Pop out on close** (only shown when background mode is on): if a video is
  still playing when you close to the tray, this opens it in the
  always-on-top window, still playing. With it off, the video pauses
  instead.
- **Start minimized to tray** (only shown when both auto-start and
  background mode are on): skip showing the window at login.

### Notifications

- **Enabled**: OS notifications for new videos ("N new video(s) from
  {channel}") — purely mechanical, no re-engagement copy.
- **Scope**: all channels, or only channels you've selected.
- **Notify me about new Shorts** (only shown when Shorts are visible in the
  feed): lets you see Shorts in the feed but keep notifications quiet for
  them. A Short already hidden from the feed never notifies regardless of
  this toggle.
- **Keep notifications in sync with Favorites**: when on, favoriting a
  channel automatically turns on notifications for it too.

### Your data

- **Export**: one-click JSON export of your channels, videos, states, and
  settings — everything, in a plain documented format you can inspect with
  any text editor.
- **Delete all data**: wipes your local database and relaunches Chronicle
  into first-run setup. Requires a second click to confirm.

Your data always lives in a local SQLite database you can open with any
SQLite browser — nothing is hidden behind a proprietary format.

## Keyboard shortcuts

Chronicle is fully operable by keyboard. Every binding below also exists as a
visible on-screen control — nothing here is keyboard-only.

### Feed

| Key | Action |
|---|---|
| `j` / `k` or ↓ / ↑ | Next / previous video |
| `Enter` or `o` | Play |
| `b` | Open in browser |
| `m` | Toggle read/unread |
| `i` | Ignore (with undo) |
| `u` | Undo the last ignore |
| `f` | Toggle favorite |
| `w` | Toggle Watch Later |
| `M` | Mark all as read (current view) |
| `v` | Toggle list/grid layout |
| `e` | Maximize the docked miniplayer |
| `x` | Close the docked miniplayer |
| `gg` / `G` | Jump to top / end of the loaded feed |
| `1`–`5` | Switch view (All, Unread, Watch Later, Favorites, Ignored) |
| `r` | Refresh |
| `Ctrl+O` | Open a YouTube video by URL |
| `/` | Focus search |
| `c` | Focus the sidebar's channel filter |
| `s` | Show/hide the sidebar |
| `?` | Shortcut overlay |
| `Esc` | Back / close overlay / cancel the current field |

### Player

| Key | Action |
|---|---|
| `Space` | Play/pause |
| `←` / `→` | Seek |
| `m` / `i` / `f` / `w` | Same as the feed's meaning, for the open video |
| `l` | Like |
| `s` | Subscribe/unsubscribe from the channel |
| `c` | Show/hide comments |
| `n` | Next in queue (only when one is queued) |
| `p` | Pop out to the always-on-top window |
| `b` | Open in browser |
| `/` | Focus search (exits the player back to the feed) |
| `?` | Shortcut overlay |
| `Esc` | Exit fullscreen, then back to feed/dock |

Menus and secondary screens (Settings, the sidebar's "…" menus, dialogs) rely
on standard Tab / Shift+Tab and Enter/Space instead of single-key bindings —
those are reserved for the feed and player's high-frequency actions above.
