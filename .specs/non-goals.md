# Non-Goals

Chronicle does not exist to *limit* the user — the user should be able to do what they do
on YouTube (watch anything, search, follow, like, comment; see `vision.md` §agency). What
this document bans is precisely defined: **anything where an algorithm, not the user,
directs the experience**, and **any mechanic designed to manufacture engagement**. The
question for every item is "who is driving?" — this list is where the answer is "not the
user."

If a proposed feature appears here, the answer is no unless the product owner explicitly
supersedes the decision in `decisions.md`. All items in "Never" are **Final** decisions
(D-002, D-011).

## Never

### Discovery and recommendation

- **No algorithmic recommendations** — not "related videos," not "channels you might
  like," not "because you watched." *Why:* engagement-optimized selection is the exact
  mechanism Chronicle exists to escape; even a "good" recommendation feature re-introduces
  the attention economy into the product.
  **Precision added by D-029 (Final):** the ban targets *who selects the content*. Content
  selected by an engagement model → banned. Content selected by a **human the user chose
  to listen to** → allowed and encouraged: clicking a YouTube link the creator put in a
  video description opens in Chronicle's own player (even if the user isn't subscribed to
  the target channel), and any video can be opened by URL. The user following a creator's
  indication is word-of-mouth, not an algorithm. Discovery philosophy in `vision.md`.
- **No Trending / Explore / Popular** pages. *Why:* these are editorial/algorithmic
  surfaces optimized for engagement, not intent.
- **No AI-driven anything in the content path** — no AI summaries injected into the feed,
  no AI-ranked ordering, no "smart" digest. *Why:* the product promise is that ordering
  and selection are mechanical and predictable. (AI-assisted *local* features like note
  search could be considered someday, but nothing that reorders or filters the feed
  opaquely.)

### Engagement mechanics

- **No algorithmic infinite feed.** The banned pattern is a feed that injects content —
  selected by anyone other than the user — to hold attention without a stopping point.
  *New* content is always finite ("caught up" is the session's natural end). Precision
  added by D-027 (Final): continuous scroll through the user's **own chronological
  archive** (older videos from their subscriptions, in mechanical order, with a real end)
  is permitted — it is navigation of owned content, not an engagement mechanism. What
  remains banned: anything appearing in the scroll path that the user's subscriptions and
  the calendar did not put there.
- **No autoplay into other videos.** A video ends; nothing plays next unless the user
  queued it (Watch Later playback is an explicit, user-built queue — see `features.md`).
- **No engagement notifications** ("X uploaded!", streaks, badges, "you haven't visited in
  a while"). *Why:* Chronicle must never pull the user in; the user comes when they want.
  (A Future idea for opt-in, strictly mechanical new-video OS notifications exists in
  `features.md`, but it defaults to off and is per-channel — it must never be promotional.)
- **No metrics designed to increase usage.** Chronicle keeps no watch-time analytics and
  sends no telemetry (D-011).

### YouTube surfaces Chronicle will not reproduce

- **No Shorts-style vertical swipe player.** Chronicle will never build a Shorts feed or
  swipe UI — that surface is inherently algorithmic (infinite, autoplaying-into-the-next
  item), which is banned above regardless of content type. Shorts *videos themselves*
  are not banned: they come from channels the user chose to follow, so they appear in
  the normal feed like any other video, tagged with a badge, with a user-controlled
  Settings toggle to hide them (D-028, reversed 2026-07-12 by B-028 — see `feed.md`
  §Shorts). The distinction is the delivery mechanism, not the content.
- **No Shopping, Communities/Posts, Stories, Gaming, Music, Live tab, Podcasts** as
  destinations. *Why:* each is a separate engagement surface; Chronicle has exactly one
  surface — the chronological feed (plus the user's own local lists).
- **No social features** — no sharing to followers, no activity feeds, no profiles.

### Infrastructure

- **No Chronicle servers.** No accounts, no sync service, no proxy for API calls, no
  crash reporting backend, no update-check that transmits identifying data. *Why:*
  local-first and privacy-first are identity, not features (D-011). Cross-device sync, if
  ever built, must be user-owned transport (e.g., user's own file sync) — Future idea.
- **No embedded Google credentials, ever** — see `authentication.md` (D-001).

## Explicitly optional / de-scoped (not "never")

- **Comments & likes: not in MVP proper, but implemented ahead of schedule via
  dogfooding (D-032, [[B-006]] in `bugs.md`, 2026-07-12).** The user expressing
  themselves on YouTube — liking a video, reading and writing comments, replying — is
  built and shipped, unlocked via incremental scope (`authentication.md`). The
  distinction that matters: what stays banned forever is Chronicle-side engagement
  **mechanics** (anything designed to provoke interaction — prompts, streaks, "leave a
  comment!" nudges); user-initiated interaction is welcome and now live. Comments load
  on explicit user action (never auto-loaded), displayed flat and chronological; costs:
  `commentThreads.list` 1 unit, `commentThreads.insert`/`comments.insert` 50 units,
  `videos.rate` 50 units. (There is no API to like a *comment*, only videos — a
  permanent limitation, not a Chronicle choice.)
- **Search**: excluded from **MVP** (Final) but implemented ahead of schedule via
  dogfooding as real, YouTube-style search (D-031, [[B-009]] in `bugs.md`,
  2026-07-12): the user types a query and finds videos and channels across all of
  YouTube — including channels they don't follow — and watches them in Chronicle's
  player. The guardrail that survives: search is a **tool the user wields, never a
  surface that feeds them** — it is inert until a query is typed, and results are never
  injected into the feed or any other view. A typed query is intentional navigation
  (D-029's logic), not algorithmic push. Still being tightened per `bugs.md`
  [[B-054]]/[[B-055]] (the shipped scope-toggle UX turned out confusing and is being
  simplified to "the filter always searches YouTube directly").
- **Mobile / web versions**: out of scope. Desktop-first is Final for the foreseeable
  future. The architecture keeps the core portable (see `architecture.md`), but no effort
  is spent on mobile UX.
- **Uploading, live streaming, channel management**: Chronicle is a consumption client
  only. Creator-side features are out of scope permanently.

## How to use this document

When reviewing a feature request or implementation idea, ask in order:

1. Is it on the "Never" list? → Reject, cite this document.
2. Does it **push** content into the user's view that no explicit user action (and no
   calendar) put there? → Reject. (Content the user *navigates to* — a description link,
   a pasted URL, a channel they chose to visit — is fine: D-029.)
3. Does it remove a natural stopping point, or add a reason to open the app that the user
   didn't create themselves? → Reject.
4. Does it require a Chronicle-operated server or shared credentials? → Reject.
5. Otherwise → evaluate against `vision.md` experience goals and file it in `features.md`
   as a Future idea with rationale.
