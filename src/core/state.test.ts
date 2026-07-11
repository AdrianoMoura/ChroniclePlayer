import { describe, expect, it } from 'vitest'
import {
  DEFAULT_VIDEO_STATE,
  ignore,
  markRead,
  markUnread,
  toggleFavorite,
  toggleRead,
  toggleWatchLater,
  unignore,
  type VideoState
} from './state'

const state = (partial: Partial<VideoState> = {}): VideoState => ({
  ...DEFAULT_VIDEO_STATE,
  ...partial
})

describe('D-010 state model', () => {
  it('defaults to unread with no flags (lazy rows: absence = this)', () => {
    expect(DEFAULT_VIDEO_STATE).toEqual({ readStatus: 'unread', favorite: false, watchLater: false })
  })

  it('read status and flags are orthogonal: marking read never touches flags', () => {
    const favoriteQueued = state({ favorite: true, watchLater: true })
    expect(markRead(favoriteQueued)).toEqual(state({ readStatus: 'read', favorite: true, watchLater: true }))
  })

  it('favoriting never un-reads a video (the artificial transition D-010 rejects)', () => {
    const read = state({ readStatus: 'read' })
    expect(toggleFavorite(read).readStatus).toBe('read')
    expect(toggleFavorite(read).favorite).toBe(true)
    expect(toggleFavorite(toggleFavorite(read))).toEqual(read)
  })

  it('watch-later toggles independently of everything else', () => {
    const ignored = state({ readStatus: 'ignored', favorite: true })
    expect(toggleWatchLater(ignored)).toEqual(state({ readStatus: 'ignored', favorite: true, watchLater: true }))
    expect(toggleWatchLater(toggleWatchLater(ignored))).toEqual(ignored)
  })

  it('toggleRead flips read ⇄ unread', () => {
    expect(toggleRead(state()).readStatus).toBe('read')
    expect(toggleRead(state({ readStatus: 'read' })).readStatus).toBe('unread')
  })

  it('toggleRead on an ignored video marks it read (explicit user touch)', () => {
    expect(toggleRead(state({ readStatus: 'ignored' })).readStatus).toBe('read')
  })

  it('ignore is reversible and unignore returns the video to unread', () => {
    const ignored = ignore(state({ readStatus: 'read' }))
    expect(ignored.readStatus).toBe('ignored')
    expect(unignore(ignored).readStatus).toBe('unread')
  })

  it('unignore is a no-op on non-ignored videos', () => {
    const read = state({ readStatus: 'read' })
    expect(unignore(read)).toEqual(read)
  })

  it('ignoring preserves flags (not deletion — feed.md)', () => {
    const flagged = state({ favorite: true, watchLater: true })
    expect(ignore(flagged)).toEqual(state({ readStatus: 'ignored', favorite: true, watchLater: true }))
  })

  it('markUnread restores the unread count contribution', () => {
    expect(markUnread(state({ readStatus: 'read' })).readStatus).toBe('unread')
  })
})
