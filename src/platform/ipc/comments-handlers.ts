import { ipcMain } from 'electron'
import { IpcChannel } from '../../ipc/contract'
import type { CommentDto, DislikeEstimateDto, ResultDto, VideoRatingDto } from '../../ipc/contract'
import { isDomainError } from '../../core/errors'
import { toCommentDto } from './dto-mappers'
import { parseVideoId } from './validators'
import type { BootContext } from './context'

function parseCommentText(value: unknown): string {
  const text = typeof value === 'string' ? value.trim() : ''
  if (text === '') throw new Error('empty comment text')
  return text
}

export function registerCommentsHandlers(ctx: BootContext): void {
  ipcMain.handle(
    IpcChannel.getComments,
    async (
      _event,
      videoId: unknown,
      pageToken: unknown,
      order: unknown
    ): Promise<ResultDto<{ comments: CommentDto[]; nextPageToken: string | null }>> => {
      const id = parseVideoId(videoId)
      try {
        // Reading comments requires the write scope too, not just readonly
        // (the opposite of what Google's docs say) — commentThreads.list
        // 403s until the force-ssl grant from a Like action. Gated like
        // every other write-scope action so the dialog shows instead of a
        // bare 403.
        if (!ctx.authFlow.hasWriteScope()) {
          return {
            ok: false,
            errorKind: 'write-scope-required',
            message: 'reading comments needs an extra permission'
          }
        }
        const result = await ctx.apiClient.listComments(
          id,
          typeof pageToken === 'string' ? pageToken : undefined,
          order === 'time' ? 'time' : 'relevance'
        )
        return {
          ok: true,
          value: { comments: result.comments.map(toCommentDto), nextPageToken: result.nextPageToken }
        }
      } catch (error) {
        const kind = isDomainError(error) ? error.kind : 'internal'
        return { ok: false, errorKind: kind, message: String((error as Error).message ?? error) }
      }
    }
  )
  ipcMain.handle(
    IpcChannel.postComment,
    async (_event, videoId: unknown, text: unknown): Promise<ResultDto<CommentDto>> => {
      const id = parseVideoId(videoId)
      try {
        const body = parseCommentText(text)
        if (!ctx.authFlow.hasWriteScope()) {
          return {
            ok: false,
            errorKind: 'write-scope-required',
            message: 'posting a comment needs an extra permission'
          }
        }
        const comment = await ctx.apiClient.postComment(id, body)
        return { ok: true, value: toCommentDto(comment) }
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
    IpcChannel.replyToComment,
    async (_event, parentId: unknown, text: unknown): Promise<ResultDto<CommentDto>> => {
      try {
        const id = typeof parentId === 'string' ? parentId : ''
        if (id === '') throw new Error('invalid comment id')
        const body = parseCommentText(text)
        if (!ctx.authFlow.hasWriteScope()) {
          return {
            ok: false,
            errorKind: 'write-scope-required',
            message: 'replying needs an extra permission'
          }
        }
        const comment = await ctx.apiClient.replyToComment(id, body)
        return { ok: true, value: toCommentDto(comment) }
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
    IpcChannel.updateComment,
    async (_event, commentId: unknown, text: unknown): Promise<ResultDto<CommentDto>> => {
      try {
        const id = typeof commentId === 'string' ? commentId : ''
        if (id === '') throw new Error('invalid comment id')
        const body = parseCommentText(text)
        if (!ctx.authFlow.hasWriteScope()) {
          return {
            ok: false,
            errorKind: 'write-scope-required',
            message: 'editing a comment needs an extra permission'
          }
        }
        const comment = await ctx.apiClient.updateComment(id, body)
        return { ok: true, value: toCommentDto(comment) }
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
    IpcChannel.rateVideo,
    async (_event, videoId: unknown, rating: unknown): Promise<ResultDto<void>> => {
      const id = parseVideoId(videoId)
      if (rating !== 'like' && rating !== 'dislike' && rating !== 'none') {
        throw new Error('invalid rating')
      }
      try {
        if (!ctx.authFlow.hasWriteScope()) {
          return {
            ok: false,
            errorKind: 'write-scope-required',
            message: 'rating a video needs an extra permission'
          }
        }
        await ctx.apiClient.rateVideo(id, rating)
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
    IpcChannel.getVideoRating,
    async (_event, videoId: unknown): Promise<ResultDto<VideoRatingDto>> => {
      const id = parseVideoId(videoId)
      try {
        const rating = await ctx.apiClient.getVideoRating(id)
        return { ok: true, value: rating }
      } catch (error) {
        const kind = isDomainError(error) ? error.kind : 'internal'
        return { ok: false, errorKind: kind, message: String((error as Error).message ?? error) }
      }
    }
  )
  ipcMain.handle(
    IpcChannel.getDislikeEstimate,
    async (_event, videoId: unknown): Promise<DislikeEstimateDto> => {
      const id = parseVideoId(videoId)
      if (!ctx.getSettings().showDislikeEstimate) return { status: 'disabled' }
      const dislikeCount = await ctx.rydClient.fetchDislikeCount(id)
      if (dislikeCount === null) return { status: 'error' }
      return { status: 'ok', dislikeCount }
    }
  )
}
