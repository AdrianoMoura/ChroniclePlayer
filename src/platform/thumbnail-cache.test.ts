import { describe, expect, it } from 'vitest'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ThumbnailCache } from './thumbnail-cache'

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'chronicle-thumbs-'))
}

function fakeFetch(responses: Record<string, Buffer | null>): typeof fetch {
  const calls: string[] = []
  const fn = (async (url: string | URL) => {
    const key = String(url)
    calls.push(key)
    const body = responses[key]
    if (body === undefined || body === null) return new Response(null, { status: 404 })
    return new Response(body)
  }) as unknown as typeof fetch
  ;(fn as unknown as { calls: string[] }).calls = calls
  return fn
}

describe('ThumbnailCache', () => {
  it('rejects a disallowed host without touching the network', async () => {
    const fetchFn = fakeFetch({})
    const cache = new ThumbnailCache(tempDir(), fetchFn)
    expect(await cache.get('https://evil.example/x.jpg')).toBeNull()
    expect((fetchFn as unknown as { calls: string[] }).calls).toEqual([])
  })

  it('fetches and caches a thumbnail from an allowed host', async () => {
    const body = Buffer.from('img-bytes')
    const url = 'https://i.ytimg.com/vi/abc/mqdefault.jpg'
    const cache = new ThumbnailCache(tempDir(), fakeFetch({ [url]: body }))
    expect(await cache.get(url)).toEqual(body)
  })

  it('falls back to the non-live variant once the live thumbnail 404s', async () => {
    const body = Buffer.from('ended-broadcast-thumb')
    const liveUrl = 'https://i.ytimg.com/vi/abc/mqdefault_live.jpg'
    const normalUrl = 'https://i.ytimg.com/vi/abc/mqdefault.jpg'
    const fetchFn = fakeFetch({ [normalUrl]: body })
    const cache = new ThumbnailCache(tempDir(), fetchFn)
    expect(await cache.get(liveUrl)).toEqual(body)
    expect((fetchFn as unknown as { calls: string[] }).calls).toEqual([liveUrl, normalUrl])
  })

  it('returns null when both the live and fallback variants 404', async () => {
    const liveUrl = 'https://i.ytimg.com/vi/abc/mqdefault_live.jpg'
    const cache = new ThumbnailCache(tempDir(), fakeFetch({}))
    expect(await cache.get(liveUrl)).toBeNull()
  })
})
