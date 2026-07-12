# Authentication

## The own-credentials model — D-001 (Final)

Chronicle ships with **zero embedded Google credentials**. Every user creates their own
Google Cloud project and their own OAuth Desktop client, guided by the onboarding wizard
(see `onboarding.md`).

### Why (rationale — record permanently)

1. **No shared quota.** The YouTube Data API grants ~10,000 units/day *per project*. A
   shared credential would pool every Chronicle user into one quota and die at trivial
   scale. Per-user projects give every user their own 10,000 units.
2. **No Google OAuth verification burden.** Apps with embedded credentials requesting
   YouTube scopes must pass Google's verification process (privacy policy, domain
   ownership, periodic re-review, possible security assessment). A local-first,
   server-less, unfunded project cannot and should not carry that.
3. **No central point of failure or trust.** There is no central credential anyone can
   revoke, leak, or be pressured over. Chronicle's developers never possess anything that
   touches users' Google accounts.
4. **True ownership.** The user's refresh token is issued to the user's own OAuth client
   in the user's own project. They can audit, restrict, or delete it in their own Google
   console at any time.

Trade-off accepted: a genuinely harder first-run (~10 minutes). The onboarding wizard is a
flagship feature precisely to pay this cost down (see `onboarding.md`). Precedent: desktop
calendar/email apps (e.g., GNOME-adjacent tools, Thunderbird-style setups, various
open-source Google API clients) use this same "bring your own OAuth client" pattern.

## OAuth flow (Final in shape)

- **Flow:** OAuth 2.0 Authorization Code with **PKCE (S256)**, Desktop-app client type.
- **Redirect:** loopback — Chronicle starts a temporary HTTP listener on
  `http://127.0.0.1:{ephemeral port}` for the duration of the auth handshake only, then
  shuts it down. This is Google's recommended pattern for desktop apps.
- **Browser:** the authorization URL opens in the **system browser**, never in an embedded
  webview (Google blocks embedded-webview OAuth; system browser also lets users leverage
  existing sessions and password managers).
- **Scope policy — D-032 (Final): minimal at start, incremental by feature.**
  - Initial auth requests `https://www.googleapis.com/auth/youtube.readonly` only —
    everything the MVP needs. Minimal initial scope keeps the onboarding consent screen
    as unscary as possible.
  - Chronicle is **not** readonly-exclusive by principle: YouTube-side interaction
    features are planned — **subscribe** (D-030), and eventually **like** and **comment**
    (`features.md`). Each unlocks via **incremental authorization**: the broader scope
    (`youtube.force-ssl` covers subscribe/rate/comment) is requested only the first time
    the user invokes such a feature — a standard incremental-consent flow
    (`include_granted_scopes=true`) in the default browser, two clicks for an
    already-signed-in user. Users who never interact never grant write access.
  - Granted write scope is used **exclusively for actions the user explicitly takes**
    (subscribe/unsubscribe, like, post a comment). It is never used for background
    writes, history, playlist manipulation, or syncing Chronicle's local states —
    D-003's local-only state rule is unaffected by any scope the user grants.
  - The settings screen shows which scopes are currently granted and what each is used
    for, with a revoke link.
  - **Implemented (2026-07-12, [[B-010]]):** the mechanism described above —
    `AuthFlow.requestWriteScope()`/`hasWriteScope()` (`src/adapters/oauth/auth.ts`),
    granted scopes tracked in the secret store (`SECRET_KEYS.grantedScopes`), and
    Unsubscribe as the first write action to trigger it.
  - **Settings screen granted-scopes display + revoke link — implemented
    (2026-07-12, [[B-015]]):** `AuthStatusDto.writeScopeGranted` (computed from
    `hasWriteScope()`) drives the Connection section's copy — "YouTube read-only"
    vs. "YouTube read-only + subscribe/comment/like" — refetched every time
    Settings is opened, so it never lags behind whatever write action was last
    used. The revoke link (`myaccount.google.com/permissions`) predates this and
    was already present; it now sits under an accurate scope description.
- **Endpoints:** standard Google OAuth2 (`accounts.google.com/o/oauth2/v2/auth`,
  `oauth2.googleapis.com/token`). No Google SDK dependency required; the flow is simple
  enough to implement directly, which keeps the adapter replaceable and auditable.

### Token lifecycle

- Access tokens (~1 h) are held **in backend process memory only** — never written to disk.
- The refresh token is persisted in the secret store (below) and used by `AuthProvider` to
  mint access tokens transparently. UI code never sees any token.
