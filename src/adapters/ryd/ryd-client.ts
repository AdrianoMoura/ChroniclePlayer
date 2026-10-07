import { webcrypto } from 'node:crypto'
import type { Clock, DislikeEstimateSource, SecretStore } from '../../core/ports'
import { request, type FetchFn } from '../http'

// Return YouTube Dislike (returnyoutubedislike.com) — free, keyless,
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
//
// submitVote (D-076) is the write side: contributing the user's own
// like/dislike/neutral rating to RYD's pool, gated by the same
// SettingsDto.showDislikeEstimate toggle as the read side above — reading
// the estimate without ever giving a vote back is the free-rider problem
// this exists to avoid, so there's no separate read-only mode. Unlike the
// in-memory dislike-count cache, the pseudonymous per-install user id this
// requires IS persisted (via SecretStore) — re-registering on every app
// restart would mean showing up as a different "voter" every session,
// worse for RYD's own anti-abuse accounting than a stable identity.

const API_BASE = 'https://returnyoutubedislikeapi.com'
const SUCCESS_TTL_MS = 60 * 60 * 1000
const FAILURE_TTL_MS = 5 * 60 * 1000

// D-076: contributing a vote. Mirrors the registration/voting handshake the
// official RYD browser extension uses (Anarios/return-youtube-dislike,
// Extensions/common/vote-client.js) — RYD's API isn't publicly documented
// beyond its Swagger surface, so this replicates the reference client
// exactly rather than guessing at the protocol.
const USER_ID_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const USER_ID_SECRET_KEY = 'ryd/user-id'
const PUZZLE_ATTEMPTS = 2
const VOTE_PUZZLE_ATTEMPTS = 3

interface CacheEntry {
  value: number | null
  expiresAt: number
}

interface Puzzle {
  challenge: string
  difficulty: number
}

function countLeadingZeroBits(bytes: Uint8Array, limit: number): number {
  let zeroes = 0
  for (const originalValue of bytes) {
    let value = originalValue
    if (value === 0) {
      zeroes += 8
    } else {
      let count = 1
      if (value >>> 4 === 0) {
        count += 4
        value <<= 4
      }
      if (value >>> 6 === 0) {
        count += 2
        value <<= 2
      }
      zeroes += count - (value >>> 7)
      break
    }
    if (zeroes >= limit) break
  }
  return zeroes
}

function generateUserId(): string {
  const values = new Uint32Array(36)
  webcrypto.getRandomValues(values)
  let result = ''
  for (const value of values) result += USER_ID_CHARSET[value % USER_ID_CHARSET.length]
  return result
}

async function solvePuzzle(puzzle: Puzzle): Promise<{ solution: string } | null> {
  const challenge = Buffer.from(puzzle.challenge, 'base64')
  if (challenge.length !== 16) return null

  const attempts = Math.pow(2, puzzle.difficulty) * 3
  const buffer = new ArrayBuffer(20)
  const byteView = new Uint8Array(buffer)
  const integerView = new Uint32Array(buffer)
  byteView.set(challenge, 4)

  for (let counter = 0; counter < attempts; counter++) {
    integerView[0] = counter
    const hash = await webcrypto.subtle.digest('SHA-512', buffer)
    if (countLeadingZeroBits(new Uint8Array(hash), puzzle.difficulty) >= puzzle.difficulty) {
      return { solution: Buffer.from(byteView.slice(0, 4)).toString('base64') }
    }
  }
  return null
}

export class RydClient implements DislikeEstimateSource {
  private readonly cache = new Map<string, CacheEntry>()
  private registration: Promise<string> | null = null
  private readonly voteQueues = new Map<string, Promise<void>>()

  constructor(
    private readonly fetchFn: FetchFn,
    private readonly clock: Clock,
    private readonly secrets: SecretStore,
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

  async submitVote(videoId: string, value: -1 | 0 | 1): Promise<void> {
    // Serialized per videoId — a rapid toggle (like -> dislike -> none) on
    // the same video must not run two handshakes against it concurrently.
    const previous = this.voteQueues.get(videoId) ?? Promise.resolve()
    const current = previous.catch(() => undefined).then(async () => {
      try {
        await this.performVote(videoId, value, 1)
      } catch {
        // Best-effort — a failed RYD contribution never surfaces to the
        // caller; the real YouTube rating write already happened or
        // hasn't, entirely independently of this.
      }
    })
    this.voteQueues.set(videoId, current)
    await current
    if (this.voteQueues.get(videoId) === current) this.voteQueues.delete(videoId)
  }

  private async postJson(path: string, body: unknown): Promise<Response> {
    return request(this.fetchFn, `${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  private async ensureRegistered(force: boolean): Promise<string> {
    if (force) {
      this.secrets.delete(USER_ID_SECRET_KEY)
      this.registration = null
    }
    if (!this.registration) this.registration = this.register()
    return this.registration
  }

  private async register(): Promise<string> {
    const existing = this.secrets.get(USER_ID_SECRET_KEY)
    if (existing) return existing

    for (let attempt = 0; attempt < PUZZLE_ATTEMPTS; attempt++) {
      const userId = generateUserId()
      const path = `/puzzle/registration?userId=${encodeURIComponent(userId)}`
      const puzzleResponse = await request(this.fetchFn, `${API_BASE}${path}`, {
        headers: { accept: 'application/json' },
      })
      if (!puzzleResponse.ok) continue
      const puzzle = (await puzzleResponse.json().catch(() => null)) as Puzzle | null
      if (!puzzle) continue
      const solved = await solvePuzzle(puzzle)
      if (!solved) continue

      const confirmResponse = await this.postJson(path, solved)
      if (!confirmResponse.ok) continue
      const confirmed = await confirmResponse.json().catch(() => null)
      if (confirmed !== true) continue

      this.secrets.set(USER_ID_SECRET_KEY, userId)
      return userId
    }
    throw new Error('unable to register a RYD user id')
  }

  private async performVote(
    videoId: string,
    value: -1 | 0 | 1,
    authRetriesRemaining: number,
  ): Promise<void> {
    const userId = await this.ensureRegistered(false)

    for (let attempt = 0; attempt < VOTE_PUZZLE_ATTEMPTS; attempt++) {
      const voteResponse = await this.postJson('/interact/vote', { userId, videoId, value })
      if (voteResponse.status === 401) {
        if (authRetriesRemaining <= 0) throw new Error('RYD vote unauthorized after re-registration')
        await this.ensureRegistered(true)
        return this.performVote(videoId, value, authRetriesRemaining - 1)
      }
      if (!voteResponse.ok) throw new Error(`RYD vote rejected: ${voteResponse.status}`)

      const puzzle = (await voteResponse.json().catch(() => null)) as Puzzle | null
      if (!puzzle) continue
      const solved = await solvePuzzle(puzzle)
      if (!solved) continue

      const confirmResponse = await this.postJson('/interact/confirmVote', {
        ...solved,
        userId,
        videoId,
      })
      if (confirmResponse.status === 401) {
        if (authRetriesRemaining <= 0) {
          throw new Error('RYD vote confirmation unauthorized after re-registration')
        }
        await this.ensureRegistered(true)
        return this.performVote(videoId, value, authRetriesRemaining - 1)
      }
      if (!confirmResponse.ok) throw new Error(`RYD vote confirmation rejected: ${confirmResponse.status}`)

      const confirmed = await confirmResponse.json().catch(() => null)
      if (confirmed !== true) throw new Error('RYD vote confirmation failed')
      return
    }
    throw new Error('unable to solve the RYD vote puzzle')
  }
}
