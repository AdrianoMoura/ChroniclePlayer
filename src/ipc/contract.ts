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
  channelId: string
  channelTitle: string
  publishedAt: string // ISO-8601 UTC
  durationSeconds: number | null
  thumbnailUrl: string | null
  // Shown only when the setting enables it (D-018: hidden by default).
  viewCount: number | null
  // Confirmed Short (B-028): shown in the feed, tagged with a badge,
  // hideable via SettingsDto.showShorts.
  isShort: boolean
  // Captured at hydration from snippet.liveBroadcastContent; 'none'
  // otherwise, and again once a broadcast ends (same as a normal upload).
  liveContent: 'none' | 'live' | 'upcoming'
  // liveStreamingDetails.actualStartTime, present once a broadcast (or a
  // Premiere) has actually started. Drives the "Started X ago" feed label
  // shown while liveContent === 'live' (ui/format.ts) instead of the
  // otherwise-useless "0 min ago" a live video's own effectiveDate gives.
  liveStartedAt: string | null
  // liveStreamingDetails.actualEndTime, present once a broadcast has ended,
  // even if Chronicle never observed the video while it was actually live
  // (e.g. discovered later via gap-backfill), since YouTube keeps it as
  // permanent video metadata. Drives ended-broadcast sort/bucket order
  // (core/feed.ts) — not read by any feed badge. Never set for a Premiere.
  liveEndedAt: string | null
  // Sticky — true once this was ever seen airing as a Premiere
  // (status.uploadStatus === 'processed' while liveContent === 'live').
  // Picks the red "Premiere" vs "Live" badge while liveContent === 'live';
  // afterward keeps a finished Premiere sorting like a plain video
  // (publishedAt) instead of an ended broadcast's wrap-time sort
  // (FeedList.tsx, core/feed.ts).
  isPremiere: boolean
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

// Local-only user-created playlists (never synced to YouTube). name/
// description share these caps between the renderer's own input limits and
// main.ts's boundary validation (same pattern as PLAYBACK_RATES above).
export const PLAYLIST_NAME_MAX_LENGTH = 100
export const PLAYLIST_DESCRIPTION_MAX_LENGTH = 500

export interface PlaylistDto {
  playlistId: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
  videoCount: number
  totalDurationSeconds: number
  // Up to 6 thumbnail URLs (playlist order) — the renderer arranges these
  // into the composite grid inside the same thumb area a video card uses.
  thumbnailUrls: string[]
  // D-059: the source YouTube playlist id if this came from "Import from
  // YouTube," null for an ordinary "Create Playlist" one. Gates the Sync
  // action on the playlist's own detail screen.
  sourcePlaylistId: string | null
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
  // D-050: membership in the "Custom" new-video notification scope.
  notify: boolean
  // D-060: the channel's own most recent video, for the sidebar's "Recent"
  // sort mode. Null when nothing has synced yet.
  latestPublishedAt: string | null
}

// Channel-screen-only extras (B-056) — fetched live via getChannelDetail,
// not part of the sidebar/feed's regular ChannelDto.
export interface ChannelDetailDto {
  bannerUrl: string | null
  subscriberCount: number | null
}

// A connected Google account (B-003). The OAuth client (one Google Cloud
// project) is shared across every account — only the token/scope state is
// per-account, hence no "unconfigured" state here (that's global, see
// AuthStatusDto, which still covers the primary account's own connect flow).
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
  channelId: string
  title: string
  channelTitle: string
  publishedAt: string
  durationSeconds: number | null
  thumbnailUrl: string | null
  description: string | null
  // Drives the same "Started X ago" label the feed shows (ui/format.ts's
  // feedItemLabel) while liveContent === 'live'.
  liveContent: 'none' | 'live' | 'upcoming'
  liveStartedAt: string | null
  liveEndedAt: string | null
  state: VideoStateDto
  // Lets the player offer a Subscribe/Unsubscribe toggle without a separate
  // lookup — cross-referenced against local subscription state the same way
  // search results already are.
  isSubscribed: boolean
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

// B-045: shared by the platform settings store (normalizeSettings' clamping)
// and the miniplayer's own drag-resize handle (MiniPlayerBar.tsx).
export const MINIPLAYER_MIN_WIDTH = 220
export const MINIPLAYER_MAX_WIDTH = 1280

