import type { Video } from './video'
import type { VideoState } from './state'

export type FeedBucket = 'today' | 'yesterday' | 'this-week' | 'earlier'

export interface FeedEntry {
  video: Video
  channelTitle: string
  state: VideoState
}

export interface FeedGroup {
  bucket: FeedBucket
  entries: FeedEntry[]
}

const BUCKET_ORDER: readonly FeedBucket[] = ['today', 'yesterday', 'this-week', 'earlier']

// Grouping per feed.md §Grouping: calendar days in the user's local timezone,
// not rolling 24h windows. Groups with zero videos are omitted.
export function groupFeed(entries: readonly FeedEntry[], now: Date): FeedGroup[] {
  const sorted = [...entries].sort(compareFeedOrder)
  const buckets = new Map<FeedBucket, FeedEntry[]>()
  for (const entry of sorted) {
    const bucket = bucketOf(new Date(entry.video.publishedAt), now)
    const group = buckets.get(bucket)
    if (group) {
      group.push(entry)
    } else {
      buckets.set(bucket, [entry])
    }
  }
  return BUCKET_ORDER.flatMap((bucket) => {
    const grouped = buckets.get(bucket)
    return grouped ? [{ bucket, entries: grouped }] : []
  })
}

// feed.md §Ordering: publishedAt descending; ties break by channel title,
// then videoId — deterministic order is part of "predictable".
function compareFeedOrder(a: FeedEntry, b: FeedEntry): number {
  const timeDiff = Date.parse(b.video.publishedAt) - Date.parse(a.video.publishedAt)
  if (timeDiff !== 0) return timeDiff
  if (a.channelTitle !== b.channelTitle) return a.channelTitle < b.channelTitle ? -1 : 1
  return a.video.videoId < b.video.videoId ? -1 : 1
}

export function bucketOf(published: Date, now: Date): FeedBucket {
  const dayDiff = localDayNumber(now) - localDayNumber(published)
  // Future-dated videos (unverified premiere assumption, feed.md §Ordering) sort
  // to the top and land in Today rather than being hidden.
  if (dayDiff <= 0) return 'today'
  if (dayDiff === 1) return 'yesterday'
  const currentWeekMonday = localDayNumber(now) - isoWeekdayIndex(now)
  return localDayNumber(published) >= currentWeekMonday ? 'this-week' : 'earlier'
}

// Days since epoch of the *local* calendar date; immune to DST-length days.
function localDayNumber(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000
}

// D-017 (Pending; recommended option exercised): weeks start on ISO Monday.
function isoWeekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7
}

// feed.md §Unread accounting: a mechanical count, no decay tricks.
export function unreadCount(entries: readonly FeedEntry[]): number {
  return entries.filter((entry) => entry.state.readStatus === 'unread').length
}

// feed.md §Caught up: Today/Yesterday/This Week contain zero unread videos.
// "Earlier" depth never affects it — the archive is not new content (D-027).
export function isCaughtUp(groups: readonly FeedGroup[]): boolean {
  return groups.every(
    (group) => group.bucket === 'earlier' || unreadCount(group.entries) === 0
  )
}

// The instant where "earlier" begins: everything published at or after this
// belongs to today/yesterday/this-week. Start of the ISO week's Monday —
// except Monday itself, when yesterday (Sunday) reaches further back.
export function recentWindowStart(now: Date): Date {
  const daysBack = Math.max(isoWeekdayIndex(now), 1)
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysBack)
}
