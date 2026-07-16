import { readFileSync, writeFileSync } from 'node:fs'
import { MINIPLAYER_MAX_WIDTH, MINIPLAYER_MIN_WIDTH, PLAYBACK_RATES } from '../ipc/contract'

// settings.json — non-sensitive preferences, human-readable/editable on
// purpose (local-data.md §Locations). Read at startup; a malformed file
// yields defaults plus a non-blocking warning — never a crash on
// user-edited config.

export interface AppSettings {
  theme: 'system' | 'dark' | 'light'
  // B-007: file-explorer-style item size, shared by list rows and grid cards.
  // Supersedes the old two-step "density" (comfortable/compact). Six steps
  // as of the B-037/B-095 follow-ups (D-037).
  itemSize: 'xs' | 'small' | 'medium' | 'large' | 'xl' | 'xxl'
  // B-007: list rows vs. a thumbnail grid, same data either way.
  layout: 'list' | 'grid'
  // Background refresh interval (D-016). 0 = manual only.
  refreshMinutes: number
  // B-029: shown by default (revisits D-018's "hidden by default").
  showViewCounts: boolean
  // B-028: shown by default, tagged with a badge (supersedes D-028's
  // unconditional exclusion).
  showShorts: boolean
  // D-038: the player loads already set to this speed instead of always 1x.
  defaultPlaybackRate: number
  // D-026: background check against GitHub's public Releases API. Notice
  // only — never auto-downloads/installs.
  checkForUpdates: boolean
  // B-045: the docked miniplayer's width, drag-resized from its own corner
  // handle (MiniPlayerBar) and persisted rather than reset every launch.
  miniplayerWidth: number
  // D-050: three independent toggles, all default off — none gates any
  // other. autoStart launches on OS login; backgroundMode keeps the app
  // alive in the tray after the window closes (which extends *when* a sync
  // can happen, not whether notifications are allowed); notifyNewVideos
  // fires an OS notification from any sync, whenever the process happens to
  // be running at all (open window or tray-resident).
  autoStart: boolean
  backgroundMode: boolean
  notifyNewVideos: boolean
  // 'all' ignores the per-channel notify flag entirely (everyone notifies);
  // 'selected' respects it. Switching between the two never touches the
  // flag itself (ChannelDto.notify) — it's just ignored while inactive, so
  // the per-channel configuration survives round-trips between modes.
  notifyScope: 'all' | 'selected'
  // Convenience: favoriting/unfavoriting a channel also sets its notify flag
  // to match, unless the user has manually changed it since. A one-shot
  // nudge at the moment of the favorite toggle, not a persistent binding.
  autoNotifyFavorites: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  itemSize: 'medium',
  layout: 'list',
  refreshMinutes: 30,
  showViewCounts: true,
  showShorts: true,
  defaultPlaybackRate: 1,
  checkForUpdates: true,
  miniplayerWidth: 360,
  autoStart: false,
  backgroundMode: false,
  notifyNewVideos: false,
  notifyScope: 'all',
  autoNotifyFavorites: false
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
  const rate = source['defaultPlaybackRate']
  const checkForUpdates = source['checkForUpdates']
  const miniplayerWidth = source['miniplayerWidth']
  const autoStart = source['autoStart']
  const backgroundMode = source['backgroundMode']
  const notifyNewVideos = source['notifyNewVideos']
  const notifyScope = source['notifyScope']
  const autoNotifyFavorites = source['autoNotifyFavorites']
  return {
    theme: theme === 'dark' || theme === 'light' || theme === 'system' ? theme : DEFAULT_SETTINGS.theme,
    itemSize:
      itemSize === 'xs' ||
      itemSize === 'small' ||
      itemSize === 'medium' ||
      itemSize === 'large' ||
      itemSize === 'xl' ||
      itemSize === 'xxl'
        ? itemSize
        : DEFAULT_SETTINGS.itemSize,
    layout: layout === 'list' || layout === 'grid' ? layout : DEFAULT_SETTINGS.layout,
    refreshMinutes:
      typeof refresh === 'number' && Number.isInteger(refresh) && refresh >= 0 && refresh <= 24 * 60
        ? refresh
        : DEFAULT_SETTINGS.refreshMinutes,
    showViewCounts: typeof views === 'boolean' ? views : DEFAULT_SETTINGS.showViewCounts,
    showShorts: typeof shorts === 'boolean' ? shorts : DEFAULT_SETTINGS.showShorts,
    defaultPlaybackRate:
      typeof rate === 'number' && (PLAYBACK_RATES as readonly number[]).includes(rate)
        ? rate
        : DEFAULT_SETTINGS.defaultPlaybackRate,
    checkForUpdates:
      typeof checkForUpdates === 'boolean' ? checkForUpdates : DEFAULT_SETTINGS.checkForUpdates,
    miniplayerWidth:
      typeof miniplayerWidth === 'number' &&
      Number.isFinite(miniplayerWidth) &&
      miniplayerWidth >= MINIPLAYER_MIN_WIDTH &&
      miniplayerWidth <= MINIPLAYER_MAX_WIDTH
        ? miniplayerWidth
        : DEFAULT_SETTINGS.miniplayerWidth,
    autoStart: typeof autoStart === 'boolean' ? autoStart : DEFAULT_SETTINGS.autoStart,
    backgroundMode:
      typeof backgroundMode === 'boolean' ? backgroundMode : DEFAULT_SETTINGS.backgroundMode,
    notifyNewVideos:
      typeof notifyNewVideos === 'boolean' ? notifyNewVideos : DEFAULT_SETTINGS.notifyNewVideos,
    notifyScope:
      notifyScope === 'all' || notifyScope === 'selected' ? notifyScope : DEFAULT_SETTINGS.notifyScope,
    autoNotifyFavorites:
      typeof autoNotifyFavorites === 'boolean'
        ? autoNotifyFavorites
        : DEFAULT_SETTINGS.autoNotifyFavorites
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
