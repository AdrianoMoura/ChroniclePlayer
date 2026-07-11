export interface Channel {
  channelId: string
  title: string
  thumbnailUrl: string | null
}

export interface Video {
  videoId: string
  channelId: string
  title: string
  publishedAt: string // ISO-8601 UTC; the feed sort key (feed.md §Ordering)
  durationSeconds: number | null // null until hydrated (D-007)
  thumbnailUrl: string | null
  viewCount: number | null // captured at hydration; displayed only by setting (D-018)
}
