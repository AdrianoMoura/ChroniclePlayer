import { authExpired, internal } from '../../core/errors'
import { request, type FetchFn } from '../http'

// Standard Google OAuth2 endpoints (authentication.md §OAuth flow).
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke'

// D-032: initial auth requests the readonly scope only; broader scopes come
// via incremental authorization when interaction features land (post-MVP).
export const YOUTUBE_READONLY_SCOPE = 'https://www.googleapis.com/auth/youtube.readonly'
// Covers subscribe/unsubscribe, rate, and comment (D-032) — requested only
// the first time a write action is invoked (B-010 is the first caller).
export const YOUTUBE_FORCE_SSL_SCOPE = 'https://www.googleapis.com/auth/youtube.force-ssl'

export interface OAuthClientCredentials {
  clientId: string
  clientSecret: string
}

export interface TokenGrant {
  accessToken: string
  expiresInSeconds: number
  refreshToken: string | null
  // Google's actual granted-scope string (may exceed what was requested when
  // include_granted_scopes=true merges prior grants) — null if the token
  // endpoint omitted it.
  scope: string | null
}

export class GoogleOAuth {
  constructor(private readonly fetchFn: FetchFn) {}

  buildAuthUrl(params: {
    clientId: string
    redirectUri: string
    state: string
    codeChallenge: string
    scope?: string
    // Incremental consent (D-032): merges this grant with scopes already
    // granted in a prior connection instead of replacing them.
    includeGrantedScopes?: boolean
  }): string {
    const url = new URL(AUTH_ENDPOINT)
    url.searchParams.set('client_id', params.clientId)
    url.searchParams.set('redirect_uri', params.redirectUri)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('scope', params.scope ?? YOUTUBE_READONLY_SCOPE)
    url.searchParams.set('state', params.state)
    url.searchParams.set('code_challenge', params.codeChallenge)
    url.searchParams.set('code_challenge_method', 'S256')
    // offline + consent guarantee a refresh token on (re-)connect.
    url.searchParams.set('access_type', 'offline')
    url.searchParams.set('prompt', 'consent')
    if (params.includeGrantedScopes) url.searchParams.set('include_granted_scopes', 'true')
    return url.toString()
  }

  async exchangeCode(params: {
    credentials: OAuthClientCredentials
    code: string
    verifier: string
    redirectUri: string
  }): Promise<TokenGrant> {
    return this.tokenRequest({
      grant_type: 'authorization_code',
      code: params.code,
      code_verifier: params.verifier,
      redirect_uri: params.redirectUri,
      client_id: params.credentials.clientId,
      client_secret: params.credentials.clientSecret
    })
  }

  async refreshAccessToken(
    credentials: OAuthClientCredentials,
    refreshToken: string
  ): Promise<TokenGrant> {
    return this.tokenRequest({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret
    })
  }

  // Best-effort (authentication.md §Token lifecycle) — sign-out never fails
  // because Google was unreachable.
  async revoke(token: string): Promise<void> {
    try {
      await request(this.fetchFn, REVOKE_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token }).toString()
      })
    } catch {
      // ignored by design
    }
  }

  private async tokenRequest(form: Record<string, string>): Promise<TokenGrant> {
    const response = await request(this.fetchFn, TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(form).toString()
    })
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>

    if (!response.ok) {
      // invalid_grant = refresh token revoked/expired (incl. the Testing-mode
      // 7-day expiry, D-012) — a first-class product state, not a crash.
      if (payload['error'] === 'invalid_grant') throw authExpired()
      throw internal(`token endpoint error: ${String(payload['error'] ?? response.status)}`)
    }
    if (typeof payload['access_token'] !== 'string') {
      throw internal('token endpoint returned no access token')
    }
    return {
      accessToken: payload['access_token'],
      expiresInSeconds: typeof payload['expires_in'] === 'number' ? payload['expires_in'] : 3600,
      refreshToken: typeof payload['refresh_token'] === 'string' ? payload['refresh_token'] : null,
      scope: typeof payload['scope'] === 'string' ? payload['scope'] : null
    }
  }
}
