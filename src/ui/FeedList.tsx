import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { FeedVideoDto } from '../ipc/contract'
import { formatDuration, formatViews, publishedLabel } from './format'
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

// File-explorer-style item size (B-007, six steps as of the B-095
// follow-up): shared by list rows and grid cards. Medium is the default
// (formerly "comfortable" density). The xl/xxl steps are deliberately bigger
// jumps than the rest — "as big as it gets" territory, not another even
// increment.
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
// Card target width; actual column count is derived from container width so
// the grid reflows instead of overflowing (D-037). Both grow with itemSize.
// `height` must cover the card's actual rendered height (thumb + padding +
// gap + two-line title + meta line at that size's own font-size) — the
// virtualizer never re-measures individual cards (no `measureElement`), so
// an estimate shorter than the real content makes consecutive virtualized
// rows overlap. xs/small were previously under-budgeted (B-095); the
// margin below is generous on purpose rather than pixel-exact.
export const GRID_CARD_SIZES: Record<ItemSize, { minWidth: number; height: number }> = {
  xs: { minWidth: 110, height: 144 },
  small: { minWidth: 160, height: 176 },
  medium: { minWidth: 220, height: 214 },
  large: { minWidth: 300, height: 290 },
  xl: { minWidth: 420, height: 400 },
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
  loadingMore
}: FeedListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const rowHeight = ROW_HEIGHTS[itemSize]
  const gridCardSize = GRID_CARD_SIZES[itemSize]
  const [columns, setColumns] = useState(1)

  // Column count follows the scroll container's width so the grid reflows
  // instead of overflowing or leaving dead space (B-007).
  useEffect(() => {
    if (layout !== 'grid') return
    const el = scrollRef.current
    if (!el) return
    const observe = (width: number) =>
      setColumns(Math.max(1, Math.floor(width / gridCardSize.minWidth)))
    observe(el.clientWidth)
    const observer = new ResizeObserver((entries) => observe(entries[0].contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [layout, gridCardSize.minWidth])

  const displayRows = useMemo<DisplayRow[]>(
    () => (layout === 'grid' ? buildCardRows(rows, columns) : rows),
    [rows, layout, columns]
  )

  const virtualizer = useVirtualizer({
    count: displayRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => {
      const row = displayRows[index]
      return row.kind === 'header' ? HEADER_HEIGHT : row.kind === 'card-row' ? gridCardSize.height : rowHeight
    },
    overscan: 12
  })

  // Item size/layout/column switches change row sizes; re-measure.
  useEffect(() => {
    virtualizer.measure()
  }, [rowHeight, gridCardSize.height, layout, columns, virtualizer])

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
  // B-043: the main virtualized FeedList has its own keyboard path (global
  // j/k/Enter cursor navigation) — making every row individually Tab-
  // focusable there would make Tab cycle through hundreds of rows, so it
  // stays off (the default) for that caller. Callers that render VideoRow
  // *outside* that cursor-navigated list — the priority section (B-042),
  // search results (B-009) — have no other keyboard path to it at all, so
  // they opt in.
  focusable?: boolean
}

// Thumbnails go through the backend cache (thumb:// protocol) — the
// renderer never talks to Google hosts directly (architecture.md).
function thumbSrc(url: string): string {
  return `thumb://img/${encodeURIComponent(url)}`
}

export function VideoRow({
  video,
  selected,
  undoable,
  actions,
  onOpen,
  onOpenChannel,
  showViewCounts,
  focusable = false
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
  return (
    <div
      className={`row${selected ? ' selected' : ''}${dimmed ? ' dimmed' : ''}`}
      onClick={onOpen}
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
      <span className={`unread-dot${state.readStatus === 'unread' ? ' on' : ''}`} />
      {video.thumbnailUrl !== null ? (
        <img className="thumb" loading="lazy" alt="" src={thumbSrc(video.thumbnailUrl)} />
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
          · {publishedLabel(video.publishedAt)}
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
      {video.liveContent !== 'none' && (
        <span className={`live-badge live-badge-${video.liveContent}`}>
          {video.liveContent === 'live' ? t('feed.card.liveBadge') : t('feed.card.upcomingBadge')}
        </span>
      )}
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
export function VideoCard({
  video,
  selected,
  undoable,
  actions,
  onOpen,
  onOpenChannel,
  showViewCounts,
  focusable = false
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
  return (
    <div
      className={`card${selected ? ' selected' : ''}${dimmed ? ' dimmed' : ''}`}
      onClick={onOpen}
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
      <div className="card-thumb-wrap">
        {video.thumbnailUrl !== null ? (
          <img className="thumb" loading="lazy" alt="" src={thumbSrc(video.thumbnailUrl)} />
        ) : (
          <div className="thumb" />
        )}
        <span className={`unread-dot${state.readStatus === 'unread' ? ' on' : ''}`} />
        {video.isShort && <span className="short-badge card-short-badge">{t('feed.card.shortBadge')}</span>}
        {video.liveContent !== 'none' && (
          <span className={`live-badge card-live-badge live-badge-${video.liveContent}`}>
            {video.liveContent === 'live' ? t('feed.card.liveBadge') : t('feed.card.upcomingBadge')}
          </span>
        )}
        {video.durationSeconds !== null && (
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
          · {publishedLabel(video.publishedAt)}
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
