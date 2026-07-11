import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  FeedBucketDto,
  FeedCursorDto,
  FeedMetaDto,
  FeedVideoDto,
  FeedViewDto,
  ReadStatusDto,
  VideoStateDto
} from '../ipc/contract'
import { FeedList, type FeedRow, type VideoActions } from './FeedList'
import { HelpOverlay } from './HelpOverlay'
import { Sidebar, VIEW_LABELS, VIEW_ORDER } from './Sidebar'

const BUCKET_LABELS: Record<FeedBucketDto, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  'this-week': 'This Week',
  earlier: 'Earlier'
}

const UNDO_WINDOW_MS = 5000

export function App() {
  const [view, setView] = useState<FeedViewDto>('all')
  const [videos, setVideos] = useState<FeedVideoDto[]>([])
  const [nextCursor, setNextCursor] = useState<FeedCursorDto | null>(null)
  const [meta, setMeta] = useState<FeedMetaDto>({ unreadCount: 0, caughtUp: false })
  const [cursorIdx, setCursorIdx] = useState(0)
  const [filter, setFilter] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)
  const [undoable, setUndoable] = useState<ReadonlySet<string>>(new Set())

  const viewRef = useRef(view)
  const loadingRef = useRef(false)
  const undoInfo = useRef(new Map<string, { previous: ReadStatusDto; timer: number }>())
  const lastG = useRef(0)
  const filterInputRef = useRef<HTMLInputElement>(null)

  const loadView = useCallback((target: FeedViewDto) => {
    viewRef.current = target
    loadingRef.current = true
    void window.chronicle.getFeed(target, null).then((slice) => {
      if (viewRef.current !== target) return
      loadingRef.current = false
      setVideos(slice.videos)
      setNextCursor(slice.nextCursor)
      setMeta({ unreadCount: slice.unreadCount, caughtUp: slice.caughtUp })
      setCursorIdx(0)
    })
  }, [])

  useEffect(() => {
    loadView(view)
  }, [view, loadView])

  const loadMore = useCallback(() => {
    if (loadingRef.current || !nextCursor) return
    loadingRef.current = true
    const target = viewRef.current
    void window.chronicle.getFeed(target, nextCursor).then((slice) => {
      loadingRef.current = false
      if (viewRef.current !== target) return
      setVideos((current) => [...current, ...slice.videos])
      setNextCursor(slice.nextCursor)
    })
  }, [nextCursor])

  // Local text filter over loaded rows (ui.md `/`) — never YouTube search.
  const filtered = useMemo(() => {
    const query = filter.trim().toLowerCase()
    if (!query) return videos
    return videos.filter(
      (video) =>
        video.title.toLowerCase().includes(query) ||
        video.channelTitle.toLowerCase().includes(query)
    )
  }, [videos, filter])

  const rows = useMemo<FeedRow[]>(() => {
    const out: FeedRow[] = []
    let lastBucket: FeedBucketDto | null = null
    filtered.forEach((video, videoIndex) => {
      if (video.bucket !== null && video.bucket !== lastBucket) {
        out.push({ kind: 'header', key: `h-${video.bucket}`, label: BUCKET_LABELS[video.bucket] })
        lastBucket = video.bucket
      }
      out.push({ kind: 'video', key: video.videoId, video, videoIndex })
    })
    return out
  }, [filtered])

  const patch = useCallback((videoId: string, state: VideoStateDto) => {
    setVideos((current) =>
      current.map((video) => (video.videoId === videoId ? { ...video, state } : video))
    )
    void window.chronicle.getFeedMeta().then(setMeta)
  }, [])

  const setStatus = useCallback(
    (video: FeedVideoDto, status: ReadStatusDto) => {
      void window.chronicle
        .setReadStatus(video.videoId, status)
        .then((state) => patch(video.videoId, state))
    },
    [patch]
  )

  const clearUndo = useCallback((videoId: string) => {
    const info = undoInfo.current.get(videoId)
    if (info) window.clearTimeout(info.timer)
    undoInfo.current.delete(videoId)
    setUndoable((set) => {
      const next = new Set(set)
      next.delete(videoId)
      return next
    })
  }, [])

  // Ignore uses inline undo, not a confirm dialog (ui.md §States & feedback).
  const ignoreVideo = useCallback(
    (video: FeedVideoDto) => {
      if (video.state.readStatus === 'ignored') {
        setStatus(video, 'unread') // in the Ignored view, `i` un-ignores
        return
      }
      const previous = video.state.readStatus
      void window.chronicle.setReadStatus(video.videoId, 'ignored').then((state) => {
        patch(video.videoId, state)
        const timer = window.setTimeout(() => {
          clearUndo(video.videoId)
          // The row leaves feed views once the undo window closes.
          if (viewRef.current === 'all' || viewRef.current === 'unread') {
            setVideos((current) => current.filter((v) => v.videoId !== video.videoId))
          }
        }, UNDO_WINDOW_MS)
        undoInfo.current.set(video.videoId, { previous, timer })
        setUndoable((set) => new Set(set).add(video.videoId))
      })
    },
    [patch, setStatus, clearUndo]
  )

  const undoIgnore = useCallback(
    (video: FeedVideoDto) => {
      const info = undoInfo.current.get(video.videoId)
      if (!info) return
      clearUndo(video.videoId)
      setStatus(video, info.previous)
    },
    [clearUndo, setStatus]
  )

  const undoLast = useCallback(() => {
    const lastId = [...undoInfo.current.keys()].at(-1)
    const video = lastId ? videos.find((v) => v.videoId === lastId) : undefined
    if (video) undoIgnore(video)
  }, [videos, undoIgnore])

  const actions = useMemo<VideoActions>(
    () => ({
      markRead: (video) => setStatus(video, 'read'),
      toggleRead: (video) =>
        setStatus(video, video.state.readStatus === 'read' ? 'unread' : 'read'),
      ignore: ignoreVideo,
      undo: undoIgnore,
      toggleFavorite: (video) =>
        void window.chronicle
          .toggleFavorite(video.videoId)
          .then((state) => patch(video.videoId, state)),
      toggleWatchLater: (video) =>
        void window.chronicle
          .toggleWatchLater(video.videoId)
          .then((state) => patch(video.videoId, state)),
      openInBrowser: (video) => {
        // Opening counts as reading (feed.md §Semantics).
        void window.chronicle.openInBrowser(video.videoId)
        setStatus(video, 'read')
      }
    }),
    [setStatus, ignoreVideo, undoIgnore, patch]
  )

  const effectiveCursor = filtered.length === 0 ? -1 : Math.min(cursorIdx, filtered.length - 1)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      const target = event.target as HTMLElement | null
      if (target instanceof HTMLInputElement) {
        if (event.key === 'Escape') {
          setFilter('')
          target.blur()
        } else if (event.key === 'Enter') {
          target.blur()
        }
        return
      }
      if (helpOpen) {
        if (event.key === 'Escape' || event.key === '?') setHelpOpen(false)
        return
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return

      const current = effectiveCursor >= 0 ? filtered[effectiveCursor] : undefined
      const move = (delta: number) => {
        if (filtered.length === 0) return
        setCursorIdx(Math.max(0, Math.min(filtered.length - 1, effectiveCursor + delta)))
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
          setCursorIdx(Math.max(0, filtered.length - 1))
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
          if (current) actions.markRead(current)
          break
        case 'b':
          if (current) actions.openInBrowser(current)
          break
        case 'm':
          if (current) actions.toggleRead(current)
          break
        case 'i':
          if (current) actions.ignore(current)
          break
        case 'u':
          undoLast()
          break
        case 'f':
          if (current) actions.toggleFavorite(current)
          break
        case 'w':
          if (current) actions.toggleWatchLater(current)
          break
        case 'r':
          loadView(viewRef.current)
          break
        case '/':
          filterInputRef.current?.focus()
          break
        case '?':
          setHelpOpen(true)
          break
        case 'Escape':
          setFilter('')
          break
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
          setView(VIEW_ORDER[Number(event.key) - 1])
          break
        default:
          handled = false
      }
      if (handled) event.preventDefault()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [filtered, effectiveCursor, helpOpen, actions, undoLast, loadView])

  return (
    <div className="app">
      <Sidebar view={view} unreadCount={meta.unreadCount} onSelectView={setView} />
      <main className="feed">
        <header className="topbar">
          <button className="refresh" title="Reload (r) — sync arrives with M2" onClick={() => loadView(viewRef.current)}>
            ⟳
          </button>
          <span className="topbar-view">{VIEW_LABELS[view]}</span>
          <span className="status">
            {meta.caughtUp ? 'All caught up' : `${meta.unreadCount} unread`}
          </span>
          <input
            ref={filterInputRef}
            className="filter"
            placeholder="Filter in view  /"
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value)
              setCursorIdx(0)
            }}
          />
        </header>
        {meta.caughtUp && (view === 'all' || view === 'unread') && (
          <div className="caught-up">You’re all caught up.</div>
        )}
        {filtered.length === 0 ? (
          <div className="empty">
            {filter ? 'Nothing matches the filter.' : 'Nothing here yet.'}
          </div>
        ) : (
          <FeedList
            rows={rows}
            cursorVideoIndex={effectiveCursor}
            undoable={undoable}
            actions={actions}
            onSelect={setCursorIdx}
            onNearEnd={loadMore}
          />
        )}
      </main>
      {helpOpen && <HelpOverlay onClose={() => setHelpOpen(false)} />}
    </div>
  )
}
