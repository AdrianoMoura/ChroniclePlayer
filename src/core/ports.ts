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

export interface FollowedChannel {
  channel: Channel
  // Freshest video (Shorts included unless the setting hides them).
  latestPublishedAt: string | null
  unreadCount: number
  // B-042: channel-level priority marker (distinct from a video's own
  // favorite, D-010) — does not affect sidebar sort order (still B-008).
  favorite: boolean
  // D-050: opt-in for the "Custom" new-video notification scope.
  notify: boolean
}

export interface FeedRepository {
  // channelId narrows to one channel (ui.md sidebar). showShorts (B-028,
  // default true): false excludes is_short videos. accountId (B-003) narrows
  // to one account; undefined means the combined feed across all accounts.
  listPage(
    view: FeedView,
    cursor: FeedCursor | null,
    limit: number,
    channelId?: string,
    showShorts?: boolean,
    accountId?: string
  ): FeedPage
  // Watch Later is an ordered queue, not a chronological view (feed.md) —
  // account-agnostic like Favorites, since it also reaches externally
  // opened videos (D-029) with no subscribing account at all.
  listWatchLaterQueue(showShorts?: boolean): FeedEntry[]
  // Queue size for the sidebar badge (B-025) — same membership as the queue.
  countWatchLater(showShorts?: boolean): number
  countUnread(showShorts?: boolean, accountId?: string): number
  // Unread within the recent window (feeds the caught-up state).
  countUnreadSince(publishedAtIso: string, showShorts?: boolean, accountId?: string): number
  // Sidebar list (B-008): freshest channel first, with its unread count.
  listFollowedChannels(showShorts?: boolean, accountId?: string): FollowedChannel[]
  // B-042: toggles a channel's priority-feed membership for one account;
  // returns the new state.
  toggleChannelFavorite(accountId: string, channelId: string): boolean
  // D-050: toggles a channel's per-channel notify flag (the "Selected
  // Channels" scope membership) for one account; returns the new state.
  toggleChannelNotify(accountId: string, channelId: string): boolean
  // D-050: direct set (not toggle) — syncs notify to a channel's new
  // favorite state when autoNotifyFavorites is on.
  setChannelNotify(accountId: string, channelId: string, notify: boolean): void
  // D-050: bulk-applies notify to every currently-favorited channel (any
  // account) — used by the autoNotifyFavorites enable/disable flow.
  bulkSetNotifyForFavorites(enable: boolean): void
  // B-042: unread videos from favorited channels, most recent first — a
  // separate capped list (like listWatchLaterQueue), not merged into the
  // main keyset-paginated feed (D-039: also stays in its normal bucket).
  listPriorityVideos(limit: number, showShorts?: boolean, accountId?: string): FeedEntry[]
  // Player view read (playback.md): any locally known video, feed or not.
  findVideo(videoId: string): { entry: FeedEntry; description: string | null } | null
  // Bulk unread → read (B-020, D-010 semantics — manual and automatic
  // marking are indistinguishable). channelId scopes to one channel, null
  // is the whole feed. beforeIso, when set, only touches videos published
  // strictly before it (the connect-time backlog auto-read). Returns the
  // number of videos changed. accountId (B-003) narrows to one account.
  markManyRead(
    channelId: string | null,
    beforeIso: string | null,
    now: string,
    accountId?: string
  ): number
  // B-009: cross-references a channel id against local state (subscribed by
  // any connected account) — shows "Subscribed" instead of a live button.
  isSubscribed(channelId: string): boolean
}

