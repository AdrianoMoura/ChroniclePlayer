import {
  bucketOf,
  effectiveDate,
  nextWatchLaterAfter,
  recentWindowStart,
  type FeedBucket,
  type FeedEntry
} from './feed'
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
export const PRIORITY_FEED_LIMIT = 20 // B-042, D-039

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
    channelId?: string,
    showShorts = true, // B-028
    accountId?: string // B-003: undefined = combined feed across all accounts
  ): FeedSlice {
    const now = this.clock.now()
    const items =
      view === 'watch-later'
        ? this.repository.listWatchLaterQueue(showShorts).map((entry) => ({ entry, bucket: null }))
        : null

    const page = items
      ? null
      : this.repository.listPage(view, cursor, limit, channelId, showShorts, accountId)

    // D-053: reorders this page's rows for display only — the cursor (D-027)
    // stays keyed on raw publishedAt, since a keyset cursor can't use "now".
    const sortedEntries = [...(page?.entries ?? [])].sort(
      (a, b) => effectiveDate(b.video, now).getTime() - effectiveDate(a.video, now).getTime()
    )

    return {
      view,
      items:
        items ??
        sortedEntries.map((entry) => ({
          entry,
          bucket: bucketOf(effectiveDate(entry.video, now), now)
        })),
      nextCursor: page?.nextCursor ?? null,
      unreadCount: this.repository.countUnread(showShorts, accountId),
      caughtUp:
        this.repository.countUnreadSince(recentWindowStart(now).toISOString(), showShorts, accountId) ===
        0
    }
  }

  // Unread videos from favorited channels — bucket-less, like the
  // watch-later queue, since it sits above the chronological grouping (B-042).
  getPriorityVideos(showShorts = true, accountId?: string): FeedItem[] {
    return this.repository
      .listPriorityVideos(PRIORITY_FEED_LIMIT, showShorts, accountId)
      .map((entry) => ({ entry, bucket: null }))
  }

  // The player's "up next" card on video end (D-055): a suggestion from the
  // user's own Watch Later queue, never algorithmic, never automatic —
  // opening it is always a deliberate click. See `nextWatchLaterAfter`.
  getNextWatchLater(currentVideoId: string, showShorts = true): FeedItem | null {
    const next = nextWatchLaterAfter(this.repository.listWatchLaterQueue(showShorts), currentVideoId)
    return next ? { entry: next, bucket: null } : null
  }
}
