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
  // discovery like duration/view count do. Re-hydrated every cycle while
  // 'upcoming' or 'live' (B-085/B-114) — reverts to 'none' once a broadcast
  // ends, same as a normal upload.
  liveContent: 'none' | 'live' | 'upcoming'
  // liveStreamingDetails.actualStartTime — when a live broadcast or a
  // Premiere actually started airing. Not sticky: re-read every hydration
  // cycle like duration/title, and only meaningful while liveContent is
  // still 'live' (feed.md §Feed item presentation's "Started X ago" label);
  // ignored once a broadcast ends, when liveEndedAt takes over instead.
  liveStartedAt: string | null
  // liveStreamingDetails.actualEndTime, captured the first hydration cycle
  // that observes the broadcast has ended (liveContent has already reverted
  // to 'none' by then). Sticky — null if never live, still live, or a
  // Premiere (never captured for one — see isPremiere below). Feeds the
  // feed's ordering: an ended broadcast sorts by when it wrapped, not its
  // original (older) publishedAt (feed.md §Ordering).
  liveEndedAt: string | null
  // Sticky — true forever once this was ever observed airing as a Premiere
  // (liveContent === 'live' with status.uploadStatus === 'processed').
  // Only ever set while liveContent === 'live'; a Premiere and a genuine
  // broadcast are indistinguishable in every other state (upcoming, or
  // already ended before Chronicle ever saw it live), so this stays false in
  // those cases. Drives the feed treating a finished Premiere as a plain
  // video (publishedAt sort, no badge) instead of a livestream-wrap sort.
  isPremiere: boolean
}
