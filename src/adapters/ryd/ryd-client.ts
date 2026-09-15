import type { Clock, DislikeEstimateSource } from '../../core/ports'
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
// written to disk, cleared on every app restart. It's also time-bounded
// (the owner routinely leaves the app open for days): a successful lookup
// is fresh for SUCCESS_TTL_MS, a failed one for the much shorter
// FAILURE_TTL_MS so a transient RYD outage doesn't get "stuck" for hours.

const API_BASE = 'https://returnyoutubedislikeapi.com'
const SUCCESS_TTL_MS = 60 * 60 * 1000
const FAILURE_TTL_MS = 5 * 60 * 1000

interface CacheEntry {
  value: number | null
  expiresAt: number
}

export class RydClient implements DislikeEstimateSource {
  private readonly cache = new Map<string, CacheEntry>()

  constructor(
    private readonly fetchFn: FetchFn,
    private readonly clock: Clock,
  ) {}

  async fetchDislikeCount(videoId: string): Promise<number | null> {
    const cached = this.cache.get(videoId)
    if (cached && cached.expiresAt > this.clock.now().getTime()) return cached.value
    const value = await this.fetchFresh(videoId)
    const ttl = value === null ? FAILURE_TTL_MS : SUCCESS_TTL_MS
    this.cache.set(videoId, { value, expiresAt: this.clock.now().getTime() + ttl })
    return value
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
