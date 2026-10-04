import { ipcMain, shell } from 'electron'
import { IpcChannel } from '../../ipc/contract'
import type { PlayerVideoDto, ResultDto } from '../../ipc/contract'
import { isDomainError } from '../../core/errors'
import { toStateDto } from './dto-mappers'
import { parseReadStatus, parseVideoId } from './validators'
import type { BootContext } from './context'

export function registerVideoStateHandlers(ctx: BootContext): void {
  ipcMain.handle(IpcChannel.setReadStatus, async (_event, videoId: unknown, status: unknown) => {
    const id = parseVideoId(videoId)
    await ctx.ensureVideoExists(id)
    return toStateDto(ctx.stateRepository.setReadStatus(id, parseReadStatus(status)))
  })
  ipcMain.handle(IpcChannel.toggleFavorite, async (_event, videoId: unknown) => {
    const id = parseVideoId(videoId)
    await ctx.ensureVideoExists(id)
    return toStateDto(ctx.stateRepository.toggleFavorite(id))
  })
  ipcMain.handle(IpcChannel.toggleWatchLater, async (_event, videoId: unknown) => {
    const id = parseVideoId(videoId)
    await ctx.ensureVideoExists(id)
    return toStateDto(ctx.stateRepository.toggleWatchLater(id))
  })
  ipcMain.handle(IpcChannel.reorderWatchLater, (_event, videoIds: unknown) => {
    if (!Array.isArray(videoIds)) throw new Error('invalid video id list')
    ctx.stateRepository.reorderWatchLater(videoIds.map(parseVideoId))
  })
  ipcMain.handle(IpcChannel.setResumePosition, (_event, videoId: unknown, seconds: unknown) => {
    const value = typeof seconds === 'number' ? seconds : null
    return toStateDto(ctx.stateRepository.setResumePosition(parseVideoId(videoId), value))
  })
  ipcMain.handle(IpcChannel.openInBrowser, (_event, videoId: unknown) =>
    shell.openExternal(`https://www.youtube.com/watch?v=${parseVideoId(videoId)}`)
  )
  ipcMain.handle(IpcChannel.openExternalUrl, (_event, url: unknown) => {
    if (typeof url !== 'string' || !/^https?:\/\//.test(url)) throw new Error('invalid url')
    return shell.openExternal(url)
  })
  ipcMain.handle(
    IpcChannel.getVideo,
    async (_event, videoId: unknown): Promise<ResultDto<PlayerVideoDto>> => {
      const id = parseVideoId(videoId)
      const local = ctx.feedRepository.findVideo(id)
      if (local !== null) {
        const { entry, description: storedDescription } = local
        // Storage keeps descriptions truncated to 500 chars (local-data.md).
        // The player wants the full text, so it's re-fetched here rather
        // than served straight from the truncated copy — videos.list, 1 unit,
        // same call the external-video branch below already makes for the
        // same reason. Never blocks opening the video: a failure (offline,
        // quota) just falls back to the shorter stored copy.
        let description = storedDescription
        // likeCount rides the same on-demand hydrate() call above — never
        // persisted (like description, kept fresh per open), null on
        // the same failure path that leaves description at its stored copy.
        let likeCount: number | null = null
        try {
          const [fresh] = await ctx.apiClient.hydrate([id])
          if (fresh !== undefined) {
            description = fresh.description
            likeCount = fresh.likeCount
          }
        } catch {
          // Keep the stored (possibly truncated) description; likeCount stays null.
        }
        return {
          ok: true,
          value: {
            videoId: entry.video.videoId,
            channelId: entry.video.channelId,
            title: entry.video.title,
            channelTitle: entry.channelTitle,
            publishedAt: entry.video.publishedAt,
            durationSeconds: entry.video.durationSeconds,
            thumbnailUrl: entry.video.thumbnailUrl,
            description,
            liveContent: entry.video.liveContent,
            liveStartedAt: entry.video.liveStartedAt,
            liveEndedAt: entry.video.liveEndedAt,
            state: toStateDto(entry.state),
            isSubscribed: ctx.feedRepository.isSubscribed(entry.video.channelId),
            likeCount
          }
        }
      }
      // External video: hydrate on demand — videos.list, 1 unit.
      try {
        const [video] = await ctx.apiClient.hydrate([id])
        if (video === undefined) {
          return { ok: false, errorKind: 'not-found', message: 'video not found on YouTube' }
        }
        ctx.syncRepository.upsertExternalVideo(video, ctx.clock.now().toISOString())
        return {
          ok: true,
          value: {
            videoId: video.videoId,
            channelId: video.channelId,
            title: video.title,
            channelTitle: video.channelTitle,
            publishedAt: video.publishedAt,
            durationSeconds: video.durationSeconds,
            thumbnailUrl: video.thumbnailUrl,
            description: video.description, // full text — storage keeps the truncated copy
            liveContent: video.liveContent,
            liveStartedAt: video.liveStartedAt,
            liveEndedAt: video.liveEndedAt,
            state: toStateDto(ctx.stateRepository.get(video.videoId)),
            isSubscribed: ctx.feedRepository.isSubscribed(video.channelId),
            likeCount: video.likeCount
          }
        }
      } catch (error) {
        const kind = isDomainError(error) ? error.kind : 'internal'
        return { ok: false, errorKind: kind, message: String((error as Error).message ?? error) }
      }
    }
  )

  // The player's "video unavailable" overlay's explicit remove action —
  // never triggered automatically.
  ipcMain.handle(IpcChannel.removeVideo, (_event, videoId: unknown) => {
    ctx.catalogRepository.deleteVideo(parseVideoId(videoId))
  })
}
