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
}

export const IpcChannel = {
  getFeed: 'feed:get',
  getFeedMeta: 'feed:meta',
  setReadStatus: 'state:setReadStatus',
  toggleFavorite: 'state:toggleFavorite',
  toggleWatchLater: 'state:toggleWatchLater',
  openInBrowser: 'system:openInBrowser'
} as const

// The surface preload exposes as window.chronicle.
export interface ChronicleApi {
  getFeed(view: FeedViewDto, cursor: FeedCursorDto | null): Promise<FeedSliceDto>
  getFeedMeta(): Promise<FeedMetaDto>
  setReadStatus(videoId: string, status: ReadStatusDto): Promise<VideoStateDto>
  toggleFavorite(videoId: string): Promise<VideoStateDto>
  toggleWatchLater(videoId: string): Promise<VideoStateDto>
  // Per-video escape hatch (ui.md `b`); the backend builds the URL.
  openInBrowser(videoId: string): Promise<void>
}
