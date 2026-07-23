import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent
} from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { FeedVideoDto } from '../ipc/contract'
import { feedItemLabel, formatDuration, formatViews } from './format'
import { t } from './i18n'

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

// File-explorer-style item size, shared by list rows and grid cards.
// Medium is the default. The xl/xxl steps are deliberately bigger jumps
// than the rest — "as big as it gets" territory, not another even increment.
export type ItemSize = 'xs' | 'small' | 'medium' | 'large' | 'xl' | 'xxl'
export const ITEM_SIZES: ItemSize[] = ['xs', 'small', 'medium', 'large', 'xl', 'xxl']
const ROW_HEIGHTS: Record<ItemSize, number> = {
  xs: 40,
  small: 56,
  medium: 76,
  large: 108,
  xl: 156,
  xxl: 208
}
const HEADER_HEIGHT = 38

// liveContent alone doesn't distinguish "airing now" from "broadcast has
// since ended" — it reverts to 'none' once a stream wraps, same as a normal
// upload, so no badge shows for the ended case. An ended broadcast still
// sorts and buckets by when it wrapped rather than its original publishedAt
// (core/feed.ts, liveEndedAt); its duration is the only card-level hint it
// was ever live.
type LiveBadgeState = 'live' | 'premiere' | 'upcoming'

function liveBadgeState(video: FeedVideoDto): LiveBadgeState | null {
  if (video.liveContent === 'live') return video.isPremiere ? 'premiere' : 'live'
  if (video.liveContent === 'upcoming') return 'upcoming'
  return null
}

function liveBadgeLabel(state: LiveBadgeState): string {
  if (state === 'upcoming') return t('feed.card.upcomingBadge')
  if (state === 'premiere') return t('feed.card.premiereBadge')
  return t('feed.card.liveBadge')
}
// Must mirror `.grid-row`'s `gap` in styles.css — used below to derive the
// actual per-card width from the container width, in sync with how the CSS
// grid distributes space.
const GRID_GAP = 16
// Card target width; actual column count is derived from container width so
// the grid reflows instead of overflowing (D-037). Both grow with itemSize.
// `height` is the card's rendered height *at exactly `minWidth` wide* (thumb
// + padding + gap + two-line title + meta line at that size's own
// font-size). Columns render at `1fr` and stretch past `minWidth`, and the
// thumbnail's `aspect-ratio` makes real height grow with actual column
// width — so the virtualizer (which never re-measures individual cards) is
// fed a width-adjusted estimate computed in the resize handler below, not
// this constant directly.
export const GRID_CARD_SIZES: Record<ItemSize, { minWidth: number; height: number }> = {
  xs: { minWidth: 110, height: 144 },
  small: { minWidth: 160, height: 176 },
  medium: { minWidth: 220, height: 214 },
  large: { minWidth: 300, height: 290 },
  xl: { minWidth: 420, height: 340 },
  xxl: { minWidth: 560, height: 420 }
}

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
  onOpenChannel: (channelId: string) => void
  onNearEnd: () => void
  onAtTopChange: (atTop: boolean) => void
  itemSize: ItemSize
  layout: 'list' | 'grid'
  showViewCounts: boolean
  loadingMore: boolean
  // D-057: Watch Later's own drag-and-drop reorder, list and grid alike.
  // Native HTML5 DnD, no new dependency. The whole row/card is both the drag
  // source (draggable, click-and-hold anywhere on it) *and* the drop target
  // (dragover/drop on that same element) — this is the one arrangement
  // confirmed working end to end live; a later attempt at moving the drop
  // target onto small separate child elements broke reordering entirely
  // (see decisions-history/D-057.md) and was reverted. insertAt is the
  // position in the (bucket-less, so index-is-position) video list to drop
  // the dragged video at.
  reorderable?: boolean
  onReorder?: (fromIndex: number, insertAt: number) => void
}

