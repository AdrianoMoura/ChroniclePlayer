import { createHash } from 'node:crypto'
import { mkdirSync, readdirSync, statSync, unlinkSync, utimesSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

// Thumbnail disk cache (ui.md §Performance budgets): lives in the platform
// cache dir (not app data), LRU-capped at 500 MB by default. The renderer
// never fetches Google hosts directly (architecture.md) — it asks for
// thumb://img/<encoded-url> and this cache answers, fetching on miss.

const DEFAULT_CAP_BYTES = 500 * 1024 * 1024

const ALLOWED_HOSTS = new Set(['i.ytimg.com', 'yt3.ggpht.com', 'yt3.googleusercontent.com'])

export class ThumbnailCache {
  constructor(
    private readonly dir: string,
    private readonly fetchFn: typeof fetch,
    private readonly capBytes = DEFAULT_CAP_BYTES
  ) {
    mkdirSync(dir, { recursive: true })
  }

  // Answers a thumb:// request. Returns null for disallowed/invalid URLs.
  async get(sourceUrl: string): Promise<Buffer | null> {
    let parsed: URL
    try {
      parsed = new URL(sourceUrl)
    } catch {
      return null
    }
    if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsed.hostname)) return null

    const file = join(this.dir, createHash('sha256').update(sourceUrl).digest('hex'))
    try {
      const cached = await readFile(file)
      const now = new Date()
      utimesSync(file, now, now) // LRU touch
      return cached
    } catch {
      // miss — fall through to network
    }

    try {
      const response = await this.fetchFn(sourceUrl)
      if (!response.ok) return null
      const body = Buffer.from(await response.arrayBuffer())
      await writeFile(file, body)
      return body
    } catch {
      return null // offline: rows render without thumbnails, layout unchanged
    }
  }

  // Oldest-first eviction until under the cap. Called at startup; cheap
  // (one readdir + stats), so no background bookkeeping is needed.
  enforceCap(): void {
    const files = readdirSync(this.dir)
      .map((name) => {
        const path = join(this.dir, name)
        const stats = statSync(path)
        return { path, size: stats.size, mtimeMs: stats.mtimeMs }
      })
      .sort((a, b) => a.mtimeMs - b.mtimeMs)

    let total = files.reduce((sum, f) => sum + f.size, 0)
    for (const file of files) {
      if (total <= this.capBytes) break
      try {
        unlinkSync(file.path)
        total -= file.size
      } catch {
        // ignore: a locked/vanished file must never break startup
      }
    }
  }

  // Total on-disk size, for the Settings storage indicator.
  sizeBytes(): number {
    return readdirSync(this.dir).reduce((sum, name) => sum + statSync(join(this.dir, name)).size, 0)
  }
}

export function chronicleCacheDir(): string {
  const home = process.env['HOME'] ?? ''
  switch (process.platform) {
    case 'darwin':
      return join(home, 'Library', 'Caches', 'Chronicle', 'thumbnails')
    case 'win32':
      return join(
        process.env['LOCALAPPDATA'] ?? join(home, 'AppData', 'Local'),
        'Chronicle',
        'cache',
        'thumbnails'
      )
    default:
      return join(process.env['XDG_CACHE_HOME'] ?? join(home, '.cache'), 'chronicle', 'thumbnails')
  }
}
