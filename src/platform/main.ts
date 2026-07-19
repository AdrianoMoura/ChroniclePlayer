import { app, BrowserWindow, Notification, Tray, dialog, ipcMain, protocol, safeStorage, shell } from 'electron'
import { randomUUID } from 'node:crypto'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
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
import { GithubReleaseSource } from '../adapters/updates/github-release-source'
import { FeedService, type FeedItem, type FeedSlice } from '../core/feed-service'
import { startOfToday } from '../core/feed'
import { isDomainError } from '../core/errors'
import { QuotaCounter, type Clock } from '../core/ports'
import { isNewerVersion } from '../core/version'
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
  SearchVideoResultDto,
  SyncReportDto,
  VideoRatingDto,
  VideoStateDto,
  WizardStateDto
} from '../ipc/contract'
import { IpcChannel, PLAYBACK_RATES } from '../ipc/contract'
import { chronicleDataDir } from './data-dir'
import { seedDevFixtures } from './dev-fixtures'
import { setLinuxAutostart } from './linux-autostart'
import { startRendererServer } from './renderer-server'
import { loadSettings, normalizeSettings, saveSettings, type AppSettings } from './settings-store'
import { ThumbnailCache, chronicleCacheDir } from './thumbnail-cache'
import { createAppTray } from './tray'

const clock: Clock = { now: () => new Date() }

// D-050: before tray-resident mode existed, closing the window always quit
// the app, so relaunching it (e.g. restarting the dev server) never left a
// stale process behind. Now that "Run in background" keeps the process
// alive with no window open, launching a second instance on top of a
// tray-resident one would leave two independent processes each with their
// own tray icon — the first (ghost) one never torn down, and unaffected by
// Settings changes made in the second. This must be checked before anything
// else registers.
const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  app.quit()
}

// D-050: "start minimized" needs to know a given launch was actually
// triggered by the OS autostart entry, not a manual open — a manual launch
// should always show the window regardless of this setting. macOS reports
// this natively (wasOpenedAtLogin); Windows has no such per-launch signal,
// so applyAutoStart() below bakes this flag into the login item's own args
// (Electron's Settings.args is win32-only) — read back here at boot.
// Linux has no Electron-level login-item API at all (linux-autostart.ts's
// own .desktop Exec= line), so the same flag doubles as its detection too.
const AUTOSTART_HIDDEN_FLAG = '--hidden'
function wasLaunchedViaAutostart(): boolean {
  if (process.platform === 'darwin') return app.getLoginItemSettings().wasOpenedAtLogin
  return process.argv.includes(AUTOSTART_HIDDEN_FLAG)
}

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
    channelId: entry.video.channelId,
    channelTitle: entry.channelTitle,
    publishedAt: entry.video.publishedAt,
    durationSeconds: entry.video.durationSeconds,
    thumbnailUrl: entry.video.thumbnailUrl,
    viewCount: entry.video.viewCount,
    isShort: entry.video.isShort,
    liveContent: entry.video.liveContent,
    wasLive: entry.video.wasLive,
    liveEndedAt: entry.video.liveEndedAt,
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
    failures: report.failures,
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

// electron-vite's dev orchestrator sets this once on this process and it
// stays set for the process's whole lifetime — including across a "delete
// all data" reset, which no longer spawns a new process at all (see boot()).
function devRendererUrl(): string | undefined {
  return process.env['ELECTRON_RENDERER_URL']
}

// B-093: deliberately *not* a named partition — every BrowserWindow here
// omits `webPreferences.partition`, which means they all share Electron's
// one unnamed default session, same as the player's embedded iframe (a
// plain <iframe> always inherits its embedding page's session — there's no
// per-iframe override) and the "Sign in to YouTube" window below. This was
// tried as an explicitly *named* partition first, which broke thumbnails:
// `protocol.handle()` (used for `thumb://` further down) registers on
// `session.defaultSession` specifically, and a custom partition is a
// different session with no handler on it at all. The default session was
// always the right answer anyway — Chronicle's own OAuth connect flow
// (D-001/D-012) runs in the *system* browser, never touching this one, so
// it starts out signed into nothing regardless of a custom name.

