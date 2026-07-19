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
  // B-114: sticky — true forever once liveContent was ever observed as
  // 'live', even after it reverts to 'none' post-broadcast. The only way to
  // tell an ended livestream apart from a video that was never live, for the
  // feed's "was Live" badge.
  wasLive: boolean
  // B-115: best-effort, unverified signal that a currently-'live' video is
  // actually a Premiere (pre-recorded, played on a schedule) rather than a
  // genuine live broadcast — see HydratedVideo.isPremiere for the heuristic.
  // Not sticky: only meaningful while liveContent is still 'live'.
  isPremiere: boolean
  // D-053: liveStreamingDetails.actualEndTime, captured the first hydration
  // cycle that observes the broadcast has ended (liveContent has already
  // reverted to 'none' by then). Sticky, like wasLive — null if never live,
  // or if it's still live/hasn't been re-hydrated since ending yet. Feeds
  // the feed's ordering fix: an ended broadcast sorts by when it wrapped,
  // not by its original (older) publishedAt (feed.md §Ordering).
  liveEndedAt: string | null
}
