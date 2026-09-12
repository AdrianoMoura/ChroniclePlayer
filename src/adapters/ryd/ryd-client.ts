import type { DislikeEstimateSource } from '../../core/ports'
import { request, type FetchFn } from '../http'

// D-068: Return YouTube Dislike (returnyoutubedislike.com) — free, keyless,
// third-party estimate for the dislike count YouTube's own API no longer
// exposes. Usage policy (returnyoutubedislike.com/docs/usage-rights): third-
// party use is explicitly permitted, requires attribution (satisfied in
// Settings, next to the toggle that enables this), and caps at 100 req/min /
// 10,000/day per client — no client-side throttling needed for a single
// desktop user's own viewing pace.
//
// Cache is in-memory only, per the product owner's explicit call — never
// written to disk, cleared on every app restart. A failed lookup is cached
// too (as null), so a temporarily-down service isn't rehit on every video
// opened in the same session.

const API_BASE = 'https://returnyoutubedislikeapi.com'

export class RydClient implements DislikeEstimateSource {
  private readonly cache = new Map<string, number | null>()

  constructor(private readonly fetchFn: FetchFn) {}

  async fetchDislikeCount(videoId: string): Promise<number | null> {
    const cached = this.cache.get(videoId)
    if (cached !== undefined) return cached
    const result = await this.fetchFresh(videoId)
    this.cache.set(videoId, result)
    return result
  }

  private async fetchFresh(videoId: string): Promise<number | null> {
    try {
      const url = new URL(`${API_BASE}/votes`)
      url.searchParams.set('videoId', videoId)
      const response = await request(this.fetchFn, url.toString())
      if (!response.ok) return null
      const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null
      const dislikes = payload?.['dislikes']
      return typeof dislikes === 'number' ? dislikes : null
    } catch {
      return null
    }
  }
}
