import { app, BrowserWindow, Notification, Tray, dialog, ipcMain, protocol, safeStorage } from 'electron'
import { mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { DatabaseSync } from 'node:sqlite'
import { openDatabase } from '../adapters/storage/database'
import { migrate } from '../adapters/storage/migrations'
import {
  SqliteCatalogRepository,
  SqliteFeedRepository,
  SqliteStateRepository
} from '../adapters/storage/repositories'
import { SqlitePlaylistRepository } from '../adapters/storage/playlist-repository'
import { SqliteSyncRepository } from '../adapters/storage/sync-repository'
import { FileSecretStore, type SecretCipher } from '../adapters/secrets/file-secret-store'
import { MachineKeyCipher } from '../adapters/secrets/machine-key-cipher'
import { GoogleOAuth } from '../adapters/oauth/google-oauth'
import { DEFAULT_ACCOUNT_ID } from '../adapters/oauth/auth'
import { HeadShortsProber } from '../adapters/youtube/shorts-prober'
import { GithubReleaseSource } from '../adapters/updates/github-release-source'
import { RydClient } from '../adapters/ryd/ryd-client'
import { FeedService } from '../core/feed-service'
import { startOfToday } from '../core/feed'
import { isDomainError } from '../core/errors'
import { QuotaCounter, type Clock } from '../core/ports'
import { isNewerVersion } from '../core/version'
import type { SyncReport, SyncTrigger } from '../core/sync-service'
import type { AccountDto, AuthStatusDto, ChronicleEventDto, ResultDto, StorageInfoDto, SyncReportDto, WizardStateDto } from '../ipc/contract'
import { IpcChannel, PLAYBACK_RATES } from '../ipc/contract'
import { buildAccountStack, type AccountStack } from './ipc/account-stack'
import { toReportDto } from './ipc/dto-mappers'
import { parseVideoId } from './ipc/validators'
import type { BootContext } from './ipc/context'
import { registerFeedHandlers } from './ipc/feed-handlers'
import { registerVideoStateHandlers } from './ipc/video-state-handlers'
import { registerChannelHandlers } from './ipc/channel-handlers'
import { registerSearchHandlers } from './ipc/search-handlers'
import { registerPlaylistHandlers } from './ipc/playlist-handlers'
import { registerAccountHandlers } from './ipc/account-handlers'
import { registerCommentsHandlers } from './ipc/comments-handlers'
import { chronicleDataDir } from './data-dir'
import { seedDevFixtures } from './dev-fixtures'
import { setLinuxAutostart } from './linux-autostart'
import { startRendererServer } from './renderer-server'
import { loadSettings, normalizeSettings, saveSettings, type AppSettings } from './settings-store'
import { ThumbnailCache, chronicleCacheDir } from './thumbnail-cache'
import { createAppTray } from './tray'

const clock: Clock = { now: () => new Date() }

// Must be checked before anything else registers: with "Run in background"
// keeping the process alive with no window open, a second launch on top of
// a tray-resident instance would leave two independent processes each with
// their own tray icon.
const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  app.quit()
}

// "Start minimized" needs to know a launch was actually triggered by the OS
// autostart entry, not a manual open. macOS reports this natively
// (wasOpenedAtLogin); Windows/Linux have no per-launch signal, so
// applyAutoStart() below bakes this flag into the login item's args /
// .desktop Exec= line, read back here at boot.
const AUTOSTART_HIDDEN_FLAG = '--hidden'
function wasLaunchedViaAutostart(): boolean {
  if (process.platform === 'darwin') return app.getLoginItemSettings().wasOpenedAtLogin
  return process.argv.includes(AUTOSTART_HIDDEN_FLAG)
}

// Chromium only auto-detects the keychain on desktops it knows (GNOME, KDE…).
// On anything else (niri, sway, headless) it silently picks basic_text even
// when org.freedesktop.secrets is live on D-Bus. Requesting gnome-libsecret
// explicitly is safe: if no Secret Service answers, isEncryptionAvailable()
// stays false and chooseSecretStore falls back to the machine key.
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('password-store', 'gnome-libsecret')
}

// thumb:// serves cached thumbnails to the renderer (ui.md: disk cache with
// LRU cap; architecture.md: the renderer never fetches Google directly).
protocol.registerSchemesAsPrivileged([
  { scheme: 'thumb', privileges: { standard: true, secure: true, stream: true } }
])

