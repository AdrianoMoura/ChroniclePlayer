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
      checkForUpdates: false,
      miniplayerWidth: 420,
      autoStart: true,
      backgroundMode: true,
      startMinimized: true,
      notifyNewVideos: true,
      notifyScope: 'selected',
      autoNotifyFavorites: true,
      popOutOnClose: false
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
        checkForUpdates: 'yes',
        miniplayerWidth: 10000,
        autoStart: 'yes',
        backgroundMode: 1,
        startMinimized: 'yes',
        notifyNewVideos: null,
        notifyScope: 'everything',
        autoNotifyFavorites: 'yes',
        popOutOnClose: 'yes'
      })
    ).toEqual({
      theme: 'light',
      itemSize: 'medium',
      layout: 'list',
      refreshMinutes: 30,
      showViewCounts: true,
      showShorts: false,
      defaultPlaybackRate: 1,
      checkForUpdates: true,
      miniplayerWidth: 360,
      autoStart: false,
      backgroundMode: false,
      startMinimized: false,
      notifyNewVideos: false,
      notifyScope: 'all',
      autoNotifyFavorites: false,
      popOutOnClose: true
    })
  })

  it('accepts popOutOnClose=false (D-051)', () => {
    expect(normalizeSettings({ popOutOnClose: false }).popOutOnClose).toBe(false)
    expect(normalizeSettings({}).popOutOnClose).toBe(true)
  })

  it('accepts the D-050 toggles + notify scope (all|selected only, D-050 redesign)', () => {
    expect(
      normalizeSettings({
        autoStart: true,
        backgroundMode: true,
        startMinimized: true,
        notifyNewVideos: true,
        notifyScope: 'selected',
        autoNotifyFavorites: true
      })
    ).toEqual(
      expect.objectContaining({
        autoStart: true,
        backgroundMode: true,
        startMinimized: true,
        notifyNewVideos: true,
        notifyScope: 'selected',
        autoNotifyFavorites: true
      })
    )
    // 'favorites'/'custom' no longer exist as scopes — fall back to 'all'.
    expect(normalizeSettings({ notifyScope: 'favorites' }).notifyScope).toBe('all')
    expect(normalizeSettings({ notifyScope: 'custom' }).notifyScope).toBe('all')
  })

  it('accepts checkForUpdates=false (D-026)', () => {
    expect(normalizeSettings({ checkForUpdates: false }).checkForUpdates).toBe(false)
  })

  it('accepts 0 as manual-only refresh', () => {
    expect(normalizeSettings({ refreshMinutes: 0 }).refreshMinutes).toBe(0)
  })

  it('accepts all six item-size steps (D-037)', () => {
    for (const itemSize of ['xs', 'small', 'medium', 'large', 'xl', 'xxl']) {
      expect(normalizeSettings({ itemSize }).itemSize).toBe(itemSize)
    }
  })

  it('accepts all playback rates (D-038)', () => {
    for (const rate of PLAYBACK_RATES) {
      expect(normalizeSettings({ defaultPlaybackRate: rate }).defaultPlaybackRate).toBe(rate)
    }
  })

  it('accepts a miniplayer width within range and falls back outside it (B-045)', () => {
    expect(normalizeSettings({ miniplayerWidth: 500 }).miniplayerWidth).toBe(500)
    expect(normalizeSettings({ miniplayerWidth: 1024 }).miniplayerWidth).toBe(1024)
    expect(normalizeSettings({ miniplayerWidth: 100 }).miniplayerWidth).toBe(360)
    expect(normalizeSettings({ miniplayerWidth: 2000 }).miniplayerWidth).toBe(360)
    expect(normalizeSettings({ miniplayerWidth: 'wide' }).miniplayerWidth).toBe(360)
  })
})
