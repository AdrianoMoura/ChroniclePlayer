import { describe, expect, it } from 'vitest'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DEFAULT_SETTINGS, loadSettings, normalizeSettings, saveSettings } from './settings-store'

function tempFile(content?: string): string {
  const file = join(mkdtempSync(join(tmpdir(), 'chronicle-settings-')), 'settings.json')
  if (content !== undefined) writeFileSync(file, content)
  return file
}

describe('settings store', () => {
  it('returns defaults silently when no file exists', () => {
    expect(loadSettings(tempFile())).toEqual({ settings: DEFAULT_SETTINGS, warning: null })
  })

  it('round-trips saved settings', () => {
    const file = tempFile()
    const custom = { theme: 'light', density: 'compact', refreshMinutes: 15, showViewCounts: true } as const
    saveSettings(file, custom)
    expect(loadSettings(file)).toEqual({ settings: custom, warning: null })
  })

  it('never crashes on a malformed user-edited file — defaults + warning', () => {
    const result = loadSettings(tempFile('{ theme: broken'))
    expect(result.settings).toEqual(DEFAULT_SETTINGS)
    expect(result.warning).toContain('settings.json')
  })

  it('normalizes field-by-field: one bad value falls back alone', () => {
    expect(
      normalizeSettings({ theme: 'light', density: 'huge', refreshMinutes: -5, showViewCounts: true })
    ).toEqual({ theme: 'light', density: 'comfortable', refreshMinutes: 30, showViewCounts: true })
  })

  it('accepts 0 as manual-only refresh', () => {
    expect(normalizeSettings({ refreshMinutes: 0 }).refreshMinutes).toBe(0)
  })
})
