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
    },
    {
      id: 'vid-3',
      snippet: {
        channelId: 'UCaaa',
        title: 'A live stream',
        publishedAt: '2026-07-13T08:00:00Z',
        liveBroadcastContent: 'live',
        description: '',
        thumbnails: {}
      },
      contentDetails: { duration: 'P0D' },
      liveStreamingDetails: { activeLiveChatId: 'chat-1', concurrentViewers: '120' }
    },
    {
      id: 'vid-4',
      snippet: {
        channelId: 'UCbbb',
        title: 'Another live stream',
        publishedAt: '2026-07-13T09:00:00Z',
        liveBroadcastContent: 'live',
        description: '',
        thumbnails: {}
      },
      contentDetails: { duration: 'P0D' },
      liveStreamingDetails: { activeLiveChatId: 'chat-2' }
    },
    {
      id: 'vid-5',
      snippet: {
        channelId: 'UCaaa',
        title: 'An ended broadcast',
        publishedAt: '2026-07-13T08:00:00Z',
        liveBroadcastContent: 'none', // D-053: reverted to 'none' once the stream ended
        description: '',
        thumbnails: {}
      },
      contentDetails: { duration: 'PT1H30M' },
      liveStreamingDetails: {
        activeLiveChatId: 'chat-3',
        actualStartTime: '2026-07-13T08:00:00Z',
        actualEndTime: '2026-07-13T09:30:00Z'
      }
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
      'vid-2',
      'vid-3',
      'vid-4'
    ])
    expect(videos[0]).toMatchObject({
      videoId: 'vid-1',
      durationSeconds: 933,
      liveContent: 'none',
      thumbnailUrl: 'https://i.ytimg.example/vid-1'
    })
    expect(videos[1]).toMatchObject({
      videoId: 'vid-2',
      durationSeconds: 130,
      liveContent: 'upcoming'
    })
  })

  it('captures liveStreamingDetails.actualEndTime once a broadcast has ended (D-053)', async () => {
    const fetchFn: FetchFn = () => Promise.resolve(jsonResponse(200, VIDEOS_RESPONSE))
    const videos = await new YouTubeApiClient(auth, fetchFn, new QuotaCounter()).hydrate([
      'vid-1',
      'vid-5'
    ])
    // A normal, never-live video has no actualEndTime to report.
    expect(videos.find((v) => v.videoId === 'vid-1')).toMatchObject({ liveEndedAt: null })
    expect(videos.find((v) => v.videoId === 'vid-5')).toMatchObject({
      liveContent: 'none',
      liveEndedAt: '2026-07-13T09:30:00Z'
    })
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

  it('subscribe POSTs subscriptions?part=snippet and counts 50 units', async () => {
    const quota = new QuotaCounter()
    let method = ''
    let body: Record<string, unknown> = {}
    const fetchFn: FetchFn = (_url, init) => {
      method = String(init?.method)
      body = JSON.parse(String(init?.body))
      return Promise.resolve(
        jsonResponse(200, {
          id: 'subNEW',
          snippet: {
            title: 'New Channel',
            resourceId: { channelId: 'UCnew' },
            thumbnails: { medium: { url: 'https://yt3.example/new' } }
          }
        })
      )
    }
    const channel = await new YouTubeApiClient(auth, fetchFn, quota).subscribe('UCnew')
    expect(method).toBe('POST')
    expect(body).toEqual({ snippet: { resourceId: { kind: 'youtube#channel', channelId: 'UCnew' } } })
    expect(channel).toEqual({
      channelId: 'UCnew',
      title: 'New Channel',
      thumbnailUrl: 'https://yt3.example/new',
      subscriptionId: 'subNEW'
    })
    expect(quota.spent).toBe(50)
  })

  it('search maps video and channel results, batches duration/subscriber lookups, and counts 100+1+1 units', async () => {
    const quota = new QuotaCounter()
    const fetchFn: FetchFn = (url) => {
      const parsed = new URL(String(url))
      const params = parsed.searchParams
      if (parsed.pathname.endsWith('/search')) {
        expect(params.get('q')).toBe('cats')
        expect(params.get('type')).toBe('video,channel')
        return Promise.resolve(
          jsonResponse(200, {
            nextPageToken: 'p2',
            items: [
              {
                id: { kind: 'youtube#video', videoId: 'v1' },
                snippet: {
                  title: 'Cat video',
                  channelId: 'UCcat',
                  channelTitle: 'Cats Inc',
                  publishedAt: '2026-07-10T08:00:00Z',
                  thumbnails: {}
                }
              },
              {
                id: { kind: 'youtube#channel', channelId: 'UCcat' },
                snippet: { title: 'Cats Inc', thumbnails: {} }
              }
            ]
          })
        )
      }
      if (parsed.pathname.endsWith('/videos')) {
        expect(params.get('id')).toBe('v1')
        return Promise.resolve(
          jsonResponse(200, { items: [{ id: 'v1', contentDetails: { duration: 'PT30S' } }] })
        )
      }
      expect(parsed.pathname.endsWith('/channels')).toBe(true)
      expect(params.get('id')).toBe('UCcat')
      return Promise.resolve(
        jsonResponse(200, {
          items: [{ id: 'UCcat', statistics: { subscriberCount: '4200' } }]
        })
      )
    }
    const { results, nextPageToken } = await new YouTubeApiClient(auth, fetchFn, quota).search('cats')
    expect(results).toEqual([
      {
        kind: 'video',
        videoId: 'v1',
        title: 'Cat video',
        channelId: 'UCcat',
        channelTitle: 'Cats Inc',
        publishedAt: '2026-07-10T08:00:00Z',
        thumbnailUrl: null,
        durationSeconds: 30,
        isShort: true
      },
      { kind: 'channel', channelId: 'UCcat', title: 'Cats Inc', thumbnailUrl: null, subscriberCount: 4200 }
    ])
    expect(nextPageToken).toBe('p2')
    expect(quota.spent).toBe(102)
  })

  it('listComments maps threads with nested replies and counts 1 unit', async () => {
    const quota = new QuotaCounter()
    const fetchFn: FetchFn = () =>
      Promise.resolve(
        jsonResponse(200, {
          items: [
            {
              snippet: {
                topLevelComment: {
                  id: 'c1',
                  snippet: {
                    authorDisplayName: 'Alice',
                    authorProfileImageUrl: 'https://yt3.example/alice',
                    textDisplay: 'Great video!',
                    publishedAt: '2026-07-10T08:00:00Z',
                    likeCount: 3
                  }
                }
              },
              replies: {
                comments: [
                  {
                    id: 'r1',
                    snippet: {
                      authorDisplayName: 'Bob',
                      textDisplay: 'Agreed',
                      publishedAt: '2026-07-10T09:00:00Z',
                      likeCount: 1
                    }
                  }
                ]
              }
            }
          ]
        })
      )
    const result = await new YouTubeApiClient(auth, fetchFn, quota).listComments('v1')
    expect(result.comments).toEqual([
      {
        commentId: 'c1',
        authorDisplayName: 'Alice',
        authorProfileImageUrl: 'https://yt3.example/alice',
        textDisplay: 'Great video!',
        publishedAt: '2026-07-10T08:00:00Z',
        likeCount: 3,
        replies: [
          {
            commentId: 'r1',
            authorDisplayName: 'Bob',
            authorProfileImageUrl: null,
            textDisplay: 'Agreed',
            publishedAt: '2026-07-10T09:00:00Z',
            likeCount: 1,
            replies: []
          }
        ]
      }
    ])
    expect(quota.spent).toBe(1)
  })

  it('postComment POSTs commentThreads?part=snippet and counts 50 units', async () => {
    const quota = new QuotaCounter()
    let body: Record<string, unknown> = {}
    const fetchFn: FetchFn = (_url, init) => {
      body = JSON.parse(String(init?.body))
      return Promise.resolve(
        jsonResponse(200, {
          snippet: {
            topLevelComment: {
              id: 'cNEW',
              snippet: {
                authorDisplayName: 'Me',
                textDisplay: 'Nice!',
                publishedAt: '2026-07-12T10:00:00Z',
                likeCount: 0
              }
            }
          }
        })
      )
    }
    const comment = await new YouTubeApiClient(auth, fetchFn, quota).postComment('v1', 'Nice!')
    expect(body).toEqual({
      snippet: { videoId: 'v1', topLevelComment: { snippet: { textOriginal: 'Nice!' } } }
    })
    expect(comment.commentId).toBe('cNEW')
    expect(quota.spent).toBe(50)
  })

  it('replyToComment POSTs comments?part=snippet and counts 50 units', async () => {
    const quota = new QuotaCounter()
    let body: Record<string, unknown> = {}
    const fetchFn: FetchFn = (_url, init) => {
      body = JSON.parse(String(init?.body))
      return Promise.resolve(
        jsonResponse(200, {
          id: 'rNEW',
          snippet: { authorDisplayName: 'Me', textDisplay: 'Thanks!', publishedAt: '2026-07-12T10:05:00Z' }
        })
      )
    }
    const reply = await new YouTubeApiClient(auth, fetchFn, quota).replyToComment('c1', 'Thanks!')
    expect(body).toEqual({ snippet: { parentId: 'c1', textOriginal: 'Thanks!' } })
    expect(reply).toEqual({
      commentId: 'rNEW',
      authorDisplayName: 'Me',
      authorProfileImageUrl: null,
      textDisplay: 'Thanks!',
      publishedAt: '2026-07-12T10:05:00Z',
      likeCount: 0,
      replies: []
    })
    expect(quota.spent).toBe(50)
  })

  it('rateVideo POSTs videos/rate with id and rating, counts 50 units', async () => {
    const quota = new QuotaCounter()
    let calledUrl = ''
    let method = ''
    const fetchFn: FetchFn = (url, init) => {
      calledUrl = String(url)
      method = String(init?.method)
      return Promise.resolve(new Response(null, { status: 204 }))
    }
    await new YouTubeApiClient(auth, fetchFn, quota).rateVideo('v1', 'like')
    expect(method).toBe('POST')
    const params = new URL(calledUrl).searchParams
    expect(params.get('id')).toBe('v1')
    expect(params.get('rating')).toBe('like')
    expect(quota.spent).toBe(50)
  })

  it('getVideoRating reads the items[0].rating field, counts 1 unit', async () => {
    const quota = new QuotaCounter()
    const fetchFn: FetchFn = () => Promise.resolve(jsonResponse(200, { items: [{ rating: 'like' }] }))
    const rating = await new YouTubeApiClient(auth, fetchFn, quota).getVideoRating('v1')
    expect(rating).toBe('like')
    expect(quota.spent).toBe(1)
  })

  it('getVideoRating defaults to none when there is no rating item', async () => {
    const fetchFn: FetchFn = () => Promise.resolve(jsonResponse(200, { items: [] }))
    const rating = await new YouTubeApiClient(auth, fetchFn, new QuotaCounter()).getVideoRating('v1')
    expect(rating).toBe('none')
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
