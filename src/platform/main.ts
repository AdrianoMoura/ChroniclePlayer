import { app, BrowserWindow, ipcMain } from 'electron'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import type { Database } from 'better-sqlite3'
import { openDatabase } from '../adapters/storage/database'
import { migrate } from '../adapters/storage/migrations'
import { groupFeed, type FeedEntry } from '../core/feed'
import { IpcChannel, type FeedDto } from '../ipc/contract'
import { chronicleDataDir } from './data-dir'

// M0 walking skeleton (roadmap.md): one hardcoded feed row proves the
// ui → ipc → core → DTO round-trip. Real data arrives with M1/M2.
const skeletonEntries: FeedEntry[] = [
  {
    channelTitle: 'Chronicle Dev',
    video: {
      videoId: 'M0-walking-skeleton',
      channelId: 'UCchronicle-dev',
      title: 'Walking skeleton: this row travelled ui → ipc → core and back',
      publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      durationSeconds: 754,
      thumbnailUrl: null
    }
  }
]

function getFeed(): FeedDto {
  return {
    groups: groupFeed(skeletonEntries, new Date()).map((group) => ({
      bucket: group.bucket,
      videos: group.entries.map(({ video, channelTitle }) => ({
        videoId: video.videoId,
        title: video.title,
        channelTitle,
        publishedAt: video.publishedAt,
        durationSeconds: video.durationSeconds,
        thumbnailUrl: video.thumbnailUrl
      }))
    }))
  }
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

let db: Database | undefined

void app.whenReady().then(() => {
  const dataDir = chronicleDataDir()
  mkdirSync(dataDir, { recursive: true })
  // Migrations run before anything reads the DB (local-data.md §Migrations).
  db = openDatabase(join(dataDir, 'chronicle.db'))
  migrate(db)

  ipcMain.handle(IpcChannel.getFeed, () => getFeed())
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
