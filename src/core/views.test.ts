import { describe, expect, it } from 'vitest'
import { belongsToView, FEED_VIEWS } from './views'
import type { VideoState } from './state'

function s(readStatus: VideoState['readStatus'], favorite = false, watchLater = false): VideoState {
  return { readStatus, favorite, watchLater, resumePositionSeconds: null }
}

describe('belongsToView', () => {
  it('all: everything except ignored', () => {
    expect(belongsToView(s('unread'), 'all')).toBe(true)
    expect(belongsToView(s('read'), 'all')).toBe(true)
    expect(belongsToView(s('ignored'), 'all')).toBe(false)
    // flags never rescue an ignored video into the default view
    expect(belongsToView(s('ignored', true, true), 'all')).toBe(false)
  })

  it('unread: only unread', () => {
    expect(belongsToView(s('unread'), 'unread')).toBe(true)
    expect(belongsToView(s('read'), 'unread')).toBe(false)
    expect(belongsToView(s('ignored'), 'unread')).toBe(false)
  })

  it('favorites: the flag, regardless of read status (orthogonal, D-010)', () => {
    expect(belongsToView(s('unread', true), 'favorites')).toBe(true)
    expect(belongsToView(s('read', true), 'favorites')).toBe(true)
    expect(belongsToView(s('ignored', true), 'favorites')).toBe(true)
    expect(belongsToView(s('read', false), 'favorites')).toBe(false)
  })

  it('watch-later: the flag, regardless of read status', () => {
    expect(belongsToView(s('read', false, true), 'watch-later')).toBe(true)
    expect(belongsToView(s('unread'), 'watch-later')).toBe(false)
  })

  it('ignored: only ignored', () => {
    expect(belongsToView(s('ignored'), 'ignored')).toBe(true)
    expect(belongsToView(s('unread'), 'ignored')).toBe(false)
  })

  it('every state belongs to a deterministic set of views', () => {
    // Sanity: the predicate is total — no state/view combination throws.
    const statuses: VideoState['readStatus'][] = ['unread', 'read', 'ignored']
    for (const readStatus of statuses) {
      for (const favorite of [false, true]) {
        for (const watchLater of [false, true]) {
          for (const view of FEED_VIEWS) {
            expect(
              typeof belongsToView(
                { readStatus, favorite, watchLater, resumePositionSeconds: null },
                view
              )
            ).toBe('boolean')
          }
        }
      }
    }
  })
})
