# Playback

**Decided (D-006, Final, 2026-07-10):** Chronicle plays videos with the **embedded
YouTube IFrame Player**, styled to be as clean and invisible as possible — the goal is
that the user barely perceives they are watching an embed. A per-video "open in browser"
escape hatch always exists. This decision drove D-005 (Electron — see `architecture.md`).

## Requirements (Final)

1. Clicking a feed item plays the video with minimal friction.
2. Playback must be reliable across Linux/macOS/Windows — "video won't play" is a
   product-killing failure. (Satisfied by Electron's bundled Chromium.)
3. Chronicle remains a well-behaved YouTube client: official player, creators keep their
   views **and their monetization**.
4. When the player view opens, the video is marked `read` (see below).
5. No autoplay into other content afterwards (see `non-goals.md`) — the end of a video is
   the end.

## Why not our own player? (rejected alternative — record permanently)

Building a native player over extracted streams (the yt-dlp/mpv approach) was considered
and **rejected** for the default experience:

- **TOS violation**: stream extraction bypasses the official player and Google's terms.
  It contradicts the "well-behaved client" identity in `vision.md` and puts the project's
  longevity at risk.
- **Fragility**: extraction breaks every time YouTube changes internals; Chronicle would
  inherit a permanent "videos stopped playing, update the app" support treadmill.
- **Creators lose money**: even when a raw-stream view counts, no ads run — the channel
  earns nothing. Chronicle's users are exactly the people who deliberately follow
  creators; defunding them is against the product's spirit.

The embedded player is the only option that is simultaneously reliable, compliant, and
fair to creators. **Correction, 2026-07-12 (`bugs.md` B-049):** this section previously
claimed Premium users get an ad-free embed "automatically via their Google session in
the webview" — untrue as shipped, since there's no sign-in path into that session at
all (see the Login quirk note below); ads run for every user today regardless of a real
Premium subscription elsewhere.

An **opt-in external player (mpv)** for power users — Chronicle detects it, never
installs it, clearly labels the trade-offs — is preserved as a **Future idea** only. Not
MVP.

## The "clean embed" mandate (Final)

The embed must not feel like a YouTube page inside the app. Concretely:

- **Player parameters**: `rel=0` (related videos restricted to the same channel — full
  suppression isn't offered by the API), `modestbranding`, `iv_load_policy=3` (no
  annotations), `controls=1`. (**Assumption:** parameter behavior as of 2026 — re-verify
  exact effects at implementation; YouTube has deprecated/weakened some of these over the
  years.)
- **End-of-video overlay**: on the IFrame API `ended` event, Chronicle immediately covers
  the player with its own end panel (back to feed / next in Watch Later queue if
  applicable) so YouTube's related-videos end screen is never seen.
- **Pause overlay mitigation**: the paused embed can show related-video shelves; evaluate
  covering the lower third on pause vs. accepting it — decide at implementation with the
  real embed in hand (minor, but part of the clean mandate). *(M3 decision, 2026-07-11:
  accepted without a cover for MVP — `rel=0` limits the pause shelf to the same channel
  (creator curation, not algorithm), and covering it would also hide legitimate player
  controls. Revisit only if dogfooding shows it pulling attention.)*
- **Chrome-less player view**: the video sits in Chronicle's own view (title, channel,
  date, description, local action bar in Chronicle's typography/theme) — everything
  around the video is ours; only the video surface itself is YouTube.
- **Embed-restricted videos** (owner disabled embedding — IFrame errors 101/150):
  detected and routed automatically to "open in browser" with a one-line explanation.
- **Login quirk**: the embed is a plain `<iframe>` using Electron's own default session
  (cookies), not the OAuth token — playback works logged-out either way. **Verified
  2026-07-12 (`bugs.md` B-049):** no `partition` is set anywhere, so it's genuinely
  Electron's own persistent, isolated session (not reusing an OS browser's) — but there
  is no sign-in surface anywhere in the app that could authenticate it (OAuth uses the
  *system* browser via the loopback flow, never this session). The Settings copy
  previously promised "sign in once inside the player for ad-free playback," which
  described a flow that doesn't exist — corrected to state plainly that there's currently
  no way to sign into that session from inside Chronicle.

## Universal video opening — D-029 (Final, 2026-07-10)

The player view is not tied to the feed: it opens **any YouTube video**, subscribed or
not. Rationale: the recommendation ban targets algorithmic selection; user-initiated
navigation and creator curation are the product's discovery model (see `vision.md`
§Discovery).

