import { ipcMain } from 'electron'
import { randomUUID } from 'node:crypto'
import {
  IpcChannel,
  PLAYLIST_DESCRIPTION_MAX_LENGTH,
  PLAYLIST_NAME_MAX_LENGTH,
  type FeedVideoDto,
  type PlaylistDto,
  type ResultDto
} from '../../ipc/contract'
import { isDomainError } from '../../core/errors'
import { nextInPlaylist, type PlaylistSummary } from '../../core/playlist'
import { parseYouTubeUrl } from '../../ipc/youtube-url'
import { toPlaylistDto, toVideoDto } from './dto-mappers'
import { parsePlaylistDescription, parsePlaylistId, parsePlaylistName, parseVideoId } from './validators'
import type { BootContext } from './context'

function requirePlaylistSummary(ctx: BootContext, playlistId: string): PlaylistSummary {
  const summary = ctx.playlistRepository.getPlaylistSummary(playlistId)
  if (summary === null) throw new Error('playlist not found')
  return summary
}

// Video-id collection shared by importPlaylist, checkPlaylistUpdates, and
// syncPlaylist — playlistItems.list, 1 unit per 50-item page. Bounded at
// 100 pages (5000 videos) since YouTube itself caps a playlist there;
// this is a one-time explicit user action, not routine sync, so there's no
// resumable cursor like the channel-archive backfill has.
async function collectSourceVideoIds(
  ctx: BootContext,
  sourcePlaylistId: string,
  onPage?: (collectedSoFar: number) => void
): Promise<string[]> {
  const videoIds: string[] = []
  let pageToken: string | undefined
  for (let page = 0; page < 100; page++) {
    const result = await ctx.apiClient.listUploads(sourcePlaylistId, pageToken)
    videoIds.push(...result.videoIds)
    onPage?.(videoIds.length)
    if (result.nextPageToken === null) break
    pageToken = result.nextPageToken
  }
  return videoIds
}

