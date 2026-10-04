import { ipcMain } from 'electron'
import { IpcChannel } from '../../ipc/contract'
import type { ResultDto, SearchResultDto } from '../../ipc/contract'
import { isDomainError } from '../../core/errors'
import type { SearchResult } from '../../adapters/youtube/api-client'
import { confirmShorts } from './shorts'
import type { BootContext } from './context'

function toSearchResultDto(
  ctx: BootContext,
  result: SearchResult,
  confirmedShorts: ReadonlyMap<string, boolean>
): SearchResultDto {
  if (result.kind === 'channel') {
    return { ...result, subscribed: ctx.feedRepository.isSubscribed(result.channelId) }
  }
  const state = ctx.stateRepository.get(result.videoId)
  return {
    ...result,
    isShort: confirmedShorts.get(result.videoId) ?? false,
    favorite: state.favorite,
    watchLater: state.watchLater,
    readStatus: state.readStatus,
    // Relevance-ordered, not chronological — see the field's own comment
    // on SearchVideoResultDto.
    bucket: null
  }
}

export function registerSearchHandlers(ctx: BootContext): void {
  ipcMain.handle(
    IpcChannel.searchYouTube,
    async (
      _event,
      query: unknown,
      pageToken: unknown,
      channelId: unknown
    ): Promise<ResultDto<{ results: SearchResultDto[]; nextPageToken: string | null }>> => {
      const q = String(query).trim()
      if (q === '') return { ok: true, value: { results: [], nextPageToken: null } }
      try {
        const page = await ctx.apiClient.search(
          q,
          typeof pageToken === 'string' ? pageToken : undefined,
          typeof channelId === 'string' ? channelId : undefined
        )
        const confirmedShorts = await confirmShorts(
          ctx.shortsProber,
          page.results.filter((r): r is Extract<SearchResult, { kind: 'video' }> => r.kind === 'video')
        )
        return {
          ok: true,
          value: {
            results: page.results.map((r) => toSearchResultDto(ctx, r, confirmedShorts)),
            nextPageToken: page.nextPageToken
          }
        }
      } catch (error) {
        const kind = isDomainError(error) ? error.kind : 'internal'
        return { ok: false, errorKind: kind, message: String((error as Error).message ?? error) }
      }
    }
  )
}
