import { describe, expect, it } from 'vitest'
import { RydClient } from './ryd-client'
import type { FetchFn } from '../http'
import type { Clock, SecretStore } from '../../core/ports'

function fakeClock(startMs: number): Clock & { advance: (ms: number) => void } {
  let now = startMs
  return {
    now: () => new Date(now),
    advance: (ms: number) => {
      now += ms
    },
  }
}

class MemorySecrets implements SecretStore {
  map = new Map<string, string>()
  get(key: string): string | null {
    return this.map.get(key) ?? null
  }
  set(key: string, value: string): void {
    this.map.set(key, value)
  }
  delete(key: string): void {
    this.map.delete(key)
  }
  isSecure(): boolean {
    return true
  }
}

// difficulty 0 means any hash clears the bar — the puzzle solver always
// succeeds on its first attempt, so tests don't burn real CPU time hashing.
const TRIVIAL_PUZZLE = { challenge: Buffer.alloc(16, 1).toString('base64'), difficulty: 0 }

function parseBody(init: unknown): Record<string, unknown> {
  const body = (init as { body?: string } | undefined)?.body
  return body ? (JSON.parse(body) as Record<string, unknown>) : {}
}

function method(init: unknown): string {
  return (init as { method?: string } | undefined)?.method ?? 'GET'
}

describe('RydClient.fetchDislikeCount', () => {
  it('reads videoId as a query param and returns dislikes from a 200', async () => {
    let calledUrl = ''
    const fetchFn: FetchFn = (url) => {
      calledUrl = String(url)
      return Promise.resolve(new Response(JSON.stringify({ likes: 10, dislikes: 3 }), { status: 200 }))
    }
    const count = await new RydClient(fetchFn, fakeClock(0), new MemorySecrets()).fetchDislikeCount('v1')
    expect(count).toBe(3)
    expect(new URL(calledUrl).searchParams.get('videoId')).toBe('v1')
  })

  it('returns null on a non-ok response rather than throwing', async () => {
    const fetchFn: FetchFn = () => Promise.resolve(new Response('', { status: 404 }))
    expect(
      await new RydClient(fetchFn, fakeClock(0), new MemorySecrets()).fetchDislikeCount('missing')
    ).toBeNull()
  })

  it('returns null on a network error rather than throwing', async () => {
    const fetchFn: FetchFn = () => Promise.reject(new Error('offline'))
    expect(
      await new RydClient(fetchFn, fakeClock(0), new MemorySecrets()).fetchDislikeCount('v1')
    ).toBeNull()
  })

  it('returns null on a malformed response body', async () => {
    const fetchFn: FetchFn = () =>
      Promise.resolve(new Response(JSON.stringify({ nope: true }), { status: 200 }))
    expect(
      await new RydClient(fetchFn, fakeClock(0), new MemorySecrets()).fetchDislikeCount('v1')
    ).toBeNull()
  })

  it('caches a successful lookup per videoId — a second lookup within the TTL does not refetch', async () => {
    let calls = 0
    const fetchFn: FetchFn = () => {
      calls++
      return Promise.resolve(new Response(JSON.stringify({ likes: 1, dislikes: 5 }), { status: 200 }))
    }
    const clock = fakeClock(0)
    const client = new RydClient(fetchFn, clock, new MemorySecrets())
    await client.fetchDislikeCount('v1')
    clock.advance(59 * 60 * 1000)
    await client.fetchDislikeCount('v1')
    expect(calls).toBe(1)
  })

  it('refetches a successful lookup once the 1-hour TTL has passed', async () => {
    let calls = 0
    const fetchFn: FetchFn = () => {
      calls++
      return Promise.resolve(new Response(JSON.stringify({ likes: 1, dislikes: 5 }), { status: 200 }))
    }
    const clock = fakeClock(0)
    const client = new RydClient(fetchFn, clock, new MemorySecrets())
    await client.fetchDislikeCount('v1')
    clock.advance(61 * 60 * 1000)
    await client.fetchDislikeCount('v1')
    expect(calls).toBe(2)
  })

  it('also caches a failed lookup, so a down service is not rehit immediately', async () => {
    let calls = 0
    const fetchFn: FetchFn = () => {
      calls++
      return Promise.resolve(new Response('', { status: 500 }))
    }
    const clock = fakeClock(0)
    const client = new RydClient(fetchFn, clock, new MemorySecrets())
    await client.fetchDislikeCount('v1')
    clock.advance(4 * 60 * 1000)
    await client.fetchDislikeCount('v1')
    expect(calls).toBe(1)
  })

  it('retries a failed lookup sooner than a successful one, once the 5-minute TTL has passed', async () => {
    let calls = 0
    const fetchFn: FetchFn = () => {
      calls++
      return Promise.resolve(new Response('', { status: 500 }))
    }
    const clock = fakeClock(0)
    const client = new RydClient(fetchFn, clock, new MemorySecrets())
    await client.fetchDislikeCount('v1')
    clock.advance(6 * 60 * 1000)
    await client.fetchDislikeCount('v1')
    expect(calls).toBe(2)
  })

  it('fetches a different videoId independently', async () => {
    let calls = 0
    const fetchFn: FetchFn = () => {
      calls++
      return Promise.resolve(new Response(JSON.stringify({ likes: 1, dislikes: 5 }), { status: 200 }))
    }
    const client = new RydClient(fetchFn, fakeClock(0), new MemorySecrets())
    await client.fetchDislikeCount('v1')
    await client.fetchDislikeCount('v2')
    expect(calls).toBe(2)
  })
})

