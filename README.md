# Chronicle

**A chronological, subscriptions-only YouTube client for the desktop.**

Chronicle recreates the pre-algorithm YouTube experience: you open it and see the
channels *you* chose, newest first, grouped as Today / Yesterday / This Week / Earlier.
Nothing on screen was put there by an engagement model — no algorithmic Home, no
recommendations, no infinite trending feed. Videos still play through the official
YouTube player, so creators keep their views and their monetization.

The governing principle is **agency, not austerity**: you can watch anything, open any
YouTube link, and search all of YouTube — Chronicle only removes the *algorithm's* will,
never yours. The test for every feature is "who is driving?"

## Principles (non-negotiable)

- **Local-first** — all your data lives in a SQLite file on your machine. There are no
  Chronicle servers. Caching data locally is a technical detail for speed and offline
  use, never a UX boundary you have to think about — searching or filtering always
  behaves like you're talking to YouTube directly.
- **Privacy-first** — no telemetry, no analytics, no phoning home. Ever.
- **Your credentials, your quota** — you create your own free Google Cloud project;
  Chronicle ships zero embedded credentials and is frugal with your API quota (a
  typical refresh costs single-digit units of your 10,000/day).
- **No engagement mechanics** — no autoplay into unrelated content, no badges, no
  infinite feed. When you're caught up, it says so and offers nothing more.
- **Shorts are shown, not hidden by default** — they appear in the feed tagged with a
  badge; a Settings toggle lets you hide them if you'd rather not see them at all.
  Chronicle doesn't decide that for you.

## Status

Pre-release, daily-driven by its developer. M0–M5 are implemented from source; M6
(packaging & release) is in progress — see [`.specs/roadmap.md`](.specs/roadmap.md) for
the full sequencing. You can run Chronicle from source today (below), or grab a packaged
build from [Releases](../../releases) once the first one ships.

## Installing a packaged build

Packaged builds are unsigned for now — no Apple Developer or code-signing budget exists
yet (D-025/D-043 in [`.specs/decisions.md`](.specs/decisions.md)); this only affects the
one-time first-run warning below, nothing else.

- **Linux** — download the `.AppImage`, `chmod +x` it, run it directly. No installation,
  no root.
- **macOS** — download the `.dmg`, drag Chronicle into Applications. Gatekeeper will
  refuse to open it the normal way ("Chronicle is damaged" or "cannot be opened" — it
  isn't damaged, it's just unsigned): right-click the app → **Open** → **Open** again in
  the dialog, or go to **System Settings → Privacy & Security** and click **Open Anyway**
  next to the Chronicle warning. Only needed once.
- **Windows** — download the installer and run it. Windows SmartScreen will show
  "Windows protected your PC": click **More info**, then **Run anyway**. Only needed
  once.

Chronicle checks GitHub for newer releases once a day (off-switch in Settings → Sync) and
shows a dismissible notice — it never downloads or installs anything on its own.

## Running from source

Requirements: Node.js 22+, npm, Linux/macOS/Windows.

```sh
git clone <this repo>
cd ChroniclePlayer
npm install
npm run dev
```

On first run Chronicle opens the onboarding wizard, which walks you through creating
your own Google Cloud project and OAuth key (~10 minutes, one time). The same steps in
plain text live in [`docs/setup.md`](docs/setup.md). You can add more than one YouTube
account afterward from the sidebar's Accounts section — additional accounts skip the
console walkthrough and share the same Google Cloud project.

Useful commands:

```sh
npm run typecheck && npm run lint && npm test   # the full offline check suite
CHRONICLE_FIXTURES=1 npm run dev                # dev feed with deterministic fake data
```

## Keyboard-first

`j`/`k` move, `Enter`/`o` plays, `b` opens in browser, `m` toggles read, `i` ignores
(with undo), `u` undoes it, `f` favorite, `w` watch later, `1…5` switch views, `r`
refresh, `/` filter, `c` focuses the channel filter, `s` toggles the sidebar, `Ctrl+O`
open any YouTube URL. Press `?` any time for the full, always-current map.

## Your data

- Database: `~/.local/share/chronicle/chronicle.db` (platform equivalents on
  macOS/Windows) — open it with any SQLite browser; it's yours.
- One-click JSON export of everything, documented in [`FORMAT.md`](FORMAT.md).
- Secrets live in your OS keychain (with an honest, clearly-flagged fallback when none
  exists). Sign-out revokes the token; "Delete all local data" removes every trace.

## Design docs

The product is specified before it is built: see [`.specs/`](.specs/) — vision,
non-goals, architecture, the decision log (`decisions.md`), and the roadmap. When code
and spec disagree, the spec is updated in the same change; decisions carry IDs and
rationale so nothing is re-litigated by accident.