Entry points:
- A feed row (the common case).
- **A YouTube video link in a description**: descriptions are rendered with links;
  `youtube.com/watch`, `youtu.be`, and `youtube.com/live` URLs open in Chronicle's own
  player view, pushing onto a **navigation stack** (Esc/back returns to the previous
  video or the feed — the trail is always escapable).
- **Open by URL**: an "open video URL" action (Ctrl+O, see `ui.md`) accepts any pasted
  YouTube link.
- **Future idea:** registering Chronicle as an OS-level handler for YouTube links
  (opt-in), and an in-app channel view as an entry point (D-030).

**Push vs. replace (bug fix, 2026-07-15, `bugs.md` [[B-045]] fourth round):** only the
in-description-link entry point above should *push* onto the navigation stack — every
other entry point (a feed row, a search result, the priority/channel-preview sections, the
"open by URL" prompt) is a **fresh browsing action** and must *replace* the stack outright.
Before this fix all of them defaulted to push, which was invisible normally (the stack was
usually empty anyway) but surfaced as a real bug once docking could leave a video sitting
in the stack: docking one video, then opening an unrelated one from the feed, buried the
first video one level down instead of discarding it, so Back/Esc later resurfaced the
*previous video* instead of the *previous screen*. `openVideo` (`App.tsx`) now takes an
explicit `mode: 'push' | 'replace'` parameter; every fresh-browsing call site passes
`'replace'`, and the in-description-link call site is the sole remaining `'push'`.

Link rules inside descriptions:
- YouTube **video** links → in-app player view (above).
- YouTube **Shorts** links → never played in-app; a small notice offers "open in
  browser". Unrelated to feed display (D-035 shows Shorts in the feed, tagged) — this is
  about Chronicle never building a Shorts-style vertical player (`non-goals.md`), so a
  clicked Shorts link still falls back to the browser rather than Chronicle's own
  16:9-oriented player view.
- YouTube **channel/playlist** links → default browser for MVP; in-app channel view when
  D-030 lands.
- **All other links** → default browser, always.

Data handling for externally opened videos (Final):
- Metadata hydrated via `videos.list` (1 unit, cached in the `videos` table); its channel
  gets a `channels` row with `subscribed = 0`.
- They **never appear in the feed** and never count as unread — the feed remains strictly
  the user's followed channels (`feed.md`).
- Local states work on them: favorite and watch-later on a discovered video are core use
  cases (that's how a discovery is kept). Read status is set as usual (harmless).

## Player view spec

- Dedicated player view (not a modal): video area + title, channel, published date,
  duration, description (collapsed by default, links rendered per D-029 rules) +
  Chronicle's local action bar (read/unread toggle, favorite, watch later, ignore, open
  in browser).
- On `ended`: Chronicle's end overlay — "Back to feed" and, if the video came from the
  Watch Later queue, "Next in queue" (explicit button; auto-advance within the user's own
  queue is **D-021, Pending** — recommendation: off by default, opt-in setting).
- Keyboard: space play/pause, ←/→ seek, f fullscreen, esc back to feed (full map in
  `ui.md`). Note: keyboard control of the IFrame player requires proxying keys through
  the IFrame API (`player.playVideo()` etc.) since the iframe swallows focus — an
  implementation detail worth planning for.
- **Known limitation, confirmed 2026-07-15 ([[B-089]]):** the proxying above only covers
  key presses while focus is on Chronicle's own app (the common case, since the iframe
  "swallows focus" only for its own internal controls the user clicks directly). If focus
  is genuinely inside the cross-origin YouTube iframe when a key is pressed, that keydown
  never reaches the parent frame's listener at all — a browser same-origin security
  boundary, not something any amount of Chronicle JS can intercept or override. In that
  case the key press is handled entirely by YouTube's own embedded player instead, which
  can behave differently (observed: its own fullscreen toggle drops its player controls,
  where Chronicle's own `f` handling — `requestFullscreen()` on the wrapping element —
  keeps them). Not fixable from Chronicle's side without disabling the iframe's own
  legitimate focus/interaction entirely (its native controls, seek bar, volume), which
  would be a worse regression than the inconsistency itself — accepted as a platform
  limitation rather than pursued further.
