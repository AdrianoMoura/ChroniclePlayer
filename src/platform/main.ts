import { app, BrowserWindow, dialog, ipcMain, protocol, safeStorage, shell } from 'electron'
import { randomUUID } from 'node:crypto'
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
import { AuthFlow, DEFAULT_ACCOUNT_ID, GoogleAuthProvider } from '../adapters/oauth/auth'
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
  AccountDto,
  AuthStatusDto,
  ChannelDetailDto,
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
  return {
    readStatus: state.readStatus,
    favorite: state.favorite,
    watchLater: state.watchLater,
    resumePositionSeconds: state.resumePositionSeconds
  }
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
    liveContent: entry.video.liveContent,
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

// B-003: same shape as parseChannelId — accountId narrows the combined feed.
function parseAccountId(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'string' && value.length > 0 && value.length <= 128) return value
  throw new Error('invalid account id')
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
  // B-003: one Google Cloud project/OAuth client and one quota pool shared
  // by every account (that's the whole point — additional accounts skip the
  // console walkthrough and just add themselves as a Test user on the same
  // project); only tokens/scopes are per-account.
  const quota = new QuotaCounter()

  interface AccountStack {
    accountId: string
    label: string
    authFlow: AuthFlow
    authProvider: GoogleAuthProvider
    apiClient: YouTubeApiClient
    syncService: SyncService
  }

  const accountStacks = new Map<string, AccountStack>()

  function buildAccountStack(accountId: string, label: string): AccountStack {
    const authFlow = new AuthFlow(secrets, oauth, (url) => shell.openExternal(url), accountId)
    const authProvider = new GoogleAuthProvider(secrets, oauth, clock, accountId)
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
    return { accountId, label, authFlow, authProvider, apiClient, syncService }
  }

  // Load every already-persisted account (from a prior session, or the
  // schema-v6 migration's backfill of a pre-existing single-account install).
  for (const account of syncRepository.listAccounts()) {
    accountStacks.set(account.accountId, buildAccountStack(account.accountId, account.label))
  }
  // The first-run wizard and Settings' Connection section predate
  // multi-account and are unaffected by it: they always operate on this one
  // "primary" account, lazily created in-memory here if this is a genuinely
  // fresh install (not yet persisted — that happens on first successful
  // connect, exactly like the old single-account model always did).
  if (!accountStacks.has(DEFAULT_ACCOUNT_ID)) {
    accountStacks.set(DEFAULT_ACCOUNT_ID, buildAccountStack(DEFAULT_ACCOUNT_ID, 'My account'))
  }
  function primaryAccountId(): string {
    return accountStacks.keys().next().value ?? DEFAULT_ACCOUNT_ID
  }
  // Pending accounts from startAddAccount() that haven't connected yet —
  // never persisted (no accounts row, no entry in accountStacks) until
  // connectAccount() succeeds, so an abandoned "add account" flow leaves no
  // trace beyond the shared oauth-client secret (already the case pre-B-003).
  const pendingAccountStacks = new Map<string, AccountStack>()

  function toAccountDto(stack: AccountStack): AccountDto {
    return {
      accountId: stack.accountId,
      label: stack.label,
      connected: stack.authFlow.hasRefreshToken(),
      writeScopeGranted: stack.authFlow.hasWriteScope(),
      isPrimary: stack.accountId === primaryAccountId()
    }
  }

  const authFlow = accountStacks.get(primaryAccountId())!.authFlow
  const authProvider = accountStacks.get(primaryAccountId())!.authProvider
  const apiClient = accountStacks.get(primaryAccountId())!.apiClient

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

  // B-003: merges one SyncReport per refreshed account into a single DTO —
  // sums counters, keeps the worst outcome, ORs firstSync (any account's
  // first-ever sync still triggers the connect-time backlog auto-read).
  function mergeReports(reports: readonly SyncReport[]): SyncReport {
    const outcomeRank: Record<SyncReport['outcome'], number> = { ok: 0, partial: 1, quota: 2, failed: 3 }
    return reports.reduce((acc, r) => ({
      trigger: r.trigger,
      startedAt: acc.startedAt < r.startedAt ? acc.startedAt : r.startedAt,
      finishedAt: acc.finishedAt > r.finishedAt ? acc.finishedAt : r.finishedAt,
      channelsPolled: acc.channelsPolled + r.channelsPolled,
      channelsFailed: acc.channelsFailed + r.channelsFailed,
      videosNew: acc.videosNew + r.videosNew,
      quotaSpent: acc.quotaSpent + r.quotaSpent,
      outcome: outcomeRank[r.outcome] > outcomeRank[acc.outcome] ? r.outcome : acc.outcome,
      subscriptions:
        acc.subscriptions === null && r.subscriptions === null
          ? null
          : {
              added: (acc.subscriptions?.added ?? 0) + (r.subscriptions?.added ?? 0),
              removed: (acc.subscriptions?.removed ?? 0) + (r.subscriptions?.removed ?? 0)
            },
      firstSync: acc.firstSync || r.firstSync
    }))
  }

  let refreshing = false
  // accountId (B-003) targets one account explicitly (e.g. sidebar "Sync
  // now"); channelId resolves to whichever account(s) actually subscribe to
  // it (usually one); neither means "every connected account" — the
  // combined-feed default, and what launch/timer refreshes always mean.
  async function runRefresh(
    trigger: SyncTrigger,
    accountId?: string,
    channelId?: string
  ): Promise<ResultDto<SyncReportDto>> {
    if (refreshing) return { ok: false, errorKind: 'busy', message: 'a refresh is already running' }
    const targetIds =
      channelId !== undefined
        ? syncRepository.listAccountIdsForChannel(channelId)
        : accountId !== undefined
          ? [accountId]
          : [...accountStacks.keys()]
    const targets = targetIds
      .map((id) => accountStacks.get(id))
      .filter((stack): stack is AccountStack => stack !== undefined && stack.authFlow.hasRefreshToken())
    if (targets.length === 0) {
      return { ok: false, errorKind: 'auth-expired', message: 'not connected to Google' }
    }

    refreshing = true
    broadcast({ type: 'refresh:started', trigger })
    const reports: SyncReport[] = []
    let anyAuthExpired = false
    let hardFailure: { kind: string; message: string } | null = null
    for (const stack of targets) {
      try {
        const report = await stack.syncService.refresh(trigger, stack.accountId, channelId)
        reports.push(report)
        // B-020: on an account's very first subscription sync, videos already
        // published before today start read — the user opens onto "what's
        // new", not an unclearable backlog. Runs before refresh:done so the
        // event's unread count already reflects it.
        if (report.firstSync) {
          const now = clock.now()
          feedRepository.markManyRead(
            null,
            startOfToday(now).toISOString(),
            now.toISOString(),
            stack.accountId
          )
        }
      } catch (error) {
        if (isDomainError(error, 'auth-expired')) {
          stack.authProvider.invalidate()
          anyAuthExpired = true
        } else {
          hardFailure = {
            kind: isDomainError(error) ? error.kind : 'internal',
            message: String((error as Error).message ?? error)
          }
        }
      }
    }
    refreshing = false

    if (reports.length === 0) {
      if (anyAuthExpired) {
        broadcast({ type: 'auth:required' })
        return { ok: false, errorKind: 'auth-expired', message: 'authorization expired or revoked' }
      }
      const message = hardFailure?.message ?? 'refresh failed'
      const kind = hardFailure?.kind ?? 'internal'
      // B-023: every refresh:started must be paired with a terminal event,
      // or a renderer that saw "started" spins its refresh indicator
      // forever with no way to recover short of a manual reload.
      broadcast({ type: 'refresh:failed', errorKind: kind, message })
      return { ok: false, errorKind: kind, message }
    }

    if (anyAuthExpired) broadcast({ type: 'auth:required' })
    const merged = mergeReports(reports)
    const dto = toReportDto(merged)
    broadcast({ type: 'refresh:done', report: dto })
    if (merged.outcome === 'quota') broadcast({ type: 'quota:exceeded' })
    return { ok: true, value: dto }
  }

  // Startup connection validation (D-012): a cheap token refresh on every
  // open, for every connected account; invalid_grant surfaces as the
  // reconnect banner, never a blocker.
  async function validateConnectionAndCatchUp(): Promise<void> {
    const connected = [...accountStacks.values()].filter((stack) => stack.authFlow.hasRefreshToken())
    if (connected.length === 0) return
    let anyReachable = false
    for (const stack of connected) {
      try {
        await stack.authProvider.getAccessToken()
        anyReachable = true
      } catch (error) {
        if (isDomainError(error, 'auth-expired')) broadcast({ type: 'auth:required' })
        // offline etc. — local browsing is unaffected either way
      }
    }
    if (!anyReachable) return
    // Every launch syncs (B-011) — RSS conditional GETs make a no-change
    // pass cost ~0 quota, so no staleness guard is needed.
    void runRefresh('launch')
  }

  // B-003: an owning-account lookup for actions that operate on one
  // account's relationship to a channel (favorite/unsubscribe/backfill) —
  // the UI only ever passes a channelId, never an accountId, for these.
  // Usually exactly one account owns a channel; if more than one does, the
  // action applies to the first (a deliberate simplification — see bugs.md).
  function resolveOwningAccountId(channelId: string): string | undefined {
    return syncRepository.listAccountIdsForChannel(channelId)[0]
  }

  ipcMain.handle(
    IpcChannel.getFeed,
    (_event, view: unknown, cursor: unknown, channelId: unknown, accountId: unknown) =>
      toSliceDto(
        feedService.getSlice(
          parseView(view),
          parseCursor(cursor),
          undefined,
          parseChannelId(channelId),
          settings.showShorts,
          parseAccountId(accountId)
        )
      )
  )
  ipcMain.handle(IpcChannel.getFeedMeta, (_event, accountId: unknown) => {
    const id = parseAccountId(accountId)
    const slice = feedService.getSlice('unread', null, 1, undefined, settings.showShorts, id)
    return {
      unreadCount: slice.unreadCount,
      caughtUp: slice.caughtUp,
      lastRefreshAt: syncRepository.lastSyncStartedAt(),
      watchLaterCount: feedRepository.countWatchLater(settings.showShorts),
      refreshing
    }
  })
  ipcMain.handle(IpcChannel.getChannels, (_event, accountId: unknown) =>
    feedRepository
      .listFollowedChannels(settings.showShorts, parseAccountId(accountId))
      .map((followed) => ({
        channelId: followed.channel.channelId,
        title: followed.channel.title,
        thumbnailUrl: followed.channel.thumbnailUrl,
        unreadCount: followed.unreadCount,
        favorite: followed.favorite
      }))
  )
  ipcMain.handle(IpcChannel.toggleChannelFavorite, (_event, channelId: unknown) => {
    const id = parseChannelIdRequired(channelId)
    const accountId = resolveOwningAccountId(id)
    if (accountId === undefined) return false
    return feedRepository.toggleChannelFavorite(accountId, id)
  })
  ipcMain.handle(IpcChannel.getPriorityFeed, (_event, accountId: unknown): FeedVideoDto[] =>
    feedService.getPriorityVideos(settings.showShorts, parseAccountId(accountId)).map(toVideoDto)
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
      const owningAccountId = resolveOwningAccountId(id)
      const stack = owningAccountId !== undefined ? accountStacks.get(owningAccountId) : undefined
      if (stack === undefined) {
        return {
          ok: false,
          errorKind: 'not-found',
          message: 'channel is not subscribed by any connected account'
        }
      }
      backfillingChannels.add(id)
      try {
        const result = await stack.syncService.backfillArchive(stack.accountId, id)
        return { ok: true, value: result }
      } catch (error) {
        if (isDomainError(error, 'auth-expired')) {
          stack.authProvider.invalidate()
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
    // B-003: a newly discovered channel (search) has no owning account yet
    // to resolve — subscribes under the primary account. Picking which
    // account to subscribe under is future scope (see bugs.md notes).
    async (_event, channelId: unknown): Promise<ResultDto<void>> => {
      const id = parseChannelIdRequired(channelId)
      try {
        if (!authFlow.hasWriteScope()) {
          return {
            ok: false,
            errorKind: 'write-scope-required',
            message: 'subscribing needs an extra permission'
          }
        }
        const channel = await apiClient.subscribe(id)
        const now = clock.now().toISOString()
        syncRepository.upsertSubscribedChannel(primaryAccountId(), channel, now)
        const playlists = await apiClient.fetchUploadsPlaylists([id])
        const playlistId = playlists.get(id)
        if (playlistId !== undefined) syncRepository.setUploadsPlaylist(id, playlistId)
        void runRefresh('manual', undefined, id)
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
    IpcChannel.getChannelDetail,
    async (_event, channelId: unknown): Promise<ResultDto<ChannelDetailDto>> => {
      const id = parseChannelIdRequired(channelId)
      try {
        const detail = await apiClient.fetchChannelDetail(id)
        return { ok: true, value: detail }
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
  ipcMain.handle(IpcChannel.refreshFeed, (_event, channelId: unknown, accountId: unknown) =>
    runRefresh('manual', parseAccountId(accountId), parseChannelId(channelId))
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
  ipcMain.handle(IpcChannel.markAllRead, (_event, channelId: unknown, accountId: unknown) =>
    feedRepository.markManyRead(
      parseChannelId(channelId) ?? null,
      null,
      clock.now().toISOString(),
      parseAccountId(accountId)
    )
  )
  ipcMain.handle(IpcChannel.toggleFavorite, (_event, videoId: unknown) =>
    toStateDto(stateRepository.toggleFavorite(parseVideoId(videoId)))
  )
  ipcMain.handle(IpcChannel.toggleWatchLater, (_event, videoId: unknown) =>
    toStateDto(stateRepository.toggleWatchLater(parseVideoId(videoId)))
  )
  ipcMain.handle(IpcChannel.setResumePosition, (_event, videoId: unknown, seconds: unknown) => {
    const value = typeof seconds === 'number' ? seconds : null
    return toStateDto(stateRepository.setResumePosition(parseVideoId(videoId), value))
  })
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
            channelId: entry.video.channelId,
            title: entry.video.title,
            channelTitle: entry.channelTitle,
            publishedAt: entry.video.publishedAt,
            durationSeconds: entry.video.durationSeconds,
            thumbnailUrl: entry.video.thumbnailUrl,
            description,
            state: toStateDto(entry.state),
            isSubscribed: feedRepository.isSubscribed(entry.video.channelId)
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
            channelId: video.channelId,
            title: video.title,
            channelTitle: video.channelTitle,
            publishedAt: video.publishedAt,
            durationSeconds: video.durationSeconds,
            thumbnailUrl: video.thumbnailUrl,
            description: video.description, // full text — storage keeps the truncated copy
            state: toStateDto(stateRepository.get(video.videoId)),
            isSubscribed: feedRepository.isSubscribed(video.channelId)
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
      // B-003: the primary account needs its accounts row too — every other
      // write to account_channels has an FK on it. A nice label is
      // best-effort (mirrors connectAccount's pattern for additional ones).
      let label = 'My account'
      try {
        const channel = await apiClient.getOwnChannel()
        if (channel !== null) label = channel.title
      } catch {
        // keep the placeholder — not worth failing the connection over
      }
      syncRepository.addAccount(primaryAccountId(), label, clock.now().toISOString())
      // The in-memory stack was built with the placeholder label before this
      // connection happened (or on a prior run) — without this, the sidebar
      // keeps showing "My account" until the next app restart even though
      // the real channel title is already persisted.
      const primaryStack = accountStacks.get(primaryAccountId())
      if (primaryStack) primaryStack.label = label
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
  ipcMain.handle(IpcChannel.requestWriteScope, async (): Promise<ResultDto<void>> => {
    try {
      await authFlow.requestWriteScope()
      authProvider.invalidate()
      return { ok: true, value: undefined }
    } catch (error) {
      const kind = isDomainError(error) ? error.kind : 'internal'
      return { ok: false, errorKind: kind, message: String((error as Error).message ?? error) }
    }
  })
  ipcMain.handle(
    IpcChannel.unsubscribeChannel,
    async (_event, channelId: unknown): Promise<ResultDto<void>> => {
      const id = parseChannelIdRequired(channelId)
      const owningAccountId = resolveOwningAccountId(id)
      const stack = owningAccountId !== undefined ? accountStacks.get(owningAccountId) : undefined
      if (stack === undefined) {
        return {
          ok: false,
          errorKind: 'not-found',
          message: 'channel is not subscribed by any connected account'
        }
      }
      try {
        // D-032 incremental consent: the write scope is requested the first
        // time it's needed, not upfront — this may open the system browser.
        if (!stack.authFlow.hasWriteScope()) {
          await stack.authFlow.requestWriteScope()
          stack.authProvider.invalidate()
        }
        let subscriptionId = syncRepository.getSubscriptionId(stack.accountId, id)
        if (subscriptionId === null) {
          // Channels subscribed before schema v3 have no cached id yet.
          subscriptionId = await stack.apiClient.findSubscriptionId(id)
        }
        if (subscriptionId === null) {
          return {
            ok: false,
            errorKind: 'not-found',
            message: 'no active subscription found for this channel'
          }
        }
        await stack.apiClient.unsubscribe(subscriptionId)
        syncRepository.markUnsubscribed(stack.accountId, id)
        return { ok: true, value: undefined }
      } catch (error) {
        if (isDomainError(error, 'auth-expired')) {
          stack.authProvider.invalidate()
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

  // B-003: additional-account management. The primary account (above) is
  // untouched by any of this — Settings and the first-run wizard keep
  // working exactly as before.
  ipcMain.handle(IpcChannel.listAccounts, (): AccountDto[] =>
    [...accountStacks.values()].map(toAccountDto)
  )
  ipcMain.handle(
    IpcChannel.startAddAccount,
    (): { accountId: string; isFirstAccount: boolean } => {
      const isFirstAccount = accountStacks.size === 0
      const accountId = randomUUID()
      pendingAccountStacks.set(accountId, buildAccountStack(accountId, 'New account'))
      return { accountId, isFirstAccount }
    }
  )
  ipcMain.handle(
    IpcChannel.connectAccount,
    async (_event, accountId: unknown): Promise<ResultDto<AccountDto>> => {
      const id = typeof accountId === 'string' ? accountId : ''
      const stack = pendingAccountStacks.get(id) ?? accountStacks.get(id)
      if (stack === undefined) {
        return { ok: false, errorKind: 'not-found', message: 'unknown account' }
      }
      try {
        await stack.authFlow.connect()
        stack.authProvider.invalidate()
        // A nice label beats the raw id — best-effort, never blocks connecting.
        try {
          const channel = await stack.apiClient.getOwnChannel()
          if (channel !== null) stack.label = channel.title
        } catch {
          // keep the placeholder label — not worth failing the connection over
        }
        const now = clock.now().toISOString()
        syncRepository.addAccount(stack.accountId, stack.label, now)
        accountStacks.set(stack.accountId, stack)
        pendingAccountStacks.delete(stack.accountId)
        void runRefresh('manual', stack.accountId)
        return { ok: true, value: toAccountDto(stack) }
      } catch (error) {
        const kind = isDomainError(error) ? error.kind : 'internal'
        return { ok: false, errorKind: kind, message: String((error as Error).message ?? error) }
      }
    }
  )
  ipcMain.handle(IpcChannel.removeAccount, async (_event, accountId: unknown): Promise<void> => {
    const id = typeof accountId === 'string' ? accountId : ''
    // The primary account signs out via Settings (unchanged) — removing it
    // here would strand the first-run wizard/Settings' Connection section,
    // which always assume it exists.
    if (id === primaryAccountId()) throw new Error('cannot remove the primary account here')
    const stack = accountStacks.get(id)
    if (stack === undefined) return
    await stack.authFlow.signOut()
    syncRepository.removeAccount(id)
    accountStacks.delete(id)
  })
  ipcMain.handle(
    IpcChannel.syncAccountNow,
    async (_event, accountId: unknown): Promise<ResultDto<SyncReportDto>> => {
      const id = typeof accountId === 'string' ? accountId : ''
      if (!accountStacks.has(id)) {
        return { ok: false, errorKind: 'not-found', message: 'unknown account' }
      }
      return runRefresh('manual', id)
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
          return {
            ok: false,
            errorKind: 'write-scope-required',
            message: 'posting a comment needs an extra permission'
          }
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
          return {
            ok: false,
            errorKind: 'write-scope-required',
            message: 'replying needs an extra permission'
          }
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
          return {
            ok: false,
            errorKind: 'write-scope-required',
            message: 'rating a video needs an extra permission'
          }
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
