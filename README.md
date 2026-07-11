# Chronicle

**A chronological, subscriptions-only YouTube client for the desktop.**

Chronicle recreates the pre-algorithm YouTube experience: you open it and see the
channels *you* chose, newest first, grouped as Today / Yesterday / This Week / Earlier.
Nothing on screen was put there by an engagement model — no algorithmic Home, no
recommendations, no Shorts, no infinite trending feed. Videos still play through the
official YouTube player, so creators keep their views and their monetization.

The governing principle is **agency, not austerity**: you can watch anything, open any
YouTube link, and (post-MVP) search all of YouTube — Chronicle only removes the
*algorithm's* will, never yours. The test for every feature is "who is driving?"

## Principles (non-negotiable)

- **Local-first** — all your data lives in a SQLite file on your machine. There are no
  Chronicle servers.
- **Privacy-first** — no telemetry, no analytics, no phoning home. Ever.
- **Your credentials, your quota** — you create your own free Google Cloud project;
  Chronicle ships zero embedded credentials and is frugal with your API quota (a
  typical refresh costs single-digit units of your 10,000/day).
- **No engagement mechanics** — no autoplay into unrelated content, no badges, no
  infinite feed. When you're caught up, it says so and offers nothing more.
- **Shorts are never displayed.** Not now, not ever. There is no toggle.

## Status

Pre-release, daily-driven by its developer. All MVP milestones through M5 are
implemented; packaged binaries (Flatpak/AppImage, dmg, Windows installer) arrive with
M6. Until then, Chronicle runs from source.

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
plain text live in [`docs/setup.md`](docs/setup.md).

Useful commands:

```sh
npm run typecheck && npm run lint && npm test   # the full offline check suite
CHRONICLE_FIXTURES=1 npm run dev                # dev feed with deterministic fake data
```

## Keyboard-first

`j`/`k` move, `Enter` plays, `m` toggles read, `i` ignores (with undo), `f` favorite,
`w` watch later, `1…5` switch views, `r` refresh, `/` filter, `Ctrl+O` open any YouTube
URL, `?` shows the full map.

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
