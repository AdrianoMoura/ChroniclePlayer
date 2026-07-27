import { describe, expect, it } from 'vitest'
import { parseYouTubeUrl } from './youtube-url'

describe('parseYouTubeUrl', () => {
  it('parses a watch URL as a video', () => {
    expect(parseYouTubeUrl('https://www.youtube.com/watch?v=abcdefghijk')).toEqual({
      kind: 'video',
      videoId: 'abcdefghijk'
    })
  })

  it('parses a youtu.be short link as a video', () => {
    expect(parseYouTubeUrl('https://youtu.be/abcdefghijk')).toEqual({
      kind: 'video',
      videoId: 'abcdefghijk'
    })
  })

  it('parses a shorts URL', () => {
    expect(parseYouTubeUrl('https://www.youtube.com/shorts/abcdefghijk')).toEqual({
      kind: 'shorts',
      videoId: 'abcdefghijk'
    })
  })

  it('parses a channel URL', () => {
    expect(parseYouTubeUrl('https://www.youtube.com/@somechannel')).toEqual({ kind: 'channel' })
  })

  it('parses a playlist URL, capturing the list id (D-059)', () => {
    expect(parseYouTubeUrl('https://www.youtube.com/playlist?list=PLxxxxxxxxxxxxxxxx')).toEqual({
      kind: 'playlist',
      playlistId: 'PLxxxxxxxxxxxxxxxx'
    })
  })

  it('treats a playlist URL with no list param as other', () => {
    expect(parseYouTubeUrl('https://www.youtube.com/playlist')).toEqual({ kind: 'other' })
  })

  it('rejects a non-YouTube URL', () => {
    expect(parseYouTubeUrl('https://example.com/watch?v=abcdefghijk')).toEqual({ kind: 'other' })
  })

  it('rejects malformed input', () => {
    expect(parseYouTubeUrl('not a url')).toEqual({ kind: 'other' })
  })
})
