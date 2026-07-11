# Bug & Adjustment Tracker

This is the working list of bugs and adjustments found while testing Chronicle. The
product owner reports items as they dogfood the app; entries are added here first, then
attacked in batches when the owner asks. This file is operational (it changes often) —
requirements and design still live in the other specs, and anything here that turns into
a design change must be reflected in the relevant spec and, when substantive, in
`decisions.md`.

## How this file is used

1. **Report** — the owner describes a bug or desired adjustment; it gets an ID and an
   entry under *Open*, with enough context to reproduce or act on it.
2. **Attack** — when the owner says to work the list, items move to *In progress* and
   then to *Resolved*, with the fixing commit referenced.
3. **Roadmap** — if a batch of items suggests re-sequencing or a new milestone task,
   `roadmap.md` is updated in the same change.

## Conventions

- IDs are `B-NNN`, sequential, never reused. Reference them in commits ("Fix B-003: …").
- **Type**: `bug` (behavior is wrong per spec/expectation) or `adjustment` (behavior is
  as designed but should change — UX polish, copy, tuning).
- **Severity** (bugs only): `blocker` / `major` / `minor`.
- **Status**: `Open` → `In progress` → `Fixed` / `Won't fix` / `Duplicate of B-NNN`.
- Dates are absolute (YYYY-MM-DD): reported date and resolved date.
- Resolved entries move to the *Resolved* section (newest first) and keep their full
  entry — the history is part of the value.

## Entry template

```markdown
### B-NNN — short title
- **Type:** bug | adjustment · **Severity:** blocker | major | minor (bugs only)
- **Status:** Open · **Reported:** YYYY-MM-DD
- **Area:** feed | player | sync | onboarding | auth | storage | ui-shell | other
- **What happens:** observed behavior (for bugs: steps to reproduce if known).
- **Expected:** what should happen instead (reference spec sections when they exist).
- **Notes:** hypotheses, related decisions (D-NNN), related items (B-NNN).
```

Resolved entries add:

```markdown
- **Resolved:** YYYY-MM-DD · **Commit:** <hash> · **Outcome:** Fixed | Won't fix | Duplicate
- **Resolution:** what was changed, and which specs were updated (if any).
```

---

## Open

### B-001 — Back button inside the player view
- **Type:** adjustment
- **Status:** Open · **Reported:** 2026-07-11
- **Area:** player
- **What happens:** while watching a video there is no visible control to return to the
  previous screen.
- **Expected:** a Back button in the player view that pops the navigation stack (the
  stack already exists per D-029; this is about making it visible/clickable, not only
  keyboard-driven).

### B-002 — Channel video list is truncated and does not paginate
- **Type:** bug · **Severity:** major
- **Status:** Open · **Reported:** 2026-07-11
- **Area:** feed
- **What happens:** a channel's video list shows only some videos and scrolling does not
  load more.
- **Expected:** scroll pagination per D-027 (keyset), same behavior as the main feed.

### B-003 — Multi-account model + optional authentication (Accounts in sidebar)
- **Type:** adjustment
- **Status:** Open · **Reported:** 2026-07-11
- **Area:** auth / ui-shell
- **What happens:** the app forces the connection wizard on first launch; only one
  account is supported.
- **Expected:** the app is usable authenticated or not (relates to D-033, accountless
  mode). Sidebar gains an **Accounts** section (placed before Settings) where the user
  adds one or several accounts. The wizard opens **in a modal**: first account ever gets
  the full Google Cloud console walkthrough (project + OAuth key); additional accounts
  skip that — just remind the user to add the new e-mail as a test user on the existing
  project, then run the connect flow. Feeds from all accounts are combined in listings,
  with the option to filter by account.
- **Notes:** exact UX is open — owner's sketch: a collapsible section (default open)
  listing connected accounts, each with a `…` menu offering **Remove** and **Sync now**.
  This is milestone-sized: touches schema (account scoping), sync, wizard, sidebar.
  Needs decisions.md entries when attacked (supersedes the single-account assumption).

### B-004 — Content should fill the available screen; player always theater-width
- **Type:** adjustment
- **Status:** Open · **Reported:** 2026-07-11
- **Area:** ui-shell / player
- **What happens:** the usable area is not well optimized; content doesn't occupy the
  available width.
- **Expected:** main content stretches to the available area. The video player always
  renders in the equivalent of theater mode, taking the full horizontal width.

### B-005 — Description always visible, clamped to N lines with expand
- **Type:** adjustment
- **Status:** Open · **Reported:** 2026-07-11
- **Area:** player
- **Expected:** the video description is always visible up to a fixed number of lines;
  a "show more" affordance expands it when it is longer.

### B-006 — Comments: read, add, reply; likes on videos and comments
- **Type:** adjustment
- **Status:** Open · **Reported:** 2026-07-11
- **Area:** player
- **Expected:** read the comment thread, post comments, reply to comments, like the
  video and like comments — all user-initiated (in scope per D-030/D-031/D-032 framing).