// Shared by createWindow() and the B-045 extract-to-window flow below —
// both load the exact same renderer bundle; the extracted window just adds
// a query string the renderer's main.tsx checks to render a different, much
// smaller UI instead of the full app (see src/ui/main.tsx).
function loadRenderer(window: BrowserWindow, query?: Record<string, string>): void {
  const qs = query ? `?${new URLSearchParams(query).toString()}` : ''
  const rendererUrl = devRendererUrl()
  if (!app.isPackaged && rendererUrl) {
    void window.loadURL(rendererUrl + qs)
  } else if (packagedRendererUrl !== null) {
    void window.loadURL(packagedRendererUrl + qs)
  } else {
    // Should be unreachable (the server is started and awaited before the
    // first createWindow() call) — file:// as a last resort still shows a
    // window instead of a crash, even though the embedded player would
    // fail with Error 153 on it.
    void window.loadFile(join(__dirname, '../renderer/index.html'), query ? { query } : undefined)
  }
}

// D-050: build/icon.png isn't part of electron-builder's `files` (only
// consumed at package time for the app's own OS icon) — extraResources
// copies it to resources/icon.png for the packaged app; in dev it's just the
// project's own build/icon.png.
function trayIconPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'icon.png')
    : join(app.getAppPath(), 'build', 'icon.png')
}

function createWindow(): BrowserWindow {
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
  loadRenderer(window)
  mainWindow = window
  // D-050: while "Run in background" is on, closing the window hides it to
  // the tray instead of quitting — the tray's own Quit item (or any other
  // real quit path) sets isQuitting first so this doesn't also intercept that.
  window.on('close', (event) => {
    if (backgroundModeEnabled && !isQuitting) {
      event.preventDefault()
      window.hide()
      // D-051: hiding alone used to leave a still-playing video running
      // silently behind the tray icon — the renderer decides whether to pop
      // it out to the always-on-top window or pause it, per
      // settings.popOutOnClose (it owns the live playback state; this
      // process doesn't).
      broadcast({ type: 'app:closedToTray' })
    }
  })
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null
  })
  return window
}

// B-045: a second BrowserWindow (its own renderer process — the live
// iframe's DOM node can't move between them) hosting the minimal
// ExtractedPlayerWindow UI, seeked to wherever the main window's player was
// when the user chose to extract. alwaysOnTop is the whole point: a small
// floating video that stays above other windows while the user works.
function createExtractWindow(
  videoId: string,
  title: string,
  startSeconds: number,
  playing: boolean,
  defaultPlaybackRate: number,
  // D-051: true when this extraction was triggered by closing the window to
  // the tray rather than the user pressing `p` — closing this window then
  // should stop the video for good, not hand it back to the (possibly still
  // hidden) main window.
  auto: boolean
): void {
  // B-112: guards against ever having two extract windows open at once —
  // nothing in the renderer currently offers a way to trigger a second
  // extraction while one is already open (the main window's own player is
  // empty for as long as the extract window is up), but this makes that
  // invariant hold even if that ever changes, rather than assuming it.
  if (extractWindow !== null && !extractWindow.isDestroyed()) {
    extractWindow.destroy()
  }
  const window = new BrowserWindow({
    width: 480,
    height: 270,
    alwaysOnTop: true,
    backgroundColor: '#000000',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      // Chromium's autoplay policy can otherwise treat a fresh top-level
      // navigation more strictly than the main window's *nested* iframe —
      // ExtractedPlayerWindow also issues an explicit playVideo() command
      // as a second line of defense, but this removes the platform-level
      // block outright.
      autoplayPolicy: 'no-user-gesture-required'
    }
  })
  // A small floating video window has no use for Electron's default
  // File/Edit/View/Window/Help application menu.
  window.removeMenu()
  window.setAspectRatio(16 / 9)
  loadRenderer(window, {
    extract: videoId,
    title,
    t: String(Math.max(0, Math.floor(startSeconds))),
    autoplay: playing ? '1' : '0',
    rate: String(defaultPlaybackRate)
  })
  extractWindow = window
  // B-112: tracks whichever video is *currently* showing in the extract
  // window, not just the one it was created with — loadInExtractWindow
  // updates this whenever the user swaps videos while the window stays
  // open, so the restore-on-close path below hands back the right one.
  extractWindowVideoId = videoId
  // The main window's miniplayer picks the video back up once this window
  // closes, resuming from wherever ExtractedPlayerWindow's own
  // beforeunload last saved (best-effort — if that write raced the window
  // actually tearing down, this falls back to the extraction-time position
  // already persisted when extraction started).
  window.on('closed', () => {
    const restoreVideoId = extractWindowVideoId ?? videoId
    if (extractWindow === window) {
      extractWindow = null
      extractWindowVideoId = null
    }
    if (!auto) broadcast({ type: 'player:restoreFromExtract', videoId: restoreVideoId })
    broadcast({ type: 'player:extractWindowClosed' })
  })
}

