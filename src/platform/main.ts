import { app, BrowserWindow, dialog, ipcMain, protocol, safeStorage, shell } from 'electron'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { DatabaseSync } from 'node:sqlite'
import { openDatabase } from '../adapters/storage/database'
import { migrate } from '../adapters/storage/migrations'
import {
  SqliteCatalogRepository,
  SqliteFeedRepository,
  SqliteStateRepository
} from '../adapters/storage/repositories'
import { SqliteSyncRepository } from '../adapters/storage/sync-repository'
import { FileSecretStore, type SecretCipher } from '../adapters/secrets/file-secret-store'
import { MachineKeyCipher } from '../adapters/secrets/machine-key-cipher'
import { GoogleOAuth } from '../adapters/oauth/google-oauth'
import { AuthFlow, GoogleAuthProvider } from '../adapters/oauth/auth'
import { YouTubeApiClient, type Comment, type SearchResult } from '../adapters/youtube/api-client'
import { HeadShortsProber } from '../adapters/youtube/shorts-prober'
import { HybridVideoSource } from '../adapters/youtube/video-source'
import { YouTubeRssClient } from '../adapters/rss/rss-client'
import { FeedService, type FeedItem, type FeedSlice } from '../core/feed-service'
import { startOfToday } from '../core/feed'
import { isDomainError } from '../core/errors'
import { QuotaCounter, type Clock } from '../core/ports'
import { SyncService, type SyncReport, type SyncTrigger } from '../core/sync-service'
import type { VideoState } from '../core/state'
import { FEED_VIEWS, type FeedView } from '../core/views'
import type {
  AuthStatusDto,
  ChronicleEventDto,
  CommentDto,
  FeedCursorDto,
  FeedSliceDto,
  FeedVideoDto,
  PlayerVideoDto,
  ReadStatusDto,
  ResultDto,
  SearchResultDto,
  SyncReportDto,
  VideoRatingDto,
  VideoStateDto,
  WizardStateDto
} from '../ipc/contract'
import { IpcChannel } from '../ipc/contract'
import { chronicleDataDir } from './data-dir'
import { seedDevFixtures } from './dev-fixtures'
import { loadSettings, normalizeSettings, saveSettings, type AppSettings } from './settings-store'
import { ThumbnailCache, chronicleCacheDir } from './thumbnail-cache'

const clock: Clock = { now: () => new Date() }

// Chromium only auto-detects the keychain on desktops it knows (GNOME, KDE…).
// On anything else (niri, sway, headless) it silently picks basic_text even
// when org.freedesktop.secrets is live on D-Bus. Requesting gnome-libsecret
// explicitly is safe: if no Secret Service answers, isEncryptionAvailable()
// stays false and chooseSecretStore falls back to the machine key (D-013).
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('password-store', 'gnome-libsecret')
}

// thumb:// serves cached thumbnails to the renderer (ui.md: disk cache with
// LRU cap; architecture.md: the renderer never fetches Google directly).
protocol.registerSchemesAsPrivileged([
  { scheme: 'thumb', privileges: { standard: true, secure: true, stream: true } }
])

// Refresh triggers (youtube-api.md §Refresh policy): every launch (B-011),
// manual always, background timer while running. Interval per D-016 —
// default 30 min, user-configurable down to 15 min or manual-only.

function toStateDto(state: VideoState): VideoStateDto {
  return { readStatus: state.readStatus, favorite: state.favorite, watchLater: state.watchLater }
}

function toVideoDto({ entry, bucket }: FeedItem): FeedVideoDto {
  return {
    videoId: entry.video.videoId,
    title: entry.video.title,
    channelTitle: entry.channelTitle,
    publishedAt: entry.video.publishedAt,
    durationSeconds: entry.video.durationSeconds,
    thumbnailUrl: entry.video.thumbnailUrl,
    viewCount: entry.video.viewCount,
    isShort: entry.video.isShort,
    state: toStateDto(entry.state),
    bucket
  }
}

function toSliceDto(slice: FeedSlice): FeedSliceDto {
  return {
    view: slice.view,
    videos: slice.items.map(toVideoDto),
    nextCursor: slice.nextCursor,
    unreadCount: slice.unreadCount,
    caughtUp: slice.caughtUp
  }
}

