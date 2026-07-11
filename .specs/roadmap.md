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

## M3 — Playback + polish

- Player view per `playback.md` (embed, end-overlay, embed-restricted fallback,
  open-in-browser).
- Universal video opening (D-029): description links → in-app player with navigation
  stack; open-by-URL (Ctrl+O); external-video hydration; Shorts-link browser fallback.
- Dark/light themes, caught-up state, new-videos pill, performance budgets verified
  (`ui.md`): cold start < 2 s, 60 fps scroll at 10k rows.
- Thumbnail disk cache with LRU cap.

Exit criterion: daily-drivable by the developer. Start dogfooding full-time here.

## M4 — Onboarding wizard

Built late deliberately: the wizard documents a flow that must already be proven (M2),
and its screenshots should be captured once the steps are final.
- All 8 steps per `onboarding.md`, with validations, resumability, re-entry points.
- Screenshot asset pipeline + "verified-on" dating.
- First-run detection; error→step routing from the failure table.

Exit criterion: **the acid test** — someone who is not the developer, with a fresh Google
account, completes setup unassisted. Recruit 2–3 such testers; their stumbles are M4 bugs.

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

## Standing release checklist (every release, starting M4)

- Re-walk the onboarding wizard against the live Google console; refresh stale
  screenshots (assets carry verified-on dates).
- Re-verify quota costs table in `youtube-api.md` against current Google docs.
- Grep audit: no secrets in logs; no new network endpoints beyond Google's.
- Export → wipe → (once import exists) restore round-trip test.
