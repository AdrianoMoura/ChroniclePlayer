# YouTube API Strategy

Chronicle consumes YouTube through two official/public interfaces, using only the user's
own credentials and quota (D-001):

1. **YouTube Data API v3** — authenticated, quota-metered.
2. **YouTube public RSS feeds** — unauthenticated, free, no quota.

This document defines exactly which endpoints are used, why, what they cost, and how
Chronicle behaves when things fail. **Any new API call added to the codebase must be
justified against this document and its quota cost stated in a code comment.**

## Quota fundamentals

- Default quota: **10,000 units per day per project**, resetting at **midnight Pacific
  Time**. Each user has their own project → their own 10,000 units (D-001 rationale).
- Costs of the calls Chronicle uses (verify against current Google docs during
  implementation — **Assumption** as of 2026-07):

| Endpoint | Cost (units) | Chronicle's use |
|---|---|---|
| `subscriptions.list` (mine=true, 50/page) | 1 per page | Import/refresh subscription list |
| `channels.list` (batched, 50 ids/call) | 1 per call | Uploads-playlist IDs, channel metadata |
| `playlistItems.list` (50/page) | 1 per call | Gap detection during sync, and on-demand back-catalog fetch when scrolling past a channel's local archive ([[B-002]], implemented 2026-07-12 — bounded at 4 pages/call, resumable) |
| `videos.list` (batched, 50 ids/call) | 1 per call | Hydrate duration, live/premiere status, stats |
| `videos.list` (single id) | 1 per call | Full (untruncated) description on every player open of an already-known video ([[B-092]], implemented 2026-07-15) — storage caps descriptions at 500 chars (local-data.md), which the player was serving as-is with no way to see the rest. Same trivial-per-open-cost precedent as `getRating` above; falls back to the stored (possibly short) copy on failure rather than blocking playback. |
| `subscriptions.delete` | 50 per call | Unsubscribe ([[B-010]], implemented 2026-07-12; incremental scope per D-032) |
| `subscriptions.insert` | 50 per call | In-app subscribe ([[B-009]], implemented 2026-07-12; D-030, incremental scope per D-032) |
| `videos.rate` / `videos.getRating` | 50 / 1 | Like a video ([[B-006]], implemented 2026-07-12; D-032). `getRating` runs silently on every video open (readonly scope, no consent needed) — 1 unit is trivial even at high viewing volume. No public endpoint exists to like a *comment*. |
| `commentThreads.list` / `.insert` | 1 / 50 | Read/post comments ([[B-006]], implemented 2026-07-12; D-032). **Revised 2026-07-13 ([[B-081]]):** reading empirically also requires the write scope (`youtube.force-ssl`), not just readonly as originally assumed — contradicts Google's own published docs, which describe `commentThreads.list` as readonly-safe; kept as an observed-behavior note rather than resolved discrepancy, in case it turns out to be specific to this project's OAuth consent configuration. Gated the same way as every other write-scope action (proactive `write-scope-required`, dialog before consent), not with a bespoke readonly/write split. |
| `comments.insert` | 50 per call | Reply to a comment ([[B-006]], implemented 2026-07-12; D-032) |
| `search.list` | **100 per call** | **Banned from sync/automation.** Explicit user-typed queries only ([[B-009]], implemented 2026-07-12; D-031). **B-055 (2026-07-13):** each search now also issues up to two small batched follow-ups — `videos.list` (`part=contentDetails`, 1 unit) for video results' duration/Short badge, and `channels.list` (`part=statistics`, 1 unit) for channel results' subscriber count — both batched across the whole result page, so at most +2 units/query regardless of how many results came back. |
| `channels.list` (`part=brandingSettings,statistics`) | 1 per call | Channel screen's banner image + subscriber count ([[B-056]], implemented 2026-07-13) — fetched live on every visit to the channel screen, not cached in the DB; trivial per-visit cost, avoids a staleness policy. |
| `channels.list` + `playlistItems.list` + `videos.list` (channel-preview browse) | 3 per page (1 each, batched) | Browsing a not-yet-subscribed channel's uploads from its screen ([[B-061]]/[[B-056]] follow-up, implemented 2026-07-13, entry point: a search channel result) — never persisted to the local DB; `channels.list` re-resolves the uploads playlist on every page (including "load more") rather than caching it client-side, same trivial-cost-over-complexity call as the banner/subscriber-count fetch above. |

`search.list` is the classic quota trap: polling 200 channels via search would cost
20,000 units — double the daily quota — for one refresh. It is banned from any automated
path forever. Deliberate user-typed searches (D-031) are the sole permitted use: ~100
queries/day of headroom, and pasted @handles/URLs resolve via `channels.list` (1 unit)
before `search.list` is ever considered.

