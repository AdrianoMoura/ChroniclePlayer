import { describe, expect, it } from 'vitest'
import { parseIsoDuration, YouTubeApiClient } from './api-client'
import { HeadShortsProber } from './shorts-prober'
import { QuotaCounter, type AuthProvider } from '../../core/ports'
import type { FetchFn } from '../http'

const auth: AuthProvider = { getAccessToken: () => Promise.resolve('test-token') }

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  })
}

// Sanitized captures of real API response shapes (architecture.md §Testing:
// recorded fixtures, never the live API).
const SUBSCRIPTIONS_PAGE_1 = {
  nextPageToken: 'p2',
  items: [
    {
      id: 'subAAA',
      snippet: {
        title: 'Alpha Channel',
        resourceId: { channelId: 'UCaaa' },
        thumbnails: { default: { url: 'https://yt3.example/a-default' }, medium: { url: 'https://yt3.example/a-med' } }
      }
    }
  ]
}
const SUBSCRIPTIONS_PAGE_2 = {
  items: [
    {
      id: 'subBBB',
      snippet: { title: 'Beta Channel', resourceId: { channelId: 'UCbbb' }, thumbnails: {} }
    }
  ]
}

const VIDEOS_RESPONSE = {
  items: [
    {
      id: 'vid-1',
      snippet: {
        channelId: 'UCaaa',
        title: 'A video',
        publishedAt: '2026-07-10T08:00:00Z',
        liveBroadcastContent: 'none',
        description: 'desc',
        thumbnails: { medium: { url: 'https://i.ytimg.example/vid-1' } }
      },
      contentDetails: { duration: 'PT15M33S' }
    },
    {
      id: 'vid-2',
      snippet: {
        channelId: 'UCbbb',
        title: 'A premiere',
        publishedAt: '2026-07-12T18:00:00Z',
        liveBroadcastContent: 'upcoming',
        description: '',
        thumbnails: {}
      },
      contentDetails: { duration: 'PT2M10S' }
    }
  ]
}

