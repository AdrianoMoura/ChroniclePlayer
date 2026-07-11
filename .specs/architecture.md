# Architecture

## Principles (Final)

1. **Local-first**: the local database is the source of truth for the UI. The network
   updates the database; the UI reads only from the database. The app is fully usable
   (browsing, watching states, lists) with no network — only refresh and playback need
   connectivity.
2. **Backend/frontend split**: a privileged backend process owns OAuth, secrets, YouTube
   API/RSS communication, and the database. The frontend (UI) is unprivileged, never holds
   tokens, and never talks to Google directly. All communication crosses a typed IPC
   boundary.
3. **Clean architecture / replaceability**: domain logic depends on interfaces, never on
   concrete adapters. YouTube API client, RSS client, storage engine, secret store, clock,
   and player are all replaceable behind ports. This is not architectural ceremony — it is
   how we hedge the pending decisions (D-005/D-006/D-007) and how we survive YouTube API
   changes.
4. **Frugal with quota**: every network design choice is evaluated against the quota
   budget in `youtube-api.md`.
5. **Predictable over clever**: no speculative caching heuristics, no background jobs the
   user didn't ask for beyond the scheduled feed refresh.

## Layer model (Final)

```
┌─────────────────────────────────────────────────────────┐
│ ui/            Frontend (renderer). Pure presentation.  │
│                Talks only to ipc/ via typed commands.    │
├─────────────────────────────────────────────────────────┤
│ ipc/           Typed contract between UI and backend.   │
│                Commands (request/response) + events      │
│                (backend → UI push: refresh progress,     │
│                auth expiry, errors).                      │
├─────────────────────────────────────────────────────────┤
│ core/          Domain. Zero I/O, zero framework imports. │
│                Entities: Channel, Video, VideoState,      │
│                FeedGroup, SyncPlan. Services: feed        │
│                grouping, state transitions, sync          │
│                planning, quota accounting.                │
│                Defines PORTS (interfaces) that adapters   │
│                implement.                                 │
├─────────────────────────────────────────────────────────┤
│ adapters/      Implementations of core ports:            │
│   youtube/       YouTube Data API v3 client               │
│   rss/           YouTube RSS feed client                  │
│   storage/       SQLite repository                        │
│   secrets/       OS keychain (+ encrypted-file fallback)  │
│   oauth/         PKCE flow, loopback server, token mgmt   │
│   player/        Playback strategy (see playback.md)      │
├─────────────────────────────────────────────────────────┤
│ platform/      Desktop shell (window mgmt, tray, deep     │
│                links, auto-update). Framework-specific.   │
└─────────────────────────────────────────────────────────┘
```

**Dependency rule (Final):** `core/` imports nothing from other layers. `adapters/` import
`core/` interfaces. `ui/` imports only `ipc/` types (and shared read-model DTOs). Nothing
imports `ui/`. Violations are build errors (enforced via lint rules / project references
once the stack is chosen).

### Core ports (initial set)

| Port | Responsibility | Implemented by |
|---|---|---|
| `SubscriptionSource` | List the user's subscriptions | `adapters/youtube` |
| `VideoSource` | Fetch recent uploads for a channel; hydrate video details | `adapters/rss` + `adapters/youtube` (see D-007) |
| `VideoRepository` / `ChannelRepository` / `StateRepository` | Persistence | `adapters/storage` |
| `SecretStore` | Store/retrieve OAuth client secret + tokens | `adapters/secrets` |
| `AuthProvider` | Produce a valid access token on demand | `adapters/oauth` |
| `Player` | Open/play a video | `adapters/player` |
| `Clock` | Now(), for testable date grouping | trivial impl |

## Process model

Two-process desktop model (Final in shape; exact runtime depends on D-005):

- **Main/backend process** (privileged): composition root; owns SQLite connection, secret
  store access, OAuth loopback server, HTTP clients, refresh scheduler.
- **Renderer/frontend process** (sandboxed): renders UI from read-model DTOs; issues
  commands; subscribes to events. Holds no secrets, no direct network access to Google.

### IPC contract style (Final)

- **Commands**: `getFeed(page)`, `setVideoState(videoId, state)`, `refreshFeed()`,
  `importClientSecret(json)`, `startAuth()`, `exportData()`, etc. Request/response, typed,
  versioned in one shared module.
- **Events**: `refresh:progress`, `refresh:done`, `auth:required`, `error` — backend
  pushes; UI reacts. The UI never polls.
- All feed reads return **read-model DTOs** (pre-grouped, presentation-ready), so grouping
  logic lives in `core/`, not in the UI.

## Data flow

### Read path (always local)

```
UI → ipc:getFeed → core FeedService → StateRepository/VideoRepository (SQLite) → DTOs → UI
```

