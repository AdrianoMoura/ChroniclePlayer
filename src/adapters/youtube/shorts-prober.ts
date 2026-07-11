import { internal } from '../../core/errors'
import type { ShortsProber } from '../../core/ports'
import { request, type FetchFn } from '../http'

// D-028 confirmation probe: HEAD youtube.com/shorts/{id}. Shorts answer 200;
// regular videos redirect to /watch. Zero quota; the verdict is cached
// permanently per video (videos.is_short), so each video is probed once ever.
export class HeadShortsProber implements ShortsProber {
  constructor(private readonly fetchFn: FetchFn) {}

  async isShort(videoId: string): Promise<boolean> {
    const response = await request(
      this.fetchFn,
      `https://www.youtube.com/shorts/${encodeURIComponent(videoId)}`,
      { method: 'HEAD', redirect: 'manual', timeoutMs: 10_000 }
    )
    if (response.status === 200) return true
    if (response.status >= 300 && response.status < 400) return false
    // Unexpected answer (429, 5xx…): leave the candidate pending — hiding a
    // real video would be worse than a Short lingering (feed.md §Detection).
    throw internal(`shorts probe returned ${response.status}`)
  }
}