export function FeedList({
  rows,
  cursorVideoIndex,
  undoable,
  actions,
  onOpen,
  onOpenChannel,
  onNearEnd,
  onAtTopChange,
  itemSize,
  layout,
  showViewCounts,
  loadingMore,
  reorderable = false,
  onReorder
}: FeedListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  // D-057: dragIndex is the video being dragged. dropTarget is whichever
  // video is currently hovered, plus which side of it — only one row/card
  // is ever hovered at a time in native DnD, so this alone is enough to
  // drive a single, unambiguous indicator. Per the owner's own simplified
  // model: every video's own drop zone means "insert after this video" —
  // there's no separate "before" zone on every item, since that would just
  // be the same position as the previous item's "after" (two indicators for
  // one gap, and a boundary between them that made drops flaky). The one
  // exception is the very first video, which also needs a "before" zone —
  // otherwise nothing could ever become the new first item.
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropTarget, setDropTarget] = useState<{ videoIndex: number; edge: 'before' | 'after' } | null>(
    null
  )
  const rowHeight = ROW_HEIGHTS[itemSize]
  const gridCardSize = GRID_CARD_SIZES[itemSize]
  const [columns, setColumns] = useState(1)
  const [cardRowHeight, setCardRowHeight] = useState(gridCardSize.height)

  // Column count follows the scroll container's width so the grid reflows
  // instead of overflowing or leaving dead space. Row height is recomputed
  // alongside it: columns render at `1fr`, so actual card width can be well
  // past `minWidth`, and since the thumbnail's height follows its width
  // (`aspect-ratio`), the fixed per-size `height` alone underestimates real
  // card height once a column stretches. Scale the thumbnail portion by
  // actual width and keep the rest (padding/title/meta) constant.
  useEffect(() => {
    if (layout !== 'grid') return
    const el = scrollRef.current
    if (!el) return
    const observe = (width: number) => {
      const cols = Math.max(
        1,
        Math.floor((width + GRID_GAP) / (gridCardSize.minWidth + GRID_GAP))
      )
      setColumns(cols)
      const cardWidth = (width - GRID_GAP * (cols - 1)) / cols
      const thumbHeightAtMinWidth = gridCardSize.minWidth * (9 / 16)
      const nonThumbHeight = gridCardSize.height - thumbHeightAtMinWidth
      setCardRowHeight(cardWidth * (9 / 16) + nonThumbHeight)
    }
    observe(el.clientWidth)
    const observer = new ResizeObserver((entries) => observe(entries[0].contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [layout, gridCardSize.minWidth, gridCardSize.height])

  const displayRows = useMemo<DisplayRow[]>(
    () => (layout === 'grid' ? buildCardRows(rows, columns) : rows),
    [rows, layout, columns]
  )

  const virtualizer = useVirtualizer({
    count: displayRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => {
      const row = displayRows[index]
      return row.kind === 'header' ? HEADER_HEIGHT : row.kind === 'card-row' ? cardRowHeight : rowHeight
    },
    overscan: 12
  })

  // Item size/layout/column switches change row sizes; re-measure.
  useEffect(() => {
    virtualizer.measure()
  }, [rowHeight, cardRowHeight, layout, columns, virtualizer])

  const items = virtualizer.getVirtualItems()

  // Continuous scroll (D-027): approaching the end of loaded rows pages the
  // local archive. The backend decides whether more exists.
  const lastIndex = items.at(-1)?.index ?? -1
  useEffect(() => {
    if (lastIndex >= 0 && lastIndex >= displayRows.length - Math.max(2, Math.ceil(10 / columns)))
      onNearEnd()
  }, [lastIndex, displayRows.length, columns, onNearEnd])

  // The check above only ever fires from a scroll position — a narrow
  // channel filter, a large item size, or a wide/short window can all
  // produce a page of results short enough that the container never
  // actually overflows, silently stranding pagination (B-107). If there's
  // no scrollable overflow after the current results render, trigger it
  // directly; `onNearEnd` (`loadMore`) already no-ops when there's nothing
  // more to fetch, so this can't loop.
  useEffect(() => {
    const el = scrollRef.current
    if (el && el.clientHeight > 0 && el.scrollHeight <= el.clientHeight) onNearEnd()
  }, [displayRows.length, columns, rowHeight, cardRowHeight, onNearEnd])

  // Keep the keyboard cursor visible.
  const cursorRowIndex = displayRows.findIndex(
    (row) =>
      (row.kind === 'video' && row.videoIndex === cursorVideoIndex) ||
      (row.kind === 'card-row' && row.items.some((item) => item.videoIndex === cursorVideoIndex))
  )
  useEffect(() => {
    if (cursorRowIndex >= 0) virtualizer.scrollToIndex(cursorRowIndex, { align: 'auto' })
  }, [cursorRowIndex, virtualizer])

  // Only the first video needs its own "before" zone (see the dropTarget
  // comment above) — every other video only ever means "after".
  const firstVideoIndex = useMemo(() => {
    let min = -1
    for (const row of rows) if (row.kind === 'video' && (min === -1 || row.videoIndex < min)) min = row.videoIndex
    return min
  }, [rows])

  const commitReorder = (videoIndex: number, edge: 'before' | 'after') => {
    if (dragIndex !== null) onReorder?.(dragIndex, edge === 'before' ? videoIndex : videoIndex + 1)
    setDragIndex(null)
    setDropTarget(null)
  }

  // Gap props for the video at `videoIndex` — shared by both the list row
  // and grid card branches below. VideoRow/VideoCard always report the raw
  // edge the pointer is over (top/bottom or left/right half); every video
  // except the first one collapses that down to always 'after', since it
  // has no "before" zone of its own.
  const dragProps = (videoIndex: number) => {
    if (!reorderable) return {}
    const acceptsBefore = videoIndex === firstVideoIndex
    return {
      reorderable: true,
      dragging: videoIndex === dragIndex,
      dropEdge: dropTarget?.videoIndex === videoIndex ? dropTarget.edge : null,
      onDragStart: () => setDragIndex(videoIndex),
      onDragOverItem: (edge: 'before' | 'after') => {
        const resolved = acceptsBefore ? edge : 'after'
        if (dropTarget?.videoIndex !== videoIndex || dropTarget.edge !== resolved)
          setDropTarget({ videoIndex, edge: resolved })
      },
      onDropItem: (edge: 'before' | 'after') => commitReorder(videoIndex, acceptsBefore ? edge : 'after'),
      onDragEndItem: () => {
        setDragIndex(null)
        setDropTarget(null)
      }
    }
  }

  return (
    <div
      className={`feed-scroll size-${itemSize}`}
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
                      onOpenChannel={onOpenChannel}
                      showViewCounts={showViewCounts}
                      {...dragProps(videoIndex)}
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
                  onOpenChannel={onOpenChannel}
                  showViewCounts={showViewCounts}
                  {...dragProps(row.videoIndex)}
                />
              )}
            </div>
          )
        })}
      </div>
      {loadingMore && <div className="feed-loading-more">{t('feed.loadingMore')}</div>}
    </div>
  )
}

