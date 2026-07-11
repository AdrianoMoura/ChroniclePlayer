# Connecting Chronicle to your YouTube account

Chronicle ships with **zero** Google credentials. You create your own (free) Google
Cloud project and OAuth client, so your data and your API quota belong to you alone —
nobody can revoke, leak, or spy on a credential that only you possess (D-001).

The whole thing takes about ten minutes, once. This document is the plain-markdown
precursor of the onboarding wizard (M4); every step below will become a wizard screen.

> Verified against the live Google console on: **(pending — M2 verification)**.
> If the console has changed since, file an issue / update this doc.

## Step 1 — Create a Google Cloud project

1. Open <https://console.cloud.google.com/projectcreate> (sign in with the Google
   account whose YouTube subscriptions you want).
2. Name it anything — `chronicle` works. No organization. **Create**.

## Step 2 — Enable the YouTube Data API

1. Open <https://console.cloud.google.com/apis/library/youtube.googleapis.com>
   (make sure your new project is selected in the top bar).
2. Click **Enable**.

If you skip this, Chronicle will fail later with *"YouTube Data API not enabled"* —
come back here.

## Step 3 — Configure the OAuth consent screen

1. Open <https://console.cloud.google.com/apis/credentials/consent>.
2. User type: **External** (the only choice without a Workspace org). **Create**.
3. Fill only the required fields: app name (`Chronicle`), your email in both support
   and developer contact. **Save and continue** through the Scopes and Test users
   screens (add nothing yet).
4. On **Test users**: add your own Google account email. (Required while the project
   is in *Testing* status.)

## Step 4 — Recommended: publish the app to production

While the consent screen is in **Testing** status, Google expires refresh tokens after
**7 days** — you would have to reconnect Chronicle weekly (two clicks, but annoying).

Publishing removes the weekly expiry and, for the readonly YouTube scope, does **not**
require Google's verification process:

1. On the consent screen page, click **Publish app** (*Testing* → *In production*).
2. During the (one-time) authorization you will see an **"unverified app"** warning.
   Click **Advanced → Go to Chronicle (unsafe)**. This is safe *here* because the
   "unverified app" is your own project — you are trusting yourself.

This is your choice (D-012): skipping it just means reconnecting weekly. Chronicle
detects the expiry and offers one-click re-auth either way.

## Step 5 — Create the OAuth client and download the file

1. Open <https://console.cloud.google.com/apis/credentials>.
2. **Create credentials → OAuth client ID**.
3. Application type: **Desktop app** (not "Web application"). Name it anything.
4. **Download JSON** — this is your `client_secret.json`.

## Step 6 — Connect Chronicle

1. Launch Chronicle. The connect screen appears on first run.
2. **Select client_secret.json…** and pick the downloaded file. Chronicle stores the
   extracted credentials in your OS keychain (or an encrypted local file, with an
   explicit warning, if no keychain exists — D-013). You may delete the downloaded
   file afterwards if you wish; Chronicle never touches your files.
3. **Connect Google.** Your browser opens Google's consent screen; Chronicle listens
   on `127.0.0.1` (loopback, PKCE) for the answer. Grant the **readonly** scope —
   it is the only one Chronicle requests (D-032).
4. Chronicle imports your subscriptions and runs the first refresh. Done.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| "YouTube Data API not enabled" | Step 2 skipped | Enable the API, refresh |
| "this is a Web application client" on import | wrong client type | Step 5: create a **Desktop app** client |
| Browser shows `redirect_uri_mismatch` | Web client used / console misconfig | Desktop-app clients need no redirect URI config; recreate as Desktop app |
| "Reconnect to Google" banner every ~week | project still in Testing | Step 4: publish to production |
| Google blocks the consent screen entirely | your account isn't a Test user (Testing mode) | Step 3.4: add yourself as Test user |
| "unverified app" warning | normal for your own unpublished/unverified project | Advanced → Go to Chronicle (unsafe) — you are trusting yourself |

## What Chronicle does and never does with this access

- Reads your subscription list and video metadata. That's all the readonly scope allows.
- Read states / favorites / watch-later are **local only** — never written to YouTube (D-003).
- Tokens live in your OS keychain; access tokens only ever in memory (authentication.md).
- Every API call is frugal with *your* quota: a typical refresh costs **single-digit
  units** out of your 10,000/day (hybrid RSS+API strategy, D-007).
