import { describe, expect, it } from 'vitest'
import { RydClient } from './ryd-client'
import type { FetchFn } from '../http'

describe('RydClient', () => {
  it('reads videoId as a query param and returns dislikes from a 200', async () => {
    let calledUrl = ''
    const fetchFn: FetchFn = (url) => {
      calledUrl = String(url)
      return Promise.resolve(new Response(JSON.stringify({ likes: 10, dislikes: 3 }), { status: 200 }))
    }
    const count = await new RydClient(fetchFn).fetchDislikeCount('v1')
    expect(count).toBe(3)
    expect(new URL(calledUrl).searchParams.get('videoId')).toBe('v1')
  })

  it('returns null on a non-ok response rather than throwing', async () => {
    const fetchFn: FetchFn = () => Promise.resolve(new Response('', { status: 404 }))
    expect(await new RydClient(fetchFn).fetchDislikeCount('missing')).toBeNull()
  })

  it('returns null on a network error rather than throwing', async () => {
    const fetchFn: FetchFn = () => Promise.reject(new Error('offline'))
    expect(await new RydClient(fetchFn).fetchDislikeCount('v1')).toBeNull()
  })

  it('returns null on a malformed response body', async () => {
    const fetchFn: FetchFn = () => Promise.resolve(new Response(JSON.stringify({ nope: true }), { status: 200 }))
    expect(await new RydClient(fetchFn).fetchDislikeCount('v1')).toBeNull()
  })

  it('caches per videoId in memory — a second lookup does not refetch', async () => {
    let calls = 0
    const fetchFn: FetchFn = () => {
      calls++
      return Promise.resolve(new Response(JSON.stringify({ likes: 1, dislikes: 5 }), { status: 200 }))
    }
    const client = new RydClient(fetchFn)
    await client.fetchDislikeCount('v1')
    await client.fetchDislikeCount('v1')
    expect(calls).toBe(1)
  })

  it('also caches a failed lookup, so a down service is not rehit', async () => {
    let calls = 0
    const fetchFn: FetchFn = () => {
      calls++
      return Promise.resolve(new Response('', { status: 500 }))
    }
    const client = new RydClient(fetchFn)
    await client.fetchDislikeCount('v1')
    await client.fetchDislikeCount('v1')
    expect(calls).toBe(1)
  })

  it('fetches a different videoId independently', async () => {
    let calls = 0
    const fetchFn: FetchFn = () => {
      calls++
      return Promise.resolve(new Response(JSON.stringify({ likes: 1, dislikes: 5 }), { status: 200 }))
    }
    const client = new RydClient(fetchFn)
    await client.fetchDislikeCount('v1')
    await client.fetchDislikeCount('v2')
    expect(calls).toBe(2)
  })
})