export interface StateRepository {
  get(videoId: string): VideoState
  setReadStatus(videoId: string, status: ReadStatus): VideoState
  toggleFavorite(videoId: string): VideoState
  toggleWatchLater(videoId: string): VideoState
  // Persists a drag-and-drop reorder of the Watch Later view. videoIds is
  // the full queue in its new order; ids no longer in the queue (or never
  // queued) are ignored rather than erroring.
  reorderWatchLater(videoIds: readonly string[]): void
  setResumePosition(videoId: string, seconds: number | null): VideoState
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

// Full facts from videos.list (snippet + contentDetails + liveStreamingDetails
// + liveBroadcastContent).
export interface HydratedVideo {
  videoId: string
  channelId: string
  channelTitle: string
  title: string
  publishedAt: string
  durationSeconds: number
  liveContent: 'none' | 'live' | 'upcoming'
  // liveStreamingDetails.actualStartTime — present once a broadcast (or a
  // Premiere) has actually started, null before then or for a video that
  // was never live. See Video.liveStartedAt for how it's used.
  liveStartedAt: string | null
  // D-053: liveStreamingDetails.actualEndTime — present once YouTube reports
  // the broadcast has ended, null while it's still live/upcoming or for a
  // video that was never live. See Video.liveEndedAt for how it's used.
  liveEndedAt: string | null
  // This cycle's observation only, NOT sticky (the persisted, sticky
  // version lives on Video.isPremiere) — status.uploadStatus === 'processed'
  // while liveContent === 'live'. Always false outside that state.
  isPremiere: boolean
  thumbnailUrl: string | null
  description: string | null
  viewCount: number | null
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

// D-026: an unauthenticated check against a public release feed — no
// identifiers sent, nothing but "what's the latest version".
export interface UpdateRelease {
  version: string
  url: string
}

export interface UpdateSource {
  latestRelease(): Promise<UpdateRelease | null>
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

// B-003: an account's local record — its own YouTube subscriptions/tokens,
// but sharing the one Google Cloud project/OAuth client and quota pool.
export interface Account {
  accountId: string
  label: string
  addedAt: string
}

// Storage surface the sync engine needs (implemented by adapters/storage).
export interface SyncRepository {
  // channelId scopes to a single channel (B-036: channel-scoped refresh).
  // B-003: accountId scopes to one account's subscriptions — channels
  // themselves (facts: title, uploads playlist, RSS state) are shared across
  // every account that follows them.
  listSubscribedChannels(accountId: string, channelId?: string): ChannelSyncInfo[]
  // Diff-apply a fresh subscription list for one account: upsert current,
  // mark missing ones unsubscribed *for that account* — videos and states
  // are retained (youtube-api.md).
  applySubscriptions(
    accountId: string,
    channels: readonly Channel[],
    now: string
  ): { added: number; removed: number }
  // Channel fact, account-agnostic (B-003) — set once, shared.
  setUploadsPlaylist(channelId: string, playlistId: string): void
  knownVideoIds(videoIds: readonly string[]): Set<string>
  insertDiscoveredVideos(channelId: string, videos: readonly DiscoveredVideo[], now: string): void
  applyHydration(videos: readonly HydratedVideo[], now: string): void
  // Archive-backfilled videos predate the user following Chronicle, so they
  // default to read instead of inflating unread counts. Only touches videos
  // with no existing video_state row — never overwrites an existing read/unread.
  markVideosReadIfUnset(videoIds: readonly string[], now: string): void
  updateChannelSyncMeta(
    channelId: string,
    meta: { rssEtag: string | null; rssLastModified: string | null; lastSyncedAt: string }
  ): void
  // B-002: continuation state for on-demand back-catalog backfill, distinct
  // from the routine-sync gap-backfill path (which doesn't persist a cursor).
  // B-003: per (account, channel) — each account walks its own cursor.
  getBackfillState(
    accountId: string,
    channelId: string
  ): { pageToken: string | null; exhausted: boolean }
  setBackfillState(
    accountId: string,
    channelId: string,
    pageToken: string | null,
    exhausted: boolean
  ): void
  // B-003: connected accounts.
  listAccounts(): Account[]
  addAccount(accountId: string, label: string, now: string): void
  removeAccount(accountId: string): void
  // duration ≤ 180 s and is_short IS NULL (feed.md §Shorts detection).
  // channelId scopes to a single channel (B-036).
  shortCandidates(channelId?: string): string[]
  setShortStatus(videoId: string, isShort: boolean): void
  // How many of the given (already-confirmed) videoIds are Shorts — used
  // after confirmShorts() to split newVideosByChannel counts for the
  // notify-shorts filter (D-052).
  countShorts(videoIds: readonly string[]): number
  // liveContent is only captured at hydration time — a video hydrated before
  // the broadcast started stays 'upcoming' until re-queried. channelId
  // scopes to a single channel (B-036).
  upcomingVideoIds(channelId?: string): string[]
  // The mirror-image gap: a video hydrated while genuinely live stays 'live'
  // (duration_seconds stuck at 0) until re-queried (B-114). channelId scopes
  // to a single channel (B-036).
  liveVideoIds(channelId?: string): string[]
  recordSync(entry: SyncLogEntry): void
  lastSyncStartedAt(): string | null
  getMeta(key: string): string | null
  setMeta(key: string, value: string): void
}