- **Resume playback position — implemented 2026-07-13 (`bugs.md` B-044), promoted off
  this future-ideas list per product-owner request.** `video_state.resume_position_seconds`
  (schema v7) persists the last known position, read via the IFrame API's `infoDelivery`
  events (already polled for the seek-±5s shortcuts) and written on pause, on the video
  actually ending (cleared to null), and right as the player switches away from a video
  (queue navigation or closing). Reopening a video passes it as the embed's `start=`
  query parameter rather than issuing a `seekTo()` after the fact — simpler, and avoids a
  visible jump once playback begins. "Finished, don't resume" threshold: under 10s
  played, or within the last 30s of the video's known duration (both treated as null/no
  resume). Persistence cadence is checkpoint-based (pause/ended/switch-away), not a
  periodic tick, consistent with the app's "predictable, not continuously polling" style
  elsewhere (e.g. D-038's reissue-on-start pattern).

## Miniplayer — D-046 (Final, exercised 2026-07-15; revised same day after live testing)

Leaving the full player view no longer has to stop playback. Three related surfaces,
all `bugs.md` [[B-045]]:

- **Docking**: leaving the player while a video is still going — Esc/the Back button, or
  any "hard" navigation away (a sidebar view/channel/settings click, submitting a
  search, switching accounts) — docks to a small persistent corner box instead of
  closing, from the outermost level of the queue stack. The feed becomes interactive
  again underneath, keyboard shortcuts revert to normal feed navigation (j/k/etc.), and
  the video keeps playing. Explicitly paused/ended, or deeper in the queue stack
  (viewing a video reached via a description link), every one of those paths still
  behaves exactly as before (closes/navigates outright). **Automatic only** — an
  explicit "Miniplayer" button was tried first and dropped after live feedback: the
  product owner's actual ask was that leaving a playing video dock by itself, and a
  separate manual button next to that auto-behavior just read as redundant clutter.
- **Maximizing**: clicking the corner box (or its own maximize button) returns to the
  full view, same video, same position, still playing.
- **Extracting**: the corner box's extract action pops the video into its own
  always-on-top OS window, independent of the main Chronicle window, with no native menu
  bar and reliable autoplay at the handed-off position. Closing that window docks the
  video back into the main window's corner box rather than losing it — extraction and
  docking are round-trippable, not a one-way trip.
- **Resizable**: the corner box has a custom drag handle occupying its own left-edge
  strip (not the browser's native `resize: horizontal`, whose handle sits in the box's
  bottom-right corner — exactly where the box itself is anchored against the screen edge,
  making it awkward to grab; nor an absolutely-positioned overlay inside the box, which a
  first attempt tried and which the video iframe's higher z-index rendered invisible and
  unclickable — see the stacking-order note below). The resulting width is persisted
  (`settings.json`, `miniplayerWidth`), not reset every launch.

**Continuity is the whole design constraint, and it splits into two different answers**
depending on whether the destination is still inside the main window's renderer process:

- Docking and maximizing stay inside the *same* renderer process, so the exact same live
  `<iframe>` — and its postMessage widget protocol connection — can keep running,
  uninterrupted, the whole time. **First implementation attempt used a React portal**
  (`ReactDOM.createPortal`) to move `PlayerSurface`'s rendered output between a
  full-view slot and a corner-box slot — this shipped, and live testing immediately
  showed the video restarting from zero on every dock. Root cause: moving an `<iframe>`
  to a different DOM parent — which is exactly what a portal does under the hood, even
  without ever detaching it from the document — makes Chromium reload it. This isn't
  React-specific or fixable by "portaling more carefully"; it's a browser behavior that
  applies to any DOM-level reparent of an iframe, portal or not. **Fixed by dropping the
  portal entirely**: `PlayerSurface` now renders at one single, permanently stable
  position in the tree (a sibling of `PlayerDetails`/`MiniPlayerBar` in `App.tsx`, never
  conditionally nested inside either) and never moves in the DOM at all. Instead it
  measures whichever "slot" placeholder element (an empty, `ResizeObserver`-watched
  `<div>`) the currently-active layout provides — `PlayerDetails` for full view,
  `MiniPlayerBar` for docked — and mirrors that placeholder's on-screen rect via
  `position: fixed` inline styles (`top`/`left`/`width`/`height`, recomputed on resize).
  The iframe's actual DOM parent chain never changes; only numbers change. This also
  means `.player-view`'s layout had to stop being one scrolling block: the stage
  placeholder sits in a non-scrolling flex row (topbar + stage, fixed height) with only
  `.player-info` (description/comments) scrolling below it — otherwise the placeholder's
  on-screen position would shift on every scroll tick, needing scroll-tracking on top of
  resize-tracking. `PlayerDetails`/`MiniPlayerBar` still both stay mounted at all times
  (CSS `display: none` when inactive) so their placeholders never disappear out from
  under `PlayerSurface`'s measurement effect.
- Extracting crosses into a genuinely different renderer process (a second
  `BrowserWindow`, `alwaysOnTop: true`) — there is no way to move a DOM node between
  two Electron renderer processes, full stop (the same constraint that broke docking
  above, just one level up — a whole separate process, not only a different parent
  within one). This hands off a **snapshot** (current playback position +
  playing/paused) to a fresh, minimal instance in the new window instead: that window
  loads the exact same renderer bundle with an
  `?extract=<videoId>&t=<startSeconds>&autoplay=<0|1>` query string, which the
  renderer's entry point checks to render a bare `ExtractedPlayerWindow` (just a
  clean-embed iframe filling the window, seeked to the handed-off position) instead of
  the full app. The main window's player closes outright once extraction happens —
  playback now lives in that window. A brief reload/seek is an accepted, inherent cost
  of this leg, not something worth chasing a workaround for.

