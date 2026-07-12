# Decision Log

The authoritative status of every design decision. Specs reference these IDs inline.

Statuses: **Final** (decided; changing it requires a superseding entry) ·
**Pending** (alternatives + recommendation documented; not confirmed by the product
owner) · **Superseded**.

Rationales live in the linked specs; this log is the index and the status of record.
When a Pending decision is confirmed, update its status here **and** remove the Pending
labels at its spec references, in the same change.

## Final decisions

From the product brief (2026-07-10):

| ID | Decision | Spec |
|---|---|---|
| D-001 | Own-credentials model: every user creates their own Google Cloud project + Desktop OAuth client; Chronicle ships zero credentials | `authentication.md` |
| D-002 | Subscriptions-only chronological feed; no recommendations/trending/algorithmic feeds — the full "Never" list | `non-goals.md`, `feed.md` |
| D-003 | Video states (read/ignored/favorite/watch-later) are **Chronicle concepts, local-only, never synced to YouTube**. (Narrowed by D-032 on 2026-07-10: the original "readonly scope only" clause was superseded — see D-032. The local-state rule itself is untouched.) | `feed.md`, `authentication.md` |
| D-004 | Secrets in OS secure storage (libsecret/Keychain/Credential Manager); never uploaded anywhere | `authentication.md` |
| D-011 | Local-first & privacy-first: no Chronicle servers, no telemetry, no analytics, ever | `non-goals.md`, `local-data.md` |
| — | Desktop-first; minimal RSS-reader-style UI; dark mode first; keyboard shortcuts; backend owns OAuth/API, frontend owns UI; clean architecture with replaceable parts | `ui.md`, `architecture.md` |
| — | MVP scope = the features in `features.md` §MVP; comments optional and excluded from MVP | `features.md` |

Confirmed by the product owner (2026-07-10, decision session):

