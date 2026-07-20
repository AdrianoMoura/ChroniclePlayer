import { authExpired, invalidClientSecret } from '../../core/errors'
import type { AuthProvider, Clock, SecretStore } from '../../core/ports'
import { generatePkce, randomState } from './pkce'
import { startLoopback, type LoopbackHandshake } from './loopback'
import {
  YOUTUBE_FORCE_SSL_SCOPE,
  YOUTUBE_READONLY_SCOPE,
  type GoogleOAuth,
  type OAuthClientCredentials
} from './google-oauth'

// The OAuth client (one Google Cloud project) is shared across every
// connected account — only the refresh token and granted scopes are
// per-account (B-003). 'default' is the single-account id.
export const SECRET_KEYS = {
  oauthClient: 'default/oauth-client'
} as const

export const DEFAULT_ACCOUNT_ID = 'default'

export function accountSecretKeys(accountId: string): {
  refreshToken: string
  grantedScopes: string
} {
  return {
    refreshToken: `${accountId}/refresh-token`,
    // D-032 incremental consent: the scope string Google actually granted,
    // so hasWriteScope() never has to guess.
    grantedScopes: `${accountId}/granted-scopes`
  }
}

// Accepts the raw content of the user's downloaded client_secret.json.
// Desktop clients appear under "installed"; a "web" client is the classic
// wrong-client-type mistake and gets a pointed message.
export function parseClientSecretJson(json: string): OAuthClientCredentials {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw invalidClientSecret('the file is not valid JSON')
  }
  const root = parsed as Record<string, unknown>
  if (root['web'] !== undefined) {
    throw invalidClientSecret(
      'this is a "Web application" OAuth client — Chronicle needs the "Desktop app" type'
    )
  }
  const installed = root['installed'] as Record<string, unknown> | undefined
  const clientId = installed?.['client_id']
  const clientSecret = installed?.['client_secret']
  if (typeof clientId !== 'string' || typeof clientSecret !== 'string') {
    throw invalidClientSecret('missing installed.client_id / installed.client_secret')
  }
  return { clientId, clientSecret }
}

export function readStoredCredentials(secrets: SecretStore): OAuthClientCredentials | null {
  const raw = secrets.get(SECRET_KEYS.oauthClient)
  if (raw === null) return null
  return JSON.parse(raw) as OAuthClientCredentials
}

// Produces valid access tokens on demand; access tokens live in this
// process's memory only, never on disk (authentication.md §Token lifecycle).
// One instance per connected account — each mints from its own refresh
// token, sharing only the OAuth client and quota (B-003).
export class GoogleAuthProvider implements AuthProvider {
  private cached: { token: string; expiresAtMs: number } | null = null
  private readonly keys: { refreshToken: string; grantedScopes: string }

  constructor(
    private readonly secrets: SecretStore,
    private readonly oauth: GoogleOAuth,
    private readonly clock: Clock,
    accountId: string
  ) {
    this.keys = accountSecretKeys(accountId)
  }

  async getAccessToken(): Promise<string> {
    const now = this.clock.now().getTime()
    if (this.cached !== null && now < this.cached.expiresAtMs - 60_000) {
      return this.cached.token
    }
    const credentials = readStoredCredentials(this.secrets)
    const refreshToken = this.secrets.get(this.keys.refreshToken)
    if (credentials === null || refreshToken === null) throw authExpired('not connected')

    const grant = await this.oauth.refreshAccessToken(credentials, refreshToken)
    this.cached = { token: grant.accessToken, expiresAtMs: now + grant.expiresInSeconds * 1000 }
    return this.cached.token
  }

  invalidate(): void {
    this.cached = null
  }
}

// The interactive connect flow: system browser + loopback + PKCE. One
// instance per account; importClientSecret affects the shared OAuth client,
// while connect/signOut/scope state stay per-account (B-003).
export class AuthFlow {
  private readonly keys: { refreshToken: string; grantedScopes: string }

  constructor(
    private readonly secrets: SecretStore,
    private readonly oauth: GoogleOAuth,
    private readonly openInSystemBrowser: (url: string) => Promise<void>,
    accountId: string,
    private readonly loopbackFactory: () => Promise<LoopbackHandshake> = startLoopback
  ) {
    this.keys = accountSecretKeys(accountId)
  }

  importClientSecret(json: string): void {
    const credentials = parseClientSecretJson(json)
    this.secrets.set(SECRET_KEYS.oauthClient, JSON.stringify(credentials))
  }

  hasClientSecret(): boolean {
    return this.secrets.get(SECRET_KEYS.oauthClient) !== null
  }

  hasRefreshToken(): boolean {
    return this.secrets.get(this.keys.refreshToken) !== null
  }

  // True once the user has granted youtube.force-ssl (D-032) — checked
  // before any write action (B-010 unsubscribe, and future like/comment).
  hasWriteScope(): boolean {
    const granted = this.secrets.get(this.keys.grantedScopes)
    return granted !== null && granted.includes(YOUTUBE_FORCE_SSL_SCOPE)
  }

  async connect(): Promise<void> {
    await this.runFlow(YOUTUBE_READONLY_SCOPE, false)
  }

  // Incremental authorization (D-032): re-runs the same system-browser +
  // loopback handshake, merging the write scope onto whatever is already
  // granted. Two clicks for an already-signed-in user.
  async requestWriteScope(): Promise<void> {
    await this.runFlow(`${YOUTUBE_READONLY_SCOPE} ${YOUTUBE_FORCE_SSL_SCOPE}`, true)
  }

  private async runFlow(scope: string, includeGrantedScopes: boolean): Promise<void> {
    const credentials = readStoredCredentials(this.secrets)
    if (credentials === null) throw invalidClientSecret('no OAuth client imported yet')

    const { verifier, challenge } = generatePkce()
    const state = randomState()
    const loopback = await this.loopbackFactory()
    try {
      const url = this.oauth.buildAuthUrl({
        clientId: credentials.clientId,
        redirectUri: loopback.redirectUri,
        state,
        codeChallenge: challenge,
        scope,
        includeGrantedScopes
      })
      await this.openInSystemBrowser(url)
      const code = await loopback.waitForCode(state)
      const grant = await this.oauth.exchangeCode({
        credentials,
        code,
        verifier,
        redirectUri: loopback.redirectUri
      })
      if (grant.refreshToken === null) {
        throw invalidClientSecret('Google returned no refresh token — retry the connection')
      }
      this.secrets.set(this.keys.refreshToken, grant.refreshToken)
      this.secrets.set(this.keys.grantedScopes, grant.scope ?? scope)
    } finally {
      loopback.close()
    }
  }

  // Deletes the local token and revokes it best-effort. Local data is never
  // deleted on sign-out (authentication.md).
  async signOut(): Promise<void> {
    const refreshToken = this.secrets.get(this.keys.refreshToken)
    if (refreshToken !== null) {
      await this.oauth.revoke(refreshToken)
      this.secrets.delete(this.keys.refreshToken)
    }
    this.secrets.delete(this.keys.grantedScopes)
  }
}
