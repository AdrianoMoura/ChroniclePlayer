import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { generatePkce, randomState } from './pkce'
import { GoogleOAuth } from './google-oauth'
import { startLoopback } from './loopback'
import { AuthFlow, GoogleAuthProvider, parseClientSecretJson, SECRET_KEYS } from './auth'
import type { Clock, SecretStore } from '../../core/ports'
import type { FetchFn } from '../http'

const credentials = { clientId: 'id-123.apps.googleusercontent.com', clientSecret: 'sec-xyz' }

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

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  })
}

describe('PKCE', () => {
  it('challenge is base64url(sha256(verifier)) — S256', () => {
    const { verifier, challenge } = generatePkce()
    expect(challenge).toBe(createHash('sha256').update(verifier).digest('base64url'))
    expect(verifier.length).toBeGreaterThanOrEqual(43)
  })

  it('state and verifier are unique per invocation', () => {
    expect(randomState()).not.toBe(randomState())
    expect(generatePkce().verifier).not.toBe(generatePkce().verifier)
  })
})

describe('GoogleOAuth', () => {
  it('builds the auth URL with PKCE, readonly scope, offline access', () => {
    const oauth = new GoogleOAuth(fetch)
    const url = new URL(
      oauth.buildAuthUrl({
        clientId: credentials.clientId,
        redirectUri: 'http://127.0.0.1:1234',
        state: 'st',
        codeChallenge: 'ch'
      })
    )
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(url.searchParams.get('scope')).toBe('https://www.googleapis.com/auth/youtube.readonly')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('access_type')).toBe('offline')
    expect(url.searchParams.get('prompt')).toBe('consent')
  })

  it('exchanges the code with the verifier and returns the grant', async () => {
    let form: URLSearchParams | undefined
    const fetchFn: FetchFn = (_url, init) => {
      form = new URLSearchParams(String(init?.body))
      return Promise.resolve(
        jsonResponse(200, { access_token: 'at', expires_in: 3599, refresh_token: 'rt' })
      )
    }
    const grant = await new GoogleOAuth(fetchFn).exchangeCode({
      credentials,
      code: 'the-code',
      verifier: 'the-verifier',
      redirectUri: 'http://127.0.0.1:9'
    })
    expect(form?.get('grant_type')).toBe('authorization_code')
    expect(form?.get('code_verifier')).toBe('the-verifier')
    expect(grant).toEqual({ accessToken: 'at', expiresInSeconds: 3599, refreshToken: 'rt' })
  })

  it('maps invalid_grant to the auth-expired domain error (D-012 path)', async () => {
    const fetchFn: FetchFn = () => Promise.resolve(jsonResponse(400, { error: 'invalid_grant' }))
    await expect(
      new GoogleOAuth(fetchFn).refreshAccessToken(credentials, 'stale')
    ).rejects.toMatchObject({ kind: 'auth-expired' })
  })
})

describe('loopback handshake', () => {
  it('resolves the code for the matching state and answers with a page', async () => {
    const loopback = await startLoopback()
    const pending = loopback.waitForCode('expected-state')
    const response = await fetch(`${loopback.redirectUri}/?state=expected-state&code=abc123`)
    expect(response.status).toBe(200)
    await expect(pending).resolves.toBe('abc123')
    loopback.close()
  })

  it('rejects a mismatched state with 400 and keeps waiting', async () => {
    const loopback = await startLoopback(200)
    const pending = loopback.waitForCode('right')
    const bad = await fetch(`${loopback.redirectUri}/?state=wrong&code=evil`)
    expect(bad.status).toBe(400)
    await expect(pending).rejects.toMatchObject({ kind: 'internal' }) // times out (200 ms)
    loopback.close()
  })

  it('propagates an authorization refusal', async () => {
    const loopback = await startLoopback()
    const pending = loopback.waitForCode('st')
    await fetch(`${loopback.redirectUri}/?state=st&error=access_denied`)
    await expect(pending).rejects.toMatchObject({ kind: 'internal' })
    loopback.close()
  })
})