function broadcast(event: ChronicleEventDto): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(IpcChannel.events, event)
  }
}

let db: DatabaseSync | undefined
let packagedRendererUrl: string | null = null
let closeRendererServer: (() => void) | null = null
// Module-level (not boot()-local): "delete all data" tears boot() down and
// calls it again in-process (see boot()'s own comment for why), and the
// will-quit cleanup below needs to reach whichever generation's timers are
// currently live regardless of how many times boot() has run.
let timer: ReturnType<typeof setInterval> | null = null
let updateTimer: ReturnType<typeof setInterval> | null = null
// D-050: tray-resident mode. mainWindow is tracked so the tray's "Open" item
// and a notification click can re-show it instead of only being able to spawn
// a fresh one; isQuitting distinguishes a real quit (let the window close) from
// the user just clicking the window's close button while backgroundMode is on
// (hide instead).
let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false
// B-112: tracks the single always-on-top extract window (if any) so a newly
// selected video can be routed into it instead of the main window, and so
// its close handler can look up whichever video is currently showing there.
let extractWindow: BrowserWindow | null = null
let extractWindowVideoId: string | null = null
// Mirrors settings.backgroundMode (boot()-local) so the module-level
// createWindow()'s close handler can read it without needing boot()'s whole
// closure — kept in sync by applyBackgroundMode() every time it runs.
let backgroundModeEnabled = false
// D-050: startMinimized only ever applies to the actual app launch — a
// deleteAllData reset re-runs boot() while the window is already open and
// visible (the user just clicked a button in it), and process.argv/
// getLoginItemSettings() don't change mid-process, so without this guard
// wasLaunchedViaAutostart() would still read true on that later re-boot too.
let hasBootedBefore = false

// Isolated try/catch so a throwing destroy() (unlikely, but seen with flaky
// Linux tray hosts) can never skip resetting the reference — leaving `tray`
// non-null after a failed destroy would wrongly convince applyBackgroundMode
// a tray still exists and skip creating a fresh one.
function destroyTray(): void {
  try {
    tray?.destroy()
  } catch (error) {
    console.error('D-050: tray destroy failed', error)
  }
  tray = null
}

function showOrCreateMainWindow(): void {
  if (mainWindow !== null && !mainWindow.isDestroyed()) {
    mainWindow.show()
    mainWindow.focus()
  } else {
    createWindow()
  }
}