- **Notes:** requires new API surface + write scopes (incremental, per D-032 and
  [[B-015]]). Quota costs must be stated in `youtube-api.md` when attacked.

### B-007 — List vs. grid view toggle, persisted
- **Type:** adjustment
- **Status:** Open · **Reported:** 2026-07-11
- **Area:** feed
- **Expected:** the user chooses between the current list layout and a grid layout for
  videos; the choice persists across restarts (settings).

### B-008 — Sidebar channel list: sort by most recent video + unseen count
- **Type:** adjustment
- **Status:** Open · **Reported:** 2026-07-11
- **Area:** ui-shell / feed
- **What happens:** the left channel list is sorted alphabetically.
- **Expected:** sorted by most recent video (channels with fresh content on top), with
  the channel's unseen-video count shown next to it.

### B-009 — Search all of YouTube, not only synced content
- **Type:** adjustment
- **Status:** Open · **Reported:** 2026-07-11
- **Area:** other (search)
- **What happens:** search/filter only covers synced channels' content.
- **Expected:** a scope option in the search/filter UI choosing between "my channels"
  and "all of YouTube" (D-031). From global results the user can open any video
  (D-029 already hydrates external videos), discover new channels, and subscribe to
  them (D-030).
- **Notes:** `search.list` costs 100 units/call — quota framing in `youtube-api.md`
  must be respected and surfaced when attacked.

### B-010 — Easy unsubscribe: channel screen + sidebar context menu
- **Type:** adjustment
- **Status:** Open · **Reported:** 2026-07-11
- **Area:** ui-shell
- **Expected:** an obvious Unsubscribe option on the channel screen, plus a `…` icon
  button per channel in the sidebar opening a context menu with Unsubscribe.
- **Notes:** unsubscribing writes to YouTube — needs the write scope path (D-032,
  [[B-015]]).

### B-011 — Always sync on launch; expired connection shows a direct Reconnect button
- **Type:** adjustment
- **Status:** Open · **Reported:** 2026-07-11
- **Area:** sync / auth
- **Expected:** every launch triggers a sync (launch refresh exists per D-016 — verify
  it always fires). If the connection is expired, show a Reconnect button that goes
  straight into the reconnect flow (Google login), not into the wizard. Same direct
  flow as [[B-012]].

### B-012 — Settings → Reconnect drops into wizard step 7
- **Type:** bug · **Severity:** minor
- **Status:** Open · **Reported:** 2026-07-11
- **Area:** auth / onboarding
- **What happens:** clicking Reconnect in Settings routes to the onboarding wizard at
  step 7 (reconnection).
- **Expected:** the button starts the Google login directly — no wizard detour.

### B-013 — Settings button gets a gear icon
- **Type:** adjustment
- **Status:** Open · **Reported:** 2026-07-11
- **Area:** ui-shell
- **Expected:** the Settings entry in the sidebar shows a gear icon.

### B-014 — Remove Electron toolbar; custom window controls in the layout
- **Type:** adjustment
- **Status:** Open · **Reported:** 2026-07-11
- **Area:** ui-shell
- **What happens:** the app shows the default Electron/system toolbar.
- **Expected:** frameless window; close and maximize buttons rendered as part of
  Chronicle's own layout instead of the system chrome.

### B-015 — App wrongly presents itself as read-only
- **Type:** bug · **Severity:** minor
- **Status:** Open · **Reported:** 2026-07-11
- **Area:** other (copy / scopes model)
- **What happens:** app copy states Chronicle is read-only.
- **Expected:** Chronicle is not read-only: subscribe, unsubscribe, comment, and like
  are all in scope (user-initiated — D-030/D-032). What actually happens is that OAuth
  permissions are added incrementally as the user first performs each write action
  (D-032). Fix the copy everywhere it appears (UI, wizard, docs) and make incremental
  scope consent the explicit model.
- **Notes:** umbrella for the write-action items [[B-006]] and [[B-010]].

### B-016 — Theme mode setting: dark, light, and auto (system default)
- **Type:** adjustment
- **Status:** Open · **Reported:** 2026-07-11
- **Area:** ui-shell
- **What happens:** themes follow the system preference only (M3).
- **Expected:** an explicit setting with three modes — dark, light, auto — where auto
  follows the system and is the default. Persisted in settings.

### B-017 — Multi-language support via lang files (English only for now)
- **Type:** adjustment
- **Status:** Open · **Reported:** 2026-07-11
- **Area:** ui-shell / other (i18n)
- **Expected:** a language system where all UI strings live in lang files
  (e.g., `en.json`), loaded through an i18n layer — no hardcoded strings in components.
  Only English ships for now; the infrastructure makes future locales a file drop.
- **Notes:** promotes the "localization is a Future idea" note in `.specs/README.md`
  to infrastructure-now, strings-later. Wizard copy is the biggest surface.

## In progress

*(none)*

## Resolved

*(none yet)*