// Refresh triggers (youtube-api.md §Refresh policy): every launch, manual
// always, background timer while running — default 30 min,
// user-configurable down to 15 min or manual-only.

// Cipher selection: (a) Electron safeStorage when a real OS keychain
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

// electron-vite's dev orchestrator sets this once for the process's whole
// lifetime, including across a "delete all data" reset (boot() reruns
// in-process rather than spawning a new one).
function devRendererUrl(): string | undefined {
  return process.env['ELECTRON_RENDERER_URL']
}

// Deliberately not a named partition: every BrowserWindow here omits
// `webPreferences.partition`, so they all share Electron's default session —
// same as the player's embedded iframe (inherits its embedding page's
// session) and the "Sign in to YouTube" window below. `protocol.handle()`
// (used for `thumb://` further down) registers on `session.defaultSession`
// specifically, so a named partition would have no handler on it. Chronicle's
// own OAuth flow runs in the system browser, never this session, so it
// starts out signed into nothing regardless.

// Shared by createWindow() and the extract-to-window flow below — both load
// the same renderer bundle; the extracted window adds a query
// string main.tsx checks to render a smaller UI instead of the full app.
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

// build/icon.png isn't part of electron-builder's `files` (only consumed at
// package time for the app's own OS icon) — extraResources copies it to
// resources/icon.png for the packaged app; in dev it's the project's own
// build/icon.png.
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
    // Frameless shell: Chronicle draws its own titlebar. On macOS
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
  // While "Run in background" is on, closing the window hides it to the tray
  // instead of quitting — the tray's own Quit item (or any other real quit
  // path) sets isQuitting first so this doesn't also intercept that.
  window.on('close', (event) => {
    if (backgroundModeEnabled && !isQuitting) {
      event.preventDefault()
      window.hide()
      // The renderer decides whether to pop the video out to the always-on-top
      // window or pause it, per settings.popOutOnClose — it owns the live
      // playback state, this process doesn't.
      broadcast({ type: 'app:closedToTray' })
    }
  })
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null
  })
  return window
}