describe('parseClientSecretJson', () => {
  it('accepts a Desktop-app client_secret.json', () => {
    const json = JSON.stringify({
      installed: { client_id: 'cid', client_secret: 'cs', redirect_uris: ['http://localhost'] }
    })
    expect(parseClientSecretJson(json)).toEqual({ clientId: 'cid', clientSecret: 'cs' })
  })

  it('rejects a Web-application client with a pointed message', () => {
    expect(() => parseClientSecretJson(JSON.stringify({ web: { client_id: 'x' } }))).toThrowError(
      /Desktop app/
    )
  })

  it('rejects garbage', () => {
    expect(() => parseClientSecretJson('not json')).toThrowError(/valid JSON/)
    expect(() => parseClientSecretJson('{}')).toThrowError(/client_id/)
  })
})

describe('GoogleAuthProvider', () => {
  const clock: Clock = { now: () => new Date('2026-07-11T12:00:00Z') }

  function connectedSecrets(): MemorySecrets {
    const secrets = new MemorySecrets()
    secrets.set(SECRET_KEYS.oauthClient, JSON.stringify(credentials))
    secrets.set(SECRET_KEYS.refreshToken, 'rt')
    return secrets
  }

  it('mints once and caches the access token in memory until near expiry', async () => {
    let calls = 0
    const fetchFn: FetchFn = () => {
      calls += 1
      return Promise.resolve(jsonResponse(200, { access_token: `at-${calls}`, expires_in: 3600 }))
    }
    const provider = new GoogleAuthProvider(connectedSecrets(), new GoogleOAuth(fetchFn), clock)
    expect(await provider.getAccessToken()).toBe('at-1')
    expect(await provider.getAccessToken()).toBe('at-1')
    expect(calls).toBe(1)
  })

  it('throws auth-expired when nothing is stored', async () => {
    const provider = new GoogleAuthProvider(new MemorySecrets(), new GoogleOAuth(fetch), clock)
    await expect(provider.getAccessToken()).rejects.toMatchObject({ kind: 'auth-expired' })
  })
})

describe('AuthFlow', () => {
  it('runs the full connect handshake and persists only the refresh token', async () => {
    const secrets = new MemorySecrets()
    const fetchFn: FetchFn = () =>
      Promise.resolve(jsonResponse(200, { access_token: 'at', expires_in: 3600, refresh_token: 'rt-new' }))
    let openedUrl = ''
    const flow = new AuthFlow(
      secrets,
      new GoogleOAuth(fetchFn),
      (url) => {
        openedUrl = url
        return Promise.resolve()
      },
      () =>
        Promise.resolve({
          redirectUri: 'http://127.0.0.1:9999',
          waitForCode: () => Promise.resolve('the-code'),
          close: () => {}
        })
    )
    flow.importClientSecret(
      JSON.stringify({ installed: { client_id: 'cid', client_secret: 'cs' } })
    )
    await flow.connect()

    expect(openedUrl).toContain('accounts.google.com')
    expect(secrets.get(SECRET_KEYS.refreshToken)).toBe('rt-new')
    // access token is never written to the store
    expect([...secrets.map.keys()]).toEqual([SECRET_KEYS.oauthClient, SECRET_KEYS.refreshToken])
  })

  it('signOut revokes best-effort and deletes the stored token', async () => {
    const secrets = new MemorySecrets()
    secrets.set(SECRET_KEYS.refreshToken, 'rt')
    let revoked = ''
    const fetchFn: FetchFn = (_url, init) => {
      revoked = String(init?.body)
      return Promise.resolve(new Response('', { status: 200 }))
    }
    const flow = new AuthFlow(secrets, new GoogleOAuth(fetchFn), () => Promise.resolve())
    await flow.signOut()
    expect(revoked).toContain('token=rt')
    expect(secrets.get(SECRET_KEYS.refreshToken)).toBeNull()
  })
})
