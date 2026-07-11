// Typed IPC contract between the backend (platform/) and the renderer (ui/).
// architecture.md §Dependency rule: ui/ imports only from this module; this
// module imports from no other layer. Feed reads cross this boundary as
// read-model DTOs — grouping happens in core/, never in the UI.

export type FeedBucketDto = 'today' | 'yesterday' | 'this-week' | 'earlier'

export interface FeedVideoDto {
  videoId: string
  title: string
  channelTitle: string
  publishedAt: string // ISO-8601 UTC
  durationSeconds: number | null
  thumbnailUrl: string | null
}

export interface FeedGroupDto {
  bucket: FeedBucketDto
  videos: FeedVideoDto[]
}

export interface FeedDto {
  groups: FeedGroupDto[]
}

export const IpcChannel = {
  getFeed: 'feed:get'
} as const

// The surface preload exposes as window.chronicle.
export interface ChronicleApi {
  getFeed(): Promise<FeedDto>
}
