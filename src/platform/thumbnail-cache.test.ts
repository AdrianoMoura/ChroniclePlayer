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

  it('fetches and caches a thumbnail from the bare ytimg host', async () => {
    const body = Buffer.from('img-bytes')
    const url = 'https://i.ytimg.com/vi/abc/mqdefault.jpg'
    const cache = new ThumbnailCache(tempDir(), fakeFetch({ [url]: body }))
    expect(await cache.get(url)).toEqual(body)
  })

  it('fetches a thumbnail from a numbered ytimg CDN host (i1-i4)', async () => {
    const body = Buffer.from('img-bytes')
    const url = 'https://i4.ytimg.com/vi/abc/hqdefault.jpg'
    const cache = new ThumbnailCache(tempDir(), fakeFetch({ [url]: body }))
    expect(await cache.get(url)).toEqual(body)
  })

  it('falls back to hqdefault once a "_live" thumbnail 404s after the broadcast ends', async () => {
    const body = Buffer.from('ended-broadcast-thumb')
    const liveUrl = 'https://i.ytimg.com/vi/abc/mqdefault_live.jpg'
    const hqUrl = 'https://i.ytimg.com/vi/abc/hqdefault.jpg'
    const fetchFn = fakeFetch({ [hqUrl]: body })
    const cache = new ThumbnailCache(tempDir(), fetchFn)
    expect(await cache.get(liveUrl)).toEqual(body)
    expect((fetchFn as unknown as { calls: string[] }).calls).toEqual([liveUrl, hqUrl])
  })

  it('falls back to hqdefault when a smaller size was never generated for a fresh upload', async () => {
    const body = Buffer.from('fresh-upload-thumb')
    const mqUrl = 'https://i3.ytimg.com/vi/abc/mqdefault.jpg'
    const hqUrl = 'https://i3.ytimg.com/vi/abc/hqdefault.jpg'
    const fetchFn = fakeFetch({ [hqUrl]: body })
    const cache = new ThumbnailCache(tempDir(), fetchFn)
    expect(await cache.get(mqUrl)).toEqual(body)
    expect((fetchFn as unknown as { calls: string[] }).calls).toEqual([mqUrl, hqUrl])
  })

  it('returns null when both the original and hqdefault fallback 404', async () => {
    const liveUrl = 'https://i.ytimg.com/vi/abc/mqdefault_live.jpg'
    const cache = new ThumbnailCache(tempDir(), fakeFetch({}))
    expect(await cache.get(liveUrl)).toBeNull()
  })

  it('does not retry when the original request already was hqdefault', async () => {
    const hqUrl = 'https://i.ytimg.com/vi/abc/hqdefault.jpg'
    const fetchFn = fakeFetch({})
    const cache = new ThumbnailCache(tempDir(), fetchFn)
    expect(await cache.get(hqUrl)).toBeNull()
    expect((fetchFn as unknown as { calls: string[] }).calls).toEqual([hqUrl])
  })
})
