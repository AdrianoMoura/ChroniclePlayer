// User-created, local-only playlists (see decisions.md). Distinct from a
// YouTube playlist: never synced, never touches the API — a plain
// user-ordered list of already-known videos (feed.md's D-029 "known
// locally" rule applies the same way Watch Later's queue does).

import type { FeedEntry } from './feed'

export interface Playlist {
  playlistId: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
}

// The composite thumbnail (ui.md) is built from at most this many of the
// playlist's own videos, oldest-added-first.
export const MAX_PLAYLIST_THUMBS = 6

export interface PlaylistSummary extends Playlist {
  videoCount: number
  totalDurationSeconds: number
  // Up to MAX_PLAYLIST_THUMBS thumbnail URLs, in playlist order — the
  // renderer arranges these into the composite grid; videos with no
  // thumbnail yet (unhydrated) are skipped rather than leaving a gap.
  thumbnailUrls: string[]
}

// A playlist is also a user-ordered queue, similar to Watch Later's
// (core/feed.ts's nextWatchLaterAfter, D-055) — but deliberately does NOT
// wrap around: Watch Later is a rotation the user dips in and out of (D-057
// added wraparound there on purpose), while a playlist is a curated,
// ordered collection with a real end — reaching its last video suggests
// nothing further, rather than looping back to the first.
export function nextInPlaylist(
  videos: readonly FeedEntry[],
  currentVideoId: string
): FeedEntry | null {
  if (videos.length === 0) return null
  const index = videos.findIndex((candidate) => candidate.video.videoId === currentVideoId)
  // Not a member of this playlist at all → suggest the first video, same
  // "no established position yet" fallback nextWatchLaterAfter uses.
  if (index === -1) return videos[0]
  return videos[index + 1] ?? null
}