## RSS feeds (free tier of our strategy)

Every channel has a public feed: `https://www.youtube.com/feeds/videos.xml?channel_id={UC…}`

- Returns the **~15 most recent entries**: videoId, title, published, updated, thumbnail,
  description, view count. **No duration, no live/short/premiere flags.**
- No authentication, no quota. Politeness rules still apply: conditional GET
  (`ETag`/`If-Modified-Since`), reasonable concurrency (≤ 8 parallel), no more than one
  poll per channel per refresh cycle.
- **Assumption:** feed availability and shape are stable (they have been for ~15 years)
  but this is not a contractual API; the `VideoSource` port isolates us if it changes.

Related zero-quota traffic: **Shorts confirmation HEAD requests** to
`youtube.com/shorts/{id}` (D-028, see `feed.md`) — only for duration-candidate videos
(≤ 180 s), once per video ever (result cached in `videos.is_short`), same politeness
rules (bounded concurrency, backoff).

## Feed data source — D-007 (Final: Hybrid, 2026-07-10)

**Decided:** subscriptions are synced locally; new uploads are discovered via the RSS
feeds of those channels (free) and hydrated in batches via `videos.list`. Only recent
videos are fetched by default; older content loads on demand as the user scrolls
(D-027, `feed.md`). The alternatives below are retained for the record:

| Option | Quota cost per refresh (200 subs) | Freshness | Metadata quality |
|---|---|---|---|
| **A. API-only**: `playlistItems.list` per channel + batched `videos.list` | ~200 + ~10–60 = **~260 units** | Good | Full |
| **B. RSS-only** | **0 units** | Good (feeds update within minutes) | Missing duration/type — can't do duration display, Shorts/live detection |
| **C. Hybrid**: RSS to *discover* new videoIds (free) → batched `videos.list` to *hydrate* only genuinely new videos | **~1–10 units** typical | Good | Full |

**Chosen: C (Hybrid).** Rationale:
- Discovery via RSS costs nothing regardless of subscription count, so frequent refreshes
  (even every 15 minutes) are quota-free at the discovery layer.
- Hydration via `videos.list` is batched at 50 ids/unit and only covers *new* videos —
  a heavy day with 100 new videos across all channels costs 2 units.
- Full metadata (duration, live/premiere flags) is preserved, which the feed and future
  filters need (`feed.md`, `features.md`).
- Resulting steady-state daily quota usage: **single digits to low tens of units** out of
  10,000 — leaving effectively the whole quota as headroom for subscription re-sync,
  backfill, and future features.
- Fallbacks: if RSS becomes unavailable (per-channel or globally), the `VideoSource` port
  falls back to Option A for affected channels — still comfortably inside quota.
- Cost of the hybrid: two code paths and reconciliation logic. Accepted; the port design
  in `architecture.md` contains it.

