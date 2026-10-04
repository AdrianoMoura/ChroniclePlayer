import type { SqliteCatalogRepository, SqliteFeedRepository, SqliteStateRepository } from '../../adapters/storage/repositories'
import type { SqlitePlaylistRepository } from '../../adapters/storage/playlist-repository'
import type { SqliteSyncRepository } from '../../adapters/storage/sync-repository'
import type { RydClient } from '../../adapters/ryd/ryd-client'
import type { YouTubeApiClient } from '../../adapters/youtube/api-client'
import type { AuthFlow, GoogleAuthProvider } from '../../adapters/oauth/auth'
import type { FeedService } from '../../core/feed-service'
import type { Clock, ShortsProber } from '../../core/ports'
import type { SyncTrigger } from '../../core/sync-service'
import type { AccountDto, AuthStatusDto, ChronicleEventDto, ResultDto, SyncReportDto } from '../../ipc/contract'
import type { AppSettings } from '../settings-store'
import type { AccountStack } from './account-stack'

// Everything an extracted IPC handler module needs from boot()'s composition
// root. `getSettings`/`isRefreshing` are live getters, not snapshotted
// values — `settings` is reassigned (not mutated) on every setSettings call,
// so a handler holding a plain `AppSettings` field would go stale after the
// very first settings change.
export interface BootContext {
  feedRepository: SqliteFeedRepository
  stateRepository: SqliteStateRepository
  catalogRepository: SqliteCatalogRepository
  syncRepository: SqliteSyncRepository
  playlistRepository: SqlitePlaylistRepository
  feedService: FeedService
  clock: Clock
  rydClient: RydClient
  shortsProber: ShortsProber
  // The primary account's own stack, broken out for the many handlers that
  // operate on "the" connection rather than resolving a specific account —
  // same accountStacks.get(primaryAccountId()) entry, kept as direct fields
  // to match every handler's existing bare `apiClient`/`authFlow` usage.
  apiClient: YouTubeApiClient
  authFlow: AuthFlow
  authProvider: GoogleAuthProvider
  accountStacks: Map<string, AccountStack>
  pendingAccountStacks: Map<string, AccountStack>
  buildAccountStack: (accountId: string, label: string) => AccountStack
  backfillingChannels: Set<string>
  primaryAccountId: () => string
  resolveOwningAccountId: (channelId: string) => string | undefined
  ensureVideoExists: (videoId: string) => Promise<void>
  runRefresh: (
    trigger: SyncTrigger,
    accountId?: string,
    channelId?: string
  ) => Promise<ResultDto<SyncReportDto>>
  isRefreshing: () => boolean
  authStatus: () => AuthStatusDto
  toAccountDto: (stack: AccountStack) => AccountDto
  getSettings: () => AppSettings
  broadcast: (event: ChronicleEventDto) => void
}
