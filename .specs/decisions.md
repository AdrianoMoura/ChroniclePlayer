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
| D-028 | **Shorts are never displayed. Not now, not ever. No toggle.** Exclusion is an MVP requirement, not a future filter. Detection heuristic (duration + `/shorts/` URL check) specced in `feed.md`. | `feed.md`, `non-goals.md`, `features.md` |
| D-029 | **Universal video opening**: the player view opens **any** YouTube video, subscribed or not — YouTube links in video descriptions open in-app; a video can be opened by pasted URL. The recommendation ban targets *algorithmic selection*, not user-initiated navigation or creator curation. Externally opened videos never enter the feed and never count as unread; local states (favorite/watch-later) work on them. | `playback.md`, `feed.md`, `non-goals.md` |
| D-031 | **YouTube search, working like YouTube's search**: the user types a query and finds videos and channels across all of YouTube, including channels they don't follow; results open in Chronicle's player/channel view. It is a *deliberate tool* — inert until the user types; results are never injected into the feed or any other view. Costs: pasted @handle/URL → `channels.list`/`videos.list` (1 unit); free-text → `search.list` (100 units/query, ~100/day headroom). | `non-goals.md`, `features.md`, `youtube-api.md` |
| D-032 | **Scope policy: minimal at start, incremental by feature.** Initial auth requests `youtube.readonly` only. YouTube-side interaction features — subscribe, **like, comment** — are planned (not banned), each unlocking via incremental authorization (`youtube.force-ssl`) the first time the user invokes it. Chronicle-side local states still never sync (D-003). What remains banned is Chronicle-generated engagement *mechanics*, not the user expressing themselves on YouTube. | `authentication.md`, `non-goals.md`, `features.md` |
| D-030 | Channel view offers **both follow mechanisms**: (a) "Subscribe on YouTube" (`subscriptions.insert`, 50 units, incremental scope per D-032) and (b) "Follow locally" via RSS — Chronicle-only, invisible to the user's YouTube account. | `features.md`, `vision.md` |
| D-033 | **Accountless mode** (enabled by local follows): Chronicle is usable **without any Google/YouTube account** — follow channels locally via RSS, chronological feed, embedded playback, local states. The onboarding wizard becomes an optional path that unlocks account features (subscription import, search, like/comment, full metadata). Degraded-mode details (no `videos.list` hydration → no duration badges; Shorts detection via HEAD-check on every new video instead of duration-filtered candidates) specced in `features.md`. Lands together with D-030 (post-MVP #1); MVP still assumes the authenticated path. | `features.md`, `onboarding.md`, `authentication.md` |
| D-009 | Frontend framework = **React + TypeScript** (confirmed) | `architecture.md` |
| D-034 | **M0 toolchain** (2026-07-11): **npm** as package manager (explicit product-owner choice — no pnpm), **electron-vite** (dev/build for main+preload+renderer), **better-sqlite3** (synchronous SQLite in the main process, rebuilt for Electron ABI via postinstall), **Vitest** (unit tests), **ESLint + Prettier**, **dependency-cruiser** enforcing the architecture.md layer rules as lint errors, **GitHub Actions** CI (typecheck + lint + tests, offline only). All replaceable without touching `core/`/`ipc/`. | `architecture.md`, `roadmap.md` |

## Pending decisions

Ordered by how urgently they block work (see `roadmap.md`).

| ID | Decision | Options (recommended first) | Blocks | Spec |
|---|---|---|---|---|
| **D-008** | Storage engine | **SQLite (WAL)** · flat files · embedded KV | M0 (high confidence — treat as working plan) | `architecture.md`, `local-data.md` |
| **D-013** | Secret-store fallback when no OS keychain | **Electron `safeStorage`, else machine-derived key + honest warning** · refuse to persist | M2 | `authentication.md` |
| **D-016** | Background refresh default interval | **30 min (configurable 15 min–manual)** · 15 min · hourly | M2 | `youtube-api.md` |
| **D-014** | Wizard validation for Google-console steps 1–5 | **checkbox confirmations + failure→step mapping at connect time** · attempt live validation | M4 | `onboarding.md` |
| **D-015** | Wizard media | **static annotated screenshots** · per-step recordings | M4 | `onboarding.md` |
| **D-017** | Week-grouping start day | **fixed Monday (ISO)** · locale-dependent | M1 (trivial) | `feed.md` |
| **D-018** | Show view counts on feed rows | **hidden by default, setting to show** · always · never | M1 (trivial) | `feed.md` |
| **D-019** | Backfill depth for new/first-sync channels | **RSS window (~15) + scroll-triggered deeper backfill** · fixed 50 · configurable | M2 | `feed.md` |
| **D-020** | Auto-pruning of stateless old videos | **off by default** · on at 24 months | M5 | `local-data.md` |
| **D-021** | Watch Later queue auto-advance | **off by default, opt-in setting** · on (it's the user's own queue) · never | M3 | `playback.md` |
| **D-022** | Feed row density default | **comfortable, with compact setting** · compact | M3 (trivial) | `ui.md` |
| **D-023** | Muted-thumbnail treatment | **prototype in M3, keep only if it works** · normal thumbnails | M3 (trivial) | `ui.md` |
| **D-024** | Linux packaging | **Flatpak primary + AppImage** · one only | M5 | `roadmap.md` |
| **D-025** | Windows code signing | budget-dependent | M5 | `roadmap.md` |
| **D-026** | Update mechanism | **signed static-manifest check, no identifiers, off-switch** · manual-only | M5 | `roadmap.md` |

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

Next free ID: **D-035**. One decision per ID. State the options, the recommendation and
its rationale (or the final choice and why), the milestone it blocks, and the owning spec.
Never edit a Final entry's meaning — supersede it with a new entry and mark the old one
**Superseded by D-NNN**.
