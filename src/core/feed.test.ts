import { describe, expect, it } from 'vitest'
import {
  bucketOf,
  effectiveDate,
  groupFeed,
  isCaughtUp,
  recentWindowStart,
  startOfToday,
  unreadCount,
  type FeedEntry
} from './feed'
import { DEFAULT_VIDEO_STATE, type VideoState } from './state'
import type { Video } from './video'

// Wednesday, 2026-07-08 15:00 local time.
const NOW = new Date(2026, 6, 8, 15, 0)

function entry(
  videoId: string,
  published: Date,
  channelTitle = 'Channel A',
  state: VideoState = DEFAULT_VIDEO_STATE,
  live: Pick<Video, 'liveContent' | 'wasLive' | 'liveEndedAt'> = {
    liveContent: 'none',
    wasLive: false,
    liveEndedAt: null
  }
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
      viewCount: null,
      isShort: false,
      ...live
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

  it('floats a currently-live video above same-bucket uploads published after it started (D-053)', () => {
    const groups = groupFeed(
      [
        entry('newer-upload', new Date(2026, 6, 8, 12)),
        // Started at 09:00 — hours before the other two — but still live.
        entry('hours-old-live', new Date(2026, 6, 8, 9), 'Channel A', DEFAULT_VIDEO_STATE, {
          liveContent: 'live',
          wasLive: true,
          liveEndedAt: null
        }),
        entry('older-upload', new Date(2026, 6, 8, 10))
      ],
      NOW
    )
    expect(groups[0]?.bucket).toBe('today')
    expect(groups[0]?.entries.map((e) => e.video.videoId)).toEqual([
      'hours-old-live',
      'newer-upload',
      'older-upload'
    ])
  })

  it('sorts an ended broadcast by its actual end time, not its original (older) publishedAt', () => {
    const groups = groupFeed(
      [
        entry('upload-at-11', new Date(2026, 6, 8, 11)),
        // Started earliest of the three (09:00) but ended at 14:00 — should
        // still rank first, by its end time rather than its start time.
        entry('ended-live', new Date(2026, 6, 8, 9), 'Channel A', DEFAULT_VIDEO_STATE, {
          liveContent: 'none',
          wasLive: true,
          liveEndedAt: new Date(2026, 6, 8, 14).toISOString()
        }),
        entry('upload-at-10', new Date(2026, 6, 8, 10))
      ],
      NOW
    )
    expect(groups[0]?.entries.map((e) => e.video.videoId)).toEqual([
      'ended-live',
      'upload-at-11',
      'upload-at-10'
    ])
  })

  it('a broadcast that crosses midnight lands in the bucket it ended in, not the one it started in (D-053)', () => {
    // Started 20:00 the day before "now", ended 02:00 on "now"'s calendar day.
    const groups = groupFeed(
      [
        entry('crossed-midnight', new Date(2026, 6, 7, 20), 'Channel A', DEFAULT_VIDEO_STATE, {
          liveContent: 'none',
          wasLive: true,
          liveEndedAt: new Date(2026, 6, 8, 2).toISOString()
        })
      ],
      NOW
    )
    expect(groups.map((g) => g.bucket)).toEqual(['today'])
  })

  it('a video still live from days ago still buckets as today, not its original day (D-053)', () => {
    const groups = groupFeed(
      [
        entry('marathon-stream', new Date(2026, 6, 5, 9), 'Channel A', DEFAULT_VIDEO_STATE, {
          liveContent: 'live',
          wasLive: true,
          liveEndedAt: null
        })
      ],
      NOW
    )
    expect(groups.map((g) => g.bucket)).toEqual(['today'])
  })
})

describe('effectiveDate', () => {
  const base = (live: Parameters<typeof entry>[4]) =>
    entry('v', new Date(2026, 6, 5, 9), 'Channel A', DEFAULT_VIDEO_STATE, live).video

  it('is publishedAt for a video that was never live', () => {
    expect(effectiveDate(base({ liveContent: 'none', wasLive: false, liveEndedAt: null }), NOW)).toEqual(
      new Date(2026, 6, 5, 9)
    )
  })

  it('is "now" while genuinely live, regardless of publishedAt', () => {
    expect(effectiveDate(base({ liveContent: 'live', wasLive: true, liveEndedAt: null }), NOW)).toEqual(
      NOW
    )
  })

  it('is liveEndedAt once ended, even without wasLive (e.g. discovered post-broadcast via gap-backfill)', () => {
    const endedAt = new Date(2026, 6, 6, 10)
    expect(
      effectiveDate(
        base({ liveContent: 'none', wasLive: false, liveEndedAt: endedAt.toISOString() }),
        NOW
      )
    ).toEqual(endedAt)
  })
})

const READ: VideoState = {
  readStatus: 'read',
  favorite: false,
  watchLater: false,
  resumePositionSeconds: null
}

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

describe('startOfToday', () => {
  it('is midnight of the local calendar day, agreeing with bucketOf\'s "today" (B-020)', () => {
    const start = startOfToday(NOW)
    expect(start).toEqual(new Date(2026, 6, 8))
    expect(bucketOf(start, NOW)).toBe('today')
    expect(bucketOf(new Date(start.getTime() - 1), NOW)).toBe('yesterday')
  })
})

describe('unreadCount', () => {
  it('counts only unread — read and ignored are excluded, flags are irrelevant', () => {
    const at = new Date(2026, 6, 8, 9)
    expect(
      unreadCount([
        entry('a', at),
        entry('b', at, 'C', {
          readStatus: 'unread',
          favorite: true,
          watchLater: true,
          resumePositionSeconds: null
        }),
        entry('c', at, 'C', READ),
        entry('d', at, 'C', {
          readStatus: 'ignored',
          favorite: false,
          watchLater: false,
          resumePositionSeconds: null
        })
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