describe('RydClient.submitVote', () => {
  function registrationAndVoteFetch(
    calls: { url: string; method: string; body: Record<string, unknown> }[]
  ): FetchFn {
    return ((url: string, init?: unknown) => {
      const u = String(url)
      calls.push({ url: u, method: method(init), body: parseBody(init) })
      if (u.includes('/puzzle/registration')) {
        return Promise.resolve(
          method(init) === 'GET'
            ? new Response(JSON.stringify(TRIVIAL_PUZZLE), { status: 200 })
            : new Response(JSON.stringify(true), { status: 200 })
        )
      }
      if (u.endsWith('/interact/vote')) {
        return Promise.resolve(new Response(JSON.stringify(TRIVIAL_PUZZLE), { status: 200 }))
      }
      if (u.endsWith('/interact/confirmVote')) {
        return Promise.resolve(new Response(JSON.stringify(true), { status: 200 }))
      }
      throw new Error(`unexpected request: ${u}`)
    }) as FetchFn
  }

  it('registers a pseudonymous user id, persists it, and submits the vote', async () => {
    const calls: { url: string; method: string; body: Record<string, unknown> }[] = []
    const secrets = new MemorySecrets()
    const client = new RydClient(registrationAndVoteFetch(calls), fakeClock(0), secrets)

    await client.submitVote('v1', 1)

    const userId = secrets.get('ryd/user-id')
    expect(userId).not.toBeNull()
    const voteCall = calls.find((c) => c.url.endsWith('/interact/vote'))
    expect(voteCall?.body).toMatchObject({ videoId: 'v1', value: 1, userId })
    const confirmCall = calls.find((c) => c.url.endsWith('/interact/confirmVote'))
    expect(confirmCall?.body).toMatchObject({ videoId: 'v1', userId })
  })

  it('reuses a persisted user id across instances instead of registering again', async () => {
    const secrets = new MemorySecrets()
    secrets.set('ryd/user-id', 'existing-user-id')
    const calls: { url: string; method: string; body: Record<string, unknown> }[] = []
    const fetchFn: FetchFn = ((url: string, init?: unknown) => {
      const u = String(url)
      calls.push({ url: u, method: method(init), body: parseBody(init) })
      if (u.includes('/puzzle/registration')) throw new Error('should not re-register')
      if (u.endsWith('/interact/vote')) {
        return Promise.resolve(new Response(JSON.stringify(TRIVIAL_PUZZLE), { status: 200 }))
      }
      if (u.endsWith('/interact/confirmVote')) {
        return Promise.resolve(new Response(JSON.stringify(true), { status: 200 }))
      }
      throw new Error(`unexpected request: ${u}`)
    }) as FetchFn

    await new RydClient(fetchFn, fakeClock(0), secrets).submitVote('v1', -1)

    const voteCall = calls.find((c) => c.url.endsWith('/interact/vote'))
    expect(voteCall?.body).toMatchObject({ userId: 'existing-user-id', value: -1 })
  })

  it('re-registers once on a 401 and retries the vote', async () => {
    const secrets = new MemorySecrets()
    secrets.set('ryd/user-id', 'stale-user-id')
    let voteAttempts = 0
    const calls: { url: string; method: string; body: Record<string, unknown> }[] = []
    const fetchFn: FetchFn = ((url: string, init?: unknown) => {
      const u = String(url)
      calls.push({ url: u, method: method(init), body: parseBody(init) })
      if (u.includes('/puzzle/registration')) {
        return Promise.resolve(
          method(init) === 'GET'
            ? new Response(JSON.stringify(TRIVIAL_PUZZLE), { status: 200 })
            : new Response(JSON.stringify(true), { status: 200 })
        )
      }
      if (u.endsWith('/interact/vote')) {
        voteAttempts++
        if (voteAttempts === 1) return Promise.resolve(new Response('', { status: 401 }))
        return Promise.resolve(new Response(JSON.stringify(TRIVIAL_PUZZLE), { status: 200 }))
      }
      if (u.endsWith('/interact/confirmVote')) {
        return Promise.resolve(new Response(JSON.stringify(true), { status: 200 }))
      }
      throw new Error(`unexpected request: ${u}`)
    }) as FetchFn

    await new RydClient(fetchFn, fakeClock(0), secrets).submitVote('v1', 1)

    expect(voteAttempts).toBe(2)
    expect(secrets.get('ryd/user-id')).not.toBe('stale-user-id')
    const secondVoteCall = calls.filter((c) => c.url.endsWith('/interact/vote'))[1]
    expect(secondVoteCall.body['userId']).toBe(secrets.get('ryd/user-id'))
  })

  it('never throws, even when every request fails', async () => {
    const fetchFn: FetchFn = () => Promise.reject(new Error('offline'))
    await expect(
      new RydClient(fetchFn, fakeClock(0), new MemorySecrets()).submitVote('v1', 1)
    ).resolves.toBeUndefined()
  })

  it('serializes votes on the same videoId instead of running handshakes concurrently', async () => {
    const secrets = new MemorySecrets()
    let inFlightVotes = 0
    let maxConcurrentVotes = 0
    const fetchFn: FetchFn = (async (url: string, init?: unknown) => {
      const u = String(url)
      if (u.includes('/puzzle/registration')) {
        return new Response(
          JSON.stringify(method(init) === 'GET' ? TRIVIAL_PUZZLE : true),
          { status: 200 }
        )
      }
      if (u.endsWith('/interact/vote')) {
        inFlightVotes++
        maxConcurrentVotes = Math.max(maxConcurrentVotes, inFlightVotes)
        await new Promise((resolve) => setTimeout(resolve, 5))
        inFlightVotes--
        return new Response(JSON.stringify(TRIVIAL_PUZZLE), { status: 200 })
      }
      if (u.endsWith('/interact/confirmVote')) {
        return new Response(JSON.stringify(true), { status: 200 })
      }
      throw new Error(`unexpected request: ${u}`)
    }) as FetchFn

    const client = new RydClient(fetchFn, fakeClock(0), secrets)
    await Promise.all([client.submitVote('v1', 1), client.submitVote('v1', -1), client.submitVote('v1', 0)])

    expect(maxConcurrentVotes).toBe(1)
  })
})