export function registerPlaylistHandlers(ctx: BootContext): void {
  ipcMain.handle(IpcChannel.listPlaylists, (): PlaylistDto[] =>
    ctx.playlistRepository.listPlaylists().map(toPlaylistDto)
  )
  ipcMain.handle(
    IpcChannel.createPlaylist,
    (_event, name: unknown, description: unknown): PlaylistDto => {
      const playlist = ctx.playlistRepository.createPlaylist(
        randomUUID(),
        parsePlaylistName(name),
        parsePlaylistDescription(description),
        ctx.clock.now().toISOString()
      )
      return toPlaylistDto({ ...playlist, videoCount: 0, totalDurationSeconds: 0, thumbnailUrls: [] })
    }
  )
  ipcMain.handle(
    IpcChannel.updatePlaylist,
    (_event, playlistId: unknown, name: unknown, description: unknown): PlaylistDto => {
      const id = parsePlaylistId(playlistId)
      const updated = ctx.playlistRepository.updatePlaylist(
        id,
        parsePlaylistName(name),
        parsePlaylistDescription(description),
        ctx.clock.now().toISOString()
      )
      if (updated === null) throw new Error('playlist not found')
      return toPlaylistDto(requirePlaylistSummary(ctx, id))
    }
  )
  ipcMain.handle(IpcChannel.deletePlaylist, (_event, playlistId: unknown) => {
    ctx.playlistRepository.deletePlaylist(parsePlaylistId(playlistId))
  })
  ipcMain.handle(IpcChannel.getPlaylistVideos, (_event, playlistId: unknown): FeedVideoDto[] =>
    ctx.playlistRepository
      .listPlaylistVideos(parsePlaylistId(playlistId))
      .map((entry) => toVideoDto({ entry, bucket: null }))
  )
  ipcMain.handle(
    IpcChannel.addVideoToPlaylist,
    // playlist_videos has the same FK to videos as video_state — reachable
    // from a search/channel-preview row too, so this needs the same
    // on-demand ensureVideoExists guard as the video-state handlers.
    async (_event, playlistId: unknown, videoId: unknown) => {
      const id = parseVideoId(videoId)
      await ctx.ensureVideoExists(id)
      ctx.playlistRepository.addVideoToPlaylist(parsePlaylistId(playlistId), id, ctx.clock.now().toISOString())
    }
  )
  ipcMain.handle(
    IpcChannel.removeVideoFromPlaylist,
    (_event, playlistId: unknown, videoId: unknown) => {
      ctx.playlistRepository.removeVideoFromPlaylist(parsePlaylistId(playlistId), parseVideoId(videoId))
    }
  )
  ipcMain.handle(IpcChannel.getPlaylistsForVideo, (_event, videoId: unknown): string[] =>
    ctx.playlistRepository.listPlaylistsForVideo(parseVideoId(videoId))
  )
  ipcMain.handle(IpcChannel.reorderPlaylist, (_event, playlistId: unknown, videoIds: unknown) => {
    if (!Array.isArray(videoIds)) throw new Error('invalid video id list')
    ctx.playlistRepository.reorderPlaylist(parsePlaylistId(playlistId), videoIds.map(parseVideoId))
  })
  ipcMain.handle(
    IpcChannel.getNextInPlaylist,
    (_event, playlistId: unknown, currentVideoId: unknown): FeedVideoDto | null => {
      const videos = ctx.playlistRepository.listPlaylistVideos(parsePlaylistId(playlistId))
      const next = nextInPlaylist(videos, parseVideoId(currentVideoId))
      return next ? toVideoDto({ entry: next, bucket: null }) : null
    }
  )

  ipcMain.handle(
    IpcChannel.importPlaylist,
    async (
      _event,
      url: unknown
    ): Promise<ResultDto<{ playlist: PlaylistDto; imported: number; total: number }>> => {
      const link = parseYouTubeUrl(typeof url === 'string' ? url : '')
      if (link.kind !== 'playlist') {
        return { ok: false, errorKind: 'invalid-url', message: 'not a YouTube playlist URL' }
      }
      try {
        ctx.broadcast({ type: 'playlist:importProgress', phase: 'meta', count: 0, total: null })
        const meta = await ctx.apiClient.fetchPlaylistMeta(link.playlistId)
        if (meta === null) {
          return { ok: false, errorKind: 'not-found', message: 'playlist not found or private' }
        }
        const now = ctx.clock.now().toISOString()
        // Truncated, not rejected — a fetched YouTube title/description isn't
        // the user's own input to validate against the usual length caps.
        const playlist = ctx.playlistRepository.createPlaylist(
          randomUUID(),
          meta.title.slice(0, PLAYLIST_NAME_MAX_LENGTH),
          meta.description?.slice(0, PLAYLIST_DESCRIPTION_MAX_LENGTH) ?? null,
          now,
          link.playlistId
        )
        const videoIds = await collectSourceVideoIds(ctx, link.playlistId, (count) =>
          ctx.broadcast({ type: 'playlist:importProgress', phase: 'collecting', count, total: null })
        )
        let imported = 0
        for (let i = 0; i < videoIds.length; i += 50) {
          const batch = videoIds.slice(i, i + 50)
          const hydrated = await ctx.apiClient.hydrate(batch)
          for (const video of hydrated) {
            ctx.syncRepository.upsertExternalVideo(video, now)
            ctx.playlistRepository.addVideoToPlaylist(playlist.playlistId, video.videoId, now)
            imported++
          }
          ctx.broadcast({
            type: 'playlist:importProgress',
            phase: 'hydrating',
            count: imported,
            total: videoIds.length
          })
        }
        return {
          ok: true,
          value: {
            playlist: toPlaylistDto(requirePlaylistSummary(ctx, playlist.playlistId)),
            imported,
            total: videoIds.length
          }
        }
      } catch (error) {
        const kind = isDomainError(error) ? error.kind : 'internal'
        return { ok: false, errorKind: kind, message: String((error as Error).message ?? error) }
      }
    }
  )

  ipcMain.handle(
    IpcChannel.checkPlaylistUpdates,
    async (_event, playlistId: unknown): Promise<ResultDto<{ newCount: number }>> => {
      const id = parsePlaylistId(playlistId)
      const playlist = ctx.playlistRepository.getPlaylist(id)
      if (playlist?.sourcePlaylistId == null) {
        return { ok: false, errorKind: 'not-imported', message: 'not an imported playlist' }
      }
      try {
        const sourceIds = await collectSourceVideoIds(ctx, playlist.sourcePlaylistId)
        const existing = ctx.playlistRepository.listImportedVideoIds(id)
        const newCount = sourceIds.filter((videoId) => !existing.has(videoId)).length
        return { ok: true, value: { newCount } }
      } catch (error) {
        const kind = isDomainError(error) ? error.kind : 'internal'
        return { ok: false, errorKind: kind, message: String((error as Error).message ?? error) }
      }
    }
  )

  ipcMain.handle(
    IpcChannel.syncPlaylist,
    async (_event, playlistId: unknown): Promise<ResultDto<{ playlist: PlaylistDto; added: number }>> => {
      const id = parsePlaylistId(playlistId)
      const playlist = ctx.playlistRepository.getPlaylist(id)
      if (playlist?.sourcePlaylistId == null) {
        return { ok: false, errorKind: 'not-imported', message: 'not an imported playlist' }
      }
      try {
        const sourceIds = await collectSourceVideoIds(ctx, playlist.sourcePlaylistId)
        const existing = ctx.playlistRepository.listImportedVideoIds(id)
        const toAdd = sourceIds.filter((videoId) => !existing.has(videoId))
        const now = ctx.clock.now().toISOString()
        let added = 0
        for (let i = 0; i < toAdd.length; i += 50) {
          const batch = toAdd.slice(i, i + 50)
          const hydrated = await ctx.apiClient.hydrate(batch)
          for (const video of hydrated) {
            ctx.syncRepository.upsertExternalVideo(video, now)
            ctx.playlistRepository.addVideoToPlaylist(id, video.videoId, now)
            added++
          }
        }
        return { ok: true, value: { playlist: toPlaylistDto(requirePlaylistSummary(ctx, id)), added } }
      } catch (error) {
        const kind = isDomainError(error) ? error.kind : 'internal'
        return { ok: false, errorKind: kind, message: String((error as Error).message ?? error) }
      }
    }
  )
}
