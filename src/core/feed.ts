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
  const sorted = [...entries].sort((a, b) => compareFeedOrder(a, b, now))
  const buckets = new Map<FeedBucket, FeedEntry[]>()
  for (const entry of sorted) {
    const bucket = bucketOf(effectiveDate(entry.video, now), now)
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

// feed.md §Ordering: effectiveDate descending (D-053) — publishedAt for
// everything that was never live; ties break by channel title, then
// videoId — deterministic order is part of "predictable".
function compareFeedOrder(a: FeedEntry, b: FeedEntry, now: Date): number {
  const timeDiff = effectiveDate(b.video, now).getTime() - effectiveDate(a.video, now).getTime()
  if (timeDiff !== 0) return timeDiff
  if (a.channelTitle !== b.channelTitle) return a.channelTitle < b.channelTitle ? -1 : 1
  return a.video.videoId < b.video.videoId ? -1 : 1
}

// D-053: the single timestamp that drives both which date bucket a video
// lands in AND its sort position — publishedAt for anything that was never
// live; `now` while a broadcast is genuinely live (so it always sorts to
// the top of "today", however long ago it actually started, since it's
// still happening); liveEndedAt once a broadcast has ended (so a stream
// that crossed midnight, e.g. started 20:00 and ended 02:00, now shows
// under the date it actually wrapped, not the date it started). Bucket and
// sort order deliberately share this one value, never two different
// timestamps — otherwise an entry could "jump" a bucket boundary in sort
// order without its header landing at the right point, since neither
// groupFeed's Map-based grouping nor feed-service.ts's flat "insert a
// header whenever the bucket changes" read model has a separate pass that
// would catch that.
export function effectiveDate(video: Video, now: Date): Date {
  // A Premiere sorts like a plain video always (publishedAt, below), never
  // "now" — it's a synchronized watch-along of an already-recorded video,
  // not an open-ended broadcast. liveEndedAt is never captured for one
  // either (sync-repository.ts), so it falls through to publishedAt on its
  // own once it ends.
  if (video.liveContent === 'live' && !video.isPremiere) return now
  if (video.liveEndedAt) {
    // liveEndedAt isn't always after publishedAt (some channels publish a
    // VOD's listing well after the stream actually ended) — never let it
    // push effectiveDate earlier than publishedAt.
    const endedAt = new Date(video.liveEndedAt)
    const publishedAt = new Date(video.publishedAt)
    return endedAt > publishedAt ? endedAt : publishedAt
  }
  return new Date(video.publishedAt)
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

// Start of the local calendar day — same boundary bucketOf uses for
// "Today" (B-020: the connect-time auto-read cutoff is "published before
// today", so it must agree with what the feed itself calls today).
export function startOfToday(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}
