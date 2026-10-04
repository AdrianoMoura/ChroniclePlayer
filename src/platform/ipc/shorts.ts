import { mapPool } from '../../core/concurrency'
import { SHORTS_CONCURRENCY } from '../../core/sync-service'
import type { ShortsProber } from '../../core/ports'

// Same 180s candidate cutoff as the synced feed's own shortCandidates()
// query (sync-repository.ts), applied on-demand here instead of
// persisted, since these two lists (free-text search, a non-subscribed
// channel's preview) are transient. Confirms via the same zero-quota HEAD
// probe (shortsProber), bounded by the same concurrency limit the synced
// pipeline uses. A probe failure (429, 5xx, timeout) leaves that video
// unconfirmed — same "don't hide a real video" rule as confirmShorts()
// itself (feed.md §Detection), so it stays visible. Awaited fully before
// the caller's page is returned, to match the synced feed's real
// behavior: it never shows a page of results before its own Shorts pass
// has finished either.
const SHORTS_CANDIDATE_MAX_SECONDS = 180

export async function confirmShorts<T extends { videoId: string; durationSeconds: number | null }>(
  shortsProber: ShortsProber,
  videos: readonly T[]
): Promise<ReadonlyMap<string, boolean>> {
  const candidates = videos.filter(
    (v) => v.durationSeconds !== null && v.durationSeconds <= SHORTS_CANDIDATE_MAX_SECONDS
  )
  const results = await mapPool(candidates, SHORTS_CONCURRENCY, (v) => shortsProber.isShort(v.videoId))
  const confirmed = new Map<string, boolean>()
  candidates.forEach((v, i) => {
    const result = results[i]
    confirmed.set(v.videoId, result.ok ? result.value : false)
  })
  return confirmed
}
