// Ports implemented by adapters (architecture.md §Core ports). core/ defines
// the interfaces; it never imports an implementation.

import type { FeedEntry } from './feed'
import type { FeedView } from './views'
import type { ReadStatus, VideoState } from './state'
import type { Channel, Video } from './video'

export interface Clock {
  now(): Date
}

// Keyset cursor for continuous scroll over the local archive (D-027). The
// triple mirrors the feed ordering exactly (published desc, channel title,
// videoId) so pages never skip or duplicate tied rows.
export interface FeedCursor {
  publishedAt: string
  channelTitle: string
  videoId: string
}

export interface FeedPage {
  entries: FeedEntry[]
  nextCursor: FeedCursor | null
}

export interface FeedRepository {
  // channelId narrows the feed to one channel (ui.md sidebar channel list).
  listPage(view: FeedView, cursor: FeedCursor | null, limit: number, channelId?: string): FeedPage
  // Watch Later is an ordered queue, not a chronological view (feed.md).
  listWatchLaterQueue(): FeedEntry[]
  countUnread(): number
  // Unread within the recent window (feeds the caught-up state).
  countUnreadSince(publishedAtIso: string): number
  listFollowedChannels(): Channel[]
}

export interface StateRepository {
  get(videoId: string): VideoState
  setReadStatus(videoId: string, status: ReadStatus): VideoState
  toggleFavorite(videoId: string): VideoState
  toggleWatchLater(videoId: string): VideoState
}

// Catalog writes; M1 uses them for fixtures, M2 for real sync.
export interface CatalogRepository {
  upsertChannel(channel: Channel): void
  upsertVideo(video: Video, fetchedAt: string): void
  countVideos(): number
}

// ── M2 sync ports ────────────────────────────────────────────────

// Client-side quota accounting: Google exposes no runtime quota-remaining
// API (Assumption, local-data.md). Adapters report each call's cost here.
export interface QuotaSink {
  add(units: number): void
}

export class QuotaCounter implements QuotaSink {
  private units = 0
  add(units: number): void {
    this.units += units
  }
  get spent(): number {
    return this.units
  }
}

export interface SubscriptionSource {
  // subscriptions.list mine=true — 1 unit per 50-channel page.
  listSubscriptions(): Promise<Channel[]>
  // channels.list batched 50/call — 1 unit per call. UC…→UU… is assumed
  // reliable but fetched rather than derived (youtube-api.md Assumption).
  fetchUploadsPlaylists(channelIds: readonly string[]): Promise<Map<string, string>>
}

export interface DiscoveredVideo {
  videoId: string
  title: string
  publishedAt: string
  thumbnailUrl: string | null
  description: string | null
}

export type RssFeedResult =
  | { kind: 'not-modified' }
  | {
      kind: 'ok'
      entries: DiscoveredVideo[]
      etag: string | null
      lastModified: string | null
    }

// Full facts from videos.list (snippet + contentDetails + liveBroadcastContent).
export interface HydratedVideo {
  videoId: string
  channelId: string
  title: string
  publishedAt: string
  durationSeconds: number
  liveContent: 'none' | 'live' | 'upcoming'
  thumbnailUrl: string | null
  description: string | null
}

export interface VideoSource {
  // RSS — free, no quota. Conditional GET via etag/lastModified.
  discoverRecent(channel: ChannelSyncInfo): Promise<RssFeedResult>
  // videos.list batched 50/call — 1 unit per call.
  hydrate(videoIds: readonly string[]): Promise<HydratedVideo[]>
  // playlistItems.list — 1 unit per 50-item page; gap detection/backfill only.
  listUploads(
    playlistId: string,
    pageToken?: string
  ): Promise<{ videoIds: string[]; nextPageToken: string | null }>
}

// D-028 confirmation: HEAD youtube.com/shorts/{id} — zero quota.
export interface ShortsProber {
  isShort(videoId: string): Promise<boolean>
}

export interface SecretStore {
  get(key: string): string | null
  set(key: string, value: string): void
  delete(key: string): void
  // false = fallback encryption (D-013) — settings must show the warning.
  isSecure(): boolean
}

export interface AuthProvider {
  // Mints/refreshes transparently; throws DomainError('auth-expired').
  getAccessToken(): Promise<string>
}

export interface ChannelSyncInfo {
  channelId: string
  title: string
  uploadsPlaylist: string | null
  rssEtag: string | null
  rssLastModified: string | null
  lastSyncedAt: string | null
}

export interface SyncLogEntry {
  startedAt: string
  finishedAt: string
  trigger: 'launch' | 'manual' | 'timer'
  channelsPolled: number
  videosNew: number
  quotaSpent: number
  outcome: 'ok' | 'partial' | 'failed' | 'quota'
}

// Storage surface the sync engine needs (implemented by adapters/storage).
export interface SyncRepository {
  listSubscribedChannels(): ChannelSyncInfo[]
  // Diff-apply a fresh subscription list: upsert current, mark missing ones
  // unsubscribed — videos and states are retained (youtube-api.md).
  applySubscriptions(channels: readonly Channel[], now: string): { added: number; removed: number }
  setUploadsPlaylist(channelId: string, playlistId: string): void
  knownVideoIds(videoIds: readonly string[]): Set<string>
  insertDiscoveredVideos(channelId: string, videos: readonly DiscoveredVideo[], now: string): void
  applyHydration(videos: readonly HydratedVideo[], now: string): void
  updateChannelSyncMeta(
    channelId: string,
    meta: { rssEtag: string | null; rssLastModified: string | null; lastSyncedAt: string; available: boolean }
  ): void
  markChannelUnavailable(channelId: string): void
  // duration ≤ 180 s and is_short IS NULL (feed.md §Shorts detection).
  shortCandidates(): string[]
  setShortStatus(videoId: string, isShort: boolean): void
  recordSync(entry: SyncLogEntry): void
  lastSyncStartedAt(): string | null
  getMeta(key: string): string | null
  setMeta(key: string, value: string): void
}
