import { shell } from 'electron'
import { AuthFlow, GoogleAuthProvider } from '../../adapters/oauth/auth'
import type { GoogleOAuth } from '../../adapters/oauth/google-oauth'
import { YouTubeApiClient } from '../../adapters/youtube/api-client'
import { HybridVideoSource } from '../../adapters/youtube/video-source'
import { YouTubeRssClient } from '../../adapters/rss/rss-client'
import { SyncService, type SyncProgress } from '../../core/sync-service'
import type { Clock, QuotaCounter, SecretStore, ShortsProber } from '../../core/ports'
import type { SqliteSyncRepository } from '../../adapters/storage/sync-repository'

export interface AccountStack {
  accountId: string
  label: string
  authFlow: AuthFlow
  authProvider: GoogleAuthProvider
  apiClient: YouTubeApiClient
  syncService: SyncService
}

export interface AccountStackDeps {
  secrets: SecretStore
  oauth: GoogleOAuth
  quota: QuotaCounter
  shortsProber: ShortsProber
  clock: Clock
  syncRepository: SqliteSyncRepository
  onSyncProgress: (progress: SyncProgress) => void
}

export function buildAccountStack(deps: AccountStackDeps, accountId: string, label: string): AccountStack {
  const authFlow = new AuthFlow(deps.secrets, deps.oauth, (url) => shell.openExternal(url), accountId)
  const authProvider = new GoogleAuthProvider(deps.secrets, deps.oauth, deps.clock, accountId)
  const apiClient = new YouTubeApiClient(authProvider, fetch, deps.quota)
  const syncService = new SyncService({
    subscriptions: apiClient,
    videoSource: new HybridVideoSource(new YouTubeRssClient(fetch), apiClient),
    repo: deps.syncRepository,
    shortsProber: deps.shortsProber,
    quota: deps.quota,
    clock: deps.clock,
    onProgress: deps.onSyncProgress
  })
  return { accountId, label, authFlow, authProvider, apiClient, syncService }
}
