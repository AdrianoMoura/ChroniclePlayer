import { describe, expect, it } from 'vitest'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PLAYBACK_RATES } from '../ipc/contract'
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
    const custom = {
      theme: 'light',
      itemSize: 'small',
      layout: 'grid',
      refreshMinutes: 15,
      showViewCounts: true,
      showShorts: false,
      defaultPlaybackRate: 1.5,
      checkForUpdates: false
    } as const
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
      normalizeSettings({
        theme: 'light',
        itemSize: 'huge',
        layout: 'masonry',
        refreshMinutes: -5,
        showViewCounts: true,
        showShorts: false,
        defaultPlaybackRate: 3,
        checkForUpdates: 'yes'
      })
    ).toEqual({
      theme: 'light',
      itemSize: 'medium',
      layout: 'list',
      refreshMinutes: 30,
      showViewCounts: true,
      showShorts: false,
      defaultPlaybackRate: 1,
      checkForUpdates: true
    })
  })

  it('accepts checkForUpdates=false (D-026)', () => {
    expect(normalizeSettings({ checkForUpdates: false }).checkForUpdates).toBe(false)
  })

  it('accepts 0 as manual-only refresh', () => {
    expect(normalizeSettings({ refreshMinutes: 0 }).refreshMinutes).toBe(0)
  })

  it('accepts all five item-size steps (D-037)', () => {
    for (const itemSize of ['xs', 'small', 'medium', 'large', 'xl']) {
      expect(normalizeSettings({ itemSize }).itemSize).toBe(itemSize)
    }
  })

  it('accepts all playback rates (D-038)', () => {
    for (const rate of PLAYBACK_RATES) {
      expect(normalizeSettings({ defaultPlaybackRate: rate }).defaultPlaybackRate).toBe(rate)
    }
  })
})
