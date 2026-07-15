# Onboarding Wizard

The onboarding wizard is a **flagship feature**, not a chore screen. It exists because of
the own-credentials model (D-001, `authentication.md`): every user who connects a YouTube
account creates their own Google Cloud project, and the wizard makes that achievable,
understandable, and even confidence-building. Reference experience: desktop calendar apps
that walk users through creating their own Google OAuth client — Chronicle should be the
best-in-class version of that pattern.

**Note (D-033):** once accountless mode lands (with D-030, post-MVP), the wizard becomes
an *optional* path — the app is usable without any account via local RSS follows, and the
first-run screen offers both routes ("start following channels now" / "connect your
YouTube account"). In the MVP, the wizard is the sole entry path.

## Design goals (Final)

1. **Explain WHY at every step**, not just what to click. Users who understand that they
   are creating *their own* private key to *their own* quota complete the setup with
   trust instead of suspicion. The "why" text is short (2–3 sentences), always visible,
   never hidden behind a tooltip.
2. **Zero guesswork.** Every step provides: explanation → screenshot of the exact Google
   page → a button that opens the correct URL in the system browser → a copy button for
   any value the user must paste → validation where technically possible.
3. **Interruptible and resumable.** Setup state persists; quitting mid-wizard resumes at
   the same step. The Google-side steps are inherently resumable (the project persists).
4. **Honest about time**: the intro screen says "about 10 minutes, one time only."
5. **Failure-friendly**: every step has a "something looks different?" expander covering
   the known variations of the Google console UI, and a "start this step over" path.

## Step-by-step specification

### Step 0 — Welcome & why

- Explains the model in plain language: *"Chronicle doesn't have a server or an API key.
  You'll create your own — free — so your data and your access belong to you alone."*
- Bullet benefits: your own quota · no third party in the loop · revocable by you anytime.
- Sets expectations: ~10 minutes, requires a Google account, free (no billing account
  needed for YouTube Data API default quota).
- CTA: "Let's set it up."

### Step 1 — Create a Google Cloud project

- Why: "Google groups API access into 'projects'. You need one to hold your key."
- Button: open `https://console.cloud.google.com/projectcreate`.
- Suggest a project name (copy button): `chronicle-player`.
- Validation: none possible (no credentials yet) → checkbox confirmation:
  "I created the project."

### Step 2 — Enable the YouTube Data API v3

- Why: "Projects start with every API disabled; you're turning on just the one Chronicle
  needs — your subscriptions, video metadata, and (only when you choose to subscribe,
  comment, or like something) those actions too." **Updated 2026-07-12 (B-015):** the
  original wording said "read-only YouTube data," which stopped being accurate once
  B-006/B-009/B-010 added write actions (subscribe/unsubscribe/comment/like) via
  incremental scope consent (D-032) — the enabled API itself isn't read-only, only the
  *initial* OAuth grant is.
- Button: open `https://console.cloud.google.com/apis/library/youtube.googleapis.com`.
- Screenshot shows the "Enable" button state.
- Validation: none yet → confirmation checkbox. (Post-auth, Chronicle *can* detect a
  disabled API by the specific 403 `accessNotConfigured` error and route the user back to
  this step — that error mapping is required, see `youtube-api.md`.)

### Step 3 — Configure the OAuth consent screen

- Why: "This is the permission screen you'll see when connecting. Because it's your own
  project, you're both the developer and the only user."
- Button: open the consent screen config page
  (`https://console.cloud.google.com/apis/credentials/consent`).
- Guidance: User type **External** (Internal is only for Workspace orgs); app name
  `Chronicle` (their choice); their own email for both contact fields; no logo, no scopes
  need to be added here (scope is requested at auth time); skip optional sections.
- Note the **Testing vs. Published** situation here in one sentence, with the full
  treatment in Step 4b.

### Step 4 — Add yourself as a Test User

- Why: "While the project is in 'Testing' mode, only listed test users can sign in —
  that's you."
- Button: same consent-screen page, Test users section.
- Value to copy: the user's own email (Chronicle can pre-fill from a text field asking
  "which Google account will you use?" — stored locally for the wizard only).

### Step 4b — Publish the app (recommended; avoids weekly re-login)

- Why (critical): "In Testing mode, Google expires your connection every 7 days. Clicking
  'Publish app' makes your token permanent. You may see an 'unverified app' warning when
  connecting — that's expected: the 'unverified developer' is *you*."