// Composition root + IPC registration. Callable more than once: "delete all
// data" (IpcChannel.deleteAllData below) tears everything down and calls
// this again in the same process, landing on a genuinely fresh first-run
// state without ever exiting the process. Previously this flow used
// `app.relaunch()` + `app.quit()` instead, which reportedly left the
// relaunched window frozen/blank — the working theory is that `electron-vite
// dev` supervises this process as its own child and tears down the Vite dev
// server the moment it sees that child exit, which a relaunched instance
// then has nothing to `loadURL()` against. Never exiting the process at all
// sidesteps that regardless of whether the theory is exactly right.
async function boot(): Promise<void> {
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
  const updateSource = new GithubReleaseSource(fetch)

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
      failures: [...acc.failures, ...r.failures],
      videosNew: acc.videosNew + r.videosNew,
      newVideosByChannel: [...acc.newVideosByChannel, ...r.newVideosByChannel],
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
  // B-070: a refresh call that arrives while another is already running must
  // never be silently dropped — connectGoogle/connectAccount fire their
  // post-connect sync as fire-and-forget (`void runRefresh(...)`), and if
  // that lost the race against the launch-time refresh, the 30-min timer, or
  // another account's own connect, the new account's videos never synced
  // until some unrelated later refresh happened to run to completion. Every
  // call now chains onto this queue instead of racing a single boolean guard,
  // so it always eventually runs (and its own refresh:started/refresh:done
  // pair always fires) rather than returning `busy` and vanishing.
  let refreshQueue: Promise<unknown> = Promise.resolve()
  // accountId (B-003) targets one account explicitly (e.g. sidebar "Sync
  // now"); channelId resolves to whichever account(s) actually subscribe to
  // it (usually one); neither means "every connected account" — the
  // combined-feed default, and what launch/timer refreshes always mean.
  function runRefresh(
    trigger: SyncTrigger,
    accountId?: string,
    channelId?: string
  ): Promise<ResultDto<SyncReportDto>> {
    const run = refreshQueue.then(
      () => runRefreshNow(trigger, accountId, channelId),
      () => runRefreshNow(trigger, accountId, channelId)
    )
    // Swallow the result here so one queued failure never poisons the chain
    // for requests queued behind it — each caller still sees its own outcome
    // via the returned `run` promise.
    refreshQueue = run.catch(() => undefined)
    return run
  }

  async function runRefreshNow(
    trigger: SyncTrigger,
    accountId?: string,
    channelId?: string
  ): Promise<ResultDto<SyncReportDto>> {
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
        // new", not an unclearable backlog. SyncService.refresh (B-069) now
        // applies this per hydrated batch as the sync runs, so this blanket
        // pass is a safety net for anything quota-interrupted hydration left
        // behind, not the primary mechanism — but still runs before
        // refresh:done so the event's unread count is guaranteed correct.
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
    maybeNotifyNewVideos(merged)
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
        favorite: followed.favorite,
        notify: followed.notify
      }))
  )
  ipcMain.handle(IpcChannel.toggleChannelFavorite, (_event, channelId: unknown) => {
    const id = parseChannelIdRequired(channelId)
    const accountId = resolveOwningAccountId(id)
    if (accountId === undefined) return false
    const favorite = feedRepository.toggleChannelFavorite(accountId, id)
    // D-050 redesign: a one-shot nudge at the moment of the favorite toggle,
    // not a persistent binding — a later manual notify toggle on this same
    // channel is never re-overridden by this until the next favorite/
    // unfavorite event.
    if (settings.autoNotifyFavorites) feedRepository.setChannelNotify(accountId, id, favorite)
    return favorite
  })
  ipcMain.handle(IpcChannel.toggleChannelNotify, (_event, channelId: unknown) => {
    const id = parseChannelIdRequired(channelId)
    const accountId = resolveOwningAccountId(id)
    if (accountId === undefined) return false
    return feedRepository.toggleChannelNotify(accountId, id)
  })
  ipcMain.handle(IpcChannel.bulkSetChannelNotifyForFavorites, (_event, enable: unknown) => {
    feedRepository.bulkSetNotifyForFavorites(Boolean(enable))
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
    async (
      _event,
      query: unknown,
      pageToken: unknown
    ): Promise<ResultDto<{ results: SearchResultDto[]; nextPageToken: string | null }>> => {
      const q = String(query).trim()
      if (q === '') return { ok: true, value: { results: [], nextPageToken: null } }
      try {
        const page = await apiClient.search(q, typeof pageToken === 'string' ? pageToken : undefined)
        return {
          ok: true,
          value: { results: page.results.map(toSearchResultDto), nextPageToken: page.nextPageToken }
        }
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
  ipcMain.handle(
    IpcChannel.getChannelVideos,
    async (
      _event,
      channelId: unknown,
      pageToken: unknown
    ): Promise<ResultDto<{ videos: SearchVideoResultDto[]; nextPageToken: string | null }>> => {
      const id = parseChannelIdRequired(channelId)
      try {
        const playlists = await apiClient.fetchUploadsPlaylists([id])
        const uploadsPlaylistId = playlists.get(id)
        if (uploadsPlaylistId === undefined) return { ok: true, value: { videos: [], nextPageToken: null } }
        const page = await apiClient.listUploads(
          uploadsPlaylistId,
          typeof pageToken === 'string' ? pageToken : undefined
        )
        const hydrated = await apiClient.hydrate(page.videoIds)
        const videos: SearchVideoResultDto[] = hydrated.map((video) => ({
          kind: 'video',
          videoId: video.videoId,
          title: video.title,
          channelId: video.channelId,
          channelTitle: video.channelTitle,
          publishedAt: video.publishedAt,
          thumbnailUrl: video.thumbnailUrl,
          durationSeconds: video.durationSeconds,
          isShort: video.durationSeconds !== null && video.durationSeconds <= 60
        }))
        return { ok: true, value: { videos, nextPageToken: page.nextPageToken } }
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
        const { entry, description: storedDescription } = local
        // Storage keeps descriptions truncated to 500 chars (local-data.md).
        // The player wants the full text, so it's re-fetched here rather
        // than served straight from the truncated copy — videos.list, 1 unit,
        // same call the external-video branch below already makes for the
        // same reason. Never blocks opening the video: a failure (offline,
        // quota) just falls back to the shorter stored copy.
        let description = storedDescription
        try {
          const [fresh] = await apiClient.hydrate([id])
          if (fresh !== undefined) description = fresh.description
        } catch {
          // Keep the stored (possibly truncated) description.
        }
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
    IpcChannel.requestWriteScopeForChannel,
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
        await stack.authFlow.requestWriteScope()
        stack.authProvider.invalidate()
        return { ok: true, value: undefined }
      } catch (error) {
        const kind = isDomainError(error) ? error.kind : 'internal'
        return { ok: false, errorKind: kind, message: String((error as Error).message ?? error) }
      }
    }
  )
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
        // D-032 incremental consent: surfaced as an in-app dialog (the
        // writeScopeGate pattern) before any browser opens, never requested
        // silently by the action itself.
        if (!stack.authFlow.hasWriteScope()) {
          return {
            ok: false,
            errorKind: 'write-scope-required',
            message: 'unsubscribing needs an extra permission'
          }
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
        // Empirically requires the write scope too, not just readonly (the
        // opposite of what Google's own docs say) — confirmed by the owner:
        // commentThreads.list 403s until the force-ssl grant from a Like
        // action, after which reading comments starts working. Gated the
        // same way as every other write-scope action so the dialog shows up
        // instead of a bare 403.
        if (!authFlow.hasWriteScope()) {
          return {
            ok: false,
            errorKind: 'write-scope-required',
            message: 'reading comments needs an extra permission'
          }
        }
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

  // D-026: notice-only background check against GitHub's public Releases
  // API — a startup check plus a slow (24h) interval, since unlike sync
  // there's no reason to poll a release feed often.
  const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60_000
  async function checkForUpdates(): Promise<void> {
    const release = await updateSource.latestRelease()
    if (release !== null && isNewerVersion(app.getVersion(), release.version)) {
      broadcast({ type: 'update:available', version: release.version, url: release.url })
    }
  }
  function applyUpdateCheckTimer(): void {
    if (updateTimer !== null) clearInterval(updateTimer)
    updateTimer = null
    if (settings.checkForUpdates) {
      void checkForUpdates()
      updateTimer = setInterval(() => void checkForUpdates(), UPDATE_CHECK_INTERVAL_MS)
    }
  }
  applyUpdateCheckTimer()

  // D-050: three independent toggles (none gates any other — see
  // AppSettings' own comment). Both apply* functions below feature-detect
  // and swallow errors rather than throw, per the decision's own risk note
  // that Windows/macOS auto-start and Linux's hand-rolled autostart file are
  // unverified here (only Linux is hands-on tested) — a platform that
  // doesn't support one of these should silently no-op, not crash the app.
  function applyAutoStart(): void {
    try {
      // In a packaged app, process.execPath *is* Chronicle — no arguments
      // needed. Running from source (electron-vite dev), it's the bare
      // Electron binary from node_modules instead; launched alone at login
      // it has no app to load at all. The standard fix (Electron's own
      // "Launch at startup" recipe): pass the project entry point
      // (process.argv[1], what electron-vite invoked electron with) as an
      // argument so a dev-mode autostart actually opens Chronicle too.
      const devArgs = app.isPackaged ? [] : [resolve(process.argv[1] ?? '.')]
      if (process.platform === 'linux') {
        // D-024: the Linux target is AppImage-only. An AppImage's
        // process.execPath resolves to a path *inside its own temporary
        // SquashFS mount* (e.g. /tmp/.mount_XXXXXX/chronicle) — that mount
        // is torn down as soon as this run exits, so writing it into the
        // autostart entry would point at a path that no longer exists by
        // the next login. The AppImage runtime sets $APPIMAGE to the
        // actual, stable .AppImage file path on disk; use that instead
        // whenever present (unset outside an AppImage — e.g. dev mode).
        // AUTOSTART_HIDDEN_FLAG is always included regardless of the
        // current startMinimized value — wasLaunchedViaAutostart() only
        // means "this launch came from autostart"; whether to actually
        // start hidden is decided at boot from the live setting, not baked
        // in here (so changing startMinimized alone, without retoggling
        // autoStart, still takes effect on the next login).
        const linuxExecPath = process.env.APPIMAGE ?? process.execPath
        const execCommand = [linuxExecPath, ...devArgs, AUTOSTART_HIDDEN_FLAG]
          .map((part) => JSON.stringify(part))
          .join(' ')
        setLinuxAutostart(settings.autoStart, execCommand)
      } else if (process.platform === 'win32') {
        // path/args are win32-only (Electron's Settings type) — macOS has
        // no equivalent, but doesn't need one; see wasLaunchedViaAutostart.
        app.setLoginItemSettings({
          openAtLogin: settings.autoStart,
          path: process.execPath,
          args: [...devArgs, AUTOSTART_HIDDEN_FLAG]
        })
      } else {
        app.setLoginItemSettings({ openAtLogin: settings.autoStart })
      }
    } catch (error) {
      console.error('D-050: applyAutoStart failed', error)
    }
  }
  applyAutoStart()

  // D-050 (revised, live-tested workaround): once created, the tray is never
  // destroyed mid-session — only at real app quit (will-quit) or a
  // deleteAllData reset (new boot() generation, see its own comment). Live
  // testing (D-Bus introspection: zero live Chronicle registrations under
  // org.kde.StatusNotifierWatcher while a ghost icon stayed stuck and
  // unresponsive) narrowed this to the tray host — at least the owner's
  // QuickShell setup — not reliably processing destroy() while the process
  // stays alive, even though the exact same destroy()-then-recreate pattern
  // is the documented-correct one and reliably works on real quit (which
  // drops the whole D-Bus connection instead of sending an explicit
  // unregister). Trade-off accepted (owner's call): turning "Run in
  // background" off no longer removes an already-shown icon immediately —
  // it still fully restores window-close-quits-the-app behavior via
  // backgroundModeEnabled below, the icon just lingers until the app quits.
  function applyBackgroundMode(): void {
    backgroundModeEnabled = settings.backgroundMode
    try {
      if (settings.backgroundMode) {
        if (tray !== null && tray.isDestroyed()) tray = null // self-heal a stale reference
        if (tray === null) {
          tray = createAppTray(trayIconPath(), {
            onOpen: showOrCreateMainWindow,
            onRefreshNow: () => void runRefresh('manual'),
            onQuit: () => {
              isQuitting = true
              app.quit()
            }
          })
        }
      } else if (mainWindow !== null && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
        // Turning the toggle off shouldn't leave the app invisible in the
        // background with no way back in beyond relaunching it.
        mainWindow.show()
      }
    } catch (error) {
      console.error('D-050: applyBackgroundMode failed', error)
    }
  }
  applyBackgroundMode()

  // D-050: never fires on an account's first sync (that's backlog, not
  // something that happened while backgrounded — mirrors D-047's reasoning).
  // 'all' ignores the per-channel notify flag entirely; 'selected' respects
  // it (notify flags OR'd across every connected account, same semantics
  // listFollowedChannels already uses elsewhere) — switching scope never
  // writes to those flags, so they survive round-trips between modes.
  function maybeNotifyNewVideos(report: SyncReport): void {
    if (!settings.notifyNewVideos || report.firstSync || report.newVideosByChannel.length === 0) {
      return
    }
    try {
      if (!Notification.isSupported()) return
      // D-052: Shorts hidden from the feed (showShorts off) never notify,
      // full stop — notifyShorts only decides whether they do when Shorts
      // are otherwise shown.
      const includeShorts = settings.showShorts && settings.notifyShorts
      let matched = report.newVideosByChannel
        .map((entry) => ({ ...entry, count: includeShorts ? entry.count : entry.count - entry.shortsCount }))
        .filter((entry) => entry.count > 0)
      if (settings.notifyScope === 'selected') {
        const followed = feedRepository.listFollowedChannels(true)
        const scopedIds = new Set(followed.filter((c) => c.notify).map((c) => c.channel.channelId))
        matched = matched.filter((entry) => scopedIds.has(entry.channelId))
      }
      if (matched.length === 0) return
      const body =
        matched.length === 1
          ? `${matched[0].count} new video${matched[0].count === 1 ? '' : 's'} from ${matched[0].channelTitle}`
          : `${matched.reduce((sum, entry) => sum + entry.count, 0)} new videos across ${matched.length} channels`
      const notification = new Notification({ title: 'Chronicle', body })
      notification.on('click', showOrCreateMainWindow)
      notification.show()
    } catch (error) {
      console.error('D-050: maybeNotifyNewVideos failed', error)
    }
  }

  ipcMain.handle(IpcChannel.getSettings, () => ({ settings, warning: settingsWarning }))
  ipcMain.handle(IpcChannel.setSettings, (_event, raw: unknown) => {
    settings = normalizeSettings(raw)
    saveSettings(settingsFile, settings)
    applyRefreshTimer()
    applyUpdateCheckTimer()
    applyAutoStart()
    applyBackgroundMode()
  })
  ipcMain.handle(IpcChannel.getAppVersion, () => app.getVersion())

  // B-093: no automation, no credential handling — just a plain window at
  // youtube.com. No explicit partition (see the comment above createWindow),
  // so it shares the same default session the player's iframe already uses.
  // The user signs in (or not) exactly like they would in any browser;
  // closing the window is on them, same as the corner-icon workaround this
  // replaces with a discoverable action.
  ipcMain.handle(IpcChannel.openYouTubeSignIn, () => {
    const signInWindow = new BrowserWindow({ width: 480, height: 720 })
    signInWindow.removeMenu()
    void signInWindow.loadURL('https://www.youtube.com')
  })

  ipcMain.handle(
    IpcChannel.extractPlayer,
    (
      _event,
      videoId: unknown,
      title: unknown,
      currentTimeSeconds: unknown,
      playing: unknown,
      defaultPlaybackRate: unknown,
      auto: unknown
    ) => {
      const id = parseVideoId(videoId)
      const label = typeof title === 'string' ? title : ''
      const t = typeof currentTimeSeconds === 'number' ? currentTimeSeconds : 0
      const rate =
        typeof defaultPlaybackRate === 'number' &&
        (PLAYBACK_RATES as readonly number[]).includes(defaultPlaybackRate)
          ? defaultPlaybackRate
          : 1
      createExtractWindow(id, label, t, playing === true, rate, auto === true)
    }
  )

  // B-112: routes a newly-selected video into the already-open extract
  // window rather than the main window. Returns false (not an error) if no
  // extract window is open — the extractWindowVideoId bookkeeping
  // createExtractWindow's own close handler relies on is only meaningful
  // while a window actually exists.
  ipcMain.handle(IpcChannel.loadInExtractWindow, (_event, videoId: unknown, title: unknown) => {
    if (extractWindow === null || extractWindow.isDestroyed()) return false
    const id = parseVideoId(videoId)
    const label = typeof title === 'string' ? title : ''
    extractWindowVideoId = id
    extractWindow.webContents.send(IpcChannel.events, {
      type: 'player:loadInExtract',
      videoId: id,
      title: label
    })
    return true
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
  // clean first-run state — entirely in-process (see boot()'s own comment).
  ipcMain.handle(IpcChannel.deleteAllData, async () => {
    db?.close()
    db = undefined
    for (const suffix of ['', '-wal', '-shm']) {
      rmSync(join(dataDir, `chronicle.db${suffix}`), { force: true })
    }
    rmSync(settingsFile, { force: true })
    rmSync(join(dataDir, 'secrets.json'), { force: true })
    rmSync(chronicleCacheDir(), { recursive: true, force: true })
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
    if (updateTimer !== null) {
      clearInterval(updateTimer)
      updateTimer = null
    }
    // D-050: the tray's own click callbacks close over this boot()
    // generation's runRefresh/settings — stale once boot() reruns below, so
    // it's destroyed here and freshly recreated by the new generation's own
    // applyBackgroundMode() rather than left pointing at torn-down state.
    destroyTray()
    // Every handler this boot() generation registered must go before the
    // next boot() re-registers them — ipcMain.handle throws if a channel
    // already has one.
    for (const channel of Object.values(IpcChannel)) ipcMain.removeHandler(channel)
    try {
      protocol.unhandle('thumb')
    } catch {
      // Nothing registered yet — fine.
    }
    // The stale windows are kept alive (not destroyed) until boot() has a
    // fresh one up: destroying every window first would momentarily drop
    // BrowserWindow.getAllWindows() to zero, which on Linux/Windows fires
    // the window-all-closed handler below straight into app.quit() — the
    // same "process exits mid-reset" failure mode this whole rework exists
    // to avoid, just reached a different way.
    const staleWindows = BrowserWindow.getAllWindows()
    await boot()
    for (const window of staleWindows) window.destroy()
  })

  // D-050: skip the initial window only for the real launch (not a
  // deleteAllData re-boot — see hasBootedBefore's own comment), only when
  // it actually came from the OS autostart entry, and only when there's a
  // tray to fall back to (backgroundMode) — otherwise the process would be
  // fully unreachable with no window and no tray.
  const skipInitialWindow =
    !hasBootedBefore &&
    wasLaunchedViaAutostart() &&
    settings.startMinimized &&
    settings.backgroundMode
  hasBootedBefore = true
  if (skipInitialWindow) {
    void validateConnectionAndCatchUp()
  } else {
    const window = createWindow()
    window.webContents.once('did-finish-load', () => {
      void validateConnectionAndCatchUp()
    })
  }
}

void app.whenReady().then(async () => {
  if (!gotSingleInstanceLock) return // already quitting — see the lock check above
  if (app.isPackaged) {
    const server = await startRendererServer(join(__dirname, '../renderer'))
    packagedRendererUrl = `${server.url}/index.html`
    closeRendererServer = server.close
  }
  await boot()
})

// D-050: a second launch attempt (e.g. clicking the app icon again while
// tray-resident) hits this in the *original* instance instead of spawning
// its own process — bring the existing window forward like the tray's own
// Open item does.
app.on('second-instance', () => {
  if (gotSingleInstanceLock) showOrCreateMainWindow()
})

// Registered once, outside boot() — boot() itself can run more than once
// (delete-all), and createWindow() is already a stable top-level function,
// so this doesn't need to be re-registered on every generation.
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  if (timer !== null) clearInterval(timer)
  if (updateTimer !== null) clearInterval(updateTimer)
  destroyTray()
  closeRendererServer?.()
  db?.close()
})

// D-050: falls back to isQuitting = true on any other route to a real quit
// (e.g. Cmd+Q on macOS, or an OS session logout) so backgroundMode's close
// intercept doesn't fight the app actually trying to exit.
app.on('before-quit', () => {
  isQuitting = true
})
