// Typed IPC contract between the backend (platform/) and the renderer (ui/).
// architecture.md §Dependency rule: ui/ imports only from this module; this
// module imports from no other layer. Feed reads cross this boundary as
// read-model DTOs — grouping/bucketing happens in core/, never in the UI.

export type FeedViewDto = 'all' | 'unread' | 'favorites' | 'watch-later' | 'ignored'
export type FeedBucketDto = 'today' | 'yesterday' | 'this-week' | 'earlier'
export type ReadStatusDto = 'unread' | 'read' | 'ignored'

export interface VideoStateDto {
  readStatus: ReadStatusDto
  favorite: boolean
  watchLater: boolean
  // Player-only; null once finished or never played.
  resumePositionSeconds: number | null
}

export interface FeedVideoDto {
  videoId: string
  title: string
  channelTitle: string
  publishedAt: string // ISO-8601 UTC
  durationSeconds: number | null
  thumbnailUrl: string | null
  // Shown only when the setting enables it (D-018: hidden by default).
  viewCount: number | null
  // Confirmed Short (B-028, supersedes D-028's unconditional exclusion):
  // shown in the feed, tagged with a badge, hideable via SettingsDto.showShorts.
  isShort: boolean
  // Captured at hydration from snippet.liveBroadcastContent; 'none' otherwise.
  liveContent: 'none' | 'live' | 'upcoming'
  state: VideoStateDto
  // Assigned by core; null in the watch-later queue (ordered by position).
  // The UI renders a header whenever the bucket changes between rows, so
  // pages concatenate without any regrouping on the renderer side.
  bucket: FeedBucketDto | null
}

export interface FeedCursorDto {
  publishedAt: string
  channelTitle: string
  videoId: string
}

export interface FeedSliceDto {
  view: FeedViewDto
  videos: FeedVideoDto[]
  // Continuous scroll over the local archive (D-027): pass back to getFeed
  // to load the next page. null = the archive end (or a non-paged view).
  nextCursor: FeedCursorDto | null
  unreadCount: number
  caughtUp: boolean
}

export interface FeedMetaDto {
  unreadCount: number
  caughtUp: boolean
  lastRefreshAt: string | null
  // Watch Later queue size for the sidebar badge (B-025).
  watchLaterCount: number
  // True while a sync is running, so a renderer that mounts (or reloads)
  // mid-sync can adopt the in-flight state instead of relying only on
  // events it may have missed (B-023).
  refreshing: boolean
}

export interface ChannelDto {
  channelId: string
  title: string
  thumbnailUrl: string | null
  // Unread videos for the sidebar badge (B-008); Shorts count unless hidden
  // by the showShorts setting (B-028).
  unreadCount: number
  // Channel-level priority marker (B-042) — distinct from a video's own
  // favorite (VideoStateDto.favorite).
  favorite: boolean
}

// B-003: a connected Google account. The OAuth client (one Google Cloud
// project) is shared across every account — only the token/scope state is
// per-account, hence no "unconfigured" state here (that's global, see
// AuthStatusDto — still used for the first/primary account's own connect
// flow, which is unchanged by multi-account: Settings keeps managing that
// one account exactly as before; the sidebar Accounts section manages the
// rest).
export interface AccountDto {
  accountId: string
  label: string
  connected: boolean
  writeScopeGranted: boolean
  isPrimary: boolean
}

// Expected failures cross the boundary as values, not thrown strings
// (architecture.md: errors are values at boundaries).
export type ResultDto<T> =
  | { ok: true; value: T }
  | { ok: false; errorKind: string; message: string }

// Player view read-model (playback.md). Description may be truncated for
// locally stored videos (local-data.md stores ~500 chars).
export interface PlayerVideoDto {
  videoId: string
  title: string
  channelTitle: string
  publishedAt: string
  durationSeconds: number | null
  thumbnailUrl: string | null
  description: string | null
  state: VideoStateDto
}

// Wizard progress (onboarding.md §Design goals: interruptible/resumable).
// Persisted locally in the meta table; email is used only to prefill the
// Test-user step and never leaves the machine.
export interface WizardStateDto {
  step: number
  email: string
  confirmed: Record<string, boolean>
  published: 'yes' | 'skipped' | null
  completed: boolean
}

