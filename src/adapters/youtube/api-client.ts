import { apiNotEnabled, authExpired, internal, quotaExceeded } from '../../core/errors'
import type {
  AuthProvider,
  HydratedVideo,
  QuotaSink,
  SubscriptionSource
} from '../../core/ports'
import type { Channel } from '../../core/video'
import { request, type FetchFn } from '../http'

// YouTube Data API v3 client. Every method states its quota cost and is
// justified in .specs/youtube-api.md — do not add calls without updating
// that document. All calls are authenticated with the user's own tokens.

const API_BASE = 'https://www.googleapis.com/youtube/v3'

export class YouTubeApiClient implements SubscriptionSource {
  constructor(
    private readonly auth: AuthProvider,
    private readonly fetchFn: FetchFn,
    private readonly quota: QuotaSink
  ) {}

  // subscriptions.list mine=true — 1 unit per 50-channel page.
  async listSubscriptions(): Promise<Channel[]> {
    const channels: Channel[] = []
    let pageToken: string | undefined
    do {
      const page = await this.get(
        'subscriptions',
        {
          part: 'snippet',
          mine: 'true',
          maxResults: '50',
          ...(pageToken ? { pageToken } : {})
        },
        1
      )
      for (const item of page.items) {
        const snippet = item['snippet'] as Record<string, unknown>
        const resource = snippet['resourceId'] as Record<string, unknown>
        channels.push({
          channelId: String(resource['channelId']),
          title: String(snippet['title']),
          thumbnailUrl: thumbnailUrl(snippet['thumbnails'])
        })
      }
      pageToken = page.nextPageToken
    } while (pageToken !== undefined)
    return channels
  }

  // channels.list batched — 1 unit per call (≤ 50 ids).
  async fetchUploadsPlaylists(channelIds: readonly string[]): Promise<Map<string, string>> {
    const result = new Map<string, string>()
    if (channelIds.length === 0) return result
    const page = await this.get(
      'channels',
      { part: 'contentDetails', id: channelIds.join(','), maxResults: '50' },
      1
    )
    for (const item of page.items) {
      const details = item['contentDetails'] as Record<string, unknown> | undefined
      const related = details?.['relatedPlaylists'] as Record<string, unknown> | undefined
      const uploads = related?.['uploads']
      if (typeof uploads === 'string') result.set(String(item['id']), uploads)
    }
    return result
  }

  // videos.list batched — 1 unit per call (≤ 50 ids). The hydration half of
  // the hybrid feed source (D-007).
  async hydrate(videoIds: readonly string[]): Promise<HydratedVideo[]> {
    if (videoIds.length === 0) return []
    const page = await this.get(
      'videos',
      { part: 'snippet,contentDetails', id: videoIds.join(','), maxResults: '50' },
      1
    )
    return page.items.map((item) => {
      const snippet = item['snippet'] as Record<string, unknown>
      const details = item['contentDetails'] as Record<string, unknown>
      const live = snippet['liveBroadcastContent']
      return {
        videoId: String(item['id']),
        channelId: String(snippet['channelId']),
        title: String(snippet['title']),
        publishedAt: String(snippet['publishedAt']),
        durationSeconds: parseIsoDuration(String(details['duration'] ?? 'PT0S')),
        liveContent: live === 'live' || live === 'upcoming' ? live : 'none',
        thumbnailUrl: thumbnailUrl(snippet['thumbnails']),
        description: typeof snippet['description'] === 'string' ? snippet['description'] : null
      }
    })
  }

  // playlistItems.list — 1 unit per 50-item page. Gap detection and
  // on-demand archive backfill only (never a routine sync path).
  async listUploads(
    playlistId: string,
    pageToken?: string
  ): Promise<{ videoIds: string[]; nextPageToken: string | null }> {
    const page = await this.get(
      'playlistItems',
      {
        part: 'contentDetails',
        playlistId,
        maxResults: '50',
        ...(pageToken ? { pageToken } : {})
      },
      1
    )
    return {
      videoIds: page.items.map((item) => {
        const details = item['contentDetails'] as Record<string, unknown>
        return String(details['videoId'])
      }),
      nextPageToken: page.nextPageToken ?? null
    }
  }

  private async get(
    resource: string,
    params: Record<string, string>,
    cost: number
  ): Promise<{ items: Record<string, unknown>[]; nextPageToken?: string }> {
    // Conservative accounting: attempts count, since Google charges failed
    // calls against quota too.
    this.quota.add(cost)
    const token = await this.auth.getAccessToken()
    const url = new URL(`${API_BASE}/${resource}`)
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)

    const response = await request(this.fetchFn, url.toString(), {
      headers: { authorization: `Bearer ${token}` }
    })
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>

    if (!response.ok) throw this.mapError(response.status, payload)
    const items = payload['items']
    return {
      items: Array.isArray(items) ? (items as Record<string, unknown>[]) : [],
      nextPageToken:
        typeof payload['nextPageToken'] === 'string' ? payload['nextPageToken'] : undefined
    }
  }

  private mapError(status: number, payload: Record<string, unknown>): Error {
    const error = payload['error'] as Record<string, unknown> | undefined
    const errors = error?.['errors'] as Record<string, unknown>[] | undefined
    const reason = errors?.[0]?.['reason']

    if (status === 401) return authExpired()
    if (status === 403) {
      if (reason === 'quotaExceeded' || reason === 'rateLimitExceeded') return quotaExceeded()
      if (reason === 'accessNotConfigured') return apiNotEnabled()
    }
    return internal(`YouTube API error ${status}: ${String(reason ?? error?.['message'] ?? '?')}`)
  }
}

function thumbnailUrl(thumbnails: unknown): string | null {
  const map = thumbnails as Record<string, { url?: string }> | undefined
  return map?.['medium']?.url ?? map?.['default']?.url ?? null
}

// ISO-8601 durations as YouTube emits them (PT#H#M#S, occasionally P#DT…).
export function parseIsoDuration(duration: string): number {
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(duration)
  if (!match) return 0
  const [, days, hours, minutes, seconds] = match
  return (
    Number(days ?? 0) * 86_400 +
    Number(hours ?? 0) * 3_600 +
    Number(minutes ?? 0) * 60 +
    Number(seconds ?? 0)
  )
}
