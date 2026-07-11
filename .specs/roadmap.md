# Roadmap

Milestones are sequenced so that **risk retires early**: the two existential risks are
(a) the own-credentials OAuth path working smoothly for real users, and (b) reliable
playback. Everything else is well-understood engineering.

Dates are deliberately absent — this is sequencing, not scheduling.

## M0 — Walking skeleton

Decisions resolved 2026-07-10: D-006 (embedded player) → D-005 (**Electron**), D-009
(**React + TypeScript**), D-007 (hybrid feed source), D-010 (state model), D-012 (auth
expiry handling), D-027 (scroll pagination), D-028 (Shorts exclusion, now MVP), D-029
(universal opening), D-030 (both follow mechanisms), D-031 (YouTube search), D-032
(incremental scopes), D-033 (accountless mode, post-MVP). D-008 (SQLite) remains the
working plan. **M0 is unblocked.**

Deliverables:
- Repo scaffolding (git init, toolchain, lint/format/test wiring, layer-boundary lint
  rules per `architecture.md`).
- Walking skeleton: backend + renderer boot, typed IPC round-trip, SQLite opens and
  migrates an empty schema v1, window shows a hardcoded feed row. No YouTube yet.
- ~~CI: unit tests + typecheck on push~~ — **deferred (2026-07-11, product owner):** no
  standalone CI in M0; a single smarter pipeline (checks + release + automatic binary
  builds) will be designed later, likely alongside M5 packaging. The invariant stands
  whenever it lands: no API calls in CI, ever. Until then, checks run locally
  (`npm run typecheck && npm run lint && npm test`).

Exit criterion: `npm run dev` shows the shell app on Linux, macOS, Windows.

**Status (2026-07-11):** scaffolding + walking skeleton implemented (toolchain: D-034).
Verified on Linux: boot, typed IPC round-trip, SQLite schema v1 migration, hardcoded feed
row rendered. Pending for exit: macOS and Windows verification.

## M1 — Data spine (offline)

