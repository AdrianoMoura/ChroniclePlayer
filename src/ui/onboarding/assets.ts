// Screenshot asset pipeline (onboarding.md §Screenshots pipeline).
//
// To add/refresh a step screenshot:
//   1. Walk the step against the live Google console (default console theme).
//   2. Capture, annotate the click target (single accent outline + arrow,
//      style per ui.md), save as PNG in this folder.
//   3. Import it below with today's date as verifiedOn.
//
// The release checklist (roadmap.md) re-walks the wizard before every
// release and refreshes stale entries. Steps without an asset render a
// "screenshot pending" placeholder — the textual guidance must always be
// sufficient on its own.

export type WizardStepId =
  | 'welcome'
  | 'project'
  | 'enable-api'
  | 'consent'
  | 'test-user'
  | 'publish'
  | 'client'
  | 'import'
  | 'connect'

export interface StepAsset {
  src: string
  verifiedOn: string // YYYY-MM-DD, shown under the image
  alt: string
}

export const STEP_ASSETS: Partial<Record<WizardStepId, StepAsset>> = {
  // No captures yet — the console walkthrough was completed 2026-07-11
  // (docs/setup.md) but not photographed. Capture before the M5 release.
}
