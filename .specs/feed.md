# The Feed

The chronological subscriptions feed is the entire product surface (see `vision.md`).
This document is the authoritative spec for its behavior.

## Feed membership (Final)

The feed contains videos from the user's followed channels (`channels.subscribed = 1`;
plus local follows when D-030 lands) — and nothing else. Videos opened via links or URL
(D-029, `playback.md`) are stored locally but **never enter the feed** and never count
as unread; they are reachable through the states the user gave them (Favorites, Watch
Later).

## Ordering (Final)

- Videos are ordered by **`publishedAt` descending**. Nothing else ever influences order:
  no engagement data, no per-user weighting, no pinning by Chronicle.
- `publishedAt` is YouTube's publish timestamp. For premieres/scheduled videos the
  effective date is when the video became publicly available (**Assumption:** RSS
  `published` reflects this; verify — if premieres appear early with future dates, they
  sort to the top with a "Premieres {date}" label rather than being hidden, until the
  hide-premieres Future feature exists).
- Ties (identical timestamps) break by channel title, then videoId — deterministic order
  is part of "predictable."

## Grouping (Final in shape; boundary details below)

The feed is grouped under date headers, computed in the **user's local timezone** against
"now":

| Group | Rule |
|---|---|
| **Today** | `publishedAt` is the current calendar day |
| **Yesterday** | previous calendar day |
| **This Week** | current ISO week (Monday start), excluding today/yesterday |
| **Earlier** | everything else, paginated |

- Calendar-day boundaries, not rolling 24 h windows — "Today" must match the user's
  intuition of today. (Final)
- Week start: **D-017 (Pending)** — ISO Monday vs. locale-dependent. Recommendation:
  fixed Monday for MVP (predictable, no locale complexity); revisit only if users ask.
- Groups with zero videos are hidden entirely (no empty headers).
- Group boundaries recompute on refresh and at local midnight if the app is open
  (a cheap timer; videos migrate from Today → Yesterday naturally).
- **"Earlier" loads by continuous scroll — D-027 (Final, 2026-07-10).** Scrolling toward
  the end of the loaded feed loads the next page (default 50) from the **local DB**
  automatically; when local data for a channel is exhausted, deeper backfill is fetched
  on demand via `playlistItems.list` (1 unit/50 videos, see `youtube-api.md`). Why this
  does not violate the no-infinite-scroll principle (`non-goals.md`): the banned pattern
  is an *algorithmic, unbounded* feed that injects content to hold attention. Here the
  user scrolls through their **own finite chronological archive** — content they chose,
  in mechanical order, with a real end (the oldest upload of their subscriptions). The
  session's natural stopping point is preserved: new content at the top is finite and the
  "caught up" state is unaffected by how deep the archive goes.

## Video state model — D-010 (Final, 2026-07-10)

The brief lists five states: Unread, Read, Ignored, Favorite, Watch Later. These are not
one enum — they are **one read-status plus orthogonal flags**, because a video can
simultaneously be read AND favorite AND in Watch Later:

```
read_status: unread | read | ignored     (exactly one)
flags:       favorite (bool), watch_later (bool)   (independent)
```

Rationale: an enum forces artificial transitions ("favoriting un-reads a video?");
orthogonal flags match user intuition (email-style: read state vs. star) and make list
features (Favorites view, Watch Later view) trivial queries. Schema in `local-data.md`.

### Semantics (Final, given the model)

- **unread** — default for every newly discovered video. Drives the "N unread" count and
  the "all caught up" state.
- **read** — set automatically when the user opens/plays a video from Chronicle; also
  settable manually ("mark as watched") without watching. Manual and automatic marking
  are indistinguishable afterwards (no "really watched?" tracking — that would be
  engagement analytics).
- **ignored** — "I've decided not to watch this; stop counting it." Ignored videos leave
  the default feed view (a feed filter can show them, styled dimmed). Not deletion:
  reversible, and the video stays in the DB.
- **favorite** — user's permanent local bookmark; surfaced in the Favorites view.
  Independent of read status.
- **watch_later** — membership in the local Watch Later queue (ordered — see below).
  Watching a video from the queue marks it read and prompts (or auto-performs — setting)
  removal from the queue.
- **None of these ever sync to YouTube** (D-003, Final). They are Chronicle's own data.
  Rationale: readonly scope keeps consent minimal; local state is instant, offline, and
  private; YouTube's equivalents (history, WL playlist) carry algorithmic side effects on
  the user's YouTube account — exactly what users came here to avoid.