interface VideoRowProps {
  video: FeedVideoDto
  selected: boolean
  undoable: boolean
  actions: VideoActions
  onOpen: () => void
  onOpenChannel: (channelId: string) => void
  showViewCounts: boolean
  // The main virtualized FeedList has its own keyboard path (global
  // j/k/Enter cursor navigation) — making every row individually
  // Tab-focusable there would make Tab cycle through hundreds of rows, so
  // it stays off by default. Callers that render VideoRow outside that
  // cursor-navigated list — the priority section, search results — have no
  // other keyboard path to it, so they opt in.
  focusable?: boolean
  // D-057: this row/card is both the native HTML5 drag source and its own
  // drop target — dragover/drop directly on it, not on a separate child
  // element (the arrangement confirmed working live; see FeedListProps).
  // dropEdge is which half of *this* item is currently hovered, purely for
  // the visual indicator — the hit-testing itself is the whole element.
  reorderable?: boolean
  dragging?: boolean
  dropEdge?: 'before' | 'after' | null
  onDragStart?: () => void
  onDragOverItem?: (edge: 'before' | 'after') => void
  onDropItem?: (edge: 'before' | 'after') => void
  onDragEndItem?: () => void
}

// Thumbnails go through the backend cache (thumb:// protocol) — the
// renderer never talks to Google hosts directly (architecture.md).
function thumbSrc(url: string): string {
  return `thumb://img/${encodeURIComponent(url)}`
}

// D-057: which half of the hovered element the pointer is over — top/bottom
// for a stacked list row, left/right for a side-by-side grid card.
function verticalEdge(event: DragEvent<HTMLDivElement>): 'before' | 'after' {
  const rect = event.currentTarget.getBoundingClientRect()
  return event.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
}

