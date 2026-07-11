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
}

export interface ChannelDto {
  channelId: string
  title: string
  thumbnailUrl: string | null
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
}

// Backend → UI push (architecture.md §IPC: the UI never polls).
export type ChronicleEventDto =
  | { type: 'refresh:started'; trigger: 'launch' | 'manual' | 'timer' }
  | { type: 'refresh:progress'; phase: 'channels' | 'shorts'; checked: number; total: number }
  | { type: 'refresh:done'; report: SyncReportDto }
  | { type: 'auth:required' }
  | { type: 'quota:exceeded' }

export const IpcChannel = {
  getFeed: 'feed:get',
  getFeedMeta: 'feed:meta',
  getChannels: 'feed:channels',
  refreshFeed: 'feed:refresh',
  setReadStatus: 'state:setReadStatus',
  toggleFavorite: 'state:toggleFavorite',
  toggleWatchLater: 'state:toggleWatchLater',
  openInBrowser: 'system:openInBrowser',
  openExternalUrl: 'system:openExternalUrl',
  getVideo: 'video:get',
  getAuthStatus: 'auth:status',
  importClientSecret: 'auth:importClientSecret',
  connectGoogle: 'auth:connect',
  signOut: 'auth:signOut',
  events: 'chronicle:event'
} as const

// The surface preload exposes as window.chronicle.
export interface ChronicleApi {
  getFeed(
    view: FeedViewDto,
    cursor: FeedCursorDto | null,
    channelId?: string | null
  ): Promise<FeedSliceDto>
  getFeedMeta(): Promise<FeedMetaDto>
  getChannels(): Promise<ChannelDto[]>
  refreshFeed(): Promise<ResultDto<SyncReportDto>>
  setReadStatus(videoId: string, status: ReadStatusDto): Promise<VideoStateDto>
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
  onEvent(listener: (event: ChronicleEventDto) => void): () => void
}
