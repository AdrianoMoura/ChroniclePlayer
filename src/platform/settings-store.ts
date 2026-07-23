import { readFileSync, writeFileSync } from 'node:fs'
import { MINIPLAYER_MAX_WIDTH, MINIPLAYER_MIN_WIDTH, PLAYBACK_RATES } from '../ipc/contract'

// settings.json — non-sensitive preferences, human-readable/editable on
// purpose (local-data.md §Locations). Read at startup; a malformed file
// yields defaults plus a non-blocking warning — never a crash on
// user-edited config.

export interface AppSettings {
  // D-054. 'system' resolves to the OS locale at runtime (ui/i18n); any
  // other value is a locale code (e.g. 'pt-BR'). Not validated against the
  // set of shipped locales here — that's a renderer concern (ui/i18n falls
  // back to English for an unrecognized code), keeping this layer decoupled
  // from which translations happen to exist.
  language: string
  theme: 'system' | 'dark' | 'light'
  // File-explorer-style item size, shared by list rows and grid cards; six
  // steps (D-037).
  itemSize: 'xs' | 'small' | 'medium' | 'large' | 'xl' | 'xxl'
  // List rows vs. a thumbnail grid, same data either way.
  layout: 'list' | 'grid'
  // Background refresh interval (D-016). 0 = manual only.
  refreshMinutes: number
  showViewCounts: boolean
  // Shown by default, tagged with a badge.
  showShorts: boolean
  // The player loads already set to this speed instead of always 1x (D-038).
  defaultPlaybackRate: number
  // Background check against GitHub's public Releases API. Notice only —
  // never auto-downloads/installs (D-026).
  checkForUpdates: boolean
  // The docked miniplayer's width, drag-resized from its own corner handle
  // (MiniPlayerBar) and persisted rather than reset every launch.
  miniplayerWidth: number
  // Three independent toggles, all default off — none gates any other
  // (D-050). autoStart launches on OS login; backgroundMode keeps the app
  // alive in the tray after the window closes (extends *when* a sync can
  // happen, not whether notifications are allowed); notifyNewVideos fires an
  // OS notification from any sync while the process is running at all (open
  // window or tray-resident).
  autoStart: boolean
  backgroundMode: boolean
  // Only takes effect when autoStart and backgroundMode are both also on —
  // an autostart launch with nowhere to go back to (no tray) would leave a
  // fully unreachable process. Has no effect on a manual launch regardless.
  startMinimized: boolean
  notifyNewVideos: boolean
  // 'all' ignores the per-channel notify flag entirely (everyone notifies);
  // 'selected' respects it. Switching between the two never touches the flag
  // itself (ChannelDto.notify), so per-channel configuration survives
  // round-trips between modes.
  notifyScope: 'all' | 'selected'
  // A Short hidden from the feed (showShorts off) never notifies regardless
  // of this flag — it only decides whether Shorts that *are* shown in the
  // feed also trigger a notification. Default true; shown in Settings only
  // while showShorts is also on (D-052).
  notifyShorts: boolean
  // Convenience: favoriting/unfavoriting a channel also sets its notify flag
  // to match, unless the user has manually changed it since. A one-shot
  // nudge at the moment of the favorite toggle, not a persistent binding.
  autoNotifyFavorites: boolean
  // Only meaningful when backgroundMode is on. True (default) pops the video
  // into the always-on-top extract window on window close (same as `p`), so
  // closing *that* window is what actually stops it; false pauses the video
  // on close instead of popping it out (D-051).
  popOutOnClose: boolean
  // Default off. True: opening a video currently in the Watch Later queue
  // removes it from the queue right away, same effect as manually untoggling
  // it (D-057).
  watchLaterAutoRemove: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'system',
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
  startMinimized: false,
  notifyNewVideos: false,
  notifyScope: 'all',
  notifyShorts: true,
  autoNotifyFavorites: false,
  popOutOnClose: true,
  watchLaterAutoRemove: false
}

// Field-by-field: one bad value falls back alone, the rest survive.
export function normalizeSettings(raw: unknown): AppSettings {
  const source = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  const language = source['language']
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
  const startMinimized = source['startMinimized']
  const notifyNewVideos = source['notifyNewVideos']
  const notifyScope = source['notifyScope']
  const notifyShorts = source['notifyShorts']
  const autoNotifyFavorites = source['autoNotifyFavorites']
  const popOutOnClose = source['popOutOnClose']
  const watchLaterAutoRemove = source['watchLaterAutoRemove']
  return {
    language: typeof language === 'string' && language.length > 0 ? language : DEFAULT_SETTINGS.language,
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
    startMinimized:
      typeof startMinimized === 'boolean' ? startMinimized : DEFAULT_SETTINGS.startMinimized,
    notifyNewVideos:
      typeof notifyNewVideos === 'boolean' ? notifyNewVideos : DEFAULT_SETTINGS.notifyNewVideos,
    notifyScope:
      notifyScope === 'all' || notifyScope === 'selected' ? notifyScope : DEFAULT_SETTINGS.notifyScope,
    notifyShorts: typeof notifyShorts === 'boolean' ? notifyShorts : DEFAULT_SETTINGS.notifyShorts,
    autoNotifyFavorites:
      typeof autoNotifyFavorites === 'boolean'
        ? autoNotifyFavorites
        : DEFAULT_SETTINGS.autoNotifyFavorites,
    popOutOnClose:
      typeof popOutOnClose === 'boolean' ? popOutOnClose : DEFAULT_SETTINGS.popOutOnClose,
    watchLaterAutoRemove:
      typeof watchLaterAutoRemove === 'boolean'
        ? watchLaterAutoRemove
        : DEFAULT_SETTINGS.watchLaterAutoRemove
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
