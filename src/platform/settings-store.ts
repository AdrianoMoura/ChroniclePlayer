import { readFileSync, writeFileSync } from 'node:fs'

// settings.json — non-sensitive preferences, human-readable/editable on
// purpose (local-data.md §Locations). Read at startup; a malformed file
// yields defaults plus a non-blocking warning — never a crash on
// user-edited config.

export interface AppSettings {
  theme: 'system' | 'dark' | 'light'
  // B-007: file-explorer-style item size, shared by list rows and grid cards.
  // Supersedes the old two-step "density" (comfortable/compact). Five steps
  // as of the B-037 follow-up (D-037).
  itemSize: 'xs' | 'small' | 'medium' | 'large' | 'xl'
  // B-007: list rows vs. a thumbnail grid, same data either way.
  layout: 'list' | 'grid'
  // Background refresh interval (D-016). 0 = manual only.
  refreshMinutes: number
  // B-029: shown by default (revisits D-018's "hidden by default").
  showViewCounts: boolean
  // B-028: shown by default, tagged with a badge (supersedes D-028's
  // unconditional exclusion).
  showShorts: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  itemSize: 'medium',
  layout: 'list',
  refreshMinutes: 30,
  showViewCounts: true,
  showShorts: true
}

// Field-by-field: one bad value falls back alone, the rest survive.
export function normalizeSettings(raw: unknown): AppSettings {
  const source = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  const theme = source['theme']
  const itemSize = source['itemSize']
  const layout = source['layout']
  const refresh = source['refreshMinutes']
  const views = source['showViewCounts']
  const shorts = source['showShorts']
  return {
    theme: theme === 'dark' || theme === 'light' || theme === 'system' ? theme : DEFAULT_SETTINGS.theme,
    itemSize:
      itemSize === 'xs' ||
      itemSize === 'small' ||
      itemSize === 'medium' ||
      itemSize === 'large' ||
      itemSize === 'xl'
        ? itemSize
        : DEFAULT_SETTINGS.itemSize,
    layout: layout === 'list' || layout === 'grid' ? layout : DEFAULT_SETTINGS.layout,
    refreshMinutes:
      typeof refresh === 'number' && Number.isInteger(refresh) && refresh >= 0 && refresh <= 24 * 60
        ? refresh
        : DEFAULT_SETTINGS.refreshMinutes,
    showViewCounts: typeof views === 'boolean' ? views : DEFAULT_SETTINGS.showViewCounts,
    showShorts: typeof shorts === 'boolean' ? shorts : DEFAULT_SETTINGS.showShorts
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
