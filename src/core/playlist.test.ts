import { describe, expect, it } from 'vitest'
import { nextInPlaylist } from './playlist'
import type { FeedEntry } from './feed'
import { DEFAULT_VIDEO_STATE } from './state'

function entry(videoId: string): FeedEntry {
  return {
    channelTitle: 'Channel A',
    state: DEFAULT_VIDEO_STATE,
    video: {
      videoId,
      channelId: 'UCa',
      title: videoId,
      publishedAt: new Date(2026, 6, 8, 9).toISOString(),
      durationSeconds: 120,
      thumbnailUrl: null,
      viewCount: null,
      isShort: false,
      liveContent: 'none',
      liveStartedAt: null,
      liveEndedAt: null,
      isPremiere: false
    }
  }
}

// Similar in shape to feed.ts's nextWatchLaterAfter (D-055), but a playlist
// deliberately does NOT wrap around like Watch Later (D-057) does — a
// playlist is a curated, ordered collection with a real end.
describe('nextInPlaylist', () => {
  const playlist = [entry('first'), entry('second'), entry('third')]

  it('suggests the first video when the one that ended is not itself a member', () => {
    expect(nextInPlaylist(playlist, 'unrelated')?.video.videoId).toBe('first')
  })

  it('suggests whichever entry follows the video that ended', () => {
    expect(nextInPlaylist(playlist, 'first')?.video.videoId).toBe('second')
    expect(nextInPlaylist(playlist, 'second')?.video.videoId).toBe('third')
  })

  it('is null once the last video ends, rather than wrapping back to the first', () => {
    expect(nextInPlaylist(playlist, 'third')).toBeNull()
  })

  it('is null for an empty playlist', () => {
    expect(nextInPlaylist([], 'anything')).toBeNull()
  })

  it('is null for a one-item playlist once its only video ends', () => {
    expect(nextInPlaylist([entry('only')], 'only')).toBeNull()
  })
})
