export interface Channel {
  channelId: string
  title: string
  thumbnailUrl: string | null
  // YouTube's subscription resource id — distinct from channelId, needed for
  // subscriptions.delete (B-010). Only populated when sourced from
  // subscriptions.list; undefined for fixtures/externally-opened channels.
  subscriptionId?: string | null
}

export interface Video {
  videoId: string
  channelId: string
  title: string
  publishedAt: string // ISO-8601 UTC; the feed sort key (feed.md §Ordering)
  durationSeconds: number | null // null until hydrated (D-007)
  thumbnailUrl: string | null
  viewCount: number | null // captured at hydration; displayed only by setting (D-018)
  // Confirmed via the D-028 detection pipeline; false until confirmed true.
  // Shown in the feed (tagged) or hidden by setting (B-028, supersedes the
  // former unconditional exclusion).
  isShort: boolean
  // Captured at hydration from snippet.liveBroadcastContent; 'none' for a
  // normal upload. Not persisted until hydration runs, so it lags RSS
  // discovery like duration/view count do.
  liveContent: 'none' | 'live' | 'upcoming'
}
