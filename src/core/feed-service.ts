import { bucketOf, recentWindowStart, type FeedBucket, type FeedEntry } from './feed'
import type { Clock, FeedCursor, FeedRepository } from './ports'
import type { FeedView } from './views'

export interface FeedItem {
  entry: FeedEntry
  // null in the watch-later queue, which is ordered by position, not date.
  bucket: FeedBucket | null
}

export interface FeedSlice {
  view: FeedView
  items: FeedItem[]
  nextCursor: FeedCursor | null
  unreadCount: number
  caughtUp: boolean
}

export const FEED_PAGE_SIZE = 50 // D-027 default page

// The read path (architecture.md): repository → grouping → read-model.
// Items come flat, each carrying its bucket; presentation renders a header
// whenever the bucket changes, so pages concatenate without regrouping.
export class FeedService {
  constructor(
    private readonly repository: FeedRepository,
    private readonly clock: Clock
  ) {}

  getSlice(
    view: FeedView,
    cursor: FeedCursor | null,
    limit = FEED_PAGE_SIZE,
    channelId?: string
  ): FeedSlice {
    const now = this.clock.now()
    const items =
      view === 'watch-later'
        ? this.repository.listWatchLaterQueue().map((entry) => ({ entry, bucket: null }))
        : null

    const page = items ? null : this.repository.listPage(view, cursor, limit, channelId)

    return {
      view,
      items:
        items ??
        (page?.entries ?? []).map((entry) => ({
          entry,
          bucket: bucketOf(new Date(entry.video.publishedAt), now)
        })),
      nextCursor: page?.nextCursor ?? null,
      unreadCount: this.repository.countUnread(),
      caughtUp: this.repository.countUnreadSince(recentWindowStart(now).toISOString()) === 0
    }
  }
}
