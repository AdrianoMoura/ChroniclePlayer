import type { Comment } from '../../adapters/youtube/api-client'
import type { FeedItem, FeedSlice } from '../../core/feed-service'
import type { PlaylistSummary } from '../../core/playlist'
import type { SyncReport } from '../../core/sync-service'
import type { VideoState } from '../../core/state'
import type {
  CommentDto,
  FeedSliceDto,
  FeedVideoDto,
  PlaylistDto,
  SyncReportDto,
  VideoStateDto
} from '../../ipc/contract'

export function toStateDto(state: VideoState): VideoStateDto {
  return {
    readStatus: state.readStatus,
    favorite: state.favorite,
    watchLater: state.watchLater,
    resumePositionSeconds: state.resumePositionSeconds
  }
}

export function toVideoDto({ entry, bucket }: FeedItem): FeedVideoDto {
  return {
    videoId: entry.video.videoId,
    title: entry.video.title,
    channelId: entry.video.channelId,
    channelTitle: entry.channelTitle,
    publishedAt: entry.video.publishedAt,
    durationSeconds: entry.video.durationSeconds,
    thumbnailUrl: entry.video.thumbnailUrl,
    viewCount: entry.video.viewCount,
    isShort: entry.video.isShort,
    liveContent: entry.video.liveContent,
    liveStartedAt: entry.video.liveStartedAt,
    liveEndedAt: entry.video.liveEndedAt,
    isPremiere: entry.video.isPremiere,
    state: toStateDto(entry.state),
    bucket
  }
}

export function toSliceDto(slice: FeedSlice): FeedSliceDto {
  return {
    view: slice.view,
    videos: slice.items.map(toVideoDto),
    nextCursor: slice.nextCursor,
    unreadCount: slice.unreadCount,
    caughtUp: slice.caughtUp
  }
}

export function toPlaylistDto(playlist: PlaylistSummary): PlaylistDto {
  return {
    playlistId: playlist.playlistId,
    name: playlist.name,
    description: playlist.description,
    createdAt: playlist.createdAt,
    updatedAt: playlist.updatedAt,
    videoCount: playlist.videoCount,
    totalDurationSeconds: playlist.totalDurationSeconds,
    thumbnailUrls: playlist.thumbnailUrls,
    sourcePlaylistId: playlist.sourcePlaylistId
  }
}

export function toReportDto(report: SyncReport): SyncReportDto {
  return {
    outcome: report.outcome,
    channelsPolled: report.channelsPolled,
    channelsFailed: report.channelsFailed,
    failures: report.failures,
    videosNew: report.videosNew,
    quotaSpent: report.quotaSpent,
    finishedAt: report.finishedAt,
    subscriptions: report.subscriptions
  }
}

export function toCommentDto(comment: Comment): CommentDto {
  return { ...comment, replies: comment.replies.map(toCommentDto) }
}