// Mirrors platform settings.json (human-editable; local-data.md).
export interface SettingsDto {
  // D-054. 'system' resolves to the OS locale at runtime (ui/i18n); any
  // other value is a locale code (e.g. 'pt-BR') the renderer's i18n
  // registry may or may not still recognize — an unknown code just falls
  // back to English, so this layer doesn't need to validate against the
  // set of shipped locales.
  language: string
  theme: 'system' | 'dark' | 'light'
  itemSize: 'xs' | 'small' | 'medium' | 'large' | 'xl' | 'xxl' // B-007/D-037, default medium — list + grid
  layout: 'list' | 'grid' // B-007, default list
  refreshMinutes: number // 0 = manual only (D-016)
  showViewCounts: boolean // D-018
  showShorts: boolean // B-028, default true
  defaultPlaybackRate: number // D-038, default 1 — player loads already at this speed
  checkForUpdates: boolean // D-026, default true — GitHub Releases API check, notice only
  miniplayerWidth: number // B-045, default 360 — corner drag-handle sets this, persisted
  // D-050, all default off/'all': tray-resident/auto-start/notifications are
  // three independent toggles, not gated on one another.
  autoStart: boolean
  backgroundMode: boolean
  // Only takes effect when autoStart and backgroundMode are both also on.
  startMinimized: boolean
  notifyNewVideos: boolean
  // 'all' ignores the per-channel notify flag (everyone notifies); 'selected'
  // respects it — switching between the two never touches the flag itself.
  notifyScope: 'all' | 'selected'
  // D-052, default true. A Short hidden from the feed (showShorts off) never
  // notifies regardless of this flag; this only governs Shorts that *are*
  // shown. Settings hides the toggle unless showShorts is also on.
  notifyShorts: boolean
  // Convenience: favoriting/unfavoriting a channel also sets its notify flag
  // to match, unless manually changed since.
  autoNotifyFavorites: boolean
  // D-051. Only meaningful when backgroundMode is on. True (default): closing
  // the window pops a playing video into the always-on-top extract window
  // (same as pressing `p`), so closing that window stops it. False: closing
  // pauses the video in place instead.
  popOutOnClose: boolean
  // Default off. True: opening a video that's currently in the Watch Later
  // queue removes it from the queue immediately (the same removal a manual
  // toggle does, just triggered by opening rather than a click) — lets the
  // queue double as a "watch and it's gone" list instead of requiring a
  // separate untoggle per video.
  watchLaterAutoRemove: boolean
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
  durationSeconds: number | null
  // Duration-heuristic (<=60s) — no HEAD-probe confirmation step for a
  // transient result list, unlike the synced feed's D-028 pipeline.
  isShort: boolean
}

