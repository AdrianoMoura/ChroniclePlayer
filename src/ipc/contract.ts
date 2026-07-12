// Typed IPC contract between the backend (platform/) and the renderer (ui/).
// architecture.md §Dependency rule: ui/ imports only from this module; this
// module imports from no other layer. Feed reads cross this boundary as
// read-model DTOs — grouping/bucketing happens in core/, never in the UI.

export type FeedViewDto = 'all' | 'unread' | 'favorites' | 'watch-later' | 'ignored'
export type FeedBucketDto = 'today' | 'yesterday' | 'this-week' | 'earlier'
export type ReadStatusDto = 'unread' | 'read' | 'ignored'

export interface VideoStateDto {
  readStatus: ReadStatusDto
  favorite: boolean
  watchLater: boolean
}

export interface FeedVideoDto {
  videoId: string
  title: string
  channelTitle: string
  publishedAt: string // ISO-8601 UTC
  durationSeconds: number | null
  thumbnailUrl: string | null
  // Shown only when the setting enables it (D-018: hidden by default).
  viewCount: number | null
  // Confirmed Short (B-028, supersedes D-028's unconditional exclusion):
  // shown in the feed, tagged with a badge, hideable via SettingsDto.showShorts.
  isShort: boolean
  state: VideoStateDto
  // Assigned by core; null in the watch-later queue (ordered by position).
  // The UI renders a header whenever the bucket changes between rows, so
  // pages concatenate without any regrouping on the renderer side.
  bucket: FeedBucketDto | null
}

export interface FeedCursorDto {
  publishedAt: string
  channelTitle: string
  videoId: string
}

export interface FeedSliceDto {
  view: FeedViewDto
  videos: FeedVideoDto[]
  // Continuous scroll over the local archive (D-027): pass back to getFeed
  // to load the next page. null = the archive end (or a non-paged view).
  nextCursor: FeedCursorDto | null
  unreadCount: number
  caughtUp: boolean
}

export interface FeedMetaDto {
  unreadCount: number
  caughtUp: boolean
  lastRefreshAt: string | null
  // Watch Later queue size for the sidebar badge (B-025).
  watchLaterCount: number
  // True while a sync is running, so a renderer that mounts (or reloads)
  // mid-sync can adopt the in-flight state instead of relying only on
  // events it may have missed (B-023).
  refreshing: boolean
}

export interface ChannelDto {
  channelId: string
  title: string
  thumbnailUrl: string | null
  // Unread videos for the sidebar badge (B-008); Shorts count unless hidden
  // by the showShorts setting (B-028).
  unreadCount: number
}

// Expected failures cross the boundary as values, not thrown strings
// (architecture.md: errors are values at boundaries).
export type ResultDto<T> =
  | { ok: true; value: T }
  | { ok: false; errorKind: string; message: string }

// Player view read-model (playback.md). Description may be truncated for
// locally stored videos (local-data.md stores ~500 chars).
export interface PlayerVideoDto {
  videoId: string
  title: string
  channelTitle: string
  publishedAt: string
  durationSeconds: number | null
  thumbnailUrl: string | null
  description: string | null
  state: VideoStateDto
}

// Wizard progress (onboarding.md §Design goals: interruptible/resumable).
// Persisted locally in the meta table; email is used only to prefill the
// Test-user step and never leaves the machine.
export interface WizardStateDto {
  step: number
  email: string
  confirmed: Record<string, boolean>
  published: 'yes' | 'skipped' | null
  completed: boolean
}

// Mirrors platform settings.json (human-editable; local-data.md).
export interface SettingsDto {
  theme: 'system' | 'dark' | 'light'
  density: 'comfortable' | 'compact'
  refreshMinutes: number // 0 = manual only (D-016)
  showViewCounts: boolean // D-018
  showShorts: boolean // B-028, default true
}

export type AuthStateDto = 'unconfigured' | 'disconnected' | 'connected'

export interface AuthStatusDto {
  state: AuthStateDto
  // false = D-013 fallback encryption; the UI shows the honest warning.
  secureStorage: boolean
}

export interface SyncReportDto {
  outcome: 'ok' | 'partial' | 'failed' | 'quota'
  channelsPolled: number
  channelsFailed: number
  videosNew: number
  quotaSpent: number
  finishedAt: string
  // Filled when this run re-listed the subscription list (weekly gate or
  // the user-initiated force path, B-021); null otherwise.
  subscriptions: { added: number; removed: number } | null
}

