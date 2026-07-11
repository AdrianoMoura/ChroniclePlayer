# Vision

## What Chronicle is

Chronicle is a desktop application for watching YouTube the way YouTube worked before
algorithmic feeds: you subscribe to channels, and you see their uploads in reverse
chronological order. That is the entire product.

Chronicle is a **client**, not a platform. Videos, channels, and subscriptions live on
YouTube. Chronicle adds a calm, local, user-controlled reading layer on top — much closer
in spirit to an RSS reader or an email client than to the YouTube website.

## The one-sentence pitch

> Open Chronicle and see what the channels you chose published today — nothing more,
> nothing chosen for you.

## The core insight: agency, not austerity

Modern YouTube's home page optimizes for watch time, not for the user's intent. The
subscriptions tab still exists but is buried, mixed with Shorts, and de-emphasized.

**Chronicle is not about limiting the user — it is about who directs the experience.**
The user should be able to do what they do on YouTube: watch anything, search for videos
and channels, follow creators, like, comment. What Chronicle removes is exactly one
thing: the algorithm's will. Every piece of content on screen is there because the user
— or a human the user chose to listen to — put it there. The tool bends to the user's
intent; it never manufactures intent. Freedom to use the tool as one prefers is the
product; the calm follows from that, it is not imposed.

The test for any feature is therefore not "is this minimal?" but **"who is driving?"** —
if the answer is the user, it belongs; if the answer is an engagement model, it never
ships (see `non-goals.md`).

**The Subscriptions page IS the application.** (Final)

There is no Home. Launching the app lands directly on the chronological feed:

```
Today
  ▸ video, video, video …
Yesterday
  ▸ …
This Week
  ▸ …
Earlier
  ▸ …
```

Nothing is promoted. Nothing is recommended. Nothing is personalized by an algorithm. The
only "personalization" is the list of channels the user subscribed to on YouTube.

## Target user

- Follows a deliberate set of channels (typically 20–300 subscriptions).
- Comfortable enough with computers to follow a guided Google Cloud setup wizard
  (the wizard is designed to make this achievable for non-developers, but the floor is
  "can follow illustrated step-by-step instructions" — see `onboarding.md`).
- Values privacy, ownership, and calm software over convenience.
- Primarily on a desktop or laptop. Linux, macOS, and Windows are all first-class targets;
  mobile is out of scope (see `non-goals.md`).

**Assumption:** the tolerance for a ~10-minute one-time setup is acceptable to this
audience precisely because the payoff (no shared quota, no central credentials, full
ownership) is the product's identity (D-001). This trade-off softens once **accountless
mode** lands (D-033, post-MVP): Chronicle becomes usable with zero setup and no
Google/YouTube account at all — local RSS follows, chronological feed, embedded playback
— with the wizard as the optional path to account features (import, search,
interactions).

## Experience goals

When Chronicle is working well:

1. **Opening the app answers one question in under two seconds:** "what's new from my
   channels?" Cold start to usable feed must feel instant because the feed renders from the
   local database first; network refresh happens in the background (see `architecture.md`).
2. **A session has a natural end.** When the user has read/watched/ignored everything new,
   the feed says so ("You're all caught up — 0 unread") and offers nothing else. Reaching
   the end is a feature.
3. **The user's attention state is preserved.** Unread/read/ignored/favorite/watch-later
   are local states that make the feed function like an inbox (see `feed.md`). Closing and
   reopening the app never loses this state.
4. **Everything is predictable.** Same input, same output, always. No A/B tests, no
   experiments, no surprise UI changes, no "we've updated your feed."
5. **The user can leave at any time with their data.** One-click export of all local state
   to a documented JSON format (see `local-data.md`).

## What success looks like

- A user checks Chronicle once or twice a day, catches up in minutes, and closes it.
  Lower session time than YouTube is success, not failure.
- Users describe it as "an RSS reader for YouTube" without being told to.
- The onboarding wizard has a high completion rate despite requiring a Google Cloud
  project — because each step explains *why*, shows a screenshot, opens the right page,
  and validates the result (see `onboarding.md`).

## Discovery: through people, not algorithms

Focusing on subscriptions raises a fair question: how does the user ever find *new*
channels? Chronicle's answer is the pre-algorithm answer — **discovery is a human act**:

1. **Creator curation (D-029, Final).** Creators constantly indicate other videos and
   channels — links in descriptions, collabs, shout-outs. Clicking a YouTube link in a
   description opens the video in Chronicle's own player, even from a channel the user
   isn't subscribed to. A trusted creator's indication is the highest-quality
   recommendation that exists, and no engagement model is involved.
2. **The user's world.** Links from friends, forums, newsletters, podcasts: any YouTube
   URL can be opened in Chronicle (paste/open action; OS-level link handling is a Future
   idea). Chronicle never generates these impulses — it just honors them.
3. **Deliberate exploration (D-030/D-031, Pending).** From any video, the user can visit
   the channel — a chronological uploads page, no popularity sorting — decide for
   themselves, and follow it: either as a real **YouTube subscription** (in-app, via
   incremental write-scope consent) or as a **local follow** (RSS-based, invisible to
   their YouTube account). A real **YouTube-style search** (D-031) lets the user find
   videos and channels across all of YouTube — a tool the user wields, inert until a
   query is typed, its results never injected into the feed.

The line is precise: content **selected by a human the user chose to listen to** is
welcome; content **selected by an engagement model** never appears. Videos discovered
this way never enter the feed by themselves — the feed remains strictly the user's
followed channels.

## Relationship to YouTube

Chronicle consumes YouTube through official, documented interfaces (YouTube Data API v3
and public RSS feeds — see `youtube-api.md`) using the *user's own* credentials and quota.
Playback keeps YouTube in the loop (see `playback.md` for the pending decision on how).
Chronicle does not scrape private endpoints, does not bypass authentication, and does not
redistribute content. Staying a well-behaved client is a design constraint, not just a
legal nicety: the product's longevity depends on it.

## Naming

Product name: **Chronicle Player**, commonly shortened to **Chronicle**. (Final)
The name reflects the core promise: a chronological record of your subscriptions.
