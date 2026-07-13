# Roadmap

Milestones are sequenced so that **risk retires early**: the two existential risks are
(a) the own-credentials OAuth path working smoothly for real users, and (b) reliable
playback. Everything else is well-understood engineering.

Dates are deliberately absent — this is sequencing, not scheduling.

## M0 — Walking skeleton

Decisions resolved 2026-07-10: D-006 (embedded player) → D-005 (**Electron**), D-009
(**React + TypeScript**), D-007 (hybrid feed source), D-010 (state model), D-012 (auth
expiry handling), D-027 (scroll pagination), D-028 (Shorts exclusion, now MVP —
superseded by D-035 on 2026-07-12, see `feed.md` §Shorts), D-029
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
  builds) will be designed as part of M6. The invariant stands whenever it lands: no API
  calls in CI, ever. Until then, checks run locally
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
`Enter`/`o` marks read until the player exists (M3). D-017 (ISO Monday) exercised with
its recommended option. D-018 (view counts) later flipped to shown-by-default (B-029).

## M2 — Auth + real data (the risk milestone)

- OAuth adapter: PKCE, loopback, token lifecycle, keychain storage + fallback (D-013).
- Verify the **Assumptions** in `authentication.md` against the live Google console
  (publish-to-production behavior, 7-day testing expiry) — update specs with findings.
- Subscriptions import; hybrid feed source (D-007): RSS discovery + batched hydration;
  sync planner + per-channel failure isolation; quota accounting; failure-state banners.
- **Shorts detection pipeline (D-028)** inside sync: duration candidates + `/shorts/`
  HEAD confirmation + `is_short` caching — and early verification of the heuristic
  itself (it is MVP-blocking). (Display policy — exclude vs. tag+toggle — later
  reversed by D-035; the detection pipeline itself is unaffected.)
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
button only), D-022 (comfortable density). D-023 (muted thumbnails) was prototyped here
and later rejected after dogfooding (B-034) — full opacity always. Pause-overlay call
recorded in `playback.md`. Performance budgets:
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

## M5 — MVP feature-complete (from source)

*(Split 2026-07-11 by the product owner: packaging/installers/release move to their own
milestone, M6 — the software must be MVP-complete before it is worth shipping binaries.)*

