---
name: release
description: Close out a Chronicle release end-to-end — rotate the bug tracker, bump the version, tag, and draft release notes. Use when the product owner asks to "fechar a versão", "close the release", "cut a release", "ship vX.Y.Z", or similar for this project.
---

# Chronicle release process

A release is a fixed sequence with two hard confirmation gates (the version number
and the push). Follow the steps in order; don't skip or reorder the gates, and don't
silently pick a version number or push without an explicit yes.

## 1. Ask the version number

Ask the product owner what version this release will be (`X.Y.Z`, no `v` prefix yet —
that gets added in step 5). Don't guess it.

You can help them decide by skimming `.specs/bugs-current.md` (which entries are
Resolved/Fixed) and any `D-NNN` entries added to `.specs/decisions.md` since the last
tag. Per `CLAUDE.md`'s versioning rule: a batch that's pure bug fixes ships as a
**patch**; a batch landing real new scope (a new Settings toggle, a new subsystem)
ships as a **minor** bump — but the owner's explicit call always wins over the rule.
Mention what you see, but still ask rather than deciding for them.

## 2. Rotate the bug tracker

Read `.specs/bugs-current.md` and follow the exact procedure already documented at the
top of that file (its own "Release" step):

- Every item still **Open** or **In progress** carries forward: bump its **Target** to
  the next release version and keep it listed. If you don't already know the next
  target, ask, or infer the obvious next patch (e.g. this release is `0.4.5` → carried
  items target `0.4.6`) and say so.
- Everything else (Resolved/Fixed, Won't fix, etc.) gets archived as-is into a new
  `.specs/bug-history/v<version>.md`. Match the header convention already used by the
  other files in that directory: title (`# Bug & Adjustment Tracker — v<version>
  (shipped <date>)`), the "Archived batch" boilerplate + link back to
  `bugs-current.md`, a short summary of what's in the batch and whether it shipped as
  a patch or minor bump.
- Rewrite `.specs/bugs-current.md`: keep its own "How this file is used" /
  "Conventions" sections unchanged, list only the carried-forward items.

## 3. Bump the version

Update the `"version"` field in `package.json` **and** `package-lock.json` (both the
top-level `version` and the matching `packages[""].version` entry) to the new version.

Do not run `npm version` — it creates its own commit and tag with a generic message,
and this project always hand-writes a specific commit (step 4) and a lightweight tag
(step 5).

## 4. Commit and merge to main

Stage the bug-tracker rotation and the version bump together in one commit. Match the
existing commit style (see `git log --oneline -10` for recent examples):

    Prepare <version>: bump version, <archive|document> <what shipped>

e.g. `Prepare 0.4.5: bump version, archive B-112, B-113`.

No PR: fast-forward merge this commit into `main` locally, same as every other
release in this repo's history.

## 5. Tag

Create a **lightweight** tag (no `-a`/annotated — every existing tag in this repo is
lightweight) named `v<version>` pointing at the commit from step 4, once it's on
`main`.

## 6. Confirm before pushing

Ask explicitly before pushing anything: pushing the tag triggers
`.github/workflows/release.yml`, which builds the Linux/macOS/Windows matrix and
publishes a **draft** GitHub Release under that tag — real CI usage and a public
(if draft) artifact, not a no-op. Only push after an explicit yes. Push `main` and the
tag together, e.g. `git push origin main v<version>`.

## 7. Hand back release notes

Draft the release-notes body for the owner to paste into the GitHub draft release (CI
creates it with empty notes). Format:

    ## Chronicle X.Y.Z

    **New**
    - ...

    **Fixed**
    - ...

Rules for the text:

- User-facing language: describe the symptom and the behavior change, not the
  implementation. Call out a relevant Settings toggle if one was added.
- Only include the sections that apply (`**New**`, `**Fixed**`, `**Changed**` — omit
  empty ones).
- Source content from the `bug-history/v<version>.md` file just written and any
  `D-NNN` decisions dated this release — not from raw commit messages.
- Skip anything purely internal (refactors, spec cleanup, test-only changes) — these
  notes are for the owner's own tracking/announcement, not a commit log.

---

Once pushed, this skill's job is done. Note: `CLAUDE.md`'s "Current state of the
repository" section and `.specs/roadmap.md`'s "Release status" section traditionally
also get a narrative paragraph per release (what shipped, why, what broke and got
caught live). This skill does not write that automatically — it takes judgment about
what's worth narrating. Do it as a separate pass afterward if the release has a story
worth capturing (it usually does).