function toReportDto(report: SyncReport): SyncReportDto {
  return {
    outcome: report.outcome,
    channelsPolled: report.channelsPolled,
    channelsFailed: report.channelsFailed,
    videosNew: report.videosNew,
    quotaSpent: report.quotaSpent,
    finishedAt: report.finishedAt,
    subscriptions: report.subscriptions
  }
}

// IPC inputs cross a trust boundary — compile-time types don't survive it.
function parseView(value: unknown): FeedView {
  if (typeof value === 'string' && (FEED_VIEWS as readonly string[]).includes(value)) {
    return value as FeedView
  }
  throw new Error(`invalid feed view: ${String(value)}`)
}

function parseReadStatus(value: unknown): ReadStatusDto {
  if (value === 'unread' || value === 'read' || value === 'ignored') return value
  throw new Error(`invalid read status: ${String(value)}`)
}

function parseVideoId(value: unknown): string {
  if (typeof value === 'string' && /^[\w-]{1,64}$/.test(value)) return value
  throw new Error('invalid video id')
}

function parseChannelId(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'string' && /^[\w-]{1,64}$/.test(value)) return value
  throw new Error('invalid channel id')
}

function parseChannelIdRequired(value: unknown): string {
  if (typeof value === 'string' && /^[\w-]{1,64}$/.test(value)) return value
  throw new Error('invalid channel id')
}

function parseCursor(value: unknown): FeedCursorDto | null {
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

// D-013 cipher selection: (a) Electron safeStorage when a real OS keychain
// backs it; (b) machine-derived key otherwise (honest obfuscation — the UI
// warns). The choice is pinned inside the store file so entries written by
// one cipher keep decrypting even if the machine later gains a keychain.
function chooseSecretStore(file: string): FileSecretStore {
  const safeStorageUsable =
    safeStorage.isEncryptionAvailable() &&
    (process.platform !== 'linux' || safeStorage.getSelectedStorageBackend() !== 'basic_text')

  const ciphers: Record<string, SecretCipher> = {
    'safe-storage': {
      encrypt: (plain) => safeStorage.encryptString(plain),
      decrypt: (data) => safeStorage.decryptString(data),
      isSecure: () => true
    },
    'machine-key': new MachineKeyCipher()
  }

  const pinned = FileSecretStore.storedCipherId(file)
  const chosen =
    pinned !== null && pinned in ciphers ? pinned : safeStorageUsable ? 'safe-storage' : 'machine-key'
  return new FileSecretStore(file, ciphers[chosen], chosen)
}

const RENDERER_URL_ARG_PREFIX = '--chronicle-renderer-url='

// B-022: `app.relaunch()` has no `env` option (only `args`/`execPath`), so a
// dev renderer URL that only lives in `process.env['ELECTRON_RENDERER_URL']`
// (set by electron-vite's dev orchestrator on the original process) is not
// guaranteed to reach the relaunched instance the same way. Falling through
// to `loadFile()` in dev would try to load a renderer bundle that only
// exists in a packaged build — exactly the blank/frozen window reported
// after "Delete all data". Reading it from argv too removes the dependency
// on env-inheritance behavior entirely; `deleteAllData` below writes it into
// `args` before relaunching.
function devRendererUrl(): string | undefined {
  const fromEnv = process.env['ELECTRON_RENDERER_URL']
  if (fromEnv) return fromEnv
  const fromArgv = process.argv.find((arg) => arg.startsWith(RENDERER_URL_ARG_PREFIX))
  return fromArgv?.slice(RENDERER_URL_ARG_PREFIX.length)
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#101014',
    // Frameless shell (B-014): Chronicle draws its own titlebar. On macOS
    // the native traffic lights are kept as an overlay instead.
    ...(process.platform === 'darwin'
      ? { titleBarStyle: 'hidden' as const }
      : { frame: false }),
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  })

  const rendererUrl = devRendererUrl()
  if (!app.isPackaged && rendererUrl) {
    void window.loadURL(rendererUrl)
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function broadcast(event: ChronicleEventDto): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(IpcChannel.events, event)
  }
}

let db: DatabaseSync | undefined