**Stacking order:** the docked corner box is `position: fixed` with `z-index: 20`; the
measured, always-fixed `.player-stage` itself sits at `z-index: 21` (above both the
corner box and the full-view chrome, `.player-view` at `z-index: 5`, regardless of which
one is currently active) but below any modal (`.overlay-backdrop`, used by the help
overlay, add-account, URL prompt, and write-scope consent dialogs, was bumped to
`z-index: 30` specifically so a dialog opened while docked — mini mode hands keyboard
control back to the feed, so e.g. `?` for help is reachable there too — still wins).

**Session note, same fix:** the first pass also gave every `BrowserWindow` (main, sign-in,
extract) a custom named session partition as part of B-093, which broke every thumbnail
in the app — see `authentication.md` §The embedded player's browser session and D-045.
Reverted to Electron's default session everywhere in the same pass as the portal fix.

**Third round, same day:** the next live test found docking didn't fire at all, via any
path. Two causes. First, every "hard" navigation-away action listed under Docking above
called `setPlayerStack([])` directly — a full, unconditional clear that never consulted
the dock decision at all. Fixed with a shared `leavePlayerForNavigation()` (`App.tsx`)
that all of those call instead: collapses the queue stack down to just the current
video and docks it if still going, otherwise clears exactly as before. Second, even the
Back/Esc path's own decision was gated on the IFrame API's literal `PLAYING` (`1`)
state, which only updates once the iframe posts back its own `onStateChange` — a round
trip that firing promptly (or distinctly, for the *autoplay-initiated* transition
specifically) isn't reliable enough to gate a core feature on. Loosened to "still
going": true unless explicitly paused (`2`) or ended (`0`), so unstarted/buffering/cued
all dock too — erring toward keeping playback going over silently never docking.
Exposed as `PlayerSurfaceHandle.isStillGoing()`, shared by both the automatic Esc/Back
path and `leavePlayerForNavigation()`.

