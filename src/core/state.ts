// Video state model per D-010 (feed.md §Video state model): one read-status
// enum plus orthogonal flags. These states are Chronicle-only and never sync
// to YouTube (D-003).

export type ReadStatus = 'unread' | 'read' | 'ignored'

export interface VideoState {
  readStatus: ReadStatus
  favorite: boolean
  watchLater: boolean
}

// Absence of a state row means this (video_state rows are created lazily,
// local-data.md §Design notes).
export const DEFAULT_VIDEO_STATE: VideoState = {
  readStatus: 'unread',
  favorite: false,
  watchLater: false
}

export function markRead(state: VideoState): VideoState {
  return { ...state, readStatus: 'read' }
}

export function markUnread(state: VideoState): VideoState {
  return { ...state, readStatus: 'unread' }
}

// Keyboard `m` (ui.md): read ⇄ unread. Ignored videos come back as read —
// the user is explicitly touching the video, so it stops counting as new.
export function toggleRead(state: VideoState): VideoState {
  return state.readStatus === 'read' ? markUnread(state) : markRead(state)
}

// "I've decided not to watch this; stop counting it." Reversible, never deletion.
export function ignore(state: VideoState): VideoState {
  return { ...state, readStatus: 'ignored' }
}

// Un-ignoring returns the video to unread: it re-enters the default view and
// the mechanical unread count.
export function unignore(state: VideoState): VideoState {
  return state.readStatus === 'ignored' ? { ...state, readStatus: 'unread' } : state
}

// Orthogonal to read status on purpose (favoriting never un-reads, feed.md).
export function toggleFavorite(state: VideoState): VideoState {
  return { ...state, favorite: !state.favorite }
}

export function toggleWatchLater(state: VideoState): VideoState {
  return { ...state, watchLater: !state.watchLater }
}