- Data export (JSON, documented format — `FORMAT.md` ships in the repo).
- Settings surface (refresh interval, theme override, density, view-count toggle,
  connection actions incl. wizard re-entry points, data actions incl. "delete all
  local data").
- README, screenshots, the wizard-as-markdown doc for the repo (`docs/setup.md`).

Exit criterion: a technical user can clone the repo and use the complete MVP from
`npm run dev` guided by the README alone; every MVP feature in `features.md` §MVP works.

**Status (2026-07-11): implemented.** Export (documented in `FORMAT.md`, save-dialog to
a single JSON; the SQLite file blessed as backup in README); settings surface with
Connection (status, scope explanation + revoke link, D-013 storage honesty, wizard
re-entry points: Reconnect→7, Replace key→6, Fix weekly logout→4b, sign out — verified
live by the product owner), Sync (D-016 interval 15/30/60/manual, applied to the timer
immediately), Appearance (theme override via data-theme, D-022 density with virtualizer
re-measure, D-018 view-count toggle — schema v2 adds `view_count`, hydration captures
statistics at no extra quota cost), Data (export + two-step delete-all that wipes DB,
settings, secrets and caches, then relaunches into first-run). `settings.json` is
human-editable; malformed files yield defaults + a non-blocking warning. README and
FORMAT.md written. D-020 (pruning) stays per recommendation: off — no pruning exists,
which is the off state; the optional setting can ship post-MVP.

## M6 — Packaging & release

*(Re-sequenced 2026-07-11 by the product owner: M6 moves to the **end**, after the
dogfooding batches below — release prep only starts once the application is functional
and the owner is happy with it. The MVP-from-source milestone (M5) already holds; the
bugs.md batches are the path to "happy with it".)*

- Packaging/signing for Linux (AppImage — D-024, resolved 2026-07-13: AppImage only for
  the first release, Flatpak deferred), macOS (dmg, D-043: unsigned for the first
  release — no Apple Developer budget yet), Windows (nsis installer, D-025: unsigned for
  the first release — no code-signing budget yet).
- CI/CD pipeline (deferred from M0, 2026-07-11): checks (typecheck + lint + tests) +
  tagged releases + automatic binary builds for the three OSes, designed as one piece.
  No API calls in CI, ever.
- App update mechanism honoring privacy rules (no identifiers, no telemetry) — D-026,
  resolved 2026-07-13: background check against GitHub's public Releases API (not a
  custom signed manifest — see D-026's rationale), default on, off switch in settings,
  notice-only (never auto-downloads/installs).
- Wizard screenshots captured/refreshed as part of the first release walk.

Exit criterion: a stranger can download, set up, and use Chronicle from the README alone.

**Status (2026-07-13): in progress.** Landed: `electron-builder` config (Linux AppImage,
macOS dmg unsigned, Windows nsis unsigned), placeholder app icon (no branding assets
existed yet — swap when the owner has real ones), `ci.yml` (typecheck+lint+test on
push/PR — this is also the "standalone CI" item deferred from M0), `release.yml`
(tag-triggered `v*.*.*` matrix build across the three OSes, publishes a **draft**
GitHub Release for the owner to review/annotate/publish manually), and the
GitHub-Releases-API update check (D-026). Still open: wizard screenshots (pending since
M4), and the owner has not yet cut a real tag to exercise the release workflow
end-to-end on GitHub Actions — the local `npm run package:linux` build is
verified, the CI-hosted matrix build is not.

## Post-MVP horizon (order per `features.md` rationale)

1. ~~Channel view + both follow mechanisms + accountless mode + YouTube search~~ —
   **mostly landed via the dogfooding batches, corrected 2026-07-12** (this item was
   left stale after the batches below shipped it — the "Roadmap-relevant signals" note
   further down already said as much but the item itself was never updated to match):
   YouTube search (D-031, B-009) and "Subscribe on YouTube" (D-030 mechanism (a),
   B-009/B-010) are shipped; multi-account (B-003) went further than this item
   originally scoped. Still open: "Follow locally" (D-030 mechanism (b), RSS-only
   following with no YouTube-side subscription) and true accountless mode (D-033, using
   Chronicle with zero accounts at all) — a proper **channel detail screen** (avatar,
   banner, subscribe button, video list) is also still missing and is now tracked as
   B-056 in `bugs.md`.
2. Hide live/premieres + duration filters (cheap once data flows)
3. Channel categories/folders
4. Local notes (+ FTS local search)
5. Import/restore of exports
6. The rest of `features.md` by demonstrated demand

(Shorts exclusion was promoted from this list into MVP — D-028.)

## Dogfooding backlog (2026-07-11)

The first dogfooding batch, **B-001–B-017**, lives in `bugs.md` (reported 2026-07-11;
worked in batches when the product owner says so). **Batch plan agreed 2026-07-11**
(all batches precede M6, per the re-sequencing note there): batch 1 = local polish
(B-001, B-005, B-013, B-004, B-008, B-011+B-012, B-014; B-016 was closed by M5 during
reconciliation); batch 2 = i18n infrastructure (B-017), so new feature UIs are born
localized; batch 3 = write scopes + discovery (B-015 first, then B-010, B-009, B-006,
and B-002 — diagnosed as archive-bounded, needs back-catalog API fetch, see its notes);
batch 4 = B-003 (multi-account) — milestone-sized (schema account scoping, wizard
rework, per-account sync) but **not** deferred past M6: M6 is release packaging only
and starts once the owner is satisfied the app is functional, so it comes *after* all
of these batches, not the other way around. **Corrected 2026-07-12** — an earlier
version of this note read "B-003 stays milestone-sized, after M6", which read as
"wait until M6 is done first" and inverted the actual sequencing already established
above (M6 moves to the end). B-003 is just the last of the dogfooding batches, still
ahead of M6.
Roadmap-relevant signals from the list:

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

**Second dogfooding batch, B-054–B-066 (reported 2026-07-12), added to `bugs.md`.**
Reported after using the search (B-009) and multi-account (B-003) features shipped in
the first batch — this batch is largely about tightening those two surfaces plus a
handful of standalone UX gaps, not new scope:
- **Search UX** (B-054, B-055): drop the "Mine"/"YouTube" scope toggle — search should
  always hit YouTube directly on Enter, no local pre-filtering; search results need to
  respect the item-size/grid-list settings (with the layout toggle hidden while
  inert), pagination, and a visual video-vs-channel distinction (circular avatar +
  subscriber count for channels, Short badge for videos).
- **Channel detail screen** (B-056) — a real per-channel screen (avatar, banner,
  subscribe button, video list) does not exist yet; promotes part of post-MVP horizon
  item 1 above from "someday" to tracked work.
- **Feed/unread correctness** (B-057, B-058, B-059, B-063): unread count not
  channel-scoped in the top bar; archive backfill (B-002's pagination) always marks
  videos unread with no regard for whether they predate the user following Chronicle;
  no loading indicator on scroll pagination; the favorites priority section (B-042)
  doesn't follow layout settings and the sidebar doesn't sort favorites first.
- **Player gaps** (B-060, B-061, B-062): filter/`/` disabled while a video plays;
  no subscribe/unsubscribe from the player; comment pagination unused, no comment
  likes (confirmed permanent API limitation, not a bug), no reply-to-reply.
- **Multi-account polish** (B-064, B-065, B-066): switching accounts doesn't refresh
  the sidebar automatically; a zero-channel account breaks the sidebar layout; the
  account/channel `…` context menus clip inside their scroll containers; removing the
  last account fails silently.

None of these are attacked yet — same rule as the first batch: worked when the product
owner says so, in whatever order makes sense once picked up (B-054/B-055/B-056 and
B-060/B-061 are natural sequencing pairs; B-058 needs a Pending decision before it can
be fixed, see its entry).

## Standing release checklist (every release, starting M4)

- Re-walk the onboarding wizard against the live Google console; refresh stale
  screenshots (assets carry verified-on dates).
- Re-verify quota costs table in `youtube-api.md` against current Google docs.
- Grep audit: no secrets in logs; no new network endpoints beyond Google's.
- Export → wipe → (once import exists) restore round-trip test.