### Watch Later ordering

Watch Later is an ordered queue (user-arrangeable), default order = insertion order.
Stored as an explicit position column, not a timestamp sort (`local-data.md`).

## Feed item presentation

Each feed row shows (see `ui.md` for layout): thumbnail, title, channel name, duration
badge, published time (relative within 7 days — "3 h ago" — absolute date beyond),
unread indicator, and flag glyphs (favorite/watch-later) when set. View count display
(**D-018**): shown by default, with a Settings toggle to hide it.

## Unread accounting & "caught up" (Final)

- The unread badge counts videos with `read_status = unread`, excluding nothing else —
  a mechanical count, no decay tricks.
- When Today/Yesterday/This Week contain zero unread videos, the feed top shows the
  caught-up state: "You're all caught up." with the last-refresh time. This is the
  natural session end (`vision.md` goal #2) — it must feel like a reward, not a dead end,
  and it offers **no** further content.

## New-video arrival during a session (Final)

If a refresh lands while the user is scrolled into the feed, new videos do not shift
content under their cursor: a pill appears at the top — "4 new videos" — and clicking it
scrolls to top and reveals them. If the user is already at the top, new items simply
appear. (Predictability over liveliness.)

## Backfill rules

- **New subscription added:** fetch its RSS feed (~15 items) and hydrate; deeper history
  is *not* imported by default — the feed is about "what's new," not archives. Deeper
  history loads on demand when the user scrolls past local data (D-027) or via a
  per-channel "load more history" action, both paging `playlistItems.list`
  (1 unit/50 videos). **D-019 (Pending):** default initial backfill depth.
  Recommendation: RSS window only (~15).
- **First-ever sync (onboarding step 8):** same rule per channel — RSS window only.
  200 subs ≈ 3,000 candidate videos discovered free, hydrated for ~60 units, well within
  quota (see `youtube-api.md`).
- **Gap detection:** if every RSS item for a channel is new (possible missed uploads
  between refreshes), page `playlistItems.list` until overlap with known videos, bounded
  at 200 videos/channel per cycle.

## Shorts — D-028 (Final, reversed 2026-07-12 by B-028)

**Shorts are shown, tagged, and user-filterable — not excluded.** The original MVP
decision (2026-07-10) unconditionally excluded Shorts everywhere, with "no toggle" as an
explicit product-identity stance. Dogfooding (B-028) surfaced that this worked against
the app's own governing principle ("agency, not austerity", `vision.md`): the feed only
ever shows content from channels the user chose to follow, so silently filtering some of
it on their behalf is the algorithm's will in miniature, not the user's. D-028 was
superseded the same day: Shorts now participate in the feed exactly like any other
video, with a "Short" badge for awareness and a Settings toggle to hide them if the user
wants to.

- Shown in every view, count as unread like any other video, and are exported as normal
  feed content. A feed row for a confirmed Short carries a small "Short" badge next to
  the duration.
- **Detection** (the API has no Shorts flag — Assumption, verify early in M2) is
  unchanged from the original design:
  1. `duration_seconds ≤ 180` is a *candidate* signal (Shorts are ≤ 3 min), captured via
     hydration (D-007) — never sufficient alone (regular short videos exist);
  2. confirmation via HEAD request to `youtube.com/shorts/{videoId}` — Shorts return
     200, regular videos redirect to `/watch`. Zero quota; result cached permanently per
     video (`videos.is_short` column, `local-data.md`).
  - Candidates are tagged as a Short **only after confirmation**; misclassifying a real
    video is worse than a Short briefly showing untagged.
- **Settings: "Show Shorts"** (default **on**). Off applies the same `is_short`
  exclusion the feed used unconditionally before this reversal — Shorts (and their
  unread/queue counts) disappear from every view, including Watch Later and Favorites,
  until switched back on. This is a display preference, not a data deletion: excluded
  rows stay in the DB either way.

## Filters (MVP scope)

MVP feed filters are limited to: All / Unread / Favorites / Watch Later / Ignored
(as views, see `ui.md`), plus the Shorts visibility setting (above). Other content-based
filters (hide live streams/premieres, duration rules, per-channel muting) are Future
features specced in `features.md` — but the data to power them (duration,
liveBroadcastContent) is captured from day one via hydration (D-007), so adding them
later is a pure query/UI change.