// Mirrors the YouTube IFrame API's fixed rate set (getAvailablePlaybackRates) —
// shared by the platform settings store and the Settings UI (D-038).
export const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const

// Mirrors platform settings.json (human-editable; local-data.md).
export interface SettingsDto {
  theme: 'system' | 'dark' | 'light'
  itemSize: 'xs' | 'small' | 'medium' | 'large' | 'xl' // B-007/D-037, default medium — list + grid
  layout: 'list' | 'grid' // B-007, default list
  refreshMinutes: number // 0 = manual only (D-016)
  showViewCounts: boolean // D-018
  showShorts: boolean // B-028, default true
  defaultPlaybackRate: number // D-038, default 1 — player loads already at this speed
}

// B-009/D-031: a free-text search result — video or channel, across all of
// YouTube, not just subscribed content. Never stored or injected into the
// feed; exists only for the lifetime of one search.
export interface SearchVideoResultDto {
  kind: 'video'
  videoId: string
  title: string
  channelId: string
  channelTitle: string
  publishedAt: string
  thumbnailUrl: string | null
}

export interface SearchChannelResultDto {
  kind: 'channel'
  channelId: string
  title: string
  thumbnailUrl: string | null
  // Cross-referenced against local state so the UI shows "Subscribed", not
  // a live Subscribe button, for channels already followed.
  subscribed: boolean
}

export type SearchResultDto = SearchVideoResultDto | SearchChannelResultDto

// B-006: one level of nesting only, matching YouTube's own comment model.
export interface CommentDto {
  commentId: string
  authorDisplayName: string
  authorProfileImageUrl: string | null
  textDisplay: string
  publishedAt: string
  likeCount: number
  replies: CommentDto[]
}

export type VideoRatingDto = 'like' | 'dislike' | 'none'

export type AuthStateDto = 'unconfigured' | 'disconnected' | 'connected'

export interface AuthStatusDto {
  state: AuthStateDto
  // false = D-013 fallback encryption; the UI shows the honest warning.
  secureStorage: boolean
  // B-015/D-032: true once youtube.force-ssl has been granted (first write
  // action) — drives the Settings screen's granted-scope description.
  writeScopeGranted: boolean
}

export interface SyncReportDto {
  outcome: 'ok' | 'partial' | 'failed' | 'quota'
  channelsPolled: number
  channelsFailed: number
  videosNew: number
  quotaSpent: number
  finishedAt: string
  // Filled when this run re-listed the subscription list (weekly gate or
  // the user-initiated force path, B-021); null otherwise.
  subscriptions: { added: number; removed: number } | null
}

// Backend → UI push (architecture.md §IPC: the UI never polls).
// Every refresh:started is paired with exactly one terminal event:
// refresh:done, refresh:failed, or auth:required (B-023 — a started with
// no terminal event left the spinner running forever).
export type ChronicleEventDto =
  | { type: 'refresh:started'; trigger: 'launch' | 'manual' | 'timer' }
  | { type: 'refresh:progress'; phase: 'channels' | 'shorts'; checked: number; total: number }
  | { type: 'refresh:done'; report: SyncReportDto }
  | { type: 'refresh:failed'; errorKind: string; message: string }
  | { type: 'auth:required' }
  | { type: 'quota:exceeded' }

