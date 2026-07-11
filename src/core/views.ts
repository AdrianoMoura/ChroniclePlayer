import type { VideoState } from './state'

// MVP views per feed.md §Filters and ui.md §Layout. Shorts exclusion (D-028)
// is NOT a view — it is unconditional and happens before videos ever reach
// the feed (sync pipeline, M2).
export type FeedView = 'all' | 'unread' | 'favorites' | 'watch-later' | 'ignored'

export const FEED_VIEWS: readonly FeedView[] = [
  'all',
  'unread',
  'watch-later',
  'favorites',
  'ignored'
]

// Single source of truth for view membership. The SQL in adapters/storage
// must agree with this predicate — contract tests enforce it.
export function belongsToView(state: VideoState, view: FeedView): boolean {
  switch (view) {
    case 'all':
      // Ignored videos leave the default view (feed.md §Semantics).
      return state.readStatus !== 'ignored'
    case 'unread':
      return state.readStatus === 'unread'
    case 'favorites':
      return state.favorite
    case 'watch-later':
      return state.watchLater
    case 'ignored':
      return state.readStatus === 'ignored'
  }
}