export interface SearchChannelResultDto {
  kind: 'channel'
  channelId: string
  title: string
  thumbnailUrl: string | null
  // Cross-referenced against local state so the UI shows "Subscribed", not
  // a live Subscribe button, for channels already followed.
  subscribed: boolean
  subscriberCount: number | null
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

// B-097: raw per-channel (or account-level, when channelId is null) detail
// behind channelsFailed — the banner's info affordance shows these.
export interface SyncFailureDetailDto {
  channelId: string | null
  channelTitle: string | null
  message: string
}

export interface SyncReportDto {
  outcome: 'ok' | 'partial' | 'failed' | 'quota'
  channelsPolled: number
  channelsFailed: number
  failures: SyncFailureDetailDto[]
  videosNew: number
  quotaSpent: number
  finishedAt: string
  // Filled when this run re-listed the subscription list (weekly gate or
  // the user-initiated force path, B-021); null otherwise.
  subscriptions: { added: number; removed: number } | null
}

// Backend → UI push (architecture.md §IPC: the UI never polls). Every
// refresh:started is paired with exactly one terminal event: refresh:done,
// refresh:failed, or auth:required (B-023).
export type ChronicleEventDto =
  | { type: 'refresh:started'; trigger: 'launch' | 'manual' | 'timer' }
  | { type: 'refresh:progress'; phase: 'channels' | 'shorts'; checked: number; total: number }
  // D-059: ImportPlaylistDialog's own running log — the import is a single
  // long-running IPC call with no other way to show what it's doing
  // meanwhile. 'collecting' fires once per playlistItems.list page (total
  // unknown until paging finishes); 'hydrating' fires once per 50-video
  // batch (total = every video id found while collecting).
  | { type: 'playlist:importProgress'; phase: 'meta'; count: 0; total: null }
  | { type: 'playlist:importProgress'; phase: 'collecting'; count: number; total: null }
  | { type: 'playlist:importProgress'; phase: 'hydrating'; count: number; total: number }
  | { type: 'refresh:done'; report: SyncReportDto }
  | { type: 'refresh:failed'; errorKind: string; message: string }
  | { type: 'auth:required' }
  | { type: 'quota:exceeded' }
  // D-026: a newer version was found on GitHub Releases — notice only,
  // never auto-downloads or installs.
  | { type: 'update:available'; version: string; url: string }
  // B-045: the always-on-top extract window closed — the main window picks
  // the video back up as a docked miniplayer, resuming from wherever
  // ExtractedPlayerWindow's own beforeunload last saved.
  | { type: 'player:restoreFromExtract'; videoId: string }
  // B-112: fired on every extract-window close, unlike restoreFromExtract
  // above (which only fires when auto is false) — lets the main window
  // reset its own "extract is open" tracking regardless of how the window
  // closed, so a later openVideo() call knows to go to the main window again.
  | { type: 'player:extractWindowClosed' }
  // B-112: the main window already had the extract window open when the
  // user picked a new video — sent to the extract window itself so it loads
  // this video in place, instead of also starting it in the main window.
  | { type: 'player:loadInExtract'; videoId: string; title: string }
  // D-051: the main window just closed to the tray (backgroundMode on) — the
  // renderer decides whether to pop the current video out or pause it, per
  // SettingsDto.popOutOnClose.
  | { type: 'app:closedToTray' }
  // D-056: the extracted live-chat popup closed (any reason — user closed
  // it, or a new extractChat() call replaced it). The renderer restores the
  // docked chat column if the full player view for this video is still open;
  // otherwise it just marks chat closed, same as the video's own restore-vs-
  // just-close split above, but unconditional (no `auto` flag — the chat
  // popup is never auto-opened, so there's nothing to distinguish).
  | { type: 'chat:extractWindowClosed'; videoId: string }

export const IpcChannel = {
  getFeed: 'feed:get',
  getFeedMeta: 'feed:meta',
  getChannels: 'feed:channels',
  refreshFeed: 'feed:refresh',
  setReadStatus: 'state:setReadStatus',
  markAllRead: 'state:markAllRead',
  toggleFavorite: 'state:toggleFavorite',
  toggleWatchLater: 'state:toggleWatchLater',
  reorderWatchLater: 'state:reorderWatchLater',
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
  requestWriteScope: 'auth:requestWriteScope',
  requestWriteScopeForChannel: 'auth:requestWriteScopeForChannel',
  windowControl: 'window:control',
  unsubscribeChannel: 'channel:unsubscribe',
  toggleChannelFavorite: 'channel:toggleFavorite',
  toggleChannelNotify: 'channel:toggleNotify',
  bulkSetChannelNotifyForFavorites: 'channel:bulkSetNotifyForFavorites',
  getPriorityFeed: 'feed:priority',
  getNextWatchLater: 'feed:nextWatchLater',
  backfillChannelArchive: 'channel:backfillArchive',
  subscribeChannel: 'channel:subscribe',
  getChannelDetail: 'channel:getDetail',
  getChannelVideos: 'channel:getVideos',
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
  getAppVersion: 'app:getVersion',
  openYouTubeSignIn: 'auth:openYouTubeSignIn',
  extractPlayer: 'player:extract',
  loadInExtractWindow: 'player:loadInExtract',
  extractChat: 'chat:extract',
  listPlaylists: 'playlist:list',
  createPlaylist: 'playlist:create',
  updatePlaylist: 'playlist:update',
  deletePlaylist: 'playlist:delete',
  getPlaylistVideos: 'playlist:getVideos',
  addVideoToPlaylist: 'playlist:addVideo',
  removeVideoFromPlaylist: 'playlist:removeVideo',
  getPlaylistsForVideo: 'playlist:getForVideo',
  reorderPlaylist: 'playlist:reorder',
  getNextInPlaylist: 'playlist:getNext',
  importPlaylist: 'playlist:import',
  checkPlaylistUpdates: 'playlist:checkUpdates',
  syncPlaylist: 'playlist:sync',
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
  // Persists a drag-and-drop reorder of the Watch Later view. videoIds is
  // the full queue in its new order; entries not currently in the queue
  // are ignored.
  reorderWatchLater(videoIds: string[]): Promise<void>
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
  // Runs the incremental write-scope consent flow for the primary account
  // (opens the system browser) — called only after the user has confirmed
  // an in-app dialog explaining why, never silently by a write action itself.
  requestWriteScope(): Promise<ResultDto<void>>
  // Same consent flow, but for whichever account actually owns channelId —
  // unsubscribe (B-003 multi-account) needs the owning account's grant, not
  // necessarily the primary account's.
  requestWriteScopeForChannel(channelId: string): Promise<ResultDto<void>>
  // Wizard Step 7 validation: proves the token works and the API is enabled
  // (1 quota unit); failures map back to the responsible step (D-014).
  getConnectedChannel(): Promise<ResultDto<{ title: string }>>
  getWizardState(): Promise<WizardStateDto>
  setWizardState(state: WizardStateDto): Promise<void>
  getSettings(): Promise<{ settings: SettingsDto; warning: string | null }>
  setSettings(settings: SettingsDto): Promise<void>
  // Settings' About line + the D-026 update check's "current version" baseline.
  getAppVersion(): Promise<string>
  // Opens a plain window (system chrome, no custom frame) at youtube.com in the
  // app's own persistent session — the same one the embedded player's iframe
  // uses, since the OAuth connect flow (D-001/D-012) runs in the system
  // browser and never touches this one. Signing in here is what lets the
  // player pass YouTube's bot-check (B-093). `title`, when given, overrides
  // the window's OS-level title (it would otherwise just mirror youtube.com's
  // own page title, indistinguishable from any other plain YouTube window —
  // e.g. the live chat sign-in link, D-056 — in a taskbar/compositor context,
  // same reasoning as `extractPlayer`'s own `title` param).
  openYouTubeSignIn(title?: string): Promise<void>
  // Pops the player into its own always-on-top OS window (B-045). There's no
  // way to move the live iframe's DOM node into a different renderer process,
  // so this hands off a snapshot (position, playing/paused) to a fresh
  // instance instead. `auto` marks an extraction triggered by closing to the
  // tray rather than pressing `p`, so the extract window's close stops the
  // video instead of restoring it to the main window (D-051). `title` sets
  // the window's OS-level title so it's distinguishable from the main window
  // in a taskbar/compositor context.
  extractPlayer(
    videoId: string,
    title: string,
    currentTimeSeconds: number,
    playing: boolean,
    defaultPlaybackRate: number,
    auto: boolean
  ): Promise<void>
  // B-112: sends a newly-selected video to the already-open extract window
  // instead of also starting it in the main window. Resolves false if no
  // extract window is open (a race), so the caller falls back to opening
  // normally in the main window.
  loadInExtractWindow(videoId: string, title: string): Promise<boolean>
  // D-056: opens the video's live chat (YouTube's own `live_chat` embed) in
  // its own always-on-top-free popup window — a bare top-level navigation to
  // youtube.com, not a Chronicle-authored page, so no postMessage bridge and
  // no title override are needed (the window naturally takes YouTube's own
  // page title, already distinct from "Chronicle"). Manual only — never
  // auto-opened, and fully independent of extractPlayer above.
  extractChat(videoId: string): Promise<void>
  // Playlists (local-only, never synced to YouTube) — newest-created first.
  listPlaylists(): Promise<PlaylistDto[]>
  createPlaylist(name: string, description: string | null): Promise<PlaylistDto>
  // Covers both the name and description edit affordances (ui.md) — always
  // sends both fields, whichever one the user actually touched.
  updatePlaylist(playlistId: string, name: string, description: string | null): Promise<PlaylistDto>
  deletePlaylist(playlistId: string): Promise<void>
  // Ordered by position, like the Watch Later queue — not a paged,
  // chronological feed view.
  getPlaylistVideos(playlistId: string): Promise<FeedVideoDto[]>
  // Idempotent — the Add to Playlist dialog just calls this per checkbox.
  addVideoToPlaylist(playlistId: string, videoId: string): Promise<void>
  removeVideoFromPlaylist(playlistId: string, videoId: string): Promise<void>
  // Drives the Add to Playlist dialog's checkbox state.
  getPlaylistsForVideo(videoId: string): Promise<string[]>
  // Persists a drag-and-drop reorder — same shape as reorderWatchLater.
  reorderPlaylist(playlistId: string, videoIds: string[]): Promise<void>
  // The player's "up next" card when the ended video was opened from this
  // playlist (mirrors getNextWatchLater, D-055) — null once there's nothing
  // left to suggest.
  getNextInPlaylist(playlistId: string, currentVideoId: string): Promise<FeedVideoDto | null>
  // D-059: paste any YouTube playlist URL, creates a new local Playlist
  // pre-named from the source's own title/description, populated with the
  // same videos in the same order. A one-time snapshot — never an ongoing
  // sync (imported is best-effort: a deleted/private video inside the
  // source is silently skipped rather than aborting the whole import).
  importPlaylist(
    url: string
  ): Promise<ResultDto<{ playlist: PlaylistDto; imported: number; total: number }>>
  // D-059: how many videos the source playlist has that this local copy
  // doesn't yet — only meaningful when sourcePlaylistId is set. Drives the
  // Sync button's badge; run on that screen's own mount, same "fetch fresh
  // on every visit" precedent as the channel screen's banner/subscriber
  // count.
  checkPlaylistUpdates(playlistId: string): Promise<ResultDto<{ newCount: number }>>
  // D-059: add-only — appends whatever checkPlaylistUpdates would report,
  // never removes/reorders/renames anything already here.
  syncPlaylist(playlistId: string): Promise<ResultDto<{ playlist: PlaylistDto; added: number }>>
  // Frameless-shell titlebar (B-014). On macOS the native traffic lights
  // stay, so the custom buttons are hidden there via `platform`.
  windowControl(action: WindowControlDto): Promise<void>
  platform: string
  // Best-effort: Electron doesn't expose the Wayland compositor's
  // xdg_toplevel wm_capabilities (how native GTK/Qt apps know to hide
  // unusable controls), so this flags scrolling/tiling compositors that
  // don't support minimize (niri, sway, i3) to hide the button instead.
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
  // D-050: local-only per-channel notify flag (the "Selected Channels" scope
  // membership) — never touches YouTube. Returns the new notify state.
  toggleChannelNotify(channelId: string): Promise<boolean>
  // D-050: bulk-applies the notify flag to every currently-favorited channel
  // — used both when "auto-enable on favorite" is turned on (enable=true)
  // and, if the user confirms, when it's turned back off (enable=false).
  bulkSetChannelNotifyForFavorites(enable: boolean): Promise<void>
  // B-042: unread videos from favorited channels, capped and bucket-less
  // (D-039) — additive to, not a filter over, the main feed.
  getPriorityFeed(accountId?: string | null): Promise<FeedVideoDto[]>
  // D-055: the player's "up next" card on video end — the Watch Later
  // queue's FIFO suggestion for whatever just finished. Null once there's
  // nothing left to suggest.
  getNextWatchLater(currentVideoId: string): Promise<FeedVideoDto | null>
  // B-002: on-demand back-catalog fetch (uploads playlist paging + hydration,
  // ~2 units/call) — triggered when scrolling past the local archive in a
  // channel-filtered view. Resumable across calls; exhausted once the
  // channel's whole uploads playlist has been walked.
  backfillChannelArchive(
    channelId: string
  ): Promise<ResultDto<{ videosNew: number; exhausted: boolean }>>
  // D-031: search.list, 100 units/call — explicit user-typed queries
  // only, fired on Enter. pageToken continues the same query.
  searchYouTube(
    query: string,
    pageToken?: string | null
  ): Promise<ResultDto<{ results: SearchResultDto[]; nextPageToken: string | null }>>
  // subscriptions.insert (D-030, 50 units) — the other half of B-010's
  // unsubscribe; shares the same incremental write-scope consent (D-032).
  subscribeChannel(channelId: string): Promise<ResultDto<void>>
  // channels.list (1 unit) — banner/subscriber count for the channel screen,
  // fetched fresh on open rather than cached in the DB.
  getChannelDetail(channelId: string): Promise<ResultDto<ChannelDetailDto>>
  // Browsing a not-yet-subscribed channel's uploads from its screen (entry
  // point: a search channel result). Never persisted to the local DB —
  // channels.list (1) + playlistItems.list (1) + videos.list (1), all
  // batched, per page; see youtube-api.md.
  getChannelVideos(
    channelId: string,
    pageToken?: string | null
  ): Promise<ResultDto<{ videos: SearchVideoResultDto[]; nextPageToken: string | null }>>
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
