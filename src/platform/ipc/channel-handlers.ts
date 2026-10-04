import { ipcMain } from 'electron'
import { IpcChannel } from '../../ipc/contract'
import type { ChannelDetailDto, ResultDto, SearchVideoResultDto } from '../../ipc/contract'
import { isDomainError } from '../../core/errors'
import { bucketOf, effectiveDate } from '../../core/feed'
import { confirmShorts } from './shorts'
import { parseChannelIdRequired } from './validators'
import type { AccountStack } from './account-stack'
import type { BootContext } from './context'

export function registerChannelHandlers(ctx: BootContext): void {
  ipcMain.handle(
    IpcChannel.subscribeChannel,
    // A newly discovered channel (search) has no owning account yet to
    // resolve — subscribes under the primary account.
    async (_event, channelId: unknown): Promise<ResultDto<void>> => {
      const id = parseChannelIdRequired(channelId)
      try {
        if (!ctx.authFlow.hasWriteScope()) {
          return {
            ok: false,
            errorKind: 'write-scope-required',
            message: 'subscribing needs an extra permission'
          }
        }
        const channel = await ctx.apiClient.subscribe(id)
        const now = ctx.clock.now().toISOString()
        ctx.syncRepository.upsertSubscribedChannel(ctx.primaryAccountId(), channel, now)
        const playlists = await ctx.apiClient.fetchUploadsPlaylists([id])
        const playlistId = playlists.get(id)
        if (playlistId !== undefined) ctx.syncRepository.setUploadsPlaylist(id, playlistId)
        void ctx.runRefresh('manual', undefined, id)
        return { ok: true, value: undefined }
      } catch (error) {
        if (isDomainError(error, 'auth-expired')) {
          ctx.authProvider.invalidate()
          ctx.broadcast({ type: 'auth:required' })
          return { ok: false, errorKind: 'auth-expired', message: error.message }
        }
        const kind = isDomainError(error) ? error.kind : 'internal'
        return { ok: false, errorKind: kind, message: String((error as Error).message ?? error) }
      }
    }
  )
  ipcMain.handle(
    IpcChannel.getChannelDetail,
    async (_event, channelId: unknown): Promise<ResultDto<ChannelDetailDto>> => {
      const id = parseChannelIdRequired(channelId)
      try {
        const detail = await ctx.apiClient.fetchChannelDetail(id)
        return { ok: true, value: detail }
      } catch (error) {
        if (isDomainError(error, 'auth-expired')) {
          ctx.authProvider.invalidate()
          ctx.broadcast({ type: 'auth:required' })
          return { ok: false, errorKind: 'auth-expired', message: error.message }
        }
        const kind = isDomainError(error) ? error.kind : 'internal'
        return { ok: false, errorKind: kind, message: String((error as Error).message ?? error) }
      }
    }
  )
  ipcMain.handle(
    IpcChannel.getChannelVideos,
    async (
      _event,
      channelId: unknown,
      pageToken: unknown
    ): Promise<ResultDto<{ videos: SearchVideoResultDto[]; nextPageToken: string | null }>> => {
      const id = parseChannelIdRequired(channelId)
      try {
        const playlists = await ctx.apiClient.fetchUploadsPlaylists([id])
        const uploadsPlaylistId = playlists.get(id)
        if (uploadsPlaylistId === undefined) return { ok: true, value: { videos: [], nextPageToken: null } }
        const page = await ctx.apiClient.listUploads(
          uploadsPlaylistId,
          typeof pageToken === 'string' ? pageToken : undefined
        )
        const hydrated = await ctx.apiClient.hydrate(page.videoIds)
        const confirmedShorts = await confirmShorts(ctx.shortsProber, hydrated)
        const now = ctx.clock.now()
        const videos: SearchVideoResultDto[] = hydrated.map((video) => {
          const state = ctx.stateRepository.get(video.videoId)
          const isShort = confirmedShorts.get(video.videoId) ?? false
          // Real chronological order here (unlike search:), so a real
          // bucket makes sense — same effectiveDate/bucketOf logic
          // FeedService.getSlice() uses for the synced feed, fed from the
          // same hydrated live-broadcast fields (never persisted here).
          const bucket = bucketOf(
            effectiveDate(
              {
                videoId: video.videoId,
                channelId: video.channelId,
                title: video.title,
                publishedAt: video.publishedAt,
                durationSeconds: video.durationSeconds,
                thumbnailUrl: video.thumbnailUrl,
                viewCount: video.viewCount,
                isShort,
                liveContent: video.liveContent,
                liveStartedAt: video.liveStartedAt,
                liveEndedAt: video.liveEndedAt,
                isPremiere: video.isPremiere
              },
              now
            ),
            now
          )
          return {
            kind: 'video',
            videoId: video.videoId,
            title: video.title,
            channelId: video.channelId,
            channelTitle: video.channelTitle,
            publishedAt: video.publishedAt,
            thumbnailUrl: video.thumbnailUrl,
            durationSeconds: video.durationSeconds,
            isShort,
            favorite: state.favorite,
            watchLater: state.watchLater,
            readStatus: state.readStatus,
            bucket
          }
        })
        return { ok: true, value: { videos, nextPageToken: page.nextPageToken } }
      } catch (error) {
        if (isDomainError(error, 'auth-expired')) {
          ctx.authProvider.invalidate()
          ctx.broadcast({ type: 'auth:required' })
          return { ok: false, errorKind: 'auth-expired', message: error.message }
        }
        const kind = isDomainError(error) ? error.kind : 'internal'
        return { ok: false, errorKind: kind, message: String((error as Error).message ?? error) }
      }
    }
  )

  const backfillingChannels = ctx.backfillingChannels
  ipcMain.handle(
    IpcChannel.backfillChannelArchive,
    async (
      _event,
      channelId: unknown
    ): Promise<ResultDto<{ videosNew: number; exhausted: boolean }>> => {
      const id = parseChannelIdRequired(channelId)
      if (backfillingChannels.has(id)) {
        return { ok: false, errorKind: 'busy', message: 'already loading older videos' }
      }
      const stack = resolveOwningStack(ctx, id)
      if (stack === undefined) {
        return {
          ok: false,
          errorKind: 'not-found',
          message: 'channel is not subscribed by any connected account'
        }
      }
      backfillingChannels.add(id)
      try {
        const result = await stack.syncService.backfillArchive(stack.accountId, id)
        return { ok: true, value: result }
      } catch (error) {
        if (isDomainError(error, 'auth-expired')) {
          stack.authProvider.invalidate()
          ctx.broadcast({ type: 'auth:required' })
          return { ok: false, errorKind: 'auth-expired', message: error.message }
        }
        const kind = isDomainError(error) ? error.kind : 'internal'
        return { ok: false, errorKind: kind, message: String((error as Error).message ?? error) }
      } finally {
        backfillingChannels.delete(id)
      }
    }
  )

  ipcMain.handle(
    IpcChannel.requestWriteScopeForChannel,
    async (_event, channelId: unknown): Promise<ResultDto<void>> => {
      const id = parseChannelIdRequired(channelId)
      const stack = resolveOwningStack(ctx, id)
      if (stack === undefined) {
        return {
          ok: false,
          errorKind: 'not-found',
          message: 'channel is not subscribed by any connected account'
        }
      }
      try {
        await stack.authFlow.requestWriteScope()
        stack.authProvider.invalidate()
        return { ok: true, value: undefined }
      } catch (error) {
        const kind = isDomainError(error) ? error.kind : 'internal'
        return { ok: false, errorKind: kind, message: String((error as Error).message ?? error) }
      }
    }
  )
  ipcMain.handle(
    IpcChannel.unsubscribeChannel,
    async (_event, channelId: unknown): Promise<ResultDto<void>> => {
      const id = parseChannelIdRequired(channelId)
      const stack = resolveOwningStack(ctx, id)
      if (stack === undefined) {
        return {
          ok: false,
          errorKind: 'not-found',
          message: 'channel is not subscribed by any connected account'
        }
      }
      try {
        // Incremental consent: surfaced as an in-app dialog before any
        // browser opens, never requested silently by the action itself.
        if (!stack.authFlow.hasWriteScope()) {
          return {
            ok: false,
            errorKind: 'write-scope-required',
            message: 'unsubscribing needs an extra permission'
          }
        }
        let subscriptionId = ctx.syncRepository.getSubscriptionId(stack.accountId, id)
        if (subscriptionId === null) {
          // Channels subscribed before schema v3 have no cached id yet.
          subscriptionId = await stack.apiClient.findSubscriptionId(id)
        }
        if (subscriptionId === null) {
          return {
            ok: false,
            errorKind: 'not-found',
            message: 'no active subscription found for this channel'
          }
        }
        await stack.apiClient.unsubscribe(subscriptionId)
        ctx.syncRepository.markUnsubscribed(stack.accountId, id)
        return { ok: true, value: undefined }
      } catch (error) {
        if (isDomainError(error, 'auth-expired')) {
          stack.authProvider.invalidate()
          ctx.broadcast({ type: 'auth:required' })
          return { ok: false, errorKind: 'auth-expired', message: error.message }
        }
        const kind = isDomainError(error) ? error.kind : 'internal'
        return { ok: false, errorKind: kind, message: String((error as Error).message ?? error) }
      }
    }
  )
  ipcMain.handle(
    IpcChannel.getConnectedChannel,
    async (): Promise<ResultDto<{ title: string; channelId: string }>> => {
      try {
        const channel = await ctx.apiClient.getOwnChannel()
        if (channel === null) {
          return { ok: false, errorKind: 'not-found', message: 'no channel on this account' }
        }
        return { ok: true, value: channel }
      } catch (error) {
        const kind = isDomainError(error) ? error.kind : 'internal'
        return { ok: false, errorKind: kind, message: String((error as Error).message ?? error) }
      }
    }
  )
}

function resolveOwningStack(ctx: BootContext, channelId: string): AccountStack | undefined {
  const owningAccountId = ctx.resolveOwningAccountId(channelId)
  return owningAccountId !== undefined ? ctx.accountStacks.get(owningAccountId) : undefined
}