- Button: consent screen page → "Publish app".
- This step is **recommended but explicitly optional (D-012, Final)**: the wizard
  explains the trade-off and lets the user choose. If skipped, Chronicle records that the
  user is in Testing mode; the startup connection validation
  (see `authentication.md` §D-012) catches the eventual `invalid_grant`, explains the
  7-day expiry, offers a two-click re-auth via the default browser, and deep-links back
  to this step for the permanent fix. (Google console behavior still needs live
  validation in M2.)

### Step 5 — Create a Desktop OAuth client

- Why: "This creates the actual key file Chronicle will use — it identifies *your*
  Chronicle install to *your* project."
- Button: open `https://console.cloud.google.com/apis/credentials`.
- Guidance: Create Credentials → OAuth client ID → Application type **Desktop app** →
  name `Chronicle Desktop` (copy button) → Create → **Download JSON**.
- Screenshot of the download dialog; note that the file is usually named
  `client_secret_….json` and lands in the Downloads folder.

### Step 6 — Import `client_secret.json`

- UI: drag-and-drop zone + file picker.
- **Validation (real, immediate):** parse the JSON; require an `installed` key (Desktop
  client type) — a `web` key means the user created the wrong client type → targeted
  error: "This is a Web client; Chronicle needs a Desktop client" with a link back to
  Step 5. Verify `client_id` matches `*.apps.googleusercontent.com` shape.
- On success: `client_id`/`client_secret` go into the secret store; show a green summary
  ("Key imported — Chronicle stores it in your system keychain, never online"). Suggest
  the user may delete the downloaded file (Chronicle doesn't touch it).

### Step 7 — Connect to Google

- Button: "Connect" → full PKCE flow in the system browser (see `authentication.md`).
- The wizard shows a live status: waiting for browser → received code → exchanging →
  connected as *{channel name / email}*.
- **Unverified-app warning walkthrough:** an inline illustrated mini-guide of the warning
  screen and the *Advanced → Continue* click-through, shown proactively *before* opening
  the browser, so the user isn't ambushed.
- Validation (real): a successful token exchange, followed by one `channels.list?mine=true`
  call (1 quota unit) to display the connected identity and prove the API is enabled. The
  three distinct failure modes map to targeted recovery: `access_denied` (user canceled) →
  retry; 403 `accessNotConfigured` → back to Step 2; testing-mode/user-not-added error →
  back to Step 4.

### Step 8 — First sync & done

- Import subscriptions (see `youtube-api.md`), show progress ("Found 142 subscriptions…
  fetching recent uploads…"), then land on the populated feed.
- Closing message reinforces ownership: "Everything Chronicle knows is stored on this
  computer. Your key can be revoked anytime at myaccount.google.com/permissions."

## Screenshots pipeline (implementation constraint)

- Screenshots of the Google console are stored as static assets versioned with the app.
- Google redesigns its console frequently. Each screenshot asset carries a
  "verified-on" date; a release checklist item (see `roadmap.md`) is to re-walk the wizard
  against the live console before each release and refresh stale screenshots.
- Screenshots must be theme-consistent (captured in the console's default theme) and
  annotated (arrow/highlight on the click target) — annotation style defined once in
  `ui.md`.
- **Future idea:** localized screenshot sets.

## Re-entry points (Final)

The wizard is not once-and-gone; individual steps are re-runnable from Settings:
- "Reconnect Google account" → starts the Google login directly, no wizard detour
  (B-012, 2026-07-11 — originally Step 7 alone; the step remains reachable through
  wizard failure routing when the login itself fails).
- "Replace API key" → Steps 6–7.
- "Fix weekly logout" → Step 4b.
- Full reset → entire wizard, preserving local video states (they are independent of auth).

**This whole wizard is scoped to the one primary account (B-003, implemented
2026-07-12).** Adding a second (or third…) Google account never touches it or re-runs
any step here — the sidebar's Accounts section has its own short flow instead: a
reminder to add the new email as a Test user on the *same* Google Cloud project (no new
project, no new OAuth client), then a Connect button. See `authentication.md` §Multi-account
and `ui.md`'s sidebar section.

## Resolved decisions

- **D-014 (Final, exercised M4):** In-wizard live validation of Google-side steps 1–5 is
  impossible pre-auth (no credentials to call with), so Chronicle uses checkbox
  confirmations for steps 1–5 plus a strong failure→step mapping at Step 7 (as specced
  above) instead of attempting live validation.
- **D-015 (Final, exercised M4):** Static annotated screenshots per step, not a
  screen-recording — lighter assets, easier to keep current. The asset pipeline
  (verified-on dating) is built; capturing the actual screenshots is still open,
  tracked as an M6 exit item in `roadmap.md`.
