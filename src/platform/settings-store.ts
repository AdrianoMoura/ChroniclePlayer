import { readFileSync, writeFileSync } from 'node:fs'

// settings.json — non-sensitive preferences, human-readable/editable on
// purpose (local-data.md §Locations). Read at startup; a malformed file
// yields defaults plus a non-blocking warning — never a crash on
// user-edited config.

export interface AppSettings {
  theme: 'system' | 'dark' | 'light'
  density: 'comfortable' | 'compact'
  // Background refresh interval (D-016). 0 = manual only.
  refreshMinutes: number
  // D-018: hidden by default.
  showViewCounts: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  density: 'comfortable',
  refreshMinutes: 30,
  showViewCounts: false
}

// Field-by-field: one bad value falls back alone, the rest survive.
export function normalizeSettings(raw: unknown): AppSettings {
  const source = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  const theme = source['theme']
  const density = source['density']
  const refresh = source['refreshMinutes']
  const views = source['showViewCounts']
  return {
    theme: theme === 'dark' || theme === 'light' || theme === 'system' ? theme : DEFAULT_SETTINGS.theme,
    density: density === 'compact' || density === 'comfortable' ? density : DEFAULT_SETTINGS.density,
    refreshMinutes:
      typeof refresh === 'number' && Number.isInteger(refresh) && refresh >= 0 && refresh <= 24 * 60
        ? refresh
        : DEFAULT_SETTINGS.refreshMinutes,
    showViewCounts: typeof views === 'boolean' ? views : DEFAULT_SETTINGS.showViewCounts
  }
}

export function loadSettings(file: string): { settings: AppSettings; warning: string | null } {
  let text: string
  try {
    text = readFileSync(file, 'utf8')
  } catch {
    return { settings: DEFAULT_SETTINGS, warning: null } // no file yet = defaults, silently
  }
  try {
    return { settings: normalizeSettings(JSON.parse(text)), warning: null }
  } catch {
    return {
      settings: DEFAULT_SETTINGS,
      warning: 'settings.json could not be parsed — using defaults. The file was left untouched.'
    }
  }
}

export function saveSettings(file: string, settings: AppSettings): void {
  writeFileSync(file, JSON.stringify(settings, null, 2) + '\n')
}
