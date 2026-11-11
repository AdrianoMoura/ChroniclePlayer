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
- **Live streams and Premieres**: a broadcast that's currently live (or a
  Premiere) shows a "Live"/"Premiere" badge and "Started X ago" instead of a
  duration, and outranks everything else in the feed — not just within
  whatever's already loaded, but at the actual sort order, so it won't be
  buried behind older uploads even if it was scheduled days in advance. Once
  it ends, the badge goes away and a duration appears like any other video —
  it settles into the feed based on when it actually ended, not its original
  publish time, so it doesn't jump around. The same badge and ranking apply
  to a live/upcoming video in search results or a channel's own video list,
  not just the main feed.

### Video states

Every video row supports:

| Action | What it does |
|---|---|
| Mark read / unread | Toggles the unread marker; opening a video also marks it read |
| Ignore | Removes it from view, with a few seconds to undo |
| Favorite | Marks it for later reference (its own view in the sidebar) |
| Watch Later | Adds it to an ordered queue (its own view in the sidebar) |
| Add to Playlist | Opens a dialog to add/remove the video from your local playlists |
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

### Live chat

While a video is live, a chat toggle appears next to the title in the full
player view. Opening it docks a chat column beside the video, using YouTube's
own live chat embed. Since that's YouTube's own iframe rather than an API
call, it doesn't carry over your account connection from setup — to type,
you sign in separately, once, in a plain browser window Chronicle opens for
you (a link right under the chat explains this). A separate button extracts
the chat into its own window, independent of the video's pop-out; closing
that window brings chat back to the docked column (unless the video has
since docked to the miniplayer, which has no room for a chat column and
closes it automatically). Chat always starts closed for each video you open.

## Watch Later

Watch Later is an ordered queue with its own view in the sidebar (`w` adds or
removes the current video from any context).

- **Reorder**: drag a row or card to a new position. Dropping it on another
  video inserts it right after that video; the first video in the queue is
  also a drop target for "insert before," since nothing else can become the
  new first item.
- **Up next**: when a video opened from Watch Later ends, a small dismissible
  card appears suggesting the next video in the queue — thumbnail, title, and
  an explicit Open button. Nothing plays on its own; the card just offers
  where to go next. Reaching the end of the queue wraps back around to the
  first video.
- **Remove when opened**: off by default. **Settings → Playback → Remove from
  Watch Later when opened** makes opening a queued video remove it
  automatically, the same as manually toggling it off.

## Playlists

Playlists are your own local collections — never a YouTube playlist, never
synced anywhere. They have their own screen in the sidebar, alongside the
feed views.

- Each playlist shows as a card/row with its name, video count, total
  duration, and a composite cover built from up to six of its own videos'
  thumbnails.
- Opening a playlist shows its videos (drag-and-drop reorder, same mechanics
  as Watch Later above) with inline-editable name and description, and a
  delete action that needs a second click to confirm.
- **Add to Playlist**, available from any video row and from the player
  (`a` in the full player view), opens a checklist of your playlists —
  ticking one adds or removes the video immediately — plus a field to create
  a new playlist and add the video to it in one step.
- Opening a video from inside a playlist never removes it — only the
  explicit "remove from playlist" action does. There's no ignore action
  inside a playlist's own video list either, since adding a video there is
  the opposite intent of hiding it.
- The "up next" card also works here: finishing a video that came from a
  playlist suggests that playlist's next video. Unlike Watch Later, it
  doesn't wrap around — a playlist has a real end, so finishing the last
  video suggests nothing further.
- **Import from YouTube**: paste a YouTube playlist URL and Chronicle creates
  a new local playlist with the same videos in the same order, pre-named
  from the source's own title. This is a one-time snapshot, not an ongoing
  sync — editing or reordering the copy afterwards never touches the
  original on YouTube.
- An imported playlist's own screen gets a **Sync** button: it checks how
  many videos the source playlist has gained since the import (or last
  sync) and shows "Sync (N new)" when there's something to pull, or "Up to
  date" (disabled) otherwise. Sync only adds missing videos — it never
  removes, reorders, or renames anything you've since changed in your own
  copy.

## Watch History

History is a local record of every video you've ever played in Chronicle —
subscribed or not, most recently watched first — with its own screen in the
sidebar (`7`).

- It has a local, free-text search box of its own, separate from the
  topbar's `/` search — this one only filters what you've already watched,
  it never reaches YouTube.
- Remove a single entry (with undo), or clear the whole history with
  **Clear History** (needs a second click to confirm).
- A history entry has no read/unread or ignore concept — those actions don't
  apply here.

## Search and channels

