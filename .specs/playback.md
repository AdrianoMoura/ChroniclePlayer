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
fair to creators. Users with YouTube Premium get an ad-free embed automatically (via
their Google session in the webview).

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
- **Login quirk**: the embed uses the webview's cookie session, not the OAuth token. The
  user may be logged-out inside the embed (playback still works; Premium users can sign
  in once in that context for ad-free). Documented in-app in settings, not surfaced
  during normal use.

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

Link rules inside descriptions:
- YouTube **video** links → in-app player view (above).
- YouTube **Shorts** links → never played in-app (D-028); a small notice offers "open in
  browser".
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
- Watch progress/resume position: **Future idea** (IFrame API exposes `getCurrentTime()`;
  storing it locally is cheap) — not MVP.

## Mark-as-read trigger (Final)

Opening the player view marks the video `read` immediately (not at N% watched). Rationale:
watch-percentage tracking is engagement analytics; "I opened it" is the honest, mechanical
inbox semantic, and a one-keystroke unread toggle exists for corrections.