void app.whenReady().then(() => {
  const dataDir = chronicleDataDir()
  mkdirSync(dataDir, { recursive: true })
  // Migrations run before anything reads the DB (local-data.md §Migrations).
  db = openDatabase(join(dataDir, 'chronicle.db'))
  migrate(db)

  // Composition root: adapters implement core ports; core never sees
  // SQLite, Electron or Google.
  const feedRepository = new SqliteFeedRepository(db)
  const stateRepository = new SqliteStateRepository(db, clock)
  const catalogRepository = new SqliteCatalogRepository(db, clock)
  const syncRepository = new SqliteSyncRepository(db)
  const feedService = new FeedService(feedRepository, clock)

  const secrets = chooseSecretStore(join(dataDir, 'secrets.json'))
  const oauth = new GoogleOAuth(fetch)
  const authProvider = new GoogleAuthProvider(secrets, oauth, clock)
  const authFlow = new AuthFlow(secrets, oauth, (url) => shell.openExternal(url))
  const quota = new QuotaCounter()
  const apiClient = new YouTubeApiClient(authProvider, fetch, quota)
  const syncService = new SyncService({
    subscriptions: apiClient,
    videoSource: new HybridVideoSource(new YouTubeRssClient(fetch), apiClient),
    repo: syncRepository,
    shortsProber: new HeadShortsProber(fetch),
    quota,
    clock,
    onProgress: (progress) =>
      broadcast({
        type: 'refresh:progress',
        phase: progress.phase,
        checked: progress.checked,
        total: progress.total
      })
  })

  if (!app.isPackaged && process.env['CHRONICLE_FIXTURES'] === '1') {
    seedDevFixtures(catalogRepository, stateRepository, clock, syncRepository)
  }

  const thumbnails = new ThumbnailCache(chronicleCacheDir(), fetch)
  thumbnails.enforceCap()
  protocol.handle('thumb', async (request) => {
    // Parsed by prefix, not by URL(): standard-scheme normalization must not
    // touch the percent-encoded source URL.
    const sourceUrl = decodeURIComponent(request.url.replace(/^thumb:\/\/img\//, ''))
    const body = await thumbnails.get(sourceUrl)
    if (body === null) return new Response(null, { status: 404 })
    return new Response(new Uint8Array(body), {
      headers: { 'cache-control': 'max-age=86400' }
    })
  })

  function authStatus(): AuthStatusDto {
    const state = !authFlow.hasClientSecret()
      ? 'unconfigured'
      : authFlow.hasRefreshToken()
        ? 'connected'
        : 'disconnected'
    return { state, secureStorage: secrets.isSecure(), writeScopeGranted: authFlow.hasWriteScope() }
  }

  let refreshing = false
  async function runRefresh(
    trigger: SyncTrigger,
    channelId?: string
  ): Promise<ResultDto<SyncReportDto>> {
    if (refreshing) return { ok: false, errorKind: 'busy', message: 'a refresh is already running' }
    if (!authFlow.hasRefreshToken()) {
      return { ok: false, errorKind: 'auth-expired', message: 'not connected to Google' }
    }
    refreshing = true
    broadcast({ type: 'refresh:started', trigger })
    try {
      const report = await syncService.refresh(trigger, channelId)
      // B-020: on an account's very first subscription sync, videos already
      // published before today start read — the user opens onto "what's
      // new", not an unclearable backlog. Runs before refresh:done so the
      // event's unread count already reflects it.
      if (report.firstSync) {
        const now = clock.now()
        feedRepository.markManyRead(null, startOfToday(now).toISOString(), now.toISOString())
      }
      const dto = toReportDto(report)
      broadcast({ type: 'refresh:done', report: dto })
      if (report.outcome === 'quota') broadcast({ type: 'quota:exceeded' })
      return { ok: true, value: dto }
    } catch (error) {
      if (isDomainError(error, 'auth-expired')) {
        authProvider.invalidate()
        broadcast({ type: 'auth:required' })
        return { ok: false, errorKind: 'auth-expired', message: error.message }
      }
      const kind = isDomainError(error) ? error.kind : 'internal'
      const message = String((error as Error).message ?? error)
      // B-023: every refresh:started must be paired with a terminal event,
      // or a renderer that saw "started" spins its refresh indicator
      // forever with no way to recover short of a manual reload.
      broadcast({ type: 'refresh:failed', errorKind: kind, message })
      return { ok: false, errorKind: kind, message }
    } finally {
      refreshing = false
    }
  }

  // Startup connection validation (D-012): a cheap token refresh on every
  // open; invalid_grant surfaces as the reconnect banner, never a blocker.
  async function validateConnectionAndCatchUp(): Promise<void> {
    if (!authFlow.hasRefreshToken()) return
    try {
      await authProvider.getAccessToken()
    } catch (error) {
      if (isDomainError(error, 'auth-expired')) {
        broadcast({ type: 'auth:required' })
        return
      }
      return // offline etc. — local browsing is unaffected
    }
    // Every launch syncs (B-011) — RSS conditional GETs make a no-change
    // pass cost ~0 quota, so no staleness guard is needed.
    void runRefresh('launch')
  }

  ipcMain.handle(IpcChannel.getFeed, (_event, view: unknown, cursor: unknown, channelId: unknown) =>
    toSliceDto(
      feedService.getSlice(
        parseView(view),
        parseCursor(cursor),
        undefined,
        parseChannelId(channelId),
        settings.showShorts
      )
    )
  )
  ipcMain.handle(IpcChannel.getFeedMeta, () => {
    const slice = feedService.getSlice('unread', null, 1, undefined, settings.showShorts)
    return {
      unreadCount: slice.unreadCount,
      caughtUp: slice.caughtUp,
      lastRefreshAt: syncRepository.lastSyncStartedAt(),
      watchLaterCount: feedRepository.countWatchLater(settings.showShorts),
      refreshing
    }
  })
  ipcMain.handle(IpcChannel.getChannels, () =>
    feedRepository.listFollowedChannels(settings.showShorts).map((followed) => ({
      channelId: followed.channel.channelId,
      title: followed.channel.title,
      thumbnailUrl: followed.channel.thumbnailUrl,
      unreadCount: followed.unreadCount,
      favorite: followed.favorite
    }))
  )
  ipcMain.handle(IpcChannel.toggleChannelFavorite, (_event, channelId: unknown) =>
    feedRepository.toggleChannelFavorite(parseChannelIdRequired(channelId))
  )
  ipcMain.handle(IpcChannel.getPriorityFeed, (): FeedVideoDto[] =>
    feedService.getPriorityVideos(settings.showShorts).map(toVideoDto)
  )
  const backfillingChannels = new Set<string>()
  ipcMain.handle(
    IpcChannel.backfillChannelArchive,
    async (
      _event,
      channelId: unknown
    ): Promise<ResultDto<{ videosNew: number; exhausted: boolean }>> => {
      const id = parseChannelIdRequired(channelId)
      if (backfillingChannels.has(id)) {
        return { ok: false, errorKind: 'busy', message: 'already loading older videos' }
      }
      backfillingChannels.add(id)
      try {
        const result = await syncService.backfillArchive(id)
        return { ok: true, value: result }
      } catch (error) {
        if (isDomainError(error, 'auth-expired')) {
          authProvider.invalidate()
          broadcast({ type: 'auth:required' })
          return { ok: false, errorKind: 'auth-expired', message: error.message }
        }
        const kind = isDomainError(error) ? error.kind : 'internal'
        return { ok: false, errorKind: kind, message: String((error as Error).message ?? error) }
      } finally {
        backfillingChannels.delete(id)
      }
    }
  )
  function toSearchResultDto(result: SearchResult): SearchResultDto {
    if (result.kind === 'video') return result
    return { ...result, subscribed: feedRepository.isSubscribed(result.channelId) }
  }
  ipcMain.handle(
    IpcChannel.searchYouTube,
    async (_event, query: unknown): Promise<ResultDto<SearchResultDto[]>> => {
      const q = String(query).trim()
      if (q === '') return { ok: true, value: [] }
      try {
        const results = await apiClient.search(q)
        return { ok: true, value: results.map(toSearchResultDto) }
      } catch (error) {
        const kind = isDomainError(error) ? error.kind : 'internal'
        return { ok: false, errorKind: kind, message: String((error as Error).message ?? error) }
      }
    }
  )
  ipcMain.handle(
    IpcChannel.subscribeChannel,
    async (_event, channelId: unknown): Promise<ResultDto<void>> => {
      const id = parseChannelIdRequired(channelId)
      try {
        if (!authFlow.hasWriteScope()) {
          await authFlow.requestWriteScope()
          authProvider.invalidate()
        }
        const channel = await apiClient.subscribe(id)
        const now = clock.now().toISOString()
        syncRepository.upsertSubscribedChannel(channel, now)
        const playlists = await apiClient.fetchUploadsPlaylists([id])
        const playlistId = playlists.get(id)
        if (playlistId !== undefined) syncRepository.setUploadsPlaylist(id, playlistId)
        void runRefresh('manual', id)
        return { ok: true, value: undefined }
      } catch (error) {
        if (isDomainError(error, 'auth-expired')) {
          authProvider.invalidate()
          broadcast({ type: 'auth:required' })
          return { ok: false, errorKind: 'auth-expired', message: error.message }
        }
        const kind = isDomainError(error) ? error.kind : 'internal'
        return { ok: false, errorKind: kind, message: String((error as Error).message ?? error) }
      }
    }
  )
  ipcMain.handle(IpcChannel.refreshFeed, (_event, channelId: unknown) =>
    runRefresh('manual', parseChannelId(channelId))
  )
  ipcMain.handle(IpcChannel.windowControl, (event, action: unknown) => {
    const target = BrowserWindow.fromWebContents(event.sender)
    if (target === null) return
    if (action === 'minimize') target.minimize()
    else if (action === 'toggle-maximize') {
      if (target.isMaximized()) target.unmaximize()
      else target.maximize()
    } else if (action === 'close') target.close()
    else throw new Error(`invalid window control: ${String(action)}`)
  })

  ipcMain.handle(IpcChannel.setReadStatus, (_event, videoId: unknown, status: unknown) =>
    toStateDto(stateRepository.setReadStatus(parseVideoId(videoId), parseReadStatus(status)))
  )
  ipcMain.handle(IpcChannel.markAllRead, (_event, channelId: unknown) =>
    feedRepository.markManyRead(parseChannelId(channelId) ?? null, null, clock.now().toISOString())
  )
  ipcMain.handle(IpcChannel.toggleFavorite, (_event, videoId: unknown) =>
    toStateDto(stateRepository.toggleFavorite(parseVideoId(videoId)))
  )
  ipcMain.handle(IpcChannel.toggleWatchLater, (_event, videoId: unknown) =>
    toStateDto(stateRepository.toggleWatchLater(parseVideoId(videoId)))
  )
  ipcMain.handle(IpcChannel.openInBrowser, (_event, videoId: unknown) =>
    shell.openExternal(`https://www.youtube.com/watch?v=${parseVideoId(videoId)}`)
  )
  ipcMain.handle(IpcChannel.openExternalUrl, (_event, url: unknown) => {
    if (typeof url !== 'string' || !/^https?:\/\//.test(url)) throw new Error('invalid url')
    return shell.openExternal(url)
  })
  ipcMain.handle(
    IpcChannel.getVideo,
    async (_event, videoId: unknown): Promise<ResultDto<PlayerVideoDto>> => {
      const id = parseVideoId(videoId)
      const local = feedRepository.findVideo(id)
      if (local !== null) {
        const { entry, description } = local
        return {
          ok: true,
          value: {
            videoId: entry.video.videoId,
            title: entry.video.title,
            channelTitle: entry.channelTitle,
            publishedAt: entry.video.publishedAt,
            durationSeconds: entry.video.durationSeconds,
            thumbnailUrl: entry.video.thumbnailUrl,
            description,
            state: toStateDto(entry.state)
          }
        }
      }
      // External video (D-029): hydrate on demand — videos.list, 1 unit.
      try {
        const [video] = await apiClient.hydrate([id])
        if (video === undefined) {
          return { ok: false, errorKind: 'not-found', message: 'video not found on YouTube' }
        }
        syncRepository.upsertExternalVideo(video, clock.now().toISOString())
        return {
          ok: true,
          value: {
            videoId: video.videoId,
            title: video.title,
            channelTitle: video.channelTitle,
            publishedAt: video.publishedAt,
            durationSeconds: video.durationSeconds,
            thumbnailUrl: video.thumbnailUrl,
            description: video.description, // full text — storage keeps the truncated copy
            state: toStateDto(stateRepository.get(video.videoId))
          }
        }
      } catch (error) {
        const kind = isDomainError(error) ? error.kind : 'internal'
        return { ok: false, errorKind: kind, message: String((error as Error).message ?? error) }
      }
    }
  )

  ipcMain.handle(IpcChannel.getAuthStatus, () => authStatus())
  ipcMain.handle(IpcChannel.importClientSecret, (_event, json: unknown): ResultDto<AuthStatusDto> => {
    try {
      authFlow.importClientSecret(String(json))
      return { ok: true, value: authStatus() }
    } catch (error) {
      const kind = isDomainError(error) ? error.kind : 'internal'
      return { ok: false, errorKind: kind, message: String((error as Error).message ?? error) }
    }
  })
  ipcMain.handle(IpcChannel.connectGoogle, async (): Promise<ResultDto<AuthStatusDto>> => {
    try {
      await authFlow.connect()
      authProvider.invalidate()
      void runRefresh('manual')
      return { ok: true, value: authStatus() }
    } catch (error) {
      const kind = isDomainError(error) ? error.kind : 'internal'
      return { ok: false, errorKind: kind, message: String((error as Error).message ?? error) }
    }
  })
  ipcMain.handle(IpcChannel.signOut, async () => {
    await authFlow.signOut()
    authProvider.invalidate()
    return authStatus()
  })
  ipcMain.handle(
    IpcChannel.unsubscribeChannel,
    async (_event, channelId: unknown): Promise<ResultDto<void>> => {
      const id = parseChannelIdRequired(channelId)
      try {
        // D-032 incremental consent: the write scope is requested the first
        // time it's needed, not upfront — this may open the system browser.
        if (!authFlow.hasWriteScope()) {
          await authFlow.requestWriteScope()
          authProvider.invalidate()
        }
        let subscriptionId = syncRepository.getSubscriptionId(id)
        if (subscriptionId === null) {
          // Channels subscribed before schema v3 have no cached id yet.
          subscriptionId = await apiClient.findSubscriptionId(id)
        }
        if (subscriptionId === null) {
          return {
            ok: false,
            errorKind: 'not-found',
            message: 'no active subscription found for this channel'
          }
        }
        await apiClient.unsubscribe(subscriptionId)
        syncRepository.markUnsubscribed(id)
        return { ok: true, value: undefined }
      } catch (error) {
        if (isDomainError(error, 'auth-expired')) {
          authProvider.invalidate()
          broadcast({ type: 'auth:required' })
          return { ok: false, errorKind: 'auth-expired', message: error.message }
        }
        const kind = isDomainError(error) ? error.kind : 'internal'
        return { ok: false, errorKind: kind, message: String((error as Error).message ?? error) }
      }
    }
  )
  ipcMain.handle(
    IpcChannel.getConnectedChannel,
    async (): Promise<ResultDto<{ title: string }>> => {
      try {
        const channel = await apiClient.getOwnChannel()
        if (channel === null) {
          return { ok: false, errorKind: 'not-found', message: 'no channel on this account' }
        }
        return { ok: true, value: channel }
      } catch (error) {
        const kind = isDomainError(error) ? error.kind : 'internal'
        return { ok: false, errorKind: kind, message: String((error as Error).message ?? error) }
      }
    }
  )

  function toCommentDto(comment: Comment): CommentDto {
    return { ...comment, replies: comment.replies.map(toCommentDto) }
  }

  function parseCommentText(value: unknown): string {
    const text = typeof value === 'string' ? value.trim() : ''
    if (text === '') throw new Error('empty comment text')
    return text
  }

  ipcMain.handle(
    IpcChannel.getComments,
    async (
      _event,
      videoId: unknown,
      pageToken: unknown
    ): Promise<ResultDto<{ comments: CommentDto[]; nextPageToken: string | null }>> => {
      const id = parseVideoId(videoId)
      try {
        const result = await apiClient.listComments(
          id,
          typeof pageToken === 'string' ? pageToken : undefined
        )
        return {
          ok: true,
          value: { comments: result.comments.map(toCommentDto), nextPageToken: result.nextPageToken }
        }
      } catch (error) {
        const kind = isDomainError(error) ? error.kind : 'internal'
        return { ok: false, errorKind: kind, message: String((error as Error).message ?? error) }
      }
    }
  )
  ipcMain.handle(
    IpcChannel.postComment,
    async (_event, videoId: unknown, text: unknown): Promise<ResultDto<CommentDto>> => {
      const id = parseVideoId(videoId)
      try {
        const body = parseCommentText(text)
        if (!authFlow.hasWriteScope()) {
          await authFlow.requestWriteScope()
          authProvider.invalidate()
        }
        const comment = await apiClient.postComment(id, body)
        return { ok: true, value: toCommentDto(comment) }
      } catch (error) {
        if (isDomainError(error, 'auth-expired')) {
          authProvider.invalidate()
          broadcast({ type: 'auth:required' })
          return { ok: false, errorKind: 'auth-expired', message: error.message }
        }
        const kind = isDomainError(error) ? error.kind : 'internal'
        return { ok: false, errorKind: kind, message: String((error as Error).message ?? error) }
      }
    }
  )
  ipcMain.handle(
    IpcChannel.replyToComment,
    async (_event, parentId: unknown, text: unknown): Promise<ResultDto<CommentDto>> => {
      try {
        const id = typeof parentId === 'string' ? parentId : ''
        if (id === '') throw new Error('invalid comment id')
        const body = parseCommentText(text)
        if (!authFlow.hasWriteScope()) {
          await authFlow.requestWriteScope()
          authProvider.invalidate()
        }
        const comment = await apiClient.replyToComment(id, body)
        return { ok: true, value: toCommentDto(comment) }
      } catch (error) {
        if (isDomainError(error, 'auth-expired')) {
          authProvider.invalidate()
          broadcast({ type: 'auth:required' })
          return { ok: false, errorKind: 'auth-expired', message: error.message }
        }
        const kind = isDomainError(error) ? error.kind : 'internal'
        return { ok: false, errorKind: kind, message: String((error as Error).message ?? error) }
      }
    }
  )
  ipcMain.handle(
    IpcChannel.rateVideo,
    async (_event, videoId: unknown, rating: unknown): Promise<ResultDto<void>> => {
      const id = parseVideoId(videoId)
      if (rating !== 'like' && rating !== 'none') throw new Error('invalid rating')
      try {
        if (!authFlow.hasWriteScope()) {
          await authFlow.requestWriteScope()
          authProvider.invalidate()
        }
        await apiClient.rateVideo(id, rating)
        return { ok: true, value: undefined }
      } catch (error) {
        if (isDomainError(error, 'auth-expired')) {
          authProvider.invalidate()
          broadcast({ type: 'auth:required' })
          return { ok: false, errorKind: 'auth-expired', message: error.message }
        }
        const kind = isDomainError(error) ? error.kind : 'internal'
        return { ok: false, errorKind: kind, message: String((error as Error).message ?? error) }
      }
    }
  )
  ipcMain.handle(
    IpcChannel.getVideoRating,
    async (_event, videoId: unknown): Promise<ResultDto<VideoRatingDto>> => {
      const id = parseVideoId(videoId)
      try {
        const rating = await apiClient.getVideoRating(id)
        return { ok: true, value: rating }
      } catch (error) {
        const kind = isDomainError(error) ? error.kind : 'internal'
        return { ok: false, errorKind: kind, message: String((error as Error).message ?? error) }
      }
    }
  )
  ipcMain.handle(IpcChannel.getWizardState, (): WizardStateDto => {
    const raw = syncRepository.getMeta('wizard_state')
    if (raw !== null) {
      try {
        return JSON.parse(raw) as WizardStateDto
      } catch {
        // fall through to defaults — never crash on stored state
      }
    }
    return { step: 0, email: '', confirmed: {}, published: null, completed: false }
  })
  ipcMain.handle(IpcChannel.setWizardState, (_event, state: unknown) => {
    if (typeof state !== 'object' || state === null) throw new Error('invalid wizard state')
    syncRepository.setMeta('wizard_state', JSON.stringify(state))
  })

  // Settings (settings.json) drive the refresh timer, theme, item size and layout.
  const settingsFile = join(dataDir, 'settings.json')
  const loaded = loadSettings(settingsFile)
  let settings: AppSettings = loaded.settings
  const settingsWarning = loaded.warning

  let timer: ReturnType<typeof setInterval> | null = null
  function applyRefreshTimer(): void {
    if (timer !== null) clearInterval(timer)
    timer = null
    if (settings.refreshMinutes > 0) {
      timer = setInterval(() => {
        if (authFlow.hasRefreshToken()) void runRefresh('timer')
      }, settings.refreshMinutes * 60_000)
    }
  }
  applyRefreshTimer()

  ipcMain.handle(IpcChannel.getSettings, () => ({ settings, warning: settingsWarning }))
  ipcMain.handle(IpcChannel.setSettings, (_event, raw: unknown) => {
    settings = normalizeSettings(raw)
    saveSettings(settingsFile, settings)
    applyRefreshTimer()
  })

  ipcMain.handle(IpcChannel.exportData, async (): Promise<
    ResultDto<{ path: string; videos: number; states: number }>
  > => {
    const stamp = clock.now().toISOString().slice(0, 10)
    const picked = await dialog.showSaveDialog({
      title: 'Export Chronicle data',
      defaultPath: join(app.getPath('downloads'), `chronicle-export-${stamp}.json`),
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (picked.canceled || !picked.filePath) {
      return { ok: false, errorKind: 'canceled', message: 'export canceled' }
    }
    const data = syncRepository.exportData()
    // Format documented in FORMAT.md — "you can leave with everything".
    const payload = {
      format: 'chronicle-export',
      formatVersion: 1,
      exportedAt: clock.now().toISOString(),
      settings,
      ...data
    }
    try {
      writeFileSync(picked.filePath, JSON.stringify(payload, null, 2))
      return {
        ok: true,
        value: { path: picked.filePath, videos: data.videos.length, states: data.videoStates.length }
      }
    } catch (error) {
      return { ok: false, errorKind: 'internal', message: String((error as Error).message) }
    }
  })

  // local-data.md §Privacy invariants: DB + secrets + caches gone, then a
  // clean relaunch (which lands on the first-run wizard).
  ipcMain.handle(IpcChannel.deleteAllData, () => {
    db?.close()
    db = undefined
    for (const suffix of ['', '-wal', '-shm']) {
      rmSync(join(dataDir, `chronicle.db${suffix}`), { force: true })
    }
    rmSync(settingsFile, { force: true })
    rmSync(join(dataDir, 'secrets.json'), { force: true })
    rmSync(chronicleCacheDir(), { recursive: true, force: true })
    // B-022: carry the dev renderer URL through relaunch via argv, not just
    // env-inheritance (see devRendererUrl() above) — relaunch's API has no
    // `env` option to set it directly.
    const rendererUrl = devRendererUrl()
    const relaunchArgs = process.argv
      .slice(1)
      .filter((arg) => !arg.startsWith(RENDERER_URL_ARG_PREFIX))
    if (!app.isPackaged && rendererUrl) {
      relaunchArgs.push(`${RENDERER_URL_ARG_PREFIX}${rendererUrl}`)
    }
    app.relaunch({ args: relaunchArgs })
    // app.exit() skips window teardown and the normal quit sequence — the
    // relaunched window can start before the old one's GPU/compositor
    // surface is gone, which lands as a frozen/blank window on some
    // compositors (observed on niri/Wayland). Destroying windows and quitting
    // normally lets the old instance tear down cleanly before the new one
    // starts.
    for (const window of BrowserWindow.getAllWindows()) window.destroy()
    app.quit()
  })

  createWindow()

  const firstWindow = BrowserWindow.getAllWindows()[0]
  firstWindow?.webContents.once('did-finish-load', () => {
    void validateConnectionAndCatchUp()
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  app.on('will-quit', () => {
    if (timer !== null) clearInterval(timer)
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  db?.close()
})
