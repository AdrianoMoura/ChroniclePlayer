import { describe, expect, it } from 'vitest'
import {
  bucketOf,
  groupFeed,
  isCaughtUp,
  recentWindowStart,
  unreadCount,
  type FeedEntry
} from './feed'
import { DEFAULT_VIDEO_STATE, type VideoState } from './state'

// Wednesday, 2026-07-08 15:00 local time.
const NOW = new Date(2026, 6, 8, 15, 0)

function entry(
  videoId: string,
  published: Date,
  channelTitle = 'Channel A',
  state: VideoState = DEFAULT_VIDEO_STATE
): FeedEntry {
  return {
    channelTitle,
    state,
    video: {
      videoId,
      channelId: 'UCtest',
      title: `Video ${videoId}`,
      publishedAt: published.toISOString(),
      durationSeconds: null,
      thumbnailUrl: null,
      viewCount: null
    }
  }
}

describe('groupFeed', () => {
  it('buckets by local calendar day: today, yesterday, this ISO week, earlier', () => {
    const groups = groupFeed(
      [
        entry('today', new Date(2026, 6, 8, 9)),
        entry('yesterday', new Date(2026, 6, 7, 23)),
        entry('monday', new Date(2026, 6, 6, 8)),
        entry('sunday-last-week', new Date(2026, 6, 5, 12)),
        entry('long-ago', new Date(2026, 5, 1))
      ],
      NOW
    )

    expect(groups.map((g) => [g.bucket, g.entries.map((e) => e.video.videoId)])).toEqual([
      ['today', ['today']],
      ['yesterday', ['yesterday']],
      ['this-week', ['monday']],
      ['earlier', ['sunday-last-week', 'long-ago']]
    ])
  })

  it('omits empty groups', () => {
    const groups = groupFeed([entry('only', new Date(2026, 6, 8, 10))], NOW)
    expect(groups.map((g) => g.bucket)).toEqual(['today'])
  })

  it('uses calendar days, not rolling 24h windows', () => {
    // 20 hours ago but on the previous calendar day.
    const groups = groupFeed([entry('late-night', new Date(2026, 6, 7, 19))], NOW)
    expect(groups[0]?.bucket).toBe('yesterday')
  })

  it('keeps yesterday as its own bucket even when it falls in the previous ISO week', () => {
    const mondayNoon = new Date(2026, 6, 6, 12)
    const groups = groupFeed(
      [
        entry('sunday', new Date(2026, 6, 5, 10)), // yesterday, previous ISO week
        entry('saturday', new Date(2026, 6, 4, 10)) // previous ISO week
      ],
      mondayNoon
    )
    expect(groups.map((g) => [g.bucket, g.entries.map((e) => e.video.videoId)])).toEqual([
      ['yesterday', ['sunday']],
      ['earlier', ['saturday']]
    ])
  })

  it('sorts publishedAt descending within groups', () => {
    const groups = groupFeed(
      [entry('older', new Date(2026, 6, 8, 8)), entry('newer', new Date(2026, 6, 8, 12))],
      NOW
    )
    expect(groups[0]?.entries.map((e) => e.video.videoId)).toEqual(['newer', 'older'])
  })

  it('breaks timestamp ties by channel title, then videoId', () => {
    const at = new Date(2026, 6, 8, 8)
    const groups = groupFeed(
      [
        entry('b-video', at, 'Zeta'),
        entry('z-video', at, 'Alpha'),
        entry('a-video', at, 'Alpha')
      ],
      NOW
    )
    expect(groups[0]?.entries.map((e) => e.video.videoId)).toEqual(['a-video', 'z-video', 'b-video'])
  })

  it('places future-dated videos (premiere assumption) in today, never hidden', () => {
    const groups = groupFeed([entry('premiere', new Date(2026, 6, 10, 9))], NOW)
    expect(groups[0]?.bucket).toBe('today')
  })
})

const READ: VideoState = { readStatus: 'read', favorite: false, watchLater: false }

describe('recentWindowStart', () => {
  it('is the start of the ISO week on a mid-week day', () => {
    expect(recentWindowStart(NOW)).toEqual(new Date(2026, 6, 6)) // Monday 00:00
  })

  it('reaches back to yesterday when today is Monday (Sunday is still "yesterday")', () => {
    expect(recentWindowStart(new Date(2026, 6, 6, 12))).toEqual(new Date(2026, 6, 5))
  })

  it('classification agrees with bucketOf: at/after the boundary is never "earlier"', () => {
    const boundary = recentWindowStart(NOW)
    expect(bucketOf(boundary, NOW)).not.toBe('earlier')
    expect(bucketOf(new Date(boundary.getTime() - 1), NOW)).toBe('earlier')
  })
})

describe('unreadCount', () => {
  it('counts only unread — read and ignored are excluded, flags are irrelevant', () => {
    const at = new Date(2026, 6, 8, 9)
    expect(
      unreadCount([
        entry('a', at),
        entry('b', at, 'C', { readStatus: 'unread', favorite: true, watchLater: true }),
        entry('c', at, 'C', READ),
        entry('d', at, 'C', { readStatus: 'ignored', favorite: false, watchLater: false })
      ])
    ).toBe(2)
  })
})

describe('isCaughtUp', () => {
  it('is true when today/yesterday/this-week have zero unread', () => {
    const groups = groupFeed(
      [entry('recent-read', new Date(2026, 6, 8, 9), 'C', READ)],
      NOW
    )
    expect(isCaughtUp(groups)).toBe(true)
  })

  it('is false while any recent group has an unread video', () => {
    const groups = groupFeed([entry('recent-unread', new Date(2026, 6, 7, 9))], NOW)
    expect(isCaughtUp(groups)).toBe(false)
  })

  it('ignores unread videos in the earlier archive (D-027: depth never affects it)', () => {
    const groups = groupFeed([entry('old-unread', new Date(2026, 4, 1))], NOW)
    expect(isCaughtUp(groups)).toBe(true)
  })

  it('is true for an empty feed', () => {
    expect(isCaughtUp(groupFeed([], NOW))).toBe(true)
  })
})