export const IpcChannel = {
  getFeed: 'feed:get',
  getFeedMeta: 'feed:meta',
  getChannels: 'feed:channels',
  refreshFeed: 'feed:refresh',
  setReadStatus: 'state:setReadStatus',
  markAllRead: 'state:markAllRead',
  toggleFavorite: 'state:toggleFavorite',
  toggleWatchLater: 'state:toggleWatchLater',
  setResumePosition: 'state:setResumePosition',
  openInBrowser: 'system:openInBrowser',
  openExternalUrl: 'system:openExternalUrl',
  getVideo: 'video:get',
  getAuthStatus: 'auth:status',
  getConnectedChannel: 'auth:whoami',
  getWizardState: 'wizard:get',
  setWizardState: 'wizard:set',
  getSettings: 'settings:get',
  setSettings: 'settings:set',
  exportData: 'data:export',
  deleteAllData: 'data:deleteAll',
  importClientSecret: 'auth:importClientSecret',
  connectGoogle: 'auth:connect',
  signOut: 'auth:signOut',
  windowControl: 'window:control',
  unsubscribeChannel: 'channel:unsubscribe',
  toggleChannelFavorite: 'channel:toggleFavorite',
  getPriorityFeed: 'feed:priority',
  backfillChannelArchive: 'channel:backfillArchive',
  subscribeChannel: 'channel:subscribe',
  searchYouTube: 'youtube:search',
  getComments: 'video:getComments',
  postComment: 'video:postComment',
  replyToComment: 'video:replyToComment',
  rateVideo: 'video:rate',
  getVideoRating: 'video:getRating',
  listAccounts: 'accounts:list',
  startAddAccount: 'accounts:startAdd',
  connectAccount: 'accounts:connect',
  removeAccount: 'accounts:remove',
  syncAccountNow: 'accounts:syncNow',
  events: 'chronicle:event'
} as const

// Custom window controls for the frameless shell (B-014).
export type WindowControlDto = 'minimize' | 'toggle-maximize' | 'close'

