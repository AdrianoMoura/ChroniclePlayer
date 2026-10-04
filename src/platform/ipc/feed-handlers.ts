import { ipcMain } from 'electron'
import { IpcChannel } from '../../ipc/contract'
import type { FeedVideoDto } from '../../ipc/contract'
import { toSliceDto, toVideoDto } from './dto-mappers'
import {
  parseAccountId,
  parseChannelId,
  parseChannelIdRequired,
  parseCursor,
  parseVideoId,
  parseView
} from './validators'
import type { BootContext } from './context'

export function registerFeedHandlers(ctx: BootContext): void {
  ipcMain.handle(
    IpcChannel.getFeed,
    (_event, view: unknown, cursor: unknown, channelId: unknown, accountId: unknown) =>
      toSliceDto(
        ctx.feedService.getSlice(
          parseView(view),
          parseCursor(cursor),
          undefined,
          parseChannelId(channelId),
          ctx.getSettings().showShorts,
          parseAccountId(accountId)
        )
      )
  )
  ipcMain.handle(IpcChannel.getFeedMeta, (_event, accountId: unknown) => {
    const id = parseAccountId(accountId)
    const slice = ctx.feedService.getSlice('unread', null, 1, undefined, ctx.getSettings().showShorts, id)
    return {
      unreadCount: slice.unreadCount,
      caughtUp: slice.caughtUp,
      lastRefreshAt: ctx.syncRepository.lastSyncStartedAt(),
      watchLaterCount: ctx.feedRepository.countWatchLater(ctx.getSettings().showShorts),
      refreshing: ctx.isRefreshing()
    }
  })
  ipcMain.handle(IpcChannel.getChannels, (_event, accountId: unknown) =>
    ctx.feedRepository
      .listFollowedChannels(ctx.getSettings().showShorts, parseAccountId(accountId))
      .map((followed) => ({
        channelId: followed.channel.channelId,
        title: followed.channel.title,
        thumbnailUrl: followed.channel.thumbnailUrl,
        unreadCount: followed.unreadCount,
        favorite: followed.favorite,
        notify: followed.notify,
        latestPublishedAt: followed.latestPublishedAt
      }))
  )
  ipcMain.handle(IpcChannel.toggleChannelFavorite, (_event, channelId: unknown) => {
    const id = parseChannelIdRequired(channelId)
    const accountId = ctx.resolveOwningAccountId(id)
    if (accountId === undefined) return false
    const favorite = ctx.feedRepository.toggleChannelFavorite(accountId, id)
    // A one-shot nudge at the moment of the favorite toggle, not a persistent
    // binding — a later manual notify toggle on this channel isn't
    // re-overridden until the next favorite/unfavorite event.
    if (ctx.getSettings().autoNotifyFavorites) ctx.feedRepository.setChannelNotify(accountId, id, favorite)
    return favorite
  })
  ipcMain.handle(IpcChannel.toggleChannelNotify, (_event, channelId: unknown) => {
    const id = parseChannelIdRequired(channelId)
    const accountId = ctx.resolveOwningAccountId(id)
    if (accountId === undefined) return false
    return ctx.feedRepository.toggleChannelNotify(accountId, id)
  })
  ipcMain.handle(IpcChannel.bulkSetChannelNotifyForFavorites, (_event, enable: unknown) => {
    ctx.feedRepository.bulkSetNotifyForFavorites(Boolean(enable))
  })
  ipcMain.handle(IpcChannel.getPriorityFeed, (_event, accountId: unknown): FeedVideoDto[] =>
    ctx.feedService.getPriorityVideos(ctx.getSettings().showShorts, parseAccountId(accountId)).map(toVideoDto)
  )
  ipcMain.handle(
    IpcChannel.getNextWatchLater,
    (_event, currentVideoId: unknown): FeedVideoDto | null => {
      const item = ctx.feedService.getNextWatchLater(parseVideoId(currentVideoId), ctx.getSettings().showShorts)
      return item ? toVideoDto(item) : null
    }
  )
  ipcMain.handle(IpcChannel.refreshFeed, (_event, channelId: unknown, accountId: unknown) =>
    ctx.runRefresh('manual', parseAccountId(accountId), parseChannelId(channelId))
  )
  ipcMain.handle(IpcChannel.markAllRead, (_event, channelId: unknown, accountId: unknown) =>
    ctx.feedRepository.markManyRead(
      parseChannelId(channelId) ?? null,
      null,
      ctx.clock.now().toISOString(),
      parseAccountId(accountId)
    )
  )
}