describe('YouTubeApiClient', () => {
  it('pages subscriptions.list and counts 1 unit per page', async () => {
    const quota = new QuotaCounter()
    const fetchFn: FetchFn = (url) => {
      const params = new URL(String(url)).searchParams
      expect(params.get('mine')).toBe('true')
      return Promise.resolve(
        jsonResponse(200, params.get('pageToken') === 'p2' ? SUBSCRIPTIONS_PAGE_2 : SUBSCRIPTIONS_PAGE_1)
      )
    }
    const channels = await new YouTubeApiClient(auth, fetchFn, quota).listSubscriptions()
    expect(channels).toEqual([
      {
        channelId: 'UCaaa',
        title: 'Alpha Channel',
        thumbnailUrl: 'https://yt3.example/a-med',
        subscriptionId: 'subAAA'
      },
      { channelId: 'UCbbb', title: 'Beta Channel', thumbnailUrl: null, subscriptionId: 'subBBB' }
    ])
    expect(quota.spent).toBe(2)
  })

  it('sends the bearer token from the AuthProvider', async () => {
    let authHeader = ''
    const fetchFn: FetchFn = (_url, init) => {
      authHeader = String((init?.headers as Record<string, string>)['authorization'])
      return Promise.resolve(jsonResponse(200, { items: [] }))
    }
    await new YouTubeApiClient(auth, fetchFn, new QuotaCounter()).hydrate(['x'])
    expect(authHeader).toBe('Bearer test-token')
  })

  it('hydrates videos with parsed duration and live state', async () => {
    const fetchFn: FetchFn = () => Promise.resolve(jsonResponse(200, VIDEOS_RESPONSE))
    const videos = await new YouTubeApiClient(auth, fetchFn, new QuotaCounter()).hydrate([
      'vid-1',
      'vid-2'
    ])
    expect(videos[0]).toMatchObject({
      videoId: 'vid-1',
      durationSeconds: 933,
      liveContent: 'none',
      thumbnailUrl: 'https://i.ytimg.example/vid-1'
    })
    expect(videos[1]).toMatchObject({ videoId: 'vid-2', durationSeconds: 130, liveContent: 'upcoming' })
  })

  it('maps uploads playlists from channels.list', async () => {
    const fetchFn: FetchFn = () =>
      Promise.resolve(
        jsonResponse(200, {
          items: [{ id: 'UCaaa', contentDetails: { relatedPlaylists: { uploads: 'UUaaa' } } }]
        })
      )
    const map = await new YouTubeApiClient(auth, fetchFn, new QuotaCounter()).fetchUploadsPlaylists([
      'UCaaa'
    ])
    expect(map.get('UCaaa')).toBe('UUaaa')
  })

  it('unsubscribe DELETEs subscriptions?id= and counts 50 units', async () => {
    const quota = new QuotaCounter()
    let method = ''
    let idParam = ''
    const fetchFn: FetchFn = (url, init) => {
      method = String(init?.method)
      idParam = new URL(String(url)).searchParams.get('id') ?? ''
      return Promise.resolve(new Response(null, { status: 204 }))
    }
    await new YouTubeApiClient(auth, fetchFn, quota).unsubscribe('subAAA')
    expect(method).toBe('DELETE')
    expect(idParam).toBe('subAAA')
    expect(quota.spent).toBe(50)
  })

  it('unsubscribe maps a failed delete to a domain error', async () => {
    const fetchFn: FetchFn = () =>
      Promise.resolve(jsonResponse(401, { error: { message: 'unauthorized' } }))
    await expect(
      new YouTubeApiClient(auth, fetchFn, new QuotaCounter()).unsubscribe('subAAA')
    ).rejects.toMatchObject({ kind: 'auth-expired' })
  })

  it('findSubscriptionId looks up subscriptions.list forChannelId — 1 unit', async () => {
    const quota = new QuotaCounter()
    const fetchFn: FetchFn = (url) => {
      const params = new URL(String(url)).searchParams
      expect(params.get('forChannelId')).toBe('UCaaa')
      expect(params.get('mine')).toBe('true')
      return Promise.resolve(jsonResponse(200, { items: [{ id: 'subAAA' }] }))
    }
    const id = await new YouTubeApiClient(auth, fetchFn, quota).findSubscriptionId('UCaaa')
    expect(id).toBe('subAAA')
    expect(quota.spent).toBe(1)
  })

  it('findSubscriptionId returns null when there is no matching subscription', async () => {
    const fetchFn: FetchFn = () => Promise.resolve(jsonResponse(200, { items: [] }))
    const id = await new YouTubeApiClient(auth, fetchFn, new QuotaCounter()).findSubscriptionId(
      'UCaaa'
    )
    expect(id).toBeNull()
  })

  it('maps 403 quotaExceeded / accessNotConfigured and 401 to domain errors', async () => {
    const cases: [unknown, number, string][] = [
      [{ error: { errors: [{ reason: 'quotaExceeded' }] } }, 403, 'quota-exceeded'],
      [{ error: { errors: [{ reason: 'accessNotConfigured' }] } }, 403, 'api-not-enabled'],
      [{ error: { message: 'unauthorized' } }, 401, 'auth-expired']
    ]
    for (const [body, status, kind] of cases) {
      const fetchFn: FetchFn = () => Promise.resolve(jsonResponse(status, body))
      await expect(
        new YouTubeApiClient(auth, fetchFn, new QuotaCounter()).hydrate(['v'])
      ).rejects.toMatchObject({ kind })
    }
  })
})

describe('parseIsoDuration', () => {
  it('parses the shapes YouTube emits', () => {
    expect(parseIsoDuration('PT45S')).toBe(45)
    expect(parseIsoDuration('PT15M33S')).toBe(933)
    expect(parseIsoDuration('PT1H2M3S')).toBe(3723)
    expect(parseIsoDuration('P1DT2H')).toBe(93_600)
    expect(parseIsoDuration('PT3M')).toBe(180)
    expect(parseIsoDuration('garbage')).toBe(0)
  })
})

describe('HeadShortsProber', () => {
  it('200 = Short, redirect = regular video, anything else = pending', async () => {
    const probe = (status: number) =>
      new HeadShortsProber(() => Promise.resolve(new Response(null, { status }))).isShort('v')
    await expect(probe(200)).resolves.toBe(true)
    await expect(probe(303)).resolves.toBe(false)
    await expect(probe(429)).rejects.toMatchObject({ kind: 'internal' })
  })
})