- Schema v1 for real (`local-data.md`), repositories, migration runner.
- `core/` domain: feed grouping, state transitions (D-010 model), unread accounting —
  fully unit-tested offline (this is the product's logic; test it exhaustively).
- Feed UI against seeded fixture data: grouping headers, virtualized list, cursor +
  keyboard map v1, views (All/Unread/WL/Fav/Ignored), inline undo.

Exit criterion: the whole feed experience works convincingly with fake data, offline.
(Sequencing rationale: UI/domain iterate fastest with no OAuth in the loop, and this
makes M2's risky work land in an already-working product.)

**Status (2026-07-11): implemented.** Repositories over schema v1 (keyset pagination per
D-027; SQL view predicates contract-tested against the core `belongsToView` truth);
core domain (D-010 transitions, grouping, unread accounting, caught-up) fully
unit-tested offline; feed UI with virtualized grouped list, cursor + keyboard map v1
(incl. `u` = undo), all five views, inline ignore-undo, local `/` filter, `?` overlay,
caught-up state; deterministic dev fixtures (~24 channels / ~4k videos) seed an empty
dev DB. Verified live on Linux. Deferred within scope: sidebar channel list (M2, needs
real channels), new-videos pill (M2, needs sync), density setting + themes (M3).
`Enter`/`o` marks read until the player exists (M3). D-017 (ISO Monday) and D-018
(view counts hidden) exercised with their recommended options — awaiting confirmation.

## M2 — Auth + real data (the risk milestone)

- OAuth adapter: PKCE, loopback, token lifecycle, keychain storage + fallback (D-013).
- Verify the **Assumptions** in `authentication.md` against the live Google console
  (publish-to-production behavior, 7-day testing expiry) — update specs with findings.
- Subscriptions import; hybrid feed source (D-007): RSS discovery + batched hydration;
  sync planner + per-channel failure isolation; quota accounting; failure-state banners.
- **Shorts exclusion pipeline (D-028)** inside sync: duration candidates + `/shorts/`
  HEAD confirmation + `is_short` caching — and early verification of the heuristic
  itself (it is MVP-blocking).
- Startup connection validation + browser re-auth flow (D-012).
- Developer-facing setup doc (the wizard's content in plain markdown first — it becomes
  the wizard copy in M4 and validates the steps early).

Exit criterion: the developer's real YouTube account flows end-to-end: wizard-less manual
setup → import → live chronological feed that refreshes. **Real-world smoke checklist
executed and recorded.**

**Status (2026-07-11): DONE — exit criterion met.** Landed: OAuth adapter (PKCE S256,
loopback with single-use state + 5-min timeout, memory-only access tokens,
`invalid_grant` → auth-expired banner per D-012); secret store via injected cipher —
safeStorage over a real keychain, machine-derived-key fallback otherwise (D-013
exercised; both paths hit in the wild on day one); YouTube API client with typed error
mapping and per-call quota accounting; RSS client with conditional GET; hybrid
SyncService (D-007) with per-channel isolation, weekly subscription re-list, bounded gap
backfill, Shorts confirm-then-hide pipeline (D-028); 30-min timer + launch refresh
(D-016 exercised); progress/auth/quota events; connect panel, banner slot, sidebar
channel list; `docs/setup.md`. All contract-tested offline.

**Real-world smoke (product owner, Linux/niri, 2026-07-11):** manual setup via
`docs/setup.md` → import → connect → first sync end-to-end. Results: 229 subscriptions,
3,261 videos discovered+hydrated, **76 quota units** (spec predicted ~60–76 for ~200
subs — verified), **937 Shorts confirmed and excluded, 0 stuck candidates** (D-028
heuristic verified at scale — the MVP-blocking assumption holds), first sync took
6 min (dominated by ~1.5k HEAD probes; concurrency since raised 4→8, phase now shown
in the status line). Findings fixed during the smoke: safeStorage crash without a
keychain (D-013 fallback was mandatory), Chromium picking `basic_text` on
non-GNOME/KDE sessions (now forces `gnome-libsecret`). Assumptions still tracked, not
yet falsifiable: publish-without-verification console behavior and 7-day Testing
expiry (needs a week / console walk — re-verify while building the M4 wizard); API
data-retention policy window.

## M3 — Playback + polish

- Player view per `playback.md` (embed, end-overlay, embed-restricted fallback,
  open-in-browser).
- Universal video opening (D-029): description links → in-app player with navigation
  stack; open-by-URL (Ctrl+O); external-video hydration; Shorts-link browser fallback.
- Dark/light themes, caught-up state, new-videos pill, performance budgets verified
  (`ui.md`): cold start < 2 s, 60 fps scroll at 10k rows.
- Thumbnail disk cache with LRU cap.

Exit criterion: daily-drivable by the developer. Start dogfooding full-time here.

**Status (2026-07-11): implemented; dogfooding starts now.** Landed: player view with
the clean-embed mandate (IFrame driven over its postMessage widget protocol — no
external API script; `ended` → Chronicle's own end panel with Back / explicit Next in
queue / Remove from WL; 101/150 → open-in-browser fallback; mark-read on open);
universal opening (D-029: description links with per-kind routing, Shorts → browser
notice per D-028, Ctrl+O URL prompt, navigation stack, external videos hydrated at
1 unit into `subscribed = 0` channels); player keys proxied through the widget protocol
(space/←→/f/Esc); dark/light themes via system preference; new-videos pill (content
never shifts under the cursor); real thumbnails through a `thumb://` protocol backed by
the LRU disk cache (500 MB default) — the renderer still never fetches Google hosts.
Pending decisions exercised with recommendations: D-021 (no auto-advance — explicit
button only), D-022 (comfortable density), D-023 (muted thumbnails prototyped — judge
during dogfooding). Pause-overlay call recorded in `playback.md`. Performance budgets:
virtualization in place; formal cold-start/scroll measurements still to be taken during
dogfooding (they close the milestone).

## M4 — Onboarding wizard

Built late deliberately: the wizard documents a flow that must already be proven (M2),
and its screenshots should be captured once the steps are final.
- All 8 steps per `onboarding.md`, with validations, resumability, re-entry points.
- Screenshot asset pipeline + "verified-on" dating.
- First-run detection; error→step routing from the failure table.

Exit criterion: **the acid test** — someone who is not the developer, with a fresh Google
account, completes setup unassisted. Recruit 2–3 such testers; their stumbles are M4 bugs.

**Status (2026-07-11): implemented; awaiting screenshots + the acid test to exit.**
Landed: all 10 screens (0–8 incl. 4b) per the step spec — why-first copy, open-URL
buttons, copy buttons, "something looks different?" expanders, checkbox confirmations
for console steps (D-014 recommendation exercised), real validation at 6 (client-type
detection with route back to Step 5) and 7 (connect + `channels.list` identity proof
with failure→step mapping: accessNotConfigured→2, refusal hint→4), explicit optional
publish choice recorded (4b/D-012), live first-sync progress at 8, resumable state in
the meta table, first-run detection, and a quick path for returning users. Screenshot
pipeline in place (assets manifest with per-asset verified-on dating; D-015
recommendation exercised) — **console captures still pending** (steps were console-
verified 2026-07-11 but not photographed; capture before M5 release). Re-entry points
from Settings arrive with the M5 settings surface. **Still open for exit:** screenshots +
2–3 external acid-testers (only the product owner can recruit).

## M5 — MVP release

- Data export (JSON, documented format).
- Settings surface (refresh interval, theme, density, view-count toggle, data actions).
- Packaging/signing for Linux (AppImage/Flatpak — **D-024 Pending**, recommend both,
  Flatpak primary), macOS (notarized dmg), Windows (signed installer if cert budget
  exists — **D-025 Pending**).
- CI/CD pipeline (deferred from M0, 2026-07-11): checks (typecheck + lint + tests) +
  tagged releases + automatic binary builds for the three OSes, designed as one piece.
  No API calls in CI, ever.
- App update mechanism honoring privacy rules (static update feed, no identifiers) —
  **D-026 Pending**, recommend simple signed static-manifest check, default on, off
  switch in settings.
- README, screenshots, the wizard-as-markdown doc for the repo.

Exit criterion: a stranger can download, set up, and use Chronicle from the README alone.

## Post-MVP horizon (order per `features.md` rationale)

1. **Channel view + both follow mechanisms + accountless mode + YouTube search**
   (D-030/D-031/D-033 — the discovery bundle; completes the D-029 loop and makes the
   wizard optional)
2. Hide live/premieres + duration filters (cheap once data flows)
3. Channel categories/folders
4. Local notes (+ FTS local search)
5. Import/restore of exports
6. The rest of `features.md` by demonstrated demand

(Shorts exclusion was promoted from this list into MVP — D-028.)

## Dogfooding backlog (2026-07-11)

The first dogfooding batch, **B-001–B-017**, lives in `bugs.md` (reported 2026-07-11;
worked in batches when the product owner says so). Roadmap-relevant signals from it:

- Several items **pull the post-MVP discovery bundle forward**: B-009 (global YouTube
  search + subscribe, D-031/D-030), B-010 (unsubscribe), B-006 (comments + likes,
  D-032 write scopes), B-015 (drop the read-only framing; incremental scopes become
  the explicit model). Item 1 of the post-MVP horizon is effectively requested now.
- **B-003 (multi-account + optional auth)** extends D-033 (accountless mode) into a
  full multi-account model — milestone-sized; needs new decisions when attacked.
- **B-017 (i18n infrastructure)** promotes localization from Future idea to
  infrastructure-now, strings-later.
- The remainder are UI/UX polish and small bugs (B-001, B-002, B-004, B-005, B-007,
  B-008, B-011–B-014, B-016) — batchable independently of the above.

## Standing release checklist (every release, starting M4)

- Re-walk the onboarding wizard against the live Google console; refresh stale
  screenshots (assets carry verified-on dates).
- Re-verify quota costs table in `youtube-api.md` against current Google docs.
- Grep audit: no secrets in logs; no new network endpoints beyond Google's.
- Export → wipe → (once import exists) restore round-trip test.