// The surface preload exposes as window.chronicle.
export interface ChronicleApi {
  // accountId (B-003) narrows the combined feed to one account; omit/null
  // for every connected account combined (the default).
  getFeed(
    view: FeedViewDto,
    cursor: FeedCursorDto | null,
    channelId?: string | null,
    accountId?: string | null
  ): Promise<FeedSliceDto>
  getFeedMeta(accountId?: string | null): Promise<FeedMetaDto>
  getChannels(accountId?: string | null): Promise<ChannelDto[]>
  // channelId scopes the sync to one channel (B-036) — omit/null for the
  // full subscription refresh. accountId (B-003) scopes to one account;
  // omit/null refreshes every connected account.
  refreshFeed(channelId?: string | null, accountId?: string | null): Promise<ResultDto<SyncReportDto>>
  setReadStatus(videoId: string, status: ReadStatusDto): Promise<VideoStateDto>
  // Bulk unread → read over the feed or one channel (B-020, D-010
  // semantics). Returns how many videos changed. accountId (B-003) narrows
  // to one account.
  markAllRead(channelId: string | null, accountId?: string | null): Promise<number>
  toggleFavorite(videoId: string): Promise<VideoStateDto>
  toggleWatchLater(videoId: string): Promise<VideoStateDto>
  // Persisted on pause/unmount, read back to resume playback. null clears
  // it (finished, or never played).
  setResumePosition(videoId: string, seconds: number | null): Promise<VideoStateDto>
  // Per-video escape hatch (ui.md `b`); the backend builds the URL.
  openInBrowser(videoId: string): Promise<void>
  // Non-video links from descriptions (D-029: browser, always).
  openExternalUrl(url: string): Promise<void>
  // Local videos come from the DB; unknown ones are hydrated on demand
  // (videos.list, 1 unit) and stored outside the feed (D-029).
  getVideo(videoId: string): Promise<ResultDto<PlayerVideoDto>>
  getAuthStatus(): Promise<AuthStatusDto>
  importClientSecret(json: string): Promise<ResultDto<AuthStatusDto>>
  connectGoogle(): Promise<ResultDto<AuthStatusDto>>
  signOut(): Promise<AuthStatusDto>
  // Wizard Step 7 validation: proves the token works and the API is enabled
  // (1 quota unit); failures map back to the responsible step (D-014).
  getConnectedChannel(): Promise<ResultDto<{ title: string }>>
  getWizardState(): Promise<WizardStateDto>
  setWizardState(state: WizardStateDto): Promise<void>
  getSettings(): Promise<{ settings: SettingsDto; warning: string | null }>
  setSettings(settings: SettingsDto): Promise<void>
  // Frameless-shell titlebar (B-014). On macOS the native traffic lights
  // stay, so the custom buttons are hidden there via `platform`.
  windowControl(action: WindowControlDto): Promise<void>
  platform: string
  // Best-effort (Electron doesn't expose the Wayland compositor's
  // xdg_toplevel wm_capabilities, which is how native GTK/Qt apps know to
  // hide controls the compositor won't honor): false hides the Minimize
  // button on compositors known not to support it — scrolling/tiling ones
  // like niri, by the same design stance as sway/i3.
  minimizeSupported: boolean
  // Writes the documented JSON export (FORMAT.md) where the user chooses.
  exportData(): Promise<ResultDto<{ path: string; videos: number; states: number }>>
  // Removes the database, secrets and caches, then relaunches (local-data.md
  // §Privacy invariants). The UI confirms before calling.
  deleteAllData(): Promise<void>
  // Real subscriptions.delete (B-010, 50 units) plus the local soft-delete.
  // Requests the youtube.force-ssl write scope incrementally on first use
  // (D-032) — may briefly open the system browser for consent.
  unsubscribeChannel(channelId: string): Promise<ResultDto<void>>
  // B-042: local-only channel priority marker — never touches YouTube.
  // Returns the new favorite state.
  toggleChannelFavorite(channelId: string): Promise<boolean>
  // B-042: unread videos from favorited channels, capped and bucket-less
  // (D-039) — additive to, not a filter over, the main feed.
  getPriorityFeed(accountId?: string | null): Promise<FeedVideoDto[]>
  // B-002: on-demand back-catalog fetch (uploads playlist paging + hydration,
  // ~2 units/call) — triggered when scrolling past the local archive in a
  // channel-filtered view. Resumable across calls; exhausted once the
  // channel's whole uploads playlist has been walked.
  backfillChannelArchive(
    channelId: string
  ): Promise<ResultDto<{ videosNew: number; exhausted: boolean }>>
  // B-009/D-031: search.list, 100 units/call — explicit user-typed queries
  // only, surfaced as a scope toggle next to the local filter.
  searchYouTube(query: string): Promise<ResultDto<SearchResultDto[]>>
  // subscriptions.insert (D-030, 50 units) — the other half of B-010's
  // unsubscribe; shares the same incremental write-scope consent (D-032).
  subscribeChannel(channelId: string): Promise<ResultDto<void>>
  // B-006: commentThreads.list (1 unit/page) — public, readonly scope suffices.
  getComments(
    videoId: string,
    pageToken?: string | null
  ): Promise<ResultDto<{ comments: CommentDto[]; nextPageToken: string | null }>>
  // commentThreads.insert (50 units, write scope, D-032).
  postComment(videoId: string, text: string): Promise<ResultDto<CommentDto>>
  // comments.insert (50 units, write scope) — replies to a top-level comment.
  replyToComment(parentId: string, text: string): Promise<ResultDto<CommentDto>>
  // videos.rate (50 units, write scope). No public API exists to like a
  // *comment* — only videos; see B-006's notes.
  rateVideo(videoId: string, rating: 'like' | 'none'): Promise<ResultDto<void>>
  // videos.getRating (1 unit, readonly scope) — the user's own existing rating.
  getVideoRating(videoId: string): Promise<ResultDto<VideoRatingDto>>
  // B-003: connected accounts, oldest first. The very first/primary account
  // (Settings' Connection section, the first-run wizard) is unaffected by
  // any of this — these five methods manage every *additional* account.
  listAccounts(): Promise<AccountDto[]>
  // Allocates a fresh account id for the "add another account" flow (no
  // Google-console walkthrough — the same OAuth client is reused, the user
  // just needs to add the new email as a Test user, then connect) and
  // reports whether this is the very first account ever (drives whether the
  // UI shows the full wizard or the shortened reminder+Connect flow).
  startAddAccount(): Promise<{ accountId: string; isFirstAccount: boolean }>
  // Runs the connect handshake (system browser + loopback) for the given
  // account id — freshly allocated (startAddAccount) or an existing one
  // being reconnected. Persists the account on success.
  connectAccount(accountId: string): Promise<ResultDto<AccountDto>>
  // Revokes the token best-effort and removes the account's local
  // subscriptions (account_channels) — channels/videos/local states from
  // other accounts or externally opened videos are untouched.
  removeAccount(accountId: string): Promise<void>
  syncAccountNow(accountId: string): Promise<ResultDto<SyncReportDto>>
  onEvent(listener: (event: ChronicleEventDto) => void): () => void
}
