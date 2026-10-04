import { useEffect, useMemo, useRef, useState } from 'react'
import type { FeedVideoDto } from '../ipc/contract'
import { bucketLabel } from './format'
import { FeedList, type FeedRow, type ItemSize, type VideoActions } from './FeedList'
import { t } from './i18n'

interface HistoryViewProps {
  videos: FeedVideoDto[]
  query: string
  onQueryChange: (query: string) => void
  itemSize: ItemSize
  layout: 'list' | 'grid'
  showViewCounts: boolean
  undoable: ReadonlySet<string>
  // Base actions (markRead/toggleRead/ignore/toggleFavorite/toggleWatchLater/
  // openInBrowser/addToPlaylist) already built by App.tsx — this view
  // overrides `undo` and adds `removeFromHistory` on top, same shape as
  // PlaylistDetailView's own `fullActions`.
  actions: VideoActions
  onOpen: (videoIndex: number) => void
  onOpenChannel: (channelId: string, channelTitle: string) => void
  onNearEnd: () => void
  loadingMore: boolean
  onRemoveVideo: (videoId: string) => void
  onUndoRemoveVideo: (video: FeedVideoDto) => void
  onClearAll: () => void
  helpOpen: boolean
  playerFullView: boolean
}

// Every video Chronicle has ever played, most recently watched first
// — subscribed or not, reached from the feed, search, a channel preview, or
// a description link alike (any path through App.tsx's openVideo). Not a
// FeedView (no read/unread bucket concept fits "I watched this"), so this
// is its own screen, like Playlists — infinite-scrolled rather than fully
// loaded, since it only ever grows across the app's whole lifetime. Bucketed
// by when each video was watched (feed.md §History), same Today/Yesterday/
// This Week/Earlier grouping as the main feed, just on last_watched_at
// instead of publishedAt — `video.bucket` already carries this from the
// backend (core/feed-service.ts's getHistory), so building header rows here
// is the exact same pattern App.tsx's own `rows` memo uses for the main feed.
export function HistoryView({
  videos,
  query,
  onQueryChange,
  itemSize,
  layout,
  showViewCounts,
  undoable,
  actions,
  onOpen,
  onOpenChannel,
  onNearEnd,
  loadingMore,
  onRemoveVideo,
  onUndoRemoveVideo,
  onClearAll,
  helpOpen,
  playerFullView
}: HistoryViewProps) {
  const [cursorIdx, setCursorIdx] = useState(0)
  const effectiveCursor = videos.length === 0 ? -1 : Math.min(cursorIdx, videos.length - 1)
  const lastG = useRef(0)
  const [confirmingClear, setConfirmingClear] = useState(false)

  useEffect(() => {
    if (!confirmingClear) return
    const timer = window.setTimeout(() => setConfirmingClear(false), 6000)
    return () => window.clearTimeout(timer)
  }, [confirmingClear])

  const rows = useMemo<FeedRow[]>(() => {
    const out: FeedRow[] = []
    let lastBucket: FeedVideoDto['bucket'] = null
    videos.forEach((video, videoIndex) => {
      if (video.bucket !== null && video.bucket !== lastBucket) {
        out.push({ kind: 'header', key: `h-${video.bucket}-${videoIndex}`, label: bucketLabel(video.bucket) })
        lastBucket = video.bucket
      }
      out.push({ kind: 'video', key: video.videoId, video, videoIndex })
    })
    return out
  }, [videos])

  // Drops toggleRead/ignore entirely (not just hides their row buttons) —
  // same reasoning as a playlist's own rows: a history entry is, by
  // definition, already "watched," so toggling its read status or hiding
  // it from the main feed doesn't read as a meaningful action here, per
  // the owner's own call.
  const fullActions: VideoActions = useMemo(
    () => ({
      ...actions,
      toggleRead: undefined,
      ignore: undefined,
      removeFromHistory: (video) => onRemoveVideo(video.videoId),
      undo: onUndoRemoveVideo
    }),
    [actions, onRemoveVideo, onUndoRemoveVideo]
  )

  // Own keydown handler, mirroring PlaylistDetailView's own subset of the
  // main feed's j/k/gg/G/Enter/f/w/b bindings (no m/i — see fullActions
  // above) — this screen's own cursor/video array isn't reachable from
  // App.tsx's global handler.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (playerFullView || helpOpen) return
      const target = event.target as HTMLElement | null
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (videos.length === 0) return

      const current = effectiveCursor >= 0 ? videos[effectiveCursor] : undefined
      const move = (delta: number): void => {
        setCursorIdx(Math.max(0, Math.min(videos.length - 1, effectiveCursor + delta)))
      }

      let handled = true
      switch (event.key) {
        case 'j':
        case 'ArrowDown':
          move(1)
          break
        case 'k':
        case 'ArrowUp':
          move(-1)
          break
        case 'G':
          setCursorIdx(videos.length - 1)
          break
        case 'g':
          if (Date.now() - lastG.current < 600) {
            setCursorIdx(0)
            lastG.current = 0
          } else {
            lastG.current = Date.now()
          }
          break
        case 'Enter':
        case 'o':
          if (current) {
            setCursorIdx(effectiveCursor)
            onOpen(effectiveCursor)
          }
          break
        case 'f':
          if (current) fullActions.toggleFavorite(current)
          break
        case 'w':
          if (current) fullActions.toggleWatchLater(current)
          break
        case 'b':
          if (current) fullActions.openInBrowser(current)
          break
        default:
          handled = false
      }
      if (handled) event.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [videos, effectiveCursor, helpOpen, playerFullView, onOpen, fullActions])

  return (
    <>
      <div className="history-toolbar">
        <div className="field-wrap history-search">
          <input
            className="filter"
            placeholder={t('history.searchPlaceholder')}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
          {query !== '' && (
            <button
              className="field-clear"
              title={t('app.topbar.clearFilterTitle')}
              onClick={() => onQueryChange('')}
            >
              ✕
            </button>
          )}
        </div>
        <button
          className={`unsubscribe-btn${confirmingClear ? ' danger' : ''}`}
          onClick={() => {
            if (confirmingClear) {
              setConfirmingClear(false)
              onClearAll()
            } else {
              setConfirmingClear(true)
            }
          }}
        >
          {confirmingClear ? t('history.confirmClear') : t('history.clearButton')}
        </button>
      </div>
      {videos.length === 0 ? (
        <div className="empty">
          <p>{query === '' ? t('history.empty') : t('history.emptyFiltered')}</p>
        </div>
      ) : (
        <FeedList
          // A search query change replaces `videos` wholesale (loadHistory),
          // same "different dataset, not an incremental append" shape
          // App.tsx's own FeedList key guards against — tanstack-virtual
          // can otherwise reuse a previous dataset's cached header/row
          // measurements when row count happens to coincide.
          key={query}
          rows={rows}
          cursorVideoIndex={effectiveCursor}
          undoable={undoable}
          actions={fullActions}
          onOpen={(videoIndex) => {
            setCursorIdx(videoIndex)
            onOpen(videoIndex)
          }}
          onOpenChannel={(channelId) => {
            const title = videos.find((v) => v.channelId === channelId)?.channelTitle ?? ''
            onOpenChannel(channelId, title)
          }}
          onNearEnd={onNearEnd}
          onAtTopChange={() => {}}
          itemSize={itemSize}
          layout={layout}
          showViewCounts={showViewCounts}
          loadingMore={loadingMore}
        />
      )}
    </>
  )
}
