import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { FeedVideoDto } from '../ipc/contract'
import { formatDuration, formatViews, publishedLabel } from './format'

export type FeedRow =
  | { kind: 'header'; key: string; label: string }
  | { kind: 'video'; key: string; video: FeedVideoDto; videoIndex: number }

// A display row is what actually gets virtualized: in list layout it's
// FeedRow unchanged; in grid layout, consecutive video rows within a bucket
// are chunked into a single "card-row" of N columns (B-007).
type DisplayRow =
  | { kind: 'header'; key: string; label: string }
  | { kind: 'video'; key: string; video: FeedVideoDto; videoIndex: number }
  | { kind: 'card-row'; key: string; items: { video: FeedVideoDto; videoIndex: number }[] }

// Comfortable is the default; compact is the setting (D-022).
const ROW_HEIGHTS = { comfortable: 76, compact: 56 } as const
const HEADER_HEIGHT = 38
// Card target width; actual column count is derived from container width so
// the grid reflows instead of overflowing (D-037).
const GRID_CARD_MIN_WIDTH = 220
const GRID_CARD_HEIGHT = 210

function buildCardRows(
  rows: FeedRow[],
  columns: number
): DisplayRow[] {
  const out: DisplayRow[] = []
  let chunk: { video: FeedVideoDto; videoIndex: number }[] = []
  const flush = (): void => {
    if (chunk.length === 0) return
    out.push({ kind: 'card-row', key: `g-${chunk[0].video.videoId}`, items: chunk })
    chunk = []
  }
  for (const row of rows) {
    if (row.kind === 'header') {
      flush()
      out.push(row)
    } else {
      chunk.push({ video: row.video, videoIndex: row.videoIndex })
      if (chunk.length === columns) flush()
    }
  }
  flush()
  return out
}

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
  layout: 'list' | 'grid'
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
  layout,
  showViewCounts
}: FeedListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const rowHeight = ROW_HEIGHTS[density]
  const [columns, setColumns] = useState(1)

  // Column count follows the scroll container's width so the grid reflows
  // instead of overflowing or leaving dead space (B-007).
  useEffect(() => {
    if (layout !== 'grid') return
    const el = scrollRef.current
    if (!el) return
    const observe = (width: number) =>
      setColumns(Math.max(1, Math.floor(width / GRID_CARD_MIN_WIDTH)))
    observe(el.clientWidth)
    const observer = new ResizeObserver((entries) => observe(entries[0].contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [layout])

  const displayRows = useMemo<DisplayRow[]>(
    () => (layout === 'grid' ? buildCardRows(rows, columns) : rows),
    [rows, layout, columns]
  )

  const virtualizer = useVirtualizer({
    count: displayRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => {
      const row = displayRows[index]
      return row.kind === 'header' ? HEADER_HEIGHT : row.kind === 'card-row' ? GRID_CARD_HEIGHT : rowHeight
    },
    overscan: 12
  })

  // Density/layout/column switches change row sizes; re-measure.
  useEffect(() => {
    virtualizer.measure()
  }, [rowHeight, layout, columns, virtualizer])

  const items = virtualizer.getVirtualItems()

  // Continuous scroll (D-027): approaching the end of loaded rows pages the
  // local archive. The backend decides whether more exists.
  const lastIndex = items.at(-1)?.index ?? -1
  useEffect(() => {
    if (lastIndex >= 0 && lastIndex >= displayRows.length - Math.max(2, Math.ceil(10 / columns)))
      onNearEnd()
  }, [lastIndex, displayRows.length, columns, onNearEnd])

  // Keep the keyboard cursor visible.
  const cursorRowIndex = displayRows.findIndex(
    (row) =>
      (row.kind === 'video' && row.videoIndex === cursorVideoIndex) ||
      (row.kind === 'card-row' && row.items.some((item) => item.videoIndex === cursorVideoIndex))
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
          const row = displayRows[item.index]
          return (
            <div
              key={row.key}
              className={`feed-item${row.kind === 'card-row' ? ' card-row' : ''}`}
              style={{ height: item.size, transform: `translateY(${item.start}px)` }}
            >
              {row.kind === 'header' ? (
                <h2 className="group-header">{row.label}</h2>
              ) : row.kind === 'card-row' ? (
                <div className="grid-row" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                  {row.items.map(({ video, videoIndex }) => (
                    <VideoCard
                      key={video.videoId}
                      video={video}
                      selected={videoIndex === cursorVideoIndex}
                      undoable={undoable.has(video.videoId)}
                      actions={actions}
                      onOpen={() => onOpen(videoIndex)}
                      showViewCounts={showViewCounts}
                    />
                  ))}
                </div>
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

type VideoCardProps = VideoRowProps

// Grid variant of VideoRow (B-007): same data and actions, thumbnail-first
// card layout instead of a text-first row.
function VideoCard({ video, selected, undoable, actions, onOpen, showViewCounts }: VideoCardProps) {
  if (undoable) {
    return (
      <div className={`card undo-strip${selected ? ' selected' : ''}`}>
        <span>Ignored — it will leave this view</span>
        <button onClick={() => actions.undo(video)}>Undo (u)</button>
      </div>
    )
  }

  const { state } = video
  const dimmed = state.readStatus !== 'unread'
  return (
    <div className={`card${selected ? ' selected' : ''}${dimmed ? ' dimmed' : ''}`} onClick={onOpen}>
      <div className="card-thumb-wrap">
        {video.thumbnailUrl !== null ? (
          <img className="thumb" loading="lazy" alt="" src={thumbSrc(video.thumbnailUrl)} />
        ) : (
          <div className="thumb" />
        )}
        <span className={`unread-dot${state.readStatus === 'unread' ? ' on' : ''}`} />
        {video.isShort && <span className="short-badge card-short-badge">Short</span>}
        {video.durationSeconds !== null && (
          <span className="duration card-duration">{formatDuration(video.durationSeconds)}</span>
        )}
        <div className="row-actions card-actions">
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
      </div>
      <div className="row-text">
        <span className="title">{video.title}</span>
        <span className="meta">
          {video.channelTitle} · {publishedLabel(video.publishedAt)}
          {showViewCounts && video.viewCount !== null && <> · {formatViews(video.viewCount)}</>}
          {state.favorite && <span className="glyph" title="Favorite"> ★</span>}
          {state.watchLater && <span className="glyph" title="Watch Later"> ▶︎⁺</span>}
        </span>
      </div>
    </div>
  )
}
