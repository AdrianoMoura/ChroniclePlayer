import { app, BrowserWindow, ipcMain, shell } from 'electron'
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
import { FeedService, type FeedSlice } from '../core/feed-service'
import type { Clock } from '../core/ports'
import type { VideoState } from '../core/state'
import { FEED_VIEWS, type FeedView } from '../core/views'
import type {
  FeedCursorDto,
  FeedSliceDto,
  ReadStatusDto,
  VideoStateDto
} from '../ipc/contract'
import { IpcChannel } from '../ipc/contract'
import { chronicleDataDir } from './data-dir'
import { seedDevFixtures } from './dev-fixtures'

const clock: Clock = { now: () => new Date() }

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

let db: DatabaseSync | undefined

void app.whenReady().then(() => {
  const dataDir = chronicleDataDir()
  mkdirSync(dataDir, { recursive: true })
  // Migrations run before anything reads the DB (local-data.md §Migrations).
  db = openDatabase(join(dataDir, 'chronicle.db'))
  migrate(db)

  // Composition root: adapters implement core ports; core never sees SQLite.
  const feedRepository = new SqliteFeedRepository(db)
  const stateRepository = new SqliteStateRepository(db, clock)
  const catalogRepository = new SqliteCatalogRepository(db, clock)
  const feedService = new FeedService(feedRepository, clock)

  if (!app.isPackaged) {
    seedDevFixtures(catalogRepository, stateRepository, clock)
  }

  ipcMain.handle(IpcChannel.getFeed, (_event, view: unknown, cursor: unknown) =>
    toSliceDto(feedService.getSlice(parseView(view), parseCursor(cursor)))
  )
  ipcMain.handle(IpcChannel.getFeedMeta, () => {
    const slice = feedService.getSlice('unread', null, 1)
    return { unreadCount: slice.unreadCount, caughtUp: slice.caughtUp }
  })
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

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  db?.close()
})
