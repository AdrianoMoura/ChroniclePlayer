import {
  useEffect,
  useLayoutEffect,
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
  // Optional because a playlist's own video list omits it — a video was
  // deliberately added there, the opposite intent from "hide this."
  ignore?: (video: FeedVideoDto) => void
  undo: (video: FeedVideoDto) => void
  toggleFavorite: (video: FeedVideoDto) => void
  toggleWatchLater: (video: FeedVideoDto) => void
  openInBrowser: (video: FeedVideoDto) => void
  // Opens the Add to Playlist dialog for this video — shown on every video
  // card/row everywhere (feed, channel, watch-later, search, player), so
  // it's effectively always provided rather than truly optional; kept
  // optional only so call sites outside App.tsx's own `actions` object
  // (none currently exist) aren't forced to stub it.
  addToPlaylist?: (video: FeedVideoDto) => void
  // Only provided inside a specific playlist's own detail screen — removes
  // just this membership, never the video itself (distinct from `ignore`,
  // which is a global read-status change).
  removeFromPlaylist?: (video: FeedVideoDto) => void
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
  // Watch Later's own drag-and-drop reorder, list and grid alike. Native
  // HTML5 DnD, no new dependency. insertAt is the position in the
  // (bucket-less, so index-is-position) video list to drop the dragged
  // video at.
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
  // dragIndex is the video being dragged. dropTarget is whichever
  // video is currently hovered, plus which side of it — only one row/card
  // is ever hovered at a time in native DnD, so this alone is enough to
  // drive a single, unambiguous indicator. Every video's own drop zone means
  // "insert after this video"; only the very first video also accepts
  // "insert before" (nothing else can become the new first item).
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

  // Item size/layout/column switches change row sizes; re-measure. Also
  // re-measure whenever the row content itself changes identity (switching
  // feed view/channel/playlist): tanstack-virtual memoizes its measurements
  // on `count` plus a few other primitives, not on `estimateSize`'s
  // closure — if two different datasets happen to produce the same row
  // count, it silently reuses the previous dataset's cached sizes/offsets
  // (header vs. video vs. card-row heights), which shows up as bucket
  // headers rendered at stale positions, overlapping the new content. Must
  // be a layout effect, not a plain effect: a plain effect fires after the
  // browser has already painted the stale sizes/offsets computed during
  // this render, so the correction would show up one visible frame late
  // (exactly the reported flash of overlapping headers) instead of never
  // painting at all.
  useLayoutEffect(() => {
    virtualizer.measure()
  }, [displayRows, rowHeight, cardRowHeight, layout, columns, virtualizer])

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

  // Fallback for empty space below all items (e.g. a list/grid shorter than
  // the scrollable area) — resolves any drag reaching the container itself
  // to "insert after the last video". Wrapper-level handlers below call
  // stopPropagation so this only fires when the pointer isn't over any
  // specific item.
  const lastVideoIndex = useMemo(() => {
    let max = -1
    for (const row of rows) if (row.kind === 'video' && row.videoIndex > max) max = row.videoIndex
    return max
  }, [rows])

  const commitReorder = (videoIndex: number, edge: 'before' | 'after') => {
    if (dragIndex !== null) onReorder?.(dragIndex, edge === 'before' ? videoIndex : videoIndex + 1)
    setDragIndex(null)
    setDropTarget(null)
  }

  // Presentational + drag-source props for the video at `videoIndex` —
  // shared by both the list row and grid card branches below. Drop-target
  // hit-testing itself lives on the wrapper in the render loop below, not
  // on the row/card's own element: a list row has its own margin, a grid
  // card its own gap/padding, so the row/card alone doesn't cover its whole
  // virtualized slot.
  const resolveEdge = (videoIndex: number, rawEdge: 'before' | 'after'): 'before' | 'after' =>
    videoIndex === firstVideoIndex ? rawEdge : 'after'

  const dragProps = (videoIndex: number) =>
    reorderable
      ? {
          reorderable: true,
          dragging: videoIndex === dragIndex,
          dropEdge: dropTarget?.videoIndex === videoIndex ? dropTarget.edge : null,
          onDragStart: () => setDragIndex(videoIndex),
          onDragEndItem: () => {
            setDragIndex(null)
            setDropTarget(null)
          }
        }
      : {}

  return (
    <div
      className={`feed-scroll size-${itemSize}`}
      ref={scrollRef}
      onScroll={(event) => onAtTopChange(event.currentTarget.scrollTop < 40)}
      {...(reorderable && lastVideoIndex >= 0
        ? {
            onDragOver: (event: DragEvent<HTMLDivElement>) => {
              event.preventDefault()
              if (dropTarget?.videoIndex !== lastVideoIndex || dropTarget.edge !== 'after')
                setDropTarget({ videoIndex: lastVideoIndex, edge: 'after' })
            },
            onDrop: (event: DragEvent<HTMLDivElement>) => {
              event.preventDefault()
              commitReorder(lastVideoIndex, 'after')
            }
          }
        : {})}
    >
      <div className="feed-inner" style={{ height: virtualizer.getTotalSize() }}>
        {items.map((item) => {
          const row = displayRows[item.index]
          // Drop-target hit-testing lives on this wrapper — the exact
          // virtualized slot, no dead zones — rather than on the row/card
          // rendered inside it (see the dragProps comment above).
          const wrapperDropProps =
            reorderable && row.kind === 'video'
              ? {
                  onDragOver: (event: DragEvent<HTMLDivElement>) => {
                    event.preventDefault()
                    event.stopPropagation()
                    const videoIndex = row.videoIndex
                    const edge = resolveEdge(videoIndex, verticalEdge(event))
                    if (dropTarget?.videoIndex !== videoIndex || dropTarget.edge !== edge)
                      setDropTarget({ videoIndex, edge })
                  },
                  onDrop: (event: DragEvent<HTMLDivElement>) => {
                    event.preventDefault()
                    event.stopPropagation()
                    const videoIndex = row.videoIndex
                    commitReorder(videoIndex, resolveEdge(videoIndex, verticalEdge(event)))
                  }
                }
              : reorderable && row.kind === 'card-row'
                ? {
                    onDragOver: (event: DragEvent<HTMLDivElement>) => {
                      event.preventDefault()
                      event.stopPropagation()
                      const { videoIndex, rawEdge } = resolveGridColumn(event, row, columns)
                      const edge = resolveEdge(videoIndex, rawEdge)
                      if (dropTarget?.videoIndex !== videoIndex || dropTarget.edge !== edge)
                        setDropTarget({ videoIndex, edge })
                    },
                    onDrop: (event: DragEvent<HTMLDivElement>) => {
                      event.preventDefault()
                      event.stopPropagation()
                      const { videoIndex, rawEdge } = resolveGridColumn(event, row, columns)
                      commitReorder(videoIndex, resolveEdge(videoIndex, rawEdge))
                    }
                  }
                : {}
          return (
            <div
              key={row.key}
              className={`feed-item${row.kind === 'card-row' ? ' card-row' : ''}`}
              style={{ height: item.size, transform: `translateY(${item.start}px)` }}
              {...wrapperDropProps}
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
  // This row/card is the native HTML5 drag source (draggable, click-and-hold
  // anywhere on it). The drop *target* lives one level up,
  // on FeedList's own virtualized wrapper — that wrapper is the exact
  // slot with no dead zone, whereas this element has its own margin/gap
  // around it that isn't covered by any drag handler. dropEdge is which
  // side of *this* item is currently hovered, purely for the visual
  // indicator (computed and owned by FeedList).
  reorderable?: boolean
  dragging?: boolean
  dropEdge?: 'before' | 'after' | null
  onDragStart?: () => void
  onDragEndItem?: () => void
}

// Thumbnails go through the backend cache (thumb:// protocol) — the
// renderer never talks to Google hosts directly (architecture.md).
function thumbSrc(url: string): string {
  return `thumb://img/${encodeURIComponent(url)}`
}

// Which half of the hovered *wrapper* (the exact virtualized slot, not the
// row itself — see the dragProps comment in FeedList) the pointer is over —
// top/bottom for a stacked list row.
function verticalEdge(event: DragEvent<HTMLDivElement>): 'before' | 'after' {
  const rect = event.currentTarget.getBoundingClientRect()
  return event.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
}

// Grid equivalent: a card-row's wrapper holds several cards side by side,
// so this also has to figure out *which* card the pointer's x falls
// nearest to (there's no per-card element to ask, by design — the wrapper
// is the only thing with no dead zone around/between cards).
function resolveGridColumn(
  event: DragEvent<HTMLDivElement>,
  row: { items: { videoIndex: number }[] },
  columns: number
): { videoIndex: number; rawEdge: 'before' | 'after' } {
  const rect = event.currentTarget.getBoundingClientRect()
  const relativeX = event.clientX - rect.left
  const colWidth = rect.width / columns
  const col = Math.min(row.items.length - 1, Math.max(0, Math.floor(relativeX / colWidth)))
  const rawEdge = relativeX - col * colWidth < colWidth / 2 ? 'before' : 'after'
  return { videoIndex: row.items[col].videoIndex, rawEdge }
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
  onDragEndItem
}: VideoRowProps) {
  if (undoable) {
    // A playlist's own video list has no `ignore` action, so its rows are
    // only ever undoable via removeFromPlaylist — reuse that same signal to
    // pick the right copy (no "(u)" hint there; that shortcut only ever
    // targets the ignore-undo above).
    const isPlaylistRemoval = actions.ignore === undefined && actions.removeFromPlaylist !== undefined
    return (
      <div className={`row undo-strip${selected ? ' selected' : ''}`}>
        <span>{t(isPlaylistRemoval ? 'feed.card.undoLabelPlaylist' : 'feed.card.undoLabel')}</span>
        <button onClick={() => actions.undo(video)}>
          {t(isPlaylistRemoval ? 'feed.card.undoButtonPlaylist' : 'feed.card.undoButton')}
        </button>
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
        {actions.ignore && (
          <button
            title={t('feed.card.ignoreTitle')}
            onClick={(e) => stop(e, () => actions.ignore!(video))}
          >
            ⊘
          </button>
        )}
        <button
          title={t('feed.card.toggleFavoriteTitle')}
          onClick={(e) => stop(e, () => actions.toggleFavorite(video))}
        >
          ★
        </button>
        {actions.addToPlaylist && (
          <button
            title={t('feed.card.addToPlaylistTitle')}
            onClick={(e) => stop(e, () => actions.addToPlaylist!(video))}
          >
            ⊕
          </button>
        )}
        {actions.removeFromPlaylist && (
          <button
            title={t('feed.card.removeFromPlaylistTitle')}
            onClick={(e) => stop(e, () => actions.removeFromPlaylist!(video))}
          >
            ⊖
          </button>
        )}
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
  onDragEndItem
}: VideoCardProps) {
  if (undoable) {
    const isPlaylistRemoval = actions.ignore === undefined && actions.removeFromPlaylist !== undefined
    return (
      <div className={`card undo-strip${selected ? ' selected' : ''}`}>
        <span>{t(isPlaylistRemoval ? 'feed.card.undoLabelPlaylist' : 'feed.card.undoLabel')}</span>
        <button onClick={() => actions.undo(video)}>
          {t(isPlaylistRemoval ? 'feed.card.undoButtonPlaylist' : 'feed.card.undoButton')}
        </button>
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
          {actions.ignore && (
            <button
              title={t('feed.card.ignoreTitle')}
              onClick={(e) => stop(e, () => actions.ignore!(video))}
            >
              ⊘
            </button>
          )}
          <button
            title={t('feed.card.toggleFavoriteTitle')}
            onClick={(e) => stop(e, () => actions.toggleFavorite(video))}
          >
            ★
          </button>
          {actions.addToPlaylist && (
            <button
              title={t('feed.card.addToPlaylistTitle')}
              onClick={(e) => stop(e, () => actions.addToPlaylist!(video))}
            >
              ⊕
            </button>
          )}
          {actions.removeFromPlaylist && (
            <button
              title={t('feed.card.removeFromPlaylistTitle')}
              onClick={(e) => stop(e, () => actions.removeFromPlaylist!(video))}
            >
              ⊖
            </button>
          )}
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
