import type { RefObject } from 'react'
import type {
  FeedBucketDto,
  FeedVideoDto,
  FeedViewDto,
  SearchResultDto,
  SearchVideoResultDto,
  SettingsDto
} from '../ipc/contract'
import {
  FeedList,
  GRID_CARD_SIZES,
  VideoCard,
  VideoRow,
  type FeedRow,
  type VideoActions
} from './FeedList'
import { bucketLabel } from './format'
import { t } from './i18n'
import {
  SearchChannelCard,
  SearchChannelRow,
  SearchVideoCard,
  SearchVideoRow,
  type SearchVideoActions
} from './SearchResults'

interface ChannelPreview {
  channelId: string
  title: string
  thumbnailUrl: string | null
  videos: SearchVideoResultDto[]
  nextPageToken: string | null
  loading: boolean
  loadingMore: boolean
}

interface MainFeedPanelProps {
  settings: SettingsDto
  newVideosPill: number | null
  onShowNewVideos: () => void

  // Free-text search results — mutually exclusive with channelPreview and
  // the normal feed below.
  searchResults: SearchResultDto[] | null
  searchResultsRef: RefObject<HTMLDivElement | null>
  searching: boolean
  searchChannelId: string | null
  searchLoadingMore: boolean
  onLoadMoreSearchResults: () => void
  searchVideoActions: SearchVideoActions
  onOpenVideo: (videoId: string) => void
  onOpenChannelPreview: (channelId: string, title: string, thumbnailUrl: string | null) => void
  onSubscribeToChannel: (channelId: string) => void

  // A not-yet-subscribed channel's uploads, opened from a search result —
  // mutually exclusive with searchResults and the normal feed below.
  channelPreview: ChannelPreview | null
  channelFilter: string | null
  channelPreviewRef: RefObject<HTMLDivElement | null>
  onLoadMoreChannelPreview: () => void

  // The normal chronological feed — rendered only while neither of the above
  // two is active.
  priorityVideos: FeedVideoDto[]
  undoable: ReadonlySet<string>
  actions: VideoActions
  onNavigateToChannel: (channelId: string, channelTitle: string) => void
  filtered: FeedVideoDto[]
  filter: string
  view: FeedViewDto
  accountFilter: string | null
  rows: FeedRow[]
  effectiveCursor: number
  onOpenFromFeed: (videoIndex: number, filtered: FeedVideoDto[]) => void
  onCursorChange: (videoIndex: number) => void
  onLoadMore: () => void
  onAtTopChange: (atTop: boolean) => void
  loadingMore: boolean
  onReorderWatchLater: (fromIndex: number, insertAt: number) => void
}

