# Chronicle — Specifications

This directory is the **single source of truth** for Chronicle's requirements and design.
Implementation tasks reference these documents instead of restating requirements. When code
and spec disagree, either the code is wrong or the spec must be updated in the same change.

## Index

| Document | Purpose |
|---|---|
| [vision.md](vision.md) | What Chronicle is, who it is for, what "done" feels like |
| [non-goals.md](non-goals.md) | What Chronicle will never do, and why |
| [architecture.md](architecture.md) | Layers, module boundaries, process model, data flow |
| [authentication.md](authentication.md) | Own-credentials OAuth model, token lifecycle, secure storage |
| [onboarding.md](onboarding.md) | The setup wizard — step-by-step spec of a flagship feature |
| [youtube-api.md](youtube-api.md) | API surface, quota budget, RSS strategy, failure handling |
| [feed.md](feed.md) | Chronological feed rules, grouping, video state model |
| [local-data.md](local-data.md) | Storage schema, migrations, export/backup |
| [playback.md](playback.md) | How videos are watched (embedded vs. external — pending) |
| [ui.md](ui.md) | Layout, navigation model, keyboard shortcuts, visual language |
| [features.md](features.md) | MVP feature specifications + future feature sketches |
| [roadmap.md](roadmap.md) | Milestones, sequencing, and what blocks what |
| [decisions.md](decisions.md) | Decision log — the authoritative status of every choice |

## Statement labels

Specs distinguish four kinds of statements. Where ambiguity is possible, they are labeled:

- **Final** — decided (by the product owner or confirmed with them). Changing it requires a
  new entry in `decisions.md` superseding the old one.
- **Pending** — an open decision. The spec documents the alternatives, trade-offs, and a
  recommendation, but the choice is not confirmed. Implementation must not silently resolve
  it. All Pending decisions are tracked in `decisions.md`.
- **Assumption** — believed true but unverified (e.g., about Google API behavior). Verify
  before relying on it in code; promote to Final or correct the spec once verified.
- **Future idea** — explicitly out of MVP scope; recorded so the architecture can leave
  room for it, not so it gets built now.

## Conventions

- Decision IDs are `D-NNN` and live in `decisions.md`. Specs reference them inline
  (e.g., "see D-007").
- Quota costs are stated next to every YouTube API call mentioned anywhere in the specs.
- All dates are absolute (YYYY-MM-DD). This spec set was authored 2026-07-10.
- Specs are written in English; the product UI language is English first (localization is a
  Future idea).