| ID | Decision | Spec |
|---|---|---|
| D-006 | Playback = **embedded YouTube IFrame player**, styled as clean as possible (minimal branding, Chronicle end-overlay suppressing related videos); per-video "open in browser" escape. Building our own player over extracted streams was **rejected**: TOS violation, breaks on YouTube internal changes, and deprives creators of ad revenue (views without monetization). mpv/yt-dlp path demoted to Future idea. | `playback.md` |
| D-005 | Desktop shell = **Electron** (follows from D-006: Chromium guarantees embed playback reliability on all three OSes; Linux system webviews do not) | `architecture.md` |
| D-007 | Feed data source = **Hybrid**: sync subscriptions locally → RSS feeds of those channels for discovery (free) → batched `videos.list` hydration for metadata. Only recent videos fetched by default; older content loaded on demand. | `youtube-api.md` |
| D-012 | Testing-mode 7-day token expiry: wizard **explains and recommends** publishing the app to production but it is the **user's optional choice**. On every app open, Chronicle validates the connection; on `invalid_grant` it prompts re-auth via the **default browser** (low friction — the user is typically already signed in to Google and just confirms). | `authentication.md`, `onboarding.md` |
| D-010 | Video state model = **read-status enum (`unread`/`read`/`ignored`) + orthogonal `favorite` and `watch_later` flags**, because a video can be read AND favorite AND queued simultaneously (email-style: read state vs. star). | `feed.md`, `local-data.md` |
| D-027 | Older-content pagination = **continuous scroll** through the user's own local chronological archive (with on-demand deeper backfill per channel). This is bounded, mechanical scrolling through content the user chose — distinct from, and not a violation of, the ban on algorithmic infinite feeds. New content at the top remains finite ("caught up" state unchanged). | `feed.md`, `non-goals.md` |
| D-028 | ~~Shorts are never displayed. Not now, not ever. No toggle.~~ **Superseded by D-035** (2026-07-12, B-028). Detection heuristic (duration + `/shorts/` URL check) is unchanged and still specced in `feed.md`. | `feed.md`, `non-goals.md`, `features.md` |
| D-029 | **Universal video opening**: the player view opens **any** YouTube video, subscribed or not — YouTube links in video descriptions open in-app; a video can be opened by pasted URL. The recommendation ban targets *algorithmic selection*, not user-initiated navigation or creator curation. Externally opened videos never enter the feed and never count as unread; local states (favorite/watch-later) work on them. | `playback.md`, `feed.md`, `non-goals.md` |
| D-031 | **YouTube search, working like YouTube's search**: the user types a query and finds videos and channels across all of YouTube, including channels they don't follow; results open in Chronicle's player/channel view. It is a *deliberate tool* — inert until the user types; results are never injected into the feed or any other view. Costs: pasted @handle/URL → `channels.list`/`videos.list` (1 unit); free-text → `search.list` (100 units/query, ~100/day headroom). **Implemented 2026-07-12 (B-009):** a "Mine" / "YouTube" scope toggle next to the existing local `/` filter; free-text search only fires on Enter (never per keystroke), rendering a flat video+channel results list distinct from the feed. Pasted @handle/URL cheap path is a separate, pre-existing surface (`UrlPrompt.tsx`, D-029) — untouched by this change. | `non-goals.md`, `features.md`, `youtube-api.md` |
| D-032 | **Scope policy: minimal at start, incremental by feature.** Initial auth requests `youtube.readonly` only. YouTube-side interaction features — subscribe, **like, comment** — are planned (not banned), each unlocking via incremental authorization (`youtube.force-ssl`) the first time the user invokes it. Chronicle-side local states still never sync (D-003). What remains banned is Chronicle-generated engagement *mechanics*, not the user expressing themselves on YouTube. | `authentication.md`, `non-goals.md`, `features.md` |
| D-030 | Channel view offers **both follow mechanisms**: (a) "Subscribe on YouTube" (`subscriptions.insert`, 50 units, incremental scope per D-032) and (b) "Follow locally" via RSS — Chronicle-only, invisible to the user's YouTube account. **Implemented 2026-07-12 (B-009):** mechanism (a) only, reachable from a YouTube search result's Subscribe button — subscribing runs the same incremental write-scope consent as [[B-010]]'s unsubscribe, then a channel-scoped sync to populate its videos. Mechanism (b), "Follow locally," is **not yet built** — that's D-033's accountless-mode work, still future. | `features.md`, `vision.md` |
| D-033 | **Accountless mode** (enabled by local follows): Chronicle is usable **without any Google/YouTube account** — follow channels locally via RSS, chronological feed, embedded playback, local states. The onboarding wizard becomes an optional path that unlocks account features (subscription import, search, like/comment, full metadata). Degraded-mode details (no `videos.list` hydration → no duration badges; Shorts detection via HEAD-check on every new video instead of duration-filtered candidates) specced in `features.md`. Lands together with D-030 (post-MVP #1); MVP still assumes the authenticated path. | `features.md`, `onboarding.md`, `authentication.md` |
| D-009 | Frontend framework = **React + TypeScript** (confirmed) | `architecture.md` |
| D-018 | Show view counts on feed rows = **on by default**, with a Settings toggle to hide. Supersedes the "hidden by default" choice exercised in M5 — the product owner reported the default as friction (B-029): the data costs no extra quota (captured at hydration) and is normal context on a video row. | `feed.md` |
| D-023 | Muted-thumbnail treatment = **rejected; thumbnails render at normal (full) opacity always**. The M3 prototype (dimmed at rest, full opacity on hover/selection) was reported as an unwanted default (B-034) and dropped rather than kept. | `ui.md` |
| D-035 | **Shorts are shown in the feed, tagged with a badge, with a "Show Shorts" Settings toggle (default on) to hide them.** Supersedes D-028's unconditional exclusion (2026-07-12, B-028) — the product owner argued unconditional exclusion contradicted the app's own "agency, not austerity" test: the feed only shows content from channels the user chose to follow, so filtering some of it without consent is the algorithm's will in miniature. Detection pipeline (duration candidate + `/shorts/{id}` HEAD confirmation) is untouched; only the display policy reversed. | `feed.md`, `non-goals.md`, `features.md` |
| D-037 | **List vs. grid feed layout, plus a shared file-explorer-style item-size control (xs/small/medium/large/xl) — both persisted, both inline in the feed topbar, not in Settings.** Supersedes the "one column; no masonry/grid" clause of the original Layout decision (2026-07-12, B-007) — the product owner argued a thumbnail grid is a personal layout preference, not an engagement mechanic, so the "who is driving?" test does not ban it. Also supersedes D-022's two-step "density" (comfortable/compact): `itemSize` replaces it with steps that scale *both* list rows and grid cards from the same slider, since a size preference applies to either layout the same way. **Two rounds of same-day owner feedback:** first pass put the layout choice in Settings → Appearance (mirroring the old density select) — the owner wanted it in the listing itself, so it moved to an icon toggle (`⊞`/`☰`) in the topbar and the Settings dropdown was removed; second pass added the item-size slider using the same inline placement from the start, once the file-explorer-style pattern was requested. **2026-07-12 follow-up (product-owner request):** three steps (small/medium/large) widened to five (`xs/small/medium/large/xl`) for finer granularity, with the xl step a deliberately bigger jump than the other, roughly-uniform steps — it's the "as big as it gets" ceiling, not another even increment. Same change fixed a CSS specificity bug where the list-row `.thumb` width overrides (`.feed-scroll.size-X .thumb`) also matched the grid card's thumbnail (`.card-thumb-wrap .thumb`, meant to always be `width: 100%`), so grid thumbnails at non-medium sizes rendered as a small fixed-width image adrift in a wider card instead of filling it; the row overrides are now scoped to `.row .thumb` so they cannot leak into the grid. Also added `cursor: pointer` on list rows and grid cards (both open the video on click), with `cursor: default` kept on the non-clickable "ignored, undo" strip. List rows, virtualization, and all per-video actions are unchanged and shared between both layouts (`FeedList.tsx`). Grid column count is derived from the feed container's width (`ResizeObserver`, min card width scales with item size), not hardcoded. | `ui.md` |
| D-034 | **M0 toolchain** (2026-07-11): **npm** as package manager (explicit product-owner choice — no pnpm), **electron-vite** (dev/build for main+preload+renderer), **node:sqlite** (Node's built-in synchronous SQLite driver), **Vitest** (unit tests), **ESLint + Prettier**, **dependency-cruiser** enforcing the architecture.md layer rules as lint errors. (Amended same day by product owner: standalone GitHub Actions CI removed from M0 — a single smarter pipeline with releases + automatic binary builds will be designed later, see `roadmap.md` M5. Amended in M1: better-sqlite3 replaced by node:sqlite — no native module, no Electron ABI rebuild, and storage contract tests run under the system Node in Vitest; stable in Electron's Node 24, experimental-but-functional in system Node 22.) All replaceable without touching `core/`/`ipc/`. | `architecture.md`, `roadmap.md` |
| D-038 | **Default playback speed**, a Settings → Playback dropdown over the YouTube IFrame API's fixed rate set (0.25×–2×, default 1× "Normal"). The player opens already set to this rate — issued once the embed announces itself and re-issued on the first `onStateChange(playing)` event, mirroring D-006/B-038's quality-reissue pattern, since YouTube can reset a requested rate the moment the stream actually starts. Per-video changes made from the embed's own speed control are session-only and never write back to the setting (product-owner request, 2026-07-12). | `playback.md` |

## Pending decisions

Ordered by how urgently they block work (see `roadmap.md`).

| ID | Decision | Options (recommended first) | Blocks | Spec |
|---|---|---|---|---|
| **D-008** | Storage engine | **SQLite (WAL)** · flat files · embedded KV | M0 (high confidence — treat as working plan) | `architecture.md`, `local-data.md` |
| **D-013** | Secret-store fallback when no OS keychain | **Electron `safeStorage`, else machine-derived key + honest warning** · refuse to persist — *recommended option fully exercised in M2 (2026-07-11): safeStorage when a real keychain backs it; else AES-256-GCM under a scrypt key from `/etc/machine-id`+user, `isSecure()=false` → UI warning. The writing cipher is pinned in the store file. Real-world smoke (product owner, keyring-less niri session) hit the missing-fallback crash on day one — `safeStorage.encryptString` throws without a keychain — confirming the fallback is mandatory, not theoretical.* | M2 | `authentication.md` |
| **D-016** | Background refresh default interval | **30 min (configurable 15 min–manual)** · 15 min · hourly — *fully exercised: 30-min default (M2); configurable 15/30/60/manual in Settings (M5, 2026-07-11)* | M2 | `youtube-api.md` |
| **D-014** | Wizard validation for Google-console steps 1–5 | **checkbox confirmations + failure→step mapping at connect time** · attempt live validation — *recommended option exercised in M4 (2026-07-11)* | M4 | `onboarding.md` |
| **D-015** | Wizard media | **static annotated screenshots** · per-step recordings — *recommended option exercised in M4 (2026-07-11): asset pipeline with verified-on dating built; captures pending* | M4 | `onboarding.md` |
| **D-017** | Week-grouping start day | **fixed Monday (ISO)** · locale-dependent | M1 (trivial) | `feed.md` |
| **D-019** | Backfill depth for new/first-sync channels | **RSS window (~15) + scroll-triggered deeper backfill** · fixed 50 · configurable | M2 | `feed.md` |
| **D-020** | Auto-pruning of stateless old videos | **off by default** · on at 24 months | M5 | `local-data.md` |
| **D-021** | Watch Later queue auto-advance | **off by default, opt-in setting** · on (it's the user's own queue) · never | M3 | `playback.md` |
| **D-024** | Linux packaging | **Flatpak primary + AppImage** · one only | M6 | `roadmap.md` |
| **D-025** | Windows code signing | budget-dependent | M6 | `roadmap.md` |
| **D-026** | Update mechanism | **signed static-manifest check, no identifiers, off-switch** · manual-only | M6 | `roadmap.md` |
| **D-039** | Favorited-channel priority section (B-042): does a video also stay in its normal chronological bucket, or only show once (in the priority section)? | **Duplicate placement — appears in both the priority section and its normal bucket** · Exclusive (removed from its bucket once it's in the priority section) — *recommended option exercised in this change (2026-07-12, B-042): consistent with D-010's orthogonal-flags model, where favorite/watch-later never remove a video from its normal spot — a video being prioritized shouldn't make "did I see everything from Tuesday" miss it from Tuesday's bucket. The priority section only lists unread videos (parallel to the unread view), capped at 20, so it can't grow unbounded.* | — | `feed.md` |

## Key assumptions to verify (tracked; promote or correct on verification)

| Where | Assumption | Verify in |
|---|---|---|
| `authentication.md` | Publishing an External consent screen to production without verification still works for the sensitive-not-restricted `youtube.readonly` scope, and removes the 7-day refresh-token expiry | M2 |
| `youtube-api.md` | Quota costs table (1-unit list calls, 100-unit search, 10k/day default) is current | M2 |
| `youtube-api.md` | Channel RSS feeds remain available, ~15 items, minutes-fresh | M2 |
| `youtube-api.md` | `UC…`→`UU…` uploads-playlist transform is reliable (would save a `channels.list` pass) | M2 |
| `youtube-api.md` | API data-retention policy window (~30 days) — confirm exact current rule | M2 |
| `feed.md` | RSS `published` reflects public availability for premieres/scheduled videos | M2 |
| `feed.md` | No Shorts flag in the API; duration + `/shorts/{id}` HEAD heuristic discriminates reliably — **now MVP-blocking (D-028), verify early in M2** | M2 |
| `local-data.md` | No runtime quota-remaining API exists (client-side accounting needed) | M2 |
| `architecture.md` | SQLite WAL comfortably handles 1 writer + 1 reader at ≤100k rows | M1 |

## How to add an entry

Next free ID: **D-040**. One decision per ID. State the options, the recommendation and
its rationale (or the final choice and why), the milestone it blocks, and the owning spec.
Never edit a Final entry's meaning — supersede it with a new entry and mark the old one
**Superseded by D-NNN**.