- On `invalid_grant` (refresh token revoked/expired): surface `AuthExpired` as a
  non-blocking banner ("Reconnect to Google") — the app remains fully usable on local
  data; only refresh is disabled until re-auth.
- Sign-out: delete the refresh token from the secret store and revoke it via
  `https://oauth2.googleapis.com/revoke` (best effort). Local data is **not** deleted on
  sign-out (it's the user's data); a separate explicit "delete all local data" action
  exists in settings.

## ⚠ The Testing-mode 7-day expiry problem (critical constraint)

Google OAuth consent screens start in **"Testing"** publishing status. For projects in
Testing status, **refresh tokens expire after 7 days**. If Chronicle ignores this, every
user would be forced to re-authenticate weekly — unacceptable.

**Resolution — D-012 (Final, 2026-07-10):** two complementary mechanisms:

1. **The wizard explains and recommends — the user chooses.** The wizard's Step 4b
   explains the 7-day Testing-mode expiry and recommends clicking **"Publish app"**
   (consent screen: *Testing* → *In production*), but publishing is **optional**. For a
   personal project with only the YouTube readonly scope:
   - Publishing does **not** require completing Google verification.
   - The consent screen will show an "unverified app" warning during the (one-time) auth;
     the wizard explains the click-through (*Advanced → Go to {project} (unsafe)*) and
     **why it is safe here**: the "unverified app" is the user's own project — they are
     trusting themselves.
   - Result: durable refresh tokens (no 7-day expiry).
2. **Startup connection validation with low-friction re-auth.** On every app open,
   Chronicle validates the stored credentials (a cheap token refresh; plus one
   `channels.list?mine=true` — 1 unit — when a full check is due). On `invalid_grant`,
   Chronicle prompts re-authentication and opens the flow in the **default browser** —
   where the user is almost always already signed in to Google and only needs to confirm.
   Weekly re-auth in Testing mode is therefore a two-click inconvenience, not a broken
   app. The `invalid_grant` banner also explains the likely cause ("your Google project
   is in Testing mode — tokens expire weekly; publish it to fix this permanently") and
   deep-links to wizard Step 4b.

**Assumption to verify in M2:** current Google Cloud console flow still permits
publishing to production with a sensitive-but-not-restricted scope without verification,
and that the readonly YouTube scope remains classified as sensitive (not restricted).
Google shifts this policy occasionally; the wizard content must be re-validated against
the live console during implementation.

Note: the older "add yourself as a Test User" step remains in the wizard because auth in
Testing mode is needed at least until the user publishes; both paths are documented in
`onboarding.md`.

## Secret storage — D-004 (Final in principle)

Two secrets exist: the **OAuth client secret** (from the user's `client_secret.json` —
note: for Desktop clients Google treats this as non-confidential, but we protect it
anyway) and the **refresh token** (genuinely sensitive).

- **Primary: OS secure credential storage** via a cross-platform abstraction:
  - Linux: Secret Service API (libsecret — GNOME Keyring / KWallet)
  - macOS: Keychain
  - Windows: Credential Manager (DPAPI-backed)
- **Fallback (Pending detail, D-013):** on systems without a working secret service
  (headless Linux, some minimal WMs), fall back to an encrypted file in the app data
  directory. Options for the file key: (a) Electron `safeStorage`/OS-derived key where
  available; (b) a machine-derived key (obfuscation only — honest about it);
  (c) refuse to store and require auth per-session. **Recommendation: (a) where the shell
  provides it, else (b) with an explicit warning in settings** ("your token is stored with
  reversible local encryption; anyone with access to your user account can read it").
  Never store secrets in plaintext.
- **Never** transmit credentials anywhere except Google's OAuth endpoints. There is no
  Chronicle server to send them to (see `non-goals.md`).
- The raw `client_secret.json` file: after import, Chronicle extracts `client_id` and
  `client_secret` into the secret store and **offers** to note that the user may delete
  the downloaded file. Chronicle never moves/deletes user files itself.

## Multi-account

Out of scope for MVP. One Google identity per Chronicle profile. **Future idea:** multiple
profiles (separate DB + secret entries per profile), which the `SecretStore`/`storage`
port design should not preclude (key entries by profile ID from day one — cheap now,
painful later).

## Security posture summary

- Tokens: memory-only (access) / OS keychain (refresh).
- Renderer/UI process: zero secret access, zero direct Google network access (enforced by
  process boundary, see `architecture.md`).
- Loopback listener: bound to 127.0.0.1, random port, single-use `state` + PKCE, rejects
  mismatched `state`, times out after 5 minutes.
- No secrets in logs, ever. Log redaction is a code-review checklist item.
