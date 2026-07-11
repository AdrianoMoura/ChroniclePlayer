import { app, BrowserWindow, ipcMain, safeStorage, shell } from 'electron'
import { mkdirSync } from 'node:fs'
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
import { YouTubeApiClient } from '../adapters/youtube/api-client'
import { HeadShortsProber } from '../adapters/youtube/shorts-prober'
import { HybridVideoSource } from '../adapters/youtube/video-source'
import { YouTubeRssClient } from '../adapters/rss/rss-client'
import { FeedService, type FeedSlice } from '../core/feed-service'
import { isDomainError } from '../core/errors'
import { QuotaCounter, type Clock } from '../core/ports'
import { SyncService, type SyncReport, type SyncTrigger } from '../core/sync-service'
import type { VideoState } from '../core/state'
import { FEED_VIEWS, type FeedView } from '../core/views'
import type {
  AuthStatusDto,
  ChronicleEventDto,
  FeedCursorDto,
  FeedSliceDto,
  ReadStatusDto,
  ResultDto,
  SyncReportDto,
  VideoStateDto
} from '../ipc/contract'
import { IpcChannel } from '../ipc/contract'
import { chronicleDataDir } from './data-dir'
import { seedDevFixtures } from './dev-fixtures'

const clock: Clock = { now: () => new Date() }

// Chromium only auto-detects the keychain on desktops it knows (GNOME, KDE…).
// On anything else (niri, sway, headless) it silently picks basic_text even
// when org.freedesktop.secrets is live on D-Bus. Requesting gnome-libsecret
// explicitly is safe: if no Secret Service answers, isEncryptionAvailable()
// stays false and chooseSecretStore falls back to the machine key (D-013).
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('password-store', 'gnome-libsecret')
}

// Refresh triggers (youtube-api.md §Refresh policy): launch when stale,
// manual always, background timer while running. D-016 (recommended option
// exercised): 30-minute default interval.
const REFRESH_INTERVAL_MS = 30 * 60_000
const LAUNCH_REFRESH_IF_OLDER_MS = 10 * 60_000

function toStateDto(state: VideoState): VideoStateDto {
  return { readStatus: state.readStatus, favorite: state.favorite, watchLater: state.watchLater }
}

function toSliceDto(slice: FeedSlice): FeedSliceDto {
  return {
    view: slice.view,
    videos: slice.items.map(({ entry, bucket }) => ({
      videoId: entry.video.videoId,
      title: entry.video.title,
      channelTitle: entry.channelTitle,
      publishedAt: entry.video.publishedAt,
      durationSeconds: entry.video.durationSeconds,
      thumbnailUrl: entry.video.thumbnailUrl,
      state: toStateDto(entry.state),
      bucket
    })),
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
    finishedAt: report.finishedAt
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

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#101014',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    void window.loadURL(process.env['ELECTRON_RENDERER_URL'])
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
      broadcast({ type: 'refresh:progress', checked: progress.checked, total: progress.total })
  })

  if (!app.isPackaged && process.env['CHRONICLE_FIXTURES'] === '1') {
    seedDevFixtures(catalogRepository, stateRepository, clock)
  }

  function authStatus(): AuthStatusDto {
    const state = !authFlow.hasClientSecret()
      ? 'unconfigured'
      : authFlow.hasRefreshToken()
        ? 'connected'
        : 'disconnected'
    return { state, secureStorage: secrets.isSecure() }
  }

  let refreshing = false
  async function runRefresh(trigger: SyncTrigger): Promise<ResultDto<SyncReportDto>> {
    if (refreshing) return { ok: false, errorKind: 'busy', message: 'a refresh is already running' }
    if (!authFlow.hasRefreshToken()) {
      return { ok: false, errorKind: 'auth-expired', message: 'not connected to Google' }
    }
    refreshing = true
    broadcast({ type: 'refresh:started', trigger })
    try {
      const report = await syncService.refresh(trigger)
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
      return { ok: false, errorKind: kind, message: String((error as Error).message ?? error) }
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
    const last = syncRepository.lastSyncStartedAt()
    if (last === null || clock.now().getTime() - Date.parse(last) > LAUNCH_REFRESH_IF_OLDER_MS) {
      void runRefresh('launch')
    }
  }

  ipcMain.handle(IpcChannel.getFeed, (_event, view: unknown, cursor: unknown, channelId: unknown) =>
    toSliceDto(
      feedService.getSlice(parseView(view), parseCursor(cursor), undefined, parseChannelId(channelId))
    )
  )
  ipcMain.handle(IpcChannel.getFeedMeta, () => {
    const slice = feedService.getSlice('unread', null, 1)
    return {
      unreadCount: slice.unreadCount,
      caughtUp: slice.caughtUp,
      lastRefreshAt: syncRepository.lastSyncStartedAt()
    }
  })
  ipcMain.handle(IpcChannel.getChannels, () => feedRepository.listFollowedChannels())
  ipcMain.handle(IpcChannel.refreshFeed, () => runRefresh('manual'))

  ipcMain.handle(IpcChannel.setReadStatus, (_event, videoId: unknown, status: unknown) =>
    toStateDto(stateRepository.setReadStatus(parseVideoId(videoId), parseReadStatus(status)))
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

  createWindow()

  const firstWindow = BrowserWindow.getAllWindows()[0]
  firstWindow?.webContents.once('did-finish-load', () => {
    void validateConnectionAndCatchUp()
  })

  const timer = setInterval(() => {
    if (authFlow.hasRefreshToken()) void runRefresh('timer')
  }, REFRESH_INTERVAL_MS)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  app.on('will-quit', () => {
    clearInterval(timer)
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  db?.close()
})