- Press `/` to focus search, then Enter to search all of YouTube — videos and
  channels, including ones you don't follow. This never filters your already
  loaded feed; browsing what you follow is the sidebar's job.
- Pasting a video/channel/@handle URL into search resolves it directly.
- **Searching within a channel**: while a channel's own screen is open,
  that same `/` field scopes your search to that channel's videos instead
  of all of YouTube — works for a channel you follow or one you're just
  browsing. The channel's header (back, subscribe, favorite) stays visible
  above the results.
- Clicking any channel — from a video, the sidebar, or search — opens an
  in-app channel page: avatar, banner, subscriber count, and that channel's
  uploads in the same strict chronological order as the main feed. No
  "popular uploads" or "for you" tab.
- Subscribing from a channel page is a real YouTube subscription, kept in
  sync with your account. Chronicle is upfront that this also affects
  YouTube's own algorithm for that account, since it's a real write to
  YouTube, not a local-only follow.
- The sidebar's channel list can be sorted — a control next to the
  **Channels** header offers **Favorites** (the default on every launch),
  **Recent** (most recent upload first), **Unread** (most unread videos
  first), or **Name** (alphabetical).

## Likes, sharing, and comments

Subscribing, liking, and commenting each need one extra Google permission
beyond the basic read-only connection from setup. The **first** time you do
any of these, your default browser opens for a quick consent screen; once
granted, it applies to all of these actions from then on — you won't be
asked again.

### Like / Dislike

The player shows the video's real like count from YouTube. Liking or
disliking (`l` for like) is a real write back to YouTube, same as doing it
on youtube.com. There's no public dislike *count* on YouTube anymore —
**Settings → Playback → Show an estimated dislike count** turns on an
optional estimate from the third-party [Return YouTube
Dislike](https://returnyoutubedislike.com) project; while it's on, your own
like/dislike/remove-rating also gets mirrored back to that project as a
vote, anonymously (no Google account link). Turning the setting off means
Chronicle talks only to YouTube, same as before this existed.

### Share

The player's topbar has a **Share** button: it gives you the video's plain
`youtube.com/watch?v=...` link with a Copy button, plus a checkbox to
include your current playback position as a timestamp. Not shown for a
live video, since there's no single "current position" everyone else
watching live shares.

### Comments

Loading comments is a deliberate click, never automatic. Once loaded:

- Toggle between **Top comments** and **Newest first** — same sort YouTube
  itself offers.
- A comment/reply's author name links to that person's own channel page
  in-app, when YouTube provides one.
- An "↗" button opens that specific comment on youtube.com.
- A red heart shows if you've already liked a comment — read-only; YouTube's
  API has no way to like a comment from a third-party app, only read your
  existing like.
- Post a top-level comment, or reply to any comment/reply (replying to a
  reply still posts as a reply to the original top-level comment — YouTube
  only nests one level deep).
- **Edit** or **Delete** your own comments and replies — both only show up
  on comments/replies you actually posted. Delete needs a second click to
  confirm; deleting a top-level comment removes its replies too, same as it
  would on youtube.com.

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
  missing just falls back to English. Some languages are AI-translated and
  not yet reviewed by a native speaker; picking one shows a note saying so.

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
- **Remove from Watch Later when opened**: off by default. See
  [Watch Later](#watch-later) above.
- **Show an estimated dislike count**: off by default. See
  [Like / Dislike](#like--dislike) above.

### Appearance

- **Theme**: follow system, or force dark/light.
- **Show view counts**: display each video's view count in the feed.
- **Show Shorts**: include or hide Shorts everywhere (see above).

### Startup & Background

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

### Data

- Shows how much space your database, thumbnail cache, and video count are
  actually using on disk.
- **Export data…**: one-click JSON export of your channels, videos, states,
  and settings — everything, in a plain documented format you can inspect
  with any text editor.
- **Delete all local data**: wipes your local database and relaunches
  Chronicle into first-run setup. Requires a second click to confirm.

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
| `1`–`7` | Switch view (All, Unread, Watch Later, Playlists, Favorites, Ignored, History) |
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
| `a` | Add to Playlist |
| `b` | Open in browser |
| `/` | Focus search (submitting a search leaves the player back to the feed) |
| `?` | Shortcut overlay |
| `Esc` | Exit fullscreen, then back to feed/dock |

Dislike, Share, and editing/deleting a comment have no keyboard shortcut —
deliberately, for Dislike, since a one-key accidental press next to Like
isn't worth the risk; the others are just click-only actions. Use their
on-screen buttons.

Menus and secondary screens (Settings, the sidebar's "…" menus, dialogs) rely
on standard Tab / Shift+Tab and Enter/Space instead of single-key bindings —
those are reserved for the feed and player's high-frequency actions above.
