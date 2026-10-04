import {
  PLAYLIST_DESCRIPTION_MAX_LENGTH,
  PLAYLIST_NAME_MAX_LENGTH,
  type FeedCursorDto,
  type HistoryCursorDto
} from '../../ipc/contract'
import { FEED_VIEWS, type FeedView } from '../../core/views'
import type { ReadStatusDto } from '../../ipc/contract'

// IPC inputs cross a trust boundary — compile-time types don't survive it.
export function parseView(value: unknown): FeedView {
  if (typeof value === 'string' && (FEED_VIEWS as readonly string[]).includes(value)) {
    return value as FeedView
  }
  throw new Error(`invalid feed view: ${String(value)}`)
}

export function parseReadStatus(value: unknown): ReadStatusDto {
  if (value === 'unread' || value === 'read' || value === 'ignored') return value
  throw new Error(`invalid read status: ${String(value)}`)
}

export function parseVideoId(value: unknown): string {
  if (typeof value === 'string' && /^[\w-]{1,64}$/.test(value)) return value
  throw new Error('invalid video id')
}

export function parseChannelId(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'string' && /^[\w-]{1,64}$/.test(value)) return value
  throw new Error('invalid channel id')
}

export function parseChannelIdRequired(value: unknown): string {
  if (typeof value === 'string' && /^[\w-]{1,64}$/.test(value)) return value
  throw new Error('invalid channel id')
}

// Same shape as parseChannelId — accountId narrows the combined feed.
export function parseAccountId(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'string' && value.length > 0 && value.length <= 128) return value
  throw new Error('invalid account id')
}

export function parsePlaylistId(value: unknown): string {
  if (typeof value === 'string' && /^[\w-]{1,64}$/.test(value)) return value
  throw new Error('invalid playlist id')
}

export function parsePlaylistName(value: unknown): string {
  const name = typeof value === 'string' ? value.trim() : ''
  if (name === '' || name.length > PLAYLIST_NAME_MAX_LENGTH) throw new Error('invalid playlist name')
  return name
}

export function parsePlaylistDescription(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const description = typeof value === 'string' ? value.trim() : ''
  if (description.length > PLAYLIST_DESCRIPTION_MAX_LENGTH) throw new Error('invalid playlist description')
  return description === '' ? null : description
}

export function parseCursor(value: unknown): FeedCursorDto | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'object') {
    const cursor = value as Record<string, unknown>
    if (
      typeof cursor['publishedAt'] === 'string' &&
      typeof cursor['channelTitle'] === 'string' &&
      typeof cursor['videoId'] === 'string'
    ) {
      return {
        publishedAt: cursor['publishedAt'],
        channelTitle: cursor['channelTitle'],
        videoId: cursor['videoId']
      }
    }
  }
  throw new Error('invalid feed cursor')
}

// The History screen's own cursor shape (last_watched_at, not publishedAt)
// — same parsing convention as parseCursor above.
export function parseHistoryCursor(value: unknown): HistoryCursorDto | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'object') {
    const cursor = value as Record<string, unknown>
    if (typeof cursor['lastWatchedAt'] === 'string' && typeof cursor['videoId'] === 'string') {
      return { lastWatchedAt: cursor['lastWatchedAt'], videoId: cursor['videoId'] }
    }
  }
  throw new Error('invalid history cursor')
}

export function parseSearchQuery(value: unknown): string {
  if (typeof value === 'string' && value.length <= 200) return value
  throw new Error('invalid query')
}