// Backend → UI push (architecture.md §IPC: the UI never polls).
// Every refresh:started is paired with exactly one terminal event:
// refresh:done, refresh:failed, or auth:required (B-023 — a started with
// no terminal event left the spinner running forever).
export type ChronicleEventDto =
  | { type: 'refresh:started'; trigger: 'launch' | 'manual' | 'timer' }
  | { type: 'refresh:progress'; phase: 'channels' | 'shorts'; checked: number; total: number }
  | { type: 'refresh:done'; report: SyncReportDto }
  | { type: 'refresh:failed'; errorKind: string; message: string }
  | { type: 'auth:required' }
  | { type: 'quota:exceeded' }

export const IpcChannel = {
  getFeed: 'feed:get',
  getFeedMeta: 'feed:meta',
  getChannels: 'feed:channels',
  refreshFeed: 'feed:refresh',
  setReadStatus: 'state:setReadStatus',
  markAllRead: 'state:markAllRead',
  toggleFavorite: 'state:toggleFavorite',
  toggleWatchLater: 'state:toggleWatchLater',
  openInBrowser: 'system:openInBrowser',
  openExternalUrl: 'system:openExternalUrl',
  getVideo: 'video:get',
  getAuthStatus: 'auth:status',
  getConnectedChannel: 'auth:whoami',
  getWizardState: 'wizard:get',
  setWizardState: 'wizard:set',
  getSettings: 'settings:get',
  setSettings: 'settings:set',
  exportData: 'data:export',
  deleteAllData: 'data:deleteAll',
  importClientSecret: 'auth:importClientSecret',
  connectGoogle: 'auth:connect',
  signOut: 'auth:signOut',
  windowControl: 'window:control',
  events: 'chronicle:event'
} as const

// Custom window controls for the frameless shell (B-014).
export type WindowControlDto = 'minimize' | 'toggle-maximize' | 'close'

// The surface preload exposes as window.chronicle.
export interface ChronicleApi {
  getFeed(
    view: FeedViewDto,
    cursor: FeedCursorDto | null,
    channelId?: string | null
  ): Promise<FeedSliceDto>
  getFeedMeta(): Promise<FeedMetaDto>
  getChannels(): Promise<ChannelDto[]>
  // channelId scopes the sync to one channel (B-036) — omit/null for the
  // full subscription refresh.
  refreshFeed(channelId?: string | null): Promise<ResultDto<SyncReportDto>>
  setReadStatus(videoId: string, status: ReadStatusDto): Promise<VideoStateDto>
  // Bulk unread → read over the feed or one channel (B-020, D-010
  // semantics). Returns how many videos changed.
  markAllRead(channelId: string | null): Promise<number>
  toggleFavorite(videoId: string): Promise<VideoStateDto>
  toggleWatchLater(videoId: string): Promise<VideoStateDto>
  // Per-video escape hatch (ui.md `b`); the backend builds the URL.
  openInBrowser(videoId: string): Promise<void>
  // Non-video links from descriptions (D-029: browser, always).
  openExternalUrl(url: string): Promise<void>
  // Local videos come from the DB; unknown ones are hydrated on demand
  // (videos.list, 1 unit) and stored outside the feed (D-029).
  getVideo(videoId: string): Promise<ResultDto<PlayerVideoDto>>
  getAuthStatus(): Promise<AuthStatusDto>
  importClientSecret(json: string): Promise<ResultDto<AuthStatusDto>>
  connectGoogle(): Promise<ResultDto<AuthStatusDto>>
  signOut(): Promise<AuthStatusDto>
  // Wizard Step 7 validation: proves the token works and the API is enabled
  // (1 quota unit); failures map back to the responsible step (D-014).
  getConnectedChannel(): Promise<ResultDto<{ title: string }>>
  getWizardState(): Promise<WizardStateDto>
  setWizardState(state: WizardStateDto): Promise<void>
  getSettings(): Promise<{ settings: SettingsDto; warning: string | null }>
  setSettings(settings: SettingsDto): Promise<void>
  // Frameless-shell titlebar (B-014). On macOS the native traffic lights
  // stay, so the custom buttons are hidden there via `platform`.
  windowControl(action: WindowControlDto): Promise<void>
  platform: string
  // Best-effort (Electron doesn't expose the Wayland compositor's
  // xdg_toplevel wm_capabilities, which is how native GTK/Qt apps know to
  // hide controls the compositor won't honor): false hides the Minimize
  // button on compositors known not to support it — scrolling/tiling ones
  // like niri, by the same design stance as sway/i3.
  minimizeSupported: boolean
  // Writes the documented JSON export (FORMAT.md) where the user chooses.
  exportData(): Promise<ResultDto<{ path: string; videos: number; states: number }>>
  // Removes the database, secrets and caches, then relaunches (local-data.md
  // §Privacy invariants). The UI confirms before calling.
  deleteAllData(): Promise<void>
  onEvent(listener: (event: ChronicleEventDto) => void): () => void
}
