import { useEffect, useRef, type MouseEvent } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { FeedVideoDto } from '../ipc/contract'
import { formatDuration, formatViews, publishedLabel } from './format'

export type FeedRow =
  | { kind: 'header'; key: string; label: string }
  | { kind: 'video'; key: string; video: FeedVideoDto; videoIndex: number }

// Comfortable is the default; compact is the setting (D-022).
const ROW_HEIGHTS = { comfortable: 76, compact: 56 } as const
const HEADER_HEIGHT = 38

export interface VideoActions {
  markRead: (video: FeedVideoDto) => void
  toggleRead: (video: FeedVideoDto) => void
  ignore: (video: FeedVideoDto) => void
  undo: (video: FeedVideoDto) => void
  toggleFavorite: (video: FeedVideoDto) => void
  toggleWatchLater: (video: FeedVideoDto) => void
  openInBrowser: (video: FeedVideoDto) => void
}

interface FeedListProps {
  rows: FeedRow[]
  cursorVideoIndex: number
  undoable: ReadonlySet<string>
  actions: VideoActions
  onOpen: (videoIndex: number) => void
  onNearEnd: () => void
  onAtTopChange: (atTop: boolean) => void
  density: 'comfortable' | 'compact'
  showViewCounts: boolean
}

export function FeedList({
  rows,
  cursorVideoIndex,
  undoable,
  actions,
  onOpen,
  onNearEnd,
  onAtTopChange,
  density,
  showViewCounts
}: FeedListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const rowHeight = ROW_HEIGHTS[density]

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => (rows[index].kind === 'header' ? HEADER_HEIGHT : rowHeight),
    overscan: 12
  })

  // Density switches change every row size; the virtualizer must re-measure.
  useEffect(() => {
    virtualizer.measure()
  }, [rowHeight, virtualizer])

  const items = virtualizer.getVirtualItems()

  // Continuous scroll (D-027): approaching the end of loaded rows pages the
  // local archive. The backend decides whether more exists.
  const lastIndex = items.at(-1)?.index ?? -1
  useEffect(() => {
    if (lastIndex >= 0 && lastIndex >= rows.length - 10) onNearEnd()
  }, [lastIndex, rows.length, onNearEnd])

  // Keep the keyboard cursor visible.
  const cursorRowIndex = rows.findIndex(
    (row) => row.kind === 'video' && row.videoIndex === cursorVideoIndex
  )
  useEffect(() => {
    if (cursorRowIndex >= 0) virtualizer.scrollToIndex(cursorRowIndex, { align: 'auto' })
  }, [cursorRowIndex, virtualizer])

  return (
    <div
      className={`feed-scroll${density === 'compact' ? ' compact' : ''}`}
      ref={scrollRef}
      onScroll={(event) => onAtTopChange(event.currentTarget.scrollTop < 40)}
    >
      <div className="feed-inner" style={{ height: virtualizer.getTotalSize() }}>
        {items.map((item) => {
          const row = rows[item.index]
          return (
            <div
              key={row.key}
              className="feed-item"
              style={{ height: item.size, transform: `translateY(${item.start}px)` }}
            >
              {row.kind === 'header' ? (
                <h2 className="group-header">{row.label}</h2>
              ) : (
                <VideoRow
                  video={row.video}
                  selected={row.videoIndex === cursorVideoIndex}
                  undoable={undoable.has(row.video.videoId)}
                  actions={actions}
                  onOpen={() => onOpen(row.videoIndex)}
                  showViewCounts={showViewCounts}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface VideoRowProps {
  video: FeedVideoDto
  selected: boolean
  undoable: boolean
  actions: VideoActions
  onOpen: () => void
  showViewCounts: boolean
}

// Thumbnails go through the backend cache (thumb:// protocol) — the
// renderer never talks to Google hosts directly (architecture.md).
function thumbSrc(url: string): string {
  return `thumb://img/${encodeURIComponent(url)}`
}

function VideoRow({ video, selected, undoable, actions, onOpen, showViewCounts }: VideoRowProps) {
  if (undoable) {
    return (
      <div className={`row undo-strip${selected ? ' selected' : ''}`}>
        <span>Ignored — it will leave this view</span>
        <button onClick={() => actions.undo(video)}>Undo (u)</button>
      </div>
    )
  }

  const { state } = video
  const dimmed = state.readStatus !== 'unread'
  return (
    <div
      className={`row${selected ? ' selected' : ''}${dimmed ? ' dimmed' : ''}`}
      onClick={onOpen}
    >
      <span className={`unread-dot${state.readStatus === 'unread' ? ' on' : ''}`} />
      {video.thumbnailUrl !== null ? (
        <img className="thumb" loading="lazy" alt="" src={thumbSrc(video.thumbnailUrl)} />
      ) : (
        <div className="thumb" />
      )}
      <div className="row-text">
        <span className="title">{video.title}</span>
        <span className="meta">
          {video.channelTitle} · {publishedLabel(video.publishedAt)}
          {showViewCounts && video.viewCount !== null && <> · {formatViews(video.viewCount)}</>}
          {state.favorite && <span className="glyph" title="Favorite"> ★</span>}
          {state.watchLater && <span className="glyph" title="Watch Later"> ▶︎⁺</span>}
        </span>
      </div>
      <div className="row-actions">
        <button title="Toggle read (m)" onClick={(e) => stop(e, () => actions.toggleRead(video))}>
          ✓
        </button>
        <button title="Ignore (i)" onClick={(e) => stop(e, () => actions.ignore(video))}>
          ⊘
        </button>
        <button
          title="Toggle favorite (f)"
          onClick={(e) => stop(e, () => actions.toggleFavorite(video))}
        >
          ★
        </button>
        <button
          title="Toggle watch later (w)"
          onClick={(e) => stop(e, () => actions.toggleWatchLater(video))}
        >
          ▶︎⁺
        </button>
        <button
          title="Open in browser (b)"
          onClick={(e) => stop(e, () => actions.openInBrowser(video))}
        >
          ↗
        </button>
      </div>
      {video.isShort && <span className="short-badge">Short</span>}
      {video.durationSeconds !== null && (
        <span className="duration">{formatDuration(video.durationSeconds)}</span>
      )}
    </div>
  )
}

function stop(event: MouseEvent, action: () => void): void {
  event.stopPropagation()
  action()
}