**Fourth round, same day:** the next live test found six more issues in the extract leg
and the resize control specifically. `ExtractedPlayerWindow` was a bare `<iframe
src="…embed/…autoplay=1">` with no widget protocol at all — reliable only for the initial
load, and with no way to know current playback position when the window closed. It now
speaks the same postMessage widget protocol as the main player: `enablejsapi=1` on the
embed, `command()`/`announce()` helpers, an explicit `command('playVideo')` once the
handshake completes (autoplay via the embed's own `autoplay=1` param alone wasn't reliable
under Electron's top-level-navigation autoplay policy — `createExtractWindow` also sets
`webPreferences.autoplayPolicy: 'no-user-gesture-required'`), and an `infoDelivery`
listener tracking `currentTime` so a `beforeunload` handler can persist the resume
position. `createExtractWindow` (`src/platform/main.ts`) gained a `window.on('closed',
...)` handler that broadcasts `player:restoreFromExtract`; the main window handles that
event by re-opening the same video docked (`openVideo(videoId, 'replace', true)`) —
closing the extracted window is now a return trip, not a dead end. Both the extract
window and the B-093 sign-in window gained `removeMenu()` — neither should show
Electron's native menu bar. The resize handle changed from native CSS `resize:
horizontal` to a custom top-left drag handle (`MiniPlayerBar.tsx`, raw
`mousedown`/`mousemove`/`mouseup`, growing the box when dragged away from its anchored
right edge), and the resulting width now persists as `miniplayerWidth` in `settings.json`
(clamped between `MINIPLAYER_MIN_WIDTH`/`MINIPLAYER_MAX_WIDTH`, `src/ipc/contract.ts`),
written once per drag on mouseup rather than on every mousemove.

**Fifth round, same day:** the next live test found the fourth round's own resize-handle
and extract-autoplay fixes didn't actually work — two separate, specific bugs in how
those fixes were built. The resize handle was `position: absolute; top: 0; left: 0`
*inside* `.miniplayer` (z-index 20 per the stacking-order note below) — but the docked
video is `PlayerSurface`'s always-mounted `.player-stage`, which mirrors the stage slot's
rect at z-index 21, one layer *above* the miniplayer box, painted directly over that same
corner. No z-index value on the handle itself could have fixed this: a positioned child
can never paint above a sibling stacking context whose own z-index is higher than its
parent's, regardless of what z-index the child requests — the handle was both invisible
and unclickable, fully covered. Fixed by giving the handle real layout instead of an
absolute overlay: `.miniplayer` is now a flex row — a fixed-width left-edge strip
(`.miniplayer-resize-handle`) plus a `.miniplayer-content` column holding the stage slot
and title bar. Since the video iframe only ever mirrors `.miniplayer-stage-slot`'s own
rect (now inset by the strip's width, not the full box), it structurally cannot cover the
handle regardless of z-index. Cursor changed from a diagonal `nwse-resize` to `ew-resize`
to match that only width changes, never height. Separately: the explicit
`command('playVideo')` added last round for extract-window autoplay was correct but never
actually got exercised, because the bug was upstream of the extract window entirely.
`extractToWindow` (`App.tsx`) reads a `playing` flag from `PlayerSurface`'s
`getPlaybackSnapshot()`, which checked `playerStateRef.current === 1` — the exact same
overly strict check the third round of this same fix already found and loosened for the
*docking* decision (`isStillGoing()`, true unless explicitly paused or ended), because the
autoplay-initiated `onStateChange` round trip isn't guaranteed to have landed by the time
the user acts. `getPlaybackSnapshot` simply hadn't been updated to match, so extracting
before that round trip landed handed off `playing: false`, and the extract window's
autoplay logic (last round's fix) faithfully honored that — correctly — as "don't
autoplay." Fixed by having `getPlaybackSnapshot().playing` reuse `isStillGoing()` too.

**Sixth round, same day:** the owner found D-038's default playback speed wasn't
reaching the extracted window — it always opened at 1x regardless of the Settings value.
Unlike the two fixes above, this wasn't a bug in already-written plumbing; the plumbing
never existed. `extractPlayer` (`src/ipc/contract.ts`) never had a `defaultPlaybackRate`
parameter, so there was no path for the value to travel through at all — the main player
gets it as an ordinary React prop from `App.tsx`'s own `settings` state
(`PlayerSurface`'s `defaultPlaybackRate` prop), but the extract window is a *different
renderer process* reached only through the `extractPlayer` IPC call and the `?extract=`
query string, and neither carried it. Fixed by threading it through every layer:
`extractPlayer` gained a fourth parameter, validated in the `main.ts` IPC handler against
`PLAYBACK_RATES` (falling back to 1x for anything outside that list, the same pattern
`normalizeSettings` already uses for settings.json), carried across as the query string's
new `rate=` param, and applied in `ExtractedPlayerWindow` exactly the way `PlayerSurface`
applies D-038: `command('setPlaybackRate', [rate])` once on the widget-protocol handshake,
and reissued on the `onStateChange` transition to playing (`1`), since YouTube can reset
the rate back to 1x the moment the stream actually starts.

Needs the owner's own live validation (dock via Back/Esc, dock via sidebar navigation,
maximize, resize (grabbing the left-edge strip) + persistence across restarts, extract,
extract autoplay, extract at the configured default speed, close-extract-to-restore-docked,
no menu bar on the extract window, and the modal-stacking behavior above) before
considering this closed — not something verifiable without actually driving the app.

## Default playback speed — D-038 (Final, 2026-07-12)

Settings → Playback offers a **default speed** dropdown over the IFrame API's fixed rate
set (0.25×, 0.5×, 0.75×, 1×, 1.25×, 1.5×, 1.75×, 2×; default **1× "Normal"**). The player
issues `setPlaybackRate` as soon as the embed announces itself, and re-issues it on the
first `onStateChange(playing)` event — the same reissue-on-start pattern quality uses
(B-038), since YouTube can reset a requested rate the moment the stream actually begins.
Changing speed from the embed's own control during playback is session-only and never
writes back to the setting — the setting is "what speed do new videos start at," not "what
speed am I watching this one at."

## Mark-as-read trigger (Final)

Opening the player view marks the video `read` immediately (not at N% watched). Rationale:
watch-percentage tracking is engagement analytics; "I opened it" is the honest, mechanical
inbox semantic, and a one-keystroke unread toggle exists for corrections.
