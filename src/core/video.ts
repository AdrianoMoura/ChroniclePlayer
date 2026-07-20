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
  // Shown in the feed (tagged) or hidden by setting (B-028).
  isShort: boolean
  // Captured at hydration from snippet.liveBroadcastContent; 'none' for a
  // normal upload. Lags RSS discovery like duration/view count until
  // hydrated. Re-hydrated every cycle while 'upcoming' or 'live' (B-085, B-114).
  liveContent: 'none' | 'live' | 'upcoming'
  // liveStreamingDetails.actualStartTime — when a live broadcast or Premiere
  // actually started. Not sticky, re-read every cycle; only meaningful while
  // liveContent is still 'live' (feed's "Started X ago" label).
  liveStartedAt: string | null
  // liveStreamingDetails.actualEndTime, captured once the broadcast is
  // observed ended. Sticky; null if never live, still live, or a Premiere
  // (see isPremiere). Drives feed ordering: an ended broadcast sorts by when
  // it wrapped, not its original publishedAt (feed.md §Ordering).
  liveEndedAt: string | null
  // Sticky — true once observed airing as a Premiere (liveContent === 'live'
  // with status.uploadStatus === 'processed'); only ever set in that state,
  // so a Premiere never seen live stays false. Drives the feed to treat a
  // finished Premiere as a plain video (publishedAt sort), not a livestream wrap.
  isPremiere: boolean
}
