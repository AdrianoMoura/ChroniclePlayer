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

// B-009/D-031: a free-text search result — video or channel, across all of
// YouTube, not just subscribed channels.
export type SearchResult =
  | {
      kind: 'video'
      videoId: string
      title: string
      channelId: string
      channelTitle: string
      publishedAt: string
      thumbnailUrl: string | null
      durationSeconds: number | null
      // Duration-heuristic only (<=60s) — unlike the synced feed's D-028
      // pipeline, there's no HEAD-probe confirmation step for a transient
      // search result list; good enough for a display badge/filter.
      isShort: boolean
    }
  | {
      kind: 'channel'
      channelId: string
      title: string
      thumbnailUrl: string | null
      subscriberCount: number | null
    }

// B-006: one level of nesting only, matching YouTube's own comment model
// (a reply cannot itself have replies).
export interface Comment {
  commentId: string
  authorDisplayName: string
  authorProfileImageUrl: string | null
  textDisplay: string
  publishedAt: string
  likeCount: number
  replies: Comment[]
}

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
          thumbnailUrl: thumbnailUrl(snippet['thumbnails']),
          subscriptionId: typeof item['id'] === 'string' ? item['id'] : null
        })
      }
      pageToken = page.nextPageToken
    } while (pageToken !== undefined)
    return channels
  }

  // channels.list mine=true — 1 unit. Used once at wizard Step 7 to show
  // the connected identity and prove the API is enabled (onboarding.md).
  async getOwnChannel(): Promise<{ title: string } | null> {
    const page = await this.get('channels', { part: 'snippet', mine: 'true' }, 1)
    const snippet = page.items[0]?.['snippet'] as Record<string, unknown> | undefined
    return snippet ? { title: String(snippet['title']) } : null
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

  // channels.list — 1 unit. Fetched on-demand when the channel screen opens
  // (not persisted — cheap enough, and stays fresh every visit), for the
  // banner image and subscriber count the compact sidebar/topbar never needed.
  async fetchChannelDetail(
    channelId: string
  ): Promise<{ bannerUrl: string | null; subscriberCount: number | null }> {
    const page = await this.get(
      'channels',
      { part: 'brandingSettings,statistics', id: channelId },
      1
    )
    const item = page.items[0]
    const branding = item?.['brandingSettings'] as Record<string, unknown> | undefined
    const image = branding?.['image'] as Record<string, unknown> | undefined
    const bannerUrl = typeof image?.['bannerExternalUrl'] === 'string' ? image['bannerExternalUrl'] : null
    const statistics = item?.['statistics'] as Record<string, unknown> | undefined
    const hidden = statistics?.['hiddenSubscriberCount'] === true
    const rawCount = statistics?.['subscriberCount']
    const subscriberCount = !hidden && typeof rawCount === 'string' ? Number(rawCount) : null
    return { bannerUrl, subscriberCount }
  }

  // videos.list batched — 1 unit per call (≤ 50 ids) regardless of how many
  // parts are requested — liveStreamingDetails and status ride along on the
  // same call at no extra quota cost, for actualEndTime and uploadStatus.
  // The hydration half of the hybrid feed source (D-007).
  async hydrate(videoIds: readonly string[]): Promise<HydratedVideo[]> {
    if (videoIds.length === 0) return []
    const page = await this.get(
      'videos',
      {
        part: 'snippet,contentDetails,statistics,liveStreamingDetails,status',
        id: videoIds.join(','),
        maxResults: '50'
      },
      1
    )
    return page.items.map((item) => {
      const snippet = item['snippet'] as Record<string, unknown>
      const details = item['contentDetails'] as Record<string, unknown>
      const statistics = item['statistics'] as Record<string, unknown> | undefined
      const rawViews = statistics?.['viewCount']
      const live = snippet['liveBroadcastContent']
      const liveContent = live === 'live' || live === 'upcoming' ? live : 'none'
      const liveStreamingDetails = item['liveStreamingDetails'] as Record<string, unknown> | undefined
      // D-053: only present once the broadcast has actually ended.
      const rawEndTime = liveStreamingDetails?.['actualEndTime']
      const liveEndedAt = typeof rawEndTime === 'string' ? rawEndTime : null
      // status.uploadStatus is 'processed' for a Premiere (already fully
      // encoded, waiting to "air") vs 'uploaded' for a genuine broadcast,
      // meaningful only while liveContent === 'live' — outside that state
      // 'processed' is normal for nearly any finished video, so isPremiere
      // must stay false there.
      const status = item['status'] as Record<string, unknown> | undefined
      const isPremiere = liveContent === 'live' && status?.['uploadStatus'] === 'processed'
      return {
        videoId: String(item['id']),
        channelId: String(snippet['channelId']),
        channelTitle: String(snippet['channelTitle'] ?? ''),
        title: String(snippet['title']),
        publishedAt: String(snippet['publishedAt']),
        durationSeconds: parseIsoDuration(String(details['duration'] ?? 'PT0S')),
        liveContent,
        liveEndedAt,
        isPremiere,
        thumbnailUrl: thumbnailUrl(snippet['thumbnails']),
        description: typeof snippet['description'] === 'string' ? snippet['description'] : null,
        viewCount: typeof rawViews === 'string' ? Number(rawViews) : null
      }
    })
  }

  // subscriptions.delete — 50 units (youtube-api.md). User-initiated only
  // (B-010, D-032) — never called from the background sync path. Requires
  // the write scope (youtube.force-ssl) to already be granted.
  async unsubscribe(subscriptionId: string): Promise<void> {
    this.quota.add(50)
    const token = await this.auth.getAccessToken()
    const url = new URL(`${API_BASE}/subscriptions`)
    url.searchParams.set('id', subscriptionId)
    const response = await request(this.fetchFn, url.toString(), {
      method: 'DELETE',
      headers: { authorization: `Bearer ${token}` }
    })
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>
      throw this.mapError(response.status, payload)
    }
  }

  // subscriptions.list mine=true forChannelId — 1 unit. Fallback lookup for
  // channels subscribed before the subscription_id column existed (B-010).
  async findSubscriptionId(channelId: string): Promise<string | null> {
    const page = await this.get(
      'subscriptions',
      { part: 'id', mine: 'true', forChannelId: channelId, maxResults: '1' },
      1
    )
    const id = page.items[0]?.['id']
    return typeof id === 'string' ? id : null
  }

  // subscriptions.insert — 50 units. User-initiated only (B-009/D-030,
  // incremental scope per D-032) — never called from sync/automation.
  async subscribe(channelId: string): Promise<Channel> {
    this.quota.add(50)
    const token = await this.auth.getAccessToken()
    const response = await request(this.fetchFn, `${API_BASE}/subscriptions?part=snippet`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ snippet: { resourceId: { kind: 'youtube#channel', channelId } } })
    })
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>
    if (!response.ok) throw this.mapError(response.status, payload)
    const snippet = payload['snippet'] as Record<string, unknown>
    return {
      channelId,
      title: String(snippet['title']),
      thumbnailUrl: thumbnailUrl(snippet['thumbnails']),
      subscriptionId: typeof payload['id'] === 'string' ? payload['id'] : null
    }
  }

  // search.list — 100 units/call (youtube-api.md, D-031). Explicit
  // user-typed queries only — never called from sync/automation, never
  // injected into the feed.
  async search(
    query: string,
    pageToken?: string
  ): Promise<{ results: SearchResult[]; nextPageToken: string | null }> {
    const page = await this.get(
      'search',
      {
        part: 'snippet',
        q: query,
        type: 'video,channel',
        maxResults: '25',
        ...(pageToken ? { pageToken } : {})
      },
      100
    )
    const videoIds: string[] = []
    const channelIds: string[] = []
    const rough = page.items.flatMap((item): SearchResult[] => {
      const id = item['id'] as Record<string, unknown>
      const snippet = item['snippet'] as Record<string, unknown>
      if (id['kind'] === 'youtube#video') {
        const videoId = String(id['videoId'])
        videoIds.push(videoId)
        return [
          {
            kind: 'video',
            videoId,
            title: String(snippet['title']),
            channelId: String(snippet['channelId']),
            channelTitle: String(snippet['channelTitle'] ?? ''),
            publishedAt: String(snippet['publishedAt']),
            thumbnailUrl: thumbnailUrl(snippet['thumbnails']),
            durationSeconds: null,
            isShort: false
          }
        ]
      }
      if (id['kind'] === 'youtube#channel') {
        const channelId = String(id['channelId'])
        channelIds.push(channelId)
        return [
          {
            kind: 'channel',
            channelId,
            title: String(snippet['title']),
            thumbnailUrl: thumbnailUrl(snippet['thumbnails']),
            subscriberCount: null
          }
        ]
      }
      return []
    })

    // Two small batched follow-ups (1 unit each, at most) — the Short
    // badge/filter and channel subscriber count both need data search.list's
    // snippet doesn't return.
    const [durations, subscriberCounts] = await Promise.all([
      this.fetchVideoDurations(videoIds),
      this.fetchSubscriberCounts(channelIds)
    ])
    const results = rough.map((result) => {
      if (result.kind === 'video') {
        const duration = durations.get(result.videoId) ?? null
        return { ...result, durationSeconds: duration, isShort: duration !== null && duration <= 60 }
      }
      return { ...result, subscriberCount: subscriberCounts.get(result.channelId) ?? null }
    })
    return { results, nextPageToken: page.nextPageToken ?? null }
  }

  private async fetchVideoDurations(videoIds: readonly string[]): Promise<Map<string, number>> {
    const result = new Map<string, number>()
    if (videoIds.length === 0) return result
    const page = await this.get(
      'videos',
      { part: 'contentDetails', id: videoIds.join(','), maxResults: '50' },
      1
    )
    for (const item of page.items) {
      const details = item['contentDetails'] as Record<string, unknown> | undefined
      const duration = details?.['duration']
      if (typeof duration === 'string') result.set(String(item['id']), parseIsoDuration(duration))
    }
    return result
  }

  private async fetchSubscriberCounts(channelIds: readonly string[]): Promise<Map<string, number>> {
    const result = new Map<string, number>()
    if (channelIds.length === 0) return result
    const page = await this.get(
      'channels',
      { part: 'statistics', id: channelIds.join(','), maxResults: '50' },
      1
    )
    for (const item of page.items) {
      const statistics = item['statistics'] as Record<string, unknown> | undefined
      if (statistics?.['hiddenSubscriberCount'] === true) continue
      const raw = statistics?.['subscriberCount']
      if (typeof raw === 'string') result.set(String(item['id']), Number(raw))
    }
    return result
  }

  // commentThreads.list — 1 unit/page. Public data; the readonly scope
  // suffices, no write scope needed just to read (B-006).
  async listComments(
    videoId: string,
    pageToken?: string
  ): Promise<{ comments: Comment[]; nextPageToken: string | null }> {
    const page = await this.get(
      'commentThreads',
      {
        part: 'snippet,replies',
        videoId,
        maxResults: '20',
        order: 'relevance',
        textFormat: 'plainText',
        ...(pageToken ? { pageToken } : {})
      },
      1
    )
    return {
      comments: page.items.map((item) => this.toComment(item)),
      nextPageToken: page.nextPageToken ?? null
    }
  }

  // commentThreads.insert — 50 units, write scope required (B-006/D-032).
  async postComment(videoId: string, text: string): Promise<Comment> {
    this.quota.add(50)
    const token = await this.auth.getAccessToken()
    const response = await request(this.fetchFn, `${API_BASE}/commentThreads?part=snippet`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        snippet: { videoId, topLevelComment: { snippet: { textOriginal: text } } }
      })
    })
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>
    if (!response.ok) throw this.mapError(response.status, payload)
    return this.toComment(payload)
  }

  // comments.insert — 50 units, write scope required. Replies to a
  // top-level comment; YouTube itself has no third nesting level.
  async replyToComment(parentId: string, text: string): Promise<Comment> {
    this.quota.add(50)
    const token = await this.auth.getAccessToken()
    const response = await request(this.fetchFn, `${API_BASE}/comments?part=snippet`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ snippet: { parentId, textOriginal: text } })
    })
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>
    if (!response.ok) throw this.mapError(response.status, payload)
    return this.toReply(payload)
  }

  // videos.rate — 50 units, write scope required (B-006/D-032). YouTube's
  // public API has no equivalent endpoint to like a *comment* — only videos.
  async rateVideo(videoId: string, rating: 'like' | 'none'): Promise<void> {
    this.quota.add(50)
    const token = await this.auth.getAccessToken()
    const url = new URL(`${API_BASE}/videos/rate`)
    url.searchParams.set('id', videoId)
    url.searchParams.set('rating', rating)
    const response = await request(this.fetchFn, url.toString(), {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` }
    })
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>
      throw this.mapError(response.status, payload)
    }
  }

  // videos.getRating — 1 unit. Retrieves the user's own existing rating;
  // the readonly scope suffices (no write, just a read of the user's state).
  async getVideoRating(videoId: string): Promise<'like' | 'dislike' | 'none'> {
    const page = await this.get('videos/getRating', { id: videoId }, 1)
    const rating = page.items[0]?.['rating']
    return rating === 'like' || rating === 'dislike' ? rating : 'none'
  }

  private toComment(item: Record<string, unknown>): Comment {
    const threadSnippet = item['snippet'] as Record<string, unknown>
    const topLevelComment = threadSnippet['topLevelComment'] as Record<string, unknown>
    const topSnippet = topLevelComment['snippet'] as Record<string, unknown>
    const repliesRaw = (item['replies'] as Record<string, unknown> | undefined)?.['comments'] as
      | Record<string, unknown>[]
      | undefined
    return {
      commentId: String(topLevelComment['id']),
      authorDisplayName: String(topSnippet['authorDisplayName'] ?? ''),
      authorProfileImageUrl:
        typeof topSnippet['authorProfileImageUrl'] === 'string'
          ? topSnippet['authorProfileImageUrl']
          : null,
      textDisplay: String(topSnippet['textDisplay'] ?? topSnippet['textOriginal'] ?? ''),
      publishedAt: String(topSnippet['publishedAt'] ?? ''),
      likeCount: typeof topSnippet['likeCount'] === 'number' ? topSnippet['likeCount'] : 0,
      replies: (repliesRaw ?? []).map((reply) => this.toReply(reply))
    }
  }

  private toReply(item: Record<string, unknown>): Comment {
    const snippet = item['snippet'] as Record<string, unknown>
    return {
      commentId: String(item['id']),
      authorDisplayName: String(snippet['authorDisplayName'] ?? ''),
      authorProfileImageUrl:
        typeof snippet['authorProfileImageUrl'] === 'string' ? snippet['authorProfileImageUrl'] : null,
      textDisplay: String(snippet['textDisplay'] ?? snippet['textOriginal'] ?? ''),
      publishedAt: String(snippet['publishedAt'] ?? ''),
      likeCount: typeof snippet['likeCount'] === 'number' ? snippet['likeCount'] : 0,
      replies: []
    }
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