// The main feed area's three mutually exclusive states (search results /
// channel preview / the synced chronological feed), plus the "N new
// videos" pill that floats above whichever of the three is showing.
export function MainFeedPanel({
  settings,
  newVideosPill,
  onShowNewVideos,
  searchResults,
  searchResultsRef,
  searching,
  searchChannelId,
  searchLoadingMore,
  onLoadMoreSearchResults,
  searchVideoActions,
  onOpenVideo,
  onOpenChannelPreview,
  onSubscribeToChannel,
  channelPreview,
  channelFilter,
  channelPreviewRef,
  onLoadMoreChannelPreview,
  priorityVideos,
  undoable,
  actions,
  onNavigateToChannel,
  filtered,
  filter,
  view,
  accountFilter,
  rows,
  effectiveCursor,
  onOpenFromFeed,
  onCursorChange,
  onLoadMore,
  onAtTopChange,
  loadingMore,
  onReorderWatchLater
}: MainFeedPanelProps) {
  return (
    <>
      {newVideosPill !== null && (
        <button className="new-videos-pill" onClick={onShowNewVideos}>
          {t('app.banner.newVideos', { count: newVideosPill, plural: newVideosPill > 1 ? 's' : '' })}
        </button>
      )}
      {searchResults !== null ? (
        <div
          ref={searchResultsRef}
          className={`search-results size-${settings.itemSize}`}
          onScroll={(event) => {
            const el = event.currentTarget
            if (el.scrollHeight - el.scrollTop - el.clientHeight < 300) onLoadMoreSearchResults()
          }}
        >
          {searching && (
            <div className="empty">
              {t(searchChannelId !== null ? 'search.searchingChannel' : 'search.searching')}
            </div>
          )}
          {!searching && searchResults.length === 0 && <div className="empty">{t('search.empty')}</div>}
          {(() => {
            const visible = searchResults.filter(
              (result) => result.kind !== 'video' || settings.showShorts || !result.isShort
            )
            if (settings.layout === 'grid') {
              return (
                <div
                  className="grid-row"
                  style={{
                    gridTemplateColumns: `repeat(auto-fill, minmax(${GRID_CARD_SIZES[settings.itemSize].minWidth}px, 1fr))`
                  }}
                >
                  {visible.map((result) =>
                    result.kind === 'video' ? (
                      <SearchVideoCard
                        key={result.videoId}
                        result={result}
                        onOpen={() => onOpenVideo(result.videoId)}
                        actions={searchVideoActions}
                      />
                    ) : (
                      <SearchChannelCard
                        key={result.channelId}
                        result={result}
                        onOpen={() => onOpenChannelPreview(result.channelId, result.title, result.thumbnailUrl)}
                        onSubscribe={() => onSubscribeToChannel(result.channelId)}
                      />
                    )
                  )}
                </div>
              )
            }
            // This list has no other keyboard path (unlike the main
            // FeedList, which has global j/k/Enter navigation) — each
            // row/card is individually focusable.
            return visible.map((result) =>
              result.kind === 'video' ? (
                <SearchVideoRow
                  key={result.videoId}
                  result={result}
                  onOpen={() => onOpenVideo(result.videoId)}
                  actions={searchVideoActions}
                />
              ) : (
                <SearchChannelRow
                  key={result.channelId}
                  result={result}
                  onOpen={() => onOpenChannelPreview(result.channelId, result.title, result.thumbnailUrl)}
                  onSubscribe={() => onSubscribeToChannel(result.channelId)}
                />
              )
            )
          })()}
          {searchLoadingMore && <div className="feed-loading-more">{t('search.loadingMore')}</div>}
        </div>
      ) : channelPreview !== null && channelPreview.channelId === channelFilter ? (
        <div
          ref={channelPreviewRef}
          className={`search-results size-${settings.itemSize}`}
          onScroll={(event) => {
            const el = event.currentTarget
            if (el.scrollHeight - el.scrollTop - el.clientHeight < 300) onLoadMoreChannelPreview()
          }}
        >
          {channelPreview.loading && <div className="empty">{t('search.channelLoading')}</div>}
          {!channelPreview.loading && channelPreview.videos.length === 0 && (
            <div className="empty">{t('search.empty')}</div>
          )}
          {(() => {
            const visible = channelPreview.videos.filter((video) => settings.showShorts || !video.isShort)
            // Chronologically ordered (unlike free-text search
            // results), so consecutive same-bucket runs can
            // just be grouped in place — no re-sort needed.
            const groups: { bucket: FeedBucketDto | null; videos: SearchVideoResultDto[] }[] = []
            for (const video of visible) {
              const last = groups.at(-1)
              if (last && last.bucket === video.bucket) last.videos.push(video)
              else groups.push({ bucket: video.bucket, videos: [video] })
            }
            return groups.map((group, groupIndex) => (
              <div key={group.bucket ?? `g-${groupIndex}`}>
                {group.bucket !== null && <h2 className="group-header">{bucketLabel(group.bucket)}</h2>}
                {settings.layout === 'grid' ? (
                  <div
                    className="grid-row"
                    style={{
                      gridTemplateColumns: `repeat(auto-fill, minmax(${GRID_CARD_SIZES[settings.itemSize].minWidth}px, 1fr))`
                    }}
                  >
                    {group.videos.map((video) => (
                      <SearchVideoCard
                        key={video.videoId}
                        result={video}
                        onOpen={() => onOpenVideo(video.videoId)}
                        actions={searchVideoActions}
                      />
                    ))}
                  </div>
                ) : (
                  group.videos.map((video) => (
                    <SearchVideoRow
                      key={video.videoId}
                      result={video}
                      onOpen={() => onOpenVideo(video.videoId)}
                      actions={searchVideoActions}
                    />
                  ))
                )}
              </div>
            ))
          })()}
          {channelPreview.loadingMore && <div className="feed-loading-more">{t('search.loadingMore')}</div>}
        </div>
      ) : (
        <>
          {priorityVideos.length > 0 && (
            <div className={`priority-section size-${settings.itemSize}`}>
              <h2 className="group-header">{t('app.bucket.favoriteChannels')}</h2>
              {settings.layout === 'grid' ? (
                <div
                  className="grid-row"
                  style={{
                    gridTemplateColumns: `repeat(auto-fill, minmax(${GRID_CARD_SIZES[settings.itemSize].minWidth}px, 1fr))`
                  }}
                >
                  {priorityVideos.map((video) => (
                    <VideoCard
                      key={video.videoId}
                      video={video}
                      selected={false}
                      undoable={undoable.has(video.videoId)}
                      actions={actions}
                      onOpen={() => onOpenVideo(video.videoId)}
                      onOpenChannel={() => onNavigateToChannel(video.channelId, video.channelTitle)}
                      showViewCounts={settings.showViewCounts}
                      focusable
                    />
                  ))}
                </div>
              ) : (
                priorityVideos.map((video) => (
                  <VideoRow
                    key={video.videoId}
                    video={video}
                    selected={false}
                    undoable={undoable.has(video.videoId)}
                    actions={actions}
                    onOpen={() => onOpenVideo(video.videoId)}
                    onOpenChannel={() => onNavigateToChannel(video.channelId, video.channelTitle)}
                    showViewCounts={settings.showViewCounts}
                    focusable
                  />
                ))
              )}
            </div>
          )}
          {filtered.length === 0 ? (
            <div className="empty">{filter ? t('app.feed.emptyFiltered') : t('app.feed.emptyNoVideos')}</div>
          ) : (
            <FeedList
              key={`${view}|${channelFilter ?? ''}|${accountFilter ?? ''}`}
              rows={rows}
              cursorVideoIndex={effectiveCursor}
              undoable={undoable}
              actions={actions}
              onOpen={(videoIndex) => {
                onCursorChange(videoIndex)
                onOpenFromFeed(videoIndex, filtered)
              }}
              onOpenChannel={(channelId) => {
                const title = filtered.find((v) => v.channelId === channelId)?.channelTitle ?? ''
                onNavigateToChannel(channelId, title)
              }}
              onNearEnd={onLoadMore}
              onAtTopChange={onAtTopChange}
              itemSize={settings.itemSize}
              layout={settings.layout}
              showViewCounts={settings.showViewCounts}
              loadingMore={loadingMore}
              reorderable={view === 'watch-later'}
              onReorder={onReorderWatchLater}
            />
          )}
        </>
      )}
    </>
  )
}
