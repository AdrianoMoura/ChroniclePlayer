// Ports implemented by adapters (architecture.md §Core ports). core/ defines
// the interfaces; it never imports an implementation.

import type { FeedEntry } from './feed'
import type { FeedView } from './views'
import type { ReadStatus, VideoState } from './state'
import type { Channel, Video } from './video'

export interface Clock {
  now(): Date
}

// Keyset cursor for continuous scroll over the local archive (D-027). The
// triple mirrors the feed ordering exactly (published desc, channel title,
// videoId) so pages never skip or duplicate tied rows.
export interface FeedCursor {
  publishedAt: string
  channelTitle: string
  videoId: string
}

export interface FeedPage {
  entries: FeedEntry[]
  nextCursor: FeedCursor | null
}

export interface FeedRepository {
  listPage(view: FeedView, cursor: FeedCursor | null, limit: number): FeedPage
  // Watch Later is an ordered queue, not a chronological view (feed.md).
  listWatchLaterQueue(): FeedEntry[]
  countUnread(): number
  // Unread within the recent window (feeds the caught-up state).
  countUnreadSince(publishedAtIso: string): number
}

export interface StateRepository {
  get(videoId: string): VideoState
  setReadStatus(videoId: string, status: ReadStatus): VideoState
  toggleFavorite(videoId: string): VideoState
  toggleWatchLater(videoId: string): VideoState
}

// Catalog writes; M1 uses them for fixtures, M2 for real sync.
export interface CatalogRepository {
  upsertChannel(channel: Channel): void
  upsertVideo(video: Video, fetchedAt: string): void
  countVideos(): number
}