// A second BrowserWindow (its own renderer process — the live iframe's DOM
// node can't move between them) hosting the minimal ExtractedPlayerWindow UI,
// seeked to wherever the main window's player was when extracted.
// alwaysOnTop is the point: a small floating video above other windows.
function createExtractWindow(
  videoId: string,
  title: string,
  startSeconds: number,
  playing: boolean,
  defaultPlaybackRate: number,
  // True when extraction was triggered by closing to tray rather than the
  // user pressing `p`; its close must stop the video for good, not hand it
  // back to the possibly still-hidden main window.
  auto: boolean
): void {
  // Guards against two extract windows open at once — not currently
  // reachable from the renderer, but enforced here regardless.
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
  // Tracks whichever video is currently showing in the extract window, not
  // just the one it was created with — loadInExtractWindow updates this when
  // the user swaps videos, so the restore-on-close path hands back the right
  // one.
  extractWindowVideoId = videoId
  // The main window's miniplayer picks the video back up once this window
  // closes, resuming from wherever ExtractedPlayerWindow's own beforeunload
  // last saved (best-effort — falls back to the extraction-time position if
  // that write raced the window tearing down).
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

// A bare top-level navigation to YouTube's own `live_chat` embed — unlike
// createExtractWindow above, there's no live playback state to keep in
// sync, so no preload/postMessage bridge is needed at all, same pattern as
// the plain Sign In window. The page is YouTube's own, so it naturally
// carries YouTube's own title (Electron mirrors document.title into the
// native window title) — already distinct from "Chronicle," no override
// needed the way the video extract window requires one.
function createChatWindow(videoId: string): void {
  if (chatWindow !== null && !chatWindow.isDestroyed()) {
    chatWindow.destroy()
  }
  const window = new BrowserWindow({ width: 420, height: 600 })
  window.removeMenu()
  void window.loadURL(`https://www.youtube.com/live_chat?v=${videoId}&dark_theme=1`)
  chatWindow = window
  window.on('closed', () => {
    if (chatWindow === window) chatWindow = null
    broadcast({ type: 'chat:extractWindowClosed', videoId })
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
// calls it again in-process, and the will-quit cleanup below needs to reach
// whichever generation's timers are currently live regardless of how many
// times boot() has run.
let timer: ReturnType<typeof setInterval> | null = null
let updateTimer: ReturnType<typeof setInterval> | null = null
// Tray-resident mode. mainWindow is tracked so the tray's "Open" item
// and a notification click can re-show it instead of only spawning a fresh
// one; isQuitting distinguishes a real quit (let the window close) from the
// user clicking the window's close button while backgroundMode is on (hide
// instead).
let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false
// Tracks the single always-on-top extract window (if any) so a newly
// selected video can be routed into it instead of the main window, and so its
// close handler can look up whichever video is currently showing there.
let extractWindow: BrowserWindow | null = null
let extractWindowVideoId: string | null = null
// The extracted live-chat popup (if any) — fully independent of
// extractWindow above, so both can be open at once for different purposes.
let chatWindow: BrowserWindow | null = null
// Mirrors settings.backgroundMode (boot()-local) so the module-level
// createWindow()'s close handler can read it without needing boot()'s whole
// closure — kept in sync by applyBackgroundMode() every time it runs.
let backgroundModeEnabled = false
// startMinimized only ever applies to the actual app launch — a
// deleteAllData reset re-runs boot() while the window is already open and
// visible, and process.argv/getLoginItemSettings() don't change mid-process,
// so without this guard wasLaunchedViaAutostart() would still read true on
// that later re-boot too.
let hasBootedBefore = false

// Isolated try/catch so a throwing destroy() (unlikely, but seen with flaky
// Linux tray hosts) can never skip resetting the reference — leaving `tray`
// non-null after a failed destroy would wrongly convince applyBackgroundMode
// a tray still exists and skip creating a fresh one.
function destroyTray(): void {
  try {
    tray?.destroy()
  } catch (error) {
    console.error('tray destroy failed', error)
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
// data" (IpcChannel.deleteAllData below) tears everything down and calls this
// again in the same process, landing on a fresh first-run state without ever
// exiting the process — `electron-vite dev` supervises this process as its
// own child and tears down the Vite dev server as soon as it exits, which a
// relaunched instance would have nothing to `loadURL()` against.
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
  const playlistRepository = new SqlitePlaylistRepository(db)
  const feedService = new FeedService(feedRepository, clock)

  const secrets = chooseSecretStore(join(dataDir, 'secrets.json'))
  const oauth = new GoogleOAuth(fetch)
  // One Google Cloud project/OAuth client and one quota pool shared by every
  // account (that's the whole point — additional accounts skip the console
  // walkthrough and just add themselves as a Test user on the same project);
  // only tokens/scopes are per-account.
  const quota = new QuotaCounter()
  const updateSource = new GithubReleaseSource(fetch)
  // Account-independent — not part of any account's YouTube auth stack, and
  // its in-memory cache is intentionally process-lifetime only.
  const rydClient = new RydClient(fetch, clock)
  // Account-independent, like rydClient above — a HEAD probe by videoId
  // needs no auth. Shared between every account's SyncService and the
  // on-demand confirmation below so there's only ever one.
  const shortsProber = new HeadShortsProber(fetch)

  const accountStacks = new Map<string, AccountStack>()

  function buildStack(accountId: string, label: string): AccountStack {
    return buildAccountStack(
      {
        secrets,
        oauth,
        quota,
        shortsProber,
        clock,
        syncRepository,
        onSyncProgress: (progress) =>
          broadcast({
            type: 'refresh:progress',
            phase: progress.phase,
            checked: progress.checked,
            total: progress.total
          })
      },
      accountId,
      label
    )
  }

  // Load every already-persisted account (from a prior session, or the
  // schema-v6 migration's backfill of a pre-existing single-account install).
  for (const account of syncRepository.listAccounts()) {
    accountStacks.set(account.accountId, buildStack(account.accountId, account.label))
  }
  // The first-run wizard and Settings' Connection section predate
  // multi-account and are unaffected by it: they always operate on this one
  // "primary" account, lazily created in-memory here if this is a genuinely
  // fresh install (not yet persisted — that happens on first successful
  // connect, exactly like the old single-account model always did).
  if (!accountStacks.has(DEFAULT_ACCOUNT_ID)) {
    accountStacks.set(DEFAULT_ACCOUNT_ID, buildStack(DEFAULT_ACCOUNT_ID, 'My account'))
  }
  function primaryAccountId(): string {
    return accountStacks.keys().next().value ?? DEFAULT_ACCOUNT_ID
  }
  // Pending accounts from startAddAccount() that haven't connected yet —
  // never persisted (no accounts row, no entry in accountStacks) until
  // connectAccount() succeeds, so an abandoned "add account" flow leaves no
  // trace beyond the shared oauth-client secret.
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

  // Merges one SyncReport per refreshed account into a single DTO —
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
  // A refresh call arriving while another is already running is never
  // dropped — connectGoogle/connectAccount fire their post-connect sync as
  // fire-and-forget, so every call chains onto this queue instead of racing a
  // single boolean guard: it always eventually runs, with its own
  // refresh:started/refresh:done pair, rather than returning `busy` and
  // vanishing.
  let refreshQueue: Promise<unknown> = Promise.resolve()
  // accountId targets one account explicitly (e.g. sidebar "Sync
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
        // On an account's first subscription sync, videos already published
        // before today start read — the user opens onto "what's new", not an
        // unclearable backlog. SyncService.refresh applies this per
        // hydrated batch as it runs; this pass is a safety net for anything
        // quota-interrupted hydration left behind, and still runs before
        // refresh:done so the event's unread count is correct.
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
      // Every refresh:started must be paired with a terminal event, or a
      // renderer that saw "started" spins its refresh indicator forever
      // with no way to recover short of a manual reload.
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

  // Startup connection validation: a cheap token refresh on every open, for
  // every connected account; invalid_grant surfaces as the reconnect
  // banner, never a blocker.
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
    // Every launch syncs — RSS conditional GETs make a no-change pass cost
    // ~0 quota, so no staleness guard is needed.
    void runRefresh('launch')
  }

  // An owning-account lookup for actions that operate on one account's
  // relationship to a channel (favorite/unsubscribe/backfill) — the UI only
  // ever passes a channelId, never an accountId, for these. Usually
  // exactly one account owns a channel; if more than one does, the action
  // applies to the first.
  function resolveOwningAccountId(channelId: string): string | undefined {
    return syncRepository.listAccountIdsForChannel(channelId)[0]
  }

  const backfillingChannels = new Set<string>()

  // A video acted on from a transient list (free-text search results, a
  // non-subscribed channel's preview) has no `videos` row yet — video_state
  // has a real FK to it. Hydrate + upsert on demand, exactly like opening
  // such a video into the player already does (getVideo) — never during
  // list render, only on the actual state-changing action. A no-op (single
  // indexed lookup) for any video that already has a row, which covers
  // every normal-feed call site.
  async function ensureVideoExists(videoId: string): Promise<void> {
    if (feedRepository.findVideo(videoId) !== null) return
    const [video] = await apiClient.hydrate([videoId])
    if (video === undefined) throw new Error('video not found on YouTube')
    syncRepository.upsertExternalVideo(video, clock.now().toISOString())
  }

  // Everything an extracted ipc/ handler module needs from this composition
  // root — see ipc/context.ts. getSettings/isRefreshing are live getters
  // since `settings`/`refreshing` below are reassigned, not mutated.
  const ctx: BootContext = {
    feedRepository,
    stateRepository,
    catalogRepository,
    syncRepository,
    playlistRepository,
    feedService,
    clock,
    rydClient,
    shortsProber,
    apiClient,
    authFlow,
    authProvider,
    accountStacks,
    pendingAccountStacks,
    buildAccountStack: buildStack,
    backfillingChannels,
    primaryAccountId,
    resolveOwningAccountId,
    ensureVideoExists,
    runRefresh,
    isRefreshing: () => refreshing,
    authStatus,
    toAccountDto,
    getSettings: () => settings,
    broadcast
  }

  registerFeedHandlers(ctx)
  registerVideoStateHandlers(ctx)
  registerChannelHandlers(ctx)
  registerSearchHandlers(ctx)
  registerPlaylistHandlers(ctx)
  registerAccountHandlers(ctx)
  registerCommentsHandlers(ctx)

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

  // Notice-only background check against GitHub's public Releases API — a
  // startup check plus a slow (24h) interval.
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

  // Three independent toggles, none gating any other. Both apply*
  // functions below feature-detect and swallow errors rather than throw —
  // only Linux autostart is hands-on tested, so an unsupported platform
  // should silently no-op, not crash the app.
  function applyAutoStart(): void {
    try {
      // In a packaged app, process.execPath is Chronicle itself. Running
      // from source (electron-vite dev), it's the bare Electron binary,
      // which needs the project entry point (process.argv[1]) passed as an
      // argument so a dev-mode autostart actually opens Chronicle too.
      const devArgs = app.isPackaged ? [] : [resolve(process.argv[1] ?? '.')]
      if (process.platform === 'linux') {
        // The Linux target is AppImage-only. process.execPath
        // resolves inside the AppImage's own temporary SquashFS mount,
        // torn down as soon as this run exits — use $APPIMAGE (the stable
        // file path the AppImage runtime sets) instead whenever present.
        // AUTOSTART_HIDDEN_FLAG is always included; whether to actually
        // start hidden is decided at boot from the live startMinimized
        // setting, not baked in here.
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
      console.error('applyAutoStart failed', error)
    }
  }
  applyAutoStart()

  // The tray is only ever destroyed at real quit (will-quit) or a
  // deleteAllData reset, never recreated mid-session — some Linux tray hosts
  // go stale under a destroy()-then-recreate cycle while the process stays
  // alive, even though it works fine on real quit. Trade-off:
  // turning "Run in background" off no longer removes an already-shown icon
  // immediately — window-close-quits-the-app behavior is still fully
  // restored via backgroundModeEnabled below, the icon just lingers until
  // the app quits.
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
      console.error('applyBackgroundMode failed', error)
    }
  }
  applyBackgroundMode()

  // Never fires on an account's first sync — that's backlog, not something
  // that happened while backgrounded. 'all' ignores the per-channel
  // notify flag; 'selected' respects it (OR'd across every connected
  // account, same semantics listFollowedChannels uses elsewhere) — switching
  // scope never writes to those flags, so they survive round-trips.
  function maybeNotifyNewVideos(report: SyncReport): void {
    if (!settings.notifyNewVideos || report.firstSync || report.newVideosByChannel.length === 0) {
      return
    }
    try {
      if (!Notification.isSupported()) return
      // A Short hidden from the feed (showShorts off) never notifies; when
      // shown, notifyShorts decides whether it also triggers one.
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
      console.error('maybeNotifyNewVideos failed', error)
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

  // No automation, no credential handling — a plain window at youtube.com,
  // sharing the default session the player's iframe already uses. The user
  // signs in (or not) exactly like they would in any browser. An explicit
  // `title` (e.g. from the live chat sign-in link) is pinned against
  // youtube.com's own page-title-updated events, which would otherwise
  // overwrite it back to "YouTube" the moment the page loads.
  ipcMain.handle(IpcChannel.openYouTubeSignIn, (_event, title: unknown) => {
    const signInWindow = new BrowserWindow({ width: 480, height: 720 })
    signInWindow.removeMenu()
    if (typeof title === 'string' && title.length > 0) {
      signInWindow.setTitle(title)
      signInWindow.on('page-title-updated', (event) => event.preventDefault())
    }
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

  // Routes a newly-selected video into the already-open extract window
  // rather than the main window. Returns false (not an error) if no extract
  // window is open.
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

  ipcMain.handle(IpcChannel.extractChat, (_event, videoId: unknown) => {
    createChatWindow(parseVideoId(videoId))
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
    // The tray's click callbacks close over this boot() generation's
    // runRefresh/settings — destroyed here and freshly recreated by the new
    // generation's applyBackgroundMode() rather than left pointing at
    // torn-down state.
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

  // Settings' storage indicator. dbBytes sums chronicle.db plus its WAL/SHM
  // sidecar files (present whenever the app has WAL pages not yet
  // checkpointed) rather than just the main file, so the number matches
  // what's actually on disk.
  ipcMain.handle(IpcChannel.getStorageInfo, (): StorageInfoDto => {
    let dbBytes = 0
    for (const suffix of ['', '-wal', '-shm']) {
      try {
        dbBytes += statSync(join(dataDir, `chronicle.db${suffix}`)).size
      } catch {
        // sidecar file absent between checkpoints — fine, it contributes 0
      }
    }
    return { dbBytes, cacheBytes: thumbnails.sizeBytes(), videoCount: catalogRepository.countVideos() }
  })

  // Skip the initial window only for the real launch (not a deleteAllData
  // re-boot), only when it came from the OS autostart entry, and only when
  // there's a tray to fall back to (backgroundMode) — otherwise the process
  // would be fully unreachable.
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

// A second launch attempt (e.g. clicking the app icon while tray-resident)
// hits this in the original instance instead of spawning its own process —
// bring the existing window forward like the tray's Open item.
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

// Falls back to isQuitting = true on any other route to a real quit (Cmd+Q
// on macOS, an OS session logout) so backgroundMode's close intercept
// doesn't fight the app actually trying to exit.
app.on('before-quit', () => {
  isQuitting = true
})