function horizontalEdge(event: DragEvent<HTMLDivElement>): 'before' | 'after' {
  const rect = event.currentTarget.getBoundingClientRect()
  return event.clientX < rect.left + rect.width / 2 ? 'before' : 'after'
}

export function VideoRow({
  video,
  selected,
  undoable,
  actions,
  onOpen,
  onOpenChannel,
  showViewCounts,
  focusable = false,
  reorderable = false,
  dragging = false,
  dropEdge = null,
  onDragStart,
  onDragOverItem,
  onDropItem,
  onDragEndItem
}: VideoRowProps) {
  if (undoable) {
    return (
      <div className={`row undo-strip${selected ? ' selected' : ''}`}>
        <span>{t('feed.card.undoLabel')}</span>
        <button onClick={() => actions.undo(video)}>{t('feed.card.undoButton')}</button>
      </div>
    )
  }

  const { state } = video
  const dimmed = state.readStatus !== 'unread'
  const liveBadge = liveBadgeState(video)
  return (
    <div
      className={`row${selected ? ' selected' : ''}${dimmed ? ' dimmed' : ''}${
        reorderable ? ' reorderable' : ''
      }${dragging ? ' dragging' : ''}`}
      onClick={onOpen}
      draggable={reorderable}
      onDragStart={reorderable ? onDragStart : undefined}
      onDragEnd={reorderable ? onDragEndItem : undefined}
      onDragOver={
        reorderable
          ? (event) => {
              event.preventDefault()
              onDragOverItem?.(verticalEdge(event))
            }
          : undefined
      }
      onDrop={
        reorderable
          ? (event) => {
              event.preventDefault()
              onDropItem?.(verticalEdge(event))
            }
          : undefined
      }
      {...(focusable
        ? {
            role: 'button',
            tabIndex: 0,
            onKeyDown: (event: KeyboardEvent) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onOpen()
              }
            }
          }
        : {})}
    >
      {dropEdge !== null && <div className={`drop-indicator horizontal ${dropEdge}`} />}
      <span className={`unread-dot${state.readStatus === 'unread' ? ' on' : ''}`} />
      {video.thumbnailUrl !== null ? (
        <img className="thumb" loading="lazy" alt="" draggable={false} src={thumbSrc(video.thumbnailUrl)} />
      ) : (
        <div className="thumb" />
      )}
      <div className="row-text">
        <span className="title">{video.title}</span>
        <span className="meta">
          <span
            className="channel-link"
            onClick={(e) => stop(e, () => onOpenChannel(video.channelId))}
          >
            {video.channelTitle}
          </span>{' '}
          · {feedItemLabel(video)}
          {showViewCounts && video.viewCount !== null && <> · {formatViews(video.viewCount)}</>}
          {state.favorite && <span className="glyph" title={t('feed.card.favoriteTitle')}> ★</span>}
          {state.watchLater && (
            <span className="glyph" title={t('feed.card.watchLaterTitle')}> ▶︎⁺</span>
          )}
        </span>
      </div>
      <div className="row-actions">
        <button
          title={t('feed.card.toggleReadTitle')}
          onClick={(e) => stop(e, () => actions.toggleRead(video))}
        >
          ✓
        </button>
        <button title={t('feed.card.ignoreTitle')} onClick={(e) => stop(e, () => actions.ignore(video))}>
          ⊘
        </button>
        <button
          title={t('feed.card.toggleFavoriteTitle')}
          onClick={(e) => stop(e, () => actions.toggleFavorite(video))}
        >
          ★
        </button>
        <button
          title={t('feed.card.toggleWatchLaterTitle')}
          onClick={(e) => stop(e, () => actions.toggleWatchLater(video))}
        >
          ▶︎⁺
        </button>
        <button
          title={t('feed.card.openInBrowserTitle')}
          onClick={(e) => stop(e, () => actions.openInBrowser(video))}
        >
          ↗
        </button>
      </div>
      {video.isShort && <span className="short-badge">{t('feed.card.shortBadge')}</span>}
      {liveBadge !== null && (
        <span className={`live-badge live-badge-${liveBadge}`}>
          {liveBadgeLabel(liveBadge)}
        </span>
      )}
      {video.durationSeconds !== null && video.liveContent !== 'live' && (
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
export function VideoCard({
  video,
  selected,
  undoable,
  actions,
  onOpen,
  onOpenChannel,
  showViewCounts,
  focusable = false,
  reorderable = false,
  dragging = false,
  dropEdge = null,
  onDragStart,
  onDragOverItem,
  onDropItem,
  onDragEndItem
}: VideoCardProps) {
  if (undoable) {
    return (
      <div className={`card undo-strip${selected ? ' selected' : ''}`}>
        <span>{t('feed.card.undoLabel')}</span>
        <button onClick={() => actions.undo(video)}>{t('feed.card.undoButton')}</button>
      </div>
    )
  }

  const { state } = video
  const dimmed = state.readStatus !== 'unread'
  const liveBadge = liveBadgeState(video)
  return (
    <div
      className={`card${selected ? ' selected' : ''}${dimmed ? ' dimmed' : ''}${
        reorderable ? ' reorderable' : ''
      }${dragging ? ' dragging' : ''}`}
      onClick={onOpen}
      draggable={reorderable}
      onDragStart={reorderable ? onDragStart : undefined}
      onDragEnd={reorderable ? onDragEndItem : undefined}
      onDragOver={
        reorderable
          ? (event) => {
              event.preventDefault()
              onDragOverItem?.(horizontalEdge(event))
            }
          : undefined
      }
      onDrop={
        reorderable
          ? (event) => {
              event.preventDefault()
              onDropItem?.(horizontalEdge(event))
            }
          : undefined
      }
      {...(focusable
        ? {
            role: 'button',
            tabIndex: 0,
            onKeyDown: (event: KeyboardEvent) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onOpen()
              }
            }
          }
        : {})}
    >
      {dropEdge !== null && <div className={`drop-indicator vertical ${dropEdge}`} />}
      <div className="card-thumb-wrap">
        {video.thumbnailUrl !== null ? (
          <img className="thumb" loading="lazy" alt="" draggable={false} src={thumbSrc(video.thumbnailUrl)} />
        ) : (
          <div className="thumb" />
        )}
        <span className={`unread-dot${state.readStatus === 'unread' ? ' on' : ''}`} />
        {video.isShort && <span className="short-badge card-short-badge">{t('feed.card.shortBadge')}</span>}
        {liveBadge !== null && (
          <span className={`live-badge card-live-badge live-badge-${liveBadge}`}>
            {liveBadgeLabel(liveBadge)}
          </span>
        )}
        {video.durationSeconds !== null && video.liveContent !== 'live' && (
          <span className="duration card-duration">{formatDuration(video.durationSeconds)}</span>
        )}
        <div className="row-actions card-actions">
          <button
            title={t('feed.card.toggleReadTitle')}
            onClick={(e) => stop(e, () => actions.toggleRead(video))}
          >
            ✓
          </button>
          <button title={t('feed.card.ignoreTitle')} onClick={(e) => stop(e, () => actions.ignore(video))}>
            ⊘
          </button>
          <button
            title={t('feed.card.toggleFavoriteTitle')}
            onClick={(e) => stop(e, () => actions.toggleFavorite(video))}
          >
            ★
          </button>
          <button
            title={t('feed.card.toggleWatchLaterTitle')}
            onClick={(e) => stop(e, () => actions.toggleWatchLater(video))}
          >
            ▶︎⁺
          </button>
          <button
            title={t('feed.card.openInBrowserTitle')}
            onClick={(e) => stop(e, () => actions.openInBrowser(video))}
          >
            ↗
          </button>
        </div>
      </div>
      <div className="row-text">
        <span className="title">{video.title}</span>
        <span className="meta">
          <span
            className="channel-link"
            onClick={(e) => stop(e, () => onOpenChannel(video.channelId))}
          >
            {video.channelTitle}
          </span>{' '}
          · {feedItemLabel(video)}
          {showViewCounts && video.viewCount !== null && <> · {formatViews(video.viewCount)}</>}
          {state.favorite && <span className="glyph" title={t('feed.card.favoriteTitle')}> ★</span>}
          {state.watchLater && (
            <span className="glyph" title={t('feed.card.watchLaterTitle')}> ▶︎⁺</span>
          )}
        </span>
      </div>
    </div>
  )
}