Cold start renders the last-known feed from SQLite immediately; no network on the critical
path. This is what makes the two-second experience goal in `vision.md` achievable.

### Refresh path (background)

```
trigger (manual button / startup / interval)
  → core SyncService builds a SyncPlan (which channels to poll, within quota budget)
  → VideoSource fetches new uploads per channel   (RSS: free; API hydration: batched)
  → new/changed videos upserted into SQLite; new videos get state=unread
  → refresh:progress / refresh:done events → UI updates in place
```

Rules (Final):
- Refresh never blocks the UI and never reorders what the user is currently looking at
  without indication (new items appear under a "N new videos — click to show" affordance
  if the user is mid-feed; if at top, they just appear).
- Refresh is idempotent and resumable: interrupting it (quit, network loss) leaves the DB
  consistent; the next refresh continues from per-channel cursors (`last_seen_published_at`).
- Failures are per-channel, not all-or-nothing: one channel failing doesn't abort the sync.

### Auth path

See `authentication.md`. The backend exposes exactly two auth-related capabilities to the
UI: "start interactive auth" and "auth status." Token refresh is invisible and automatic
inside `AuthProvider`.

## Desktop shell framework — D-005 (Final: Electron)

**Decided 2026-07-10**, as a direct consequence of D-006 (playback = embedded YouTube
IFrame player, see `playback.md`). The single biggest product risk was "video doesn't
play on the user's machine"; Electron's bundled Chromium makes the embed work identically
and reliably on Linux/macOS/Windows.

Alternatives considered and rejected:
- **Tauri 2** (Rust + system webview): smaller footprint and better philosophical fit
  ("minimal, fast"), but WebKitGTK on Linux is historically unreliable for YouTube embed
  playback (codecs/media features vary by distro). Would have been the choice if playback
  had gone the external-player route.
- **Native per-OS (Qt, etc.)**: cost unjustifiable for this scope; rules out the IFrame
  player.

Accepted trade-off: Electron's footprint (~250 MB installed, hundreds of MB RAM). The
philosophy's "fast" is about *interaction speed and predictability*, which Electron
delivers with a lean renderer. Mitigations: no heavyweight UI dependencies, virtualized
lists, performance budgets enforced in `ui.md`.

The layer model above remains framework-agnostic on purpose; `core/`, the `ipc/` contract
shape, and `adapters/` would survive a future shell change.

## Frontend framework — D-009 (Final: React + TypeScript)

**Decided 2026-07-10.** The UI is a list-heavy, keyboard-driven app where ecosystem
maturity (virtualized lists, focus management, testing) matters more than runtime size;
state is simple (server state = SQLite via IPC, minimal client state). Pair with a
lightweight query/cache layer over IPC calls. Alternatives considered: Svelte 5 (smaller
runtime, smaller ecosystem), SolidJS (fastest reactivity, smallest ecosystem).

## Storage engine — D-008 (Pending, high confidence)

**Recommendation: SQLite**, single file in the app data directory. Alternatives (flat JSON
files; embedded KV stores like LevelDB) lose on querying (date-range grouping, per-state
filtering, future full-text search on notes) and on atomicity. SQLite is boring,
inspectable by the user (data-ownership bonus), and portable. WAL mode for concurrent
read (UI) + write (sync). Schema in `local-data.md`. Status: **Pending** (D-008) but no
credible alternative is expected; safe to treat as the working plan.

## Error-handling strategy (Final)

- Adapters translate transport errors into a closed set of typed domain errors:
  `AuthExpired`, `QuotaExceeded`, `NetworkUnavailable`, `ChannelUnavailable`,
  `InvalidClientSecret`, `Internal`.
- `QuotaExceeded` is a first-class product state, not an exception path: the UI shows when
  quota resets (midnight Pacific) and the app keeps working from local data
  (see `youtube-api.md`).
- `AuthExpired` triggers a non-blocking banner prompting re-auth; it never interrupts
  browsing local data.

## Testing strategy (Final)

- `core/` is 100% offline-testable: pure functions + ports. Feed grouping, state
  transitions, and sync planning get thorough unit tests (they are the product).
- Adapters get contract tests against **recorded fixtures** (captured real API/RSS
  responses, committed to the repo, sanitized). Never hit the real API in CI.
- One thin end-to-end smoke path per milestone, run manually with the developer's own
  credentials (documented in the milestone checklist, see `roadmap.md`).

## Assumptions

- **Assumption:** a two-process shell (Electron/Tauri) is acceptable to the target user
  despite footprint concerns; verified by the desktop-first Final decision.
- **Assumption:** SQLite WAL handles the concurrency of one writer (sync) + one reader
  (UI) without contention at our scale (≤ tens of thousands of rows). Verify in M1.