Edge case: RSS's 15-item window can miss uploads — for very-high-volume channels between
infrequent refreshes, or for any channel whose sync ever failed mid-cycle (nothing gets
inserted or marked known that day, so once enough newer videos push the missed ones out
of the window, they're gone from every future window too). **Revised 2026-07-15
(`bugs.md` [[B-051]]):** originally gated on the whole RSS window being new (any known
entry in the window was taken as proof there was no gap) — too conservative, since a
window can be a mix of known and new entries and still hide an older miss the known entry
says nothing about. Now: any channel with **at least one** newly discovered video this
cycle pages `playlistItems.list` for that channel, stopping at the first page that
overlaps the real (DB-wide, not just this window's) known set — bounded backfill; see
`feed.md` §Backfill. In the common gap-free case this is one extra `playlistItems.list`
call (1 unit) per channel per cycle that had any new video, since the very first page
already overlaps; still comfortably inside the daily budget (single digits to low tens of
units becomes, worst case, roughly one unit per active channel per cycle — for the
229-subscription real-world smoke in M2, still well under 1 unit × 229 ≈ 229 units even if
*every* channel published something in the same cycle, against the 10,000/day budget).

## Subscription import & sync (Final in shape)

- Initial import: `subscriptions.list?mine=true&maxResults=50`, paged. 200 subs = 4 units.
  Extract channelId, title, thumbnail; then one batched `channels.list` pass (4 units per
  200 channels) to capture the uploads playlist ID (`UC…` → `UU…` is a stable convention,
  but we fetch rather than assume — **Assumption to verify:** the string transform is
  reliable; if verified, `channels.list` here becomes optional).
- Re-sync: re-listed and diffed on **every sync** (launch/manual/timer alike, no gate) —
  new channels are added (with initial backfill) and show up on the very next sync,
  removed channels are marked `unsubscribed` locally but **their videos and local states
  are retained** (data ownership; the user can purge via settings). At ~230 subs this
  costs ~5 units/run; even at the fastest 15-minute background interval that's under 500
  units/day — cheap enough that gating it (an earlier version of this spec had a manual
  "Refresh subscriptions" action plus a weekly automatic re-list) only added friction for
  no real saving. **Amended 2026-07-12** at the product owner's direction: prioritize a
  frictionless, simple experience over conserving quota headroom that isn't actually
  scarce — deal with quota as a real constraint only if it becomes one. (Final)
- Chronicle **never writes** subscriptions to YouTube (readonly scope, D-003).

## Refresh policy (Final, D-016)

- Refresh triggers: every app launch (B-011, 2026-07-11 — previously guarded by a
  10-min staleness check; RSS conditional GETs make a no-change pass cost ~0 quota),
  manual refresh button (always), background timer while the app runs.
- **D-016 (Final, exercised M2/M5):** background interval defaults to **30 minutes**,
  user-configurable to 15/30/60 minutes or manual-only in Settings (M5, 2026-07-11).
  Rationale: RSS discovery is free, but more frequent than 15 min adds nothing
  (creators don't publish that fast) and contradicts the calm-software ethos —
  Chronicle should not feel "live."
- No refresh when the app is closed. Chronicle has no background daemon in MVP.
  (**Future idea:** optional tray-resident mode.)

## Failure handling (Final)

| Failure | Detection | Behavior |
|---|---|---|
| Quota exceeded | 403 `quotaExceeded` | First-class state: banner "Daily API limit reached — resets at midnight Pacific ({local time})". RSS discovery continues (free); hydration queues until reset. Never retry-spin. |
| API not enabled | 403 `accessNotConfigured` | Route to onboarding Step 2 (see `onboarding.md`) |
| Auth expired/revoked | 401 / `invalid_grant` | `AuthExpired` banner; local browsing unaffected (see `authentication.md`) |
| Testing-mode 7-day expiry | `invalid_grant` + testing-mode flag | Targeted explanation + deep link to onboarding Step 4b |
| Network down | transport errors | Silent skip of refresh; subtle "offline" indicator; next trigger retries |
| RSS 404 / malformed / blocked | 404, parse errors, other 4xx / 5xx | Retried in-cycle (below), then an ordinary per-channel failure for that cycle if still failing (logged, retried next cycle) — **not** treated as proof the channel is gone (D-048): a single RSS 404 isn't reliable evidence of permanent deletion, and RSS calls are free, so there's no cost reason to ever stop asking. **No banner** for this on its own (D-049) — confirmed live (`bugs.md` [[B-110]]) that YouTube's own RSS backend returns transient 404/500 for genuinely active channels under ordinary conditions, so some per-cycle failures are expected background noise, not something the owner can act on. |

- Retries: exponential backoff (300ms, doubling), per-channel, max 3 attempts per cycle
  — implemented in `SyncService.discoverChannel`'s `discoverRecentWithRetry` (previously
  documented here but never actually built, found and fixed alongside [[B-110]]); never
  across the quota boundary. All refresh failures are per-channel — one bad channel
  never aborts a sync.
- **D-048:** there is deliberately no "channel unavailable / stop polling" state. An
  earlier version of this doc had one (mark `unavailable` on an RSS 404, exclude from
  all future sync, "show in a settings list") — that was never an actual product
  decision, just an assumption from earlier development, and it caused a real bug
  (`bugs.md` [[B-110]]): a single transient 404 permanently and silently froze sync for
  a channel with no retry and no UI ever surfacing it (the settings list was never
  built either). Removed outright, per the product owner's own framing: Chronicle's
  experience should work like YouTube's own pagination — keep trying until the result
  actually comes back empty, not give up on one failed attempt.
- All HTTP goes through one client in `adapters/` with: descriptive User-Agent, sane
  timeouts (10 s connect / 30 s total), and structured local logging (no tokens in logs).

## Terms-of-service constraints (record permanently)

- Use documented, official endpoints with the user's own OAuth consent. No scraping of
  youtube.com internals, no Innertube private API, no cookie extraction.
- Data storage: YouTube API policies require that stored API data be refreshed
  periodically (**Assumption:** the current policy window is 30 days for most resources —
  verify during implementation). Chronicle's practical posture: metadata is refreshed
  continuously anyway; stale channels stop being displayed prominently; the offline
  metadata cache feature (`features.md`) must respect whatever the verified policy is.
- Playback-related TOS constraints live in `playback.md`.
