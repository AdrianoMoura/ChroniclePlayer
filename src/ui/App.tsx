import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  AuthStatusDto,
  ChannelDto,
  ChronicleEventDto,
  FeedBucketDto,
  FeedCursorDto,
  FeedMetaDto,
  FeedVideoDto,
  FeedViewDto,
  ReadStatusDto,
  VideoStateDto
} from '../ipc/contract'
import { ConnectPanel } from './ConnectPanel'
import { FeedList, type FeedRow, type VideoActions } from './FeedList'
import { formatClockTime, quotaResetLocalTime } from './format'
import { HelpOverlay } from './HelpOverlay'
import { Sidebar, VIEW_LABELS, VIEW_ORDER } from './Sidebar'

const BUCKET_LABELS: Record<FeedBucketDto, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  'this-week': 'This Week',
  earlier: 'Earlier'
}

const UNDO_WINDOW_MS = 5000

interface Banner {
  text: string
  action?: { label: string; run: () => void }
}

export function App() {
  const [view, setView] = useState<FeedViewDto>('all')
  const [channelFilter, setChannelFilter] = useState<string | null>(null)
  const [videos, setVideos] = useState<FeedVideoDto[]>([])
  const [nextCursor, setNextCursor] = useState<FeedCursorDto | null>(null)
  const [meta, setMeta] = useState<FeedMetaDto>({ unreadCount: 0, caughtUp: false, lastRefreshAt: null })
  const [cursorIdx, setCursorIdx] = useState(0)
  const [filter, setFilter] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)
  const [undoable, setUndoable] = useState<ReadonlySet<string>>(new Set())
  const [auth, setAuth] = useState<AuthStatusDto | null>(null)
  const [banner, setBanner] = useState<Banner | null>(null)
  const [channels, setChannels] = useState<ChannelDto[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [progress, setProgress] = useState<{
    phase: 'channels' | 'shorts'
    checked: number
    total: number
  } | null>(null)
  const [connecting, setConnecting] = useState(false)

  const viewRef = useRef<FeedViewDto>('all')
  const channelRef = useRef<string | null>(null)
  const loadingRef = useRef(false)
  const undoInfo = useRef(new Map<string, { previous: ReadStatusDto; timer: number }>())
  const lastG = useRef(0)
  const filterInputRef = useRef<HTMLInputElement>(null)

  const loadView = useCallback((target?: FeedViewDto, channel?: string | null) => {
    const nextView = target ?? viewRef.current
    const nextChannel = channel === undefined ? channelRef.current : channel
    viewRef.current = nextView
    channelRef.current = nextChannel
    loadingRef.current = true
    void window.chronicle.getFeed(nextView, null, nextChannel).then((slice) => {
      if (viewRef.current !== nextView || channelRef.current !== nextChannel) return
      loadingRef.current = false
      setVideos(slice.videos)
      setNextCursor(slice.nextCursor)
      setCursorIdx(0)
    })
    void window.chronicle.getFeedMeta().then(setMeta)
  }, [])

  const loadChannels = useCallback(() => {
    void window.chronicle.getChannels().then(setChannels)
  }, [])

  useEffect(() => {
    loadView(view, channelFilter)
  }, [view, channelFilter, loadView])

  useEffect(() => {
    void window.chronicle.getAuthStatus().then(setAuth)
    loadChannels()
  }, [loadChannels])

  const connect = useCallback(() => {
    setBanner(null)
    setConnecting(true)
    void window.chronicle.connectGoogle().then((result) => {
      setConnecting(false)
      if (result.ok) {
        setAuth(result.value)
      } else {
        setBanner({ text: `Connection failed: ${result.message}` })
      }
    })
  }, [])

  const doRefresh = useCallback(() => {
    void window.chronicle.refreshFeed().then((result) => {
      if (result.ok || result.errorKind === 'busy') return
      if (result.errorKind === 'auth-expired') {
        setBanner({
          text: 'Reconnect to Google — your authorization expired. (Testing-mode projects expire weekly; publishing the app fixes this permanently.)',
          action: { label: 'Reconnect', run: connect }
        })
      } else if (result.errorKind === 'network-unavailable') {
        setBanner({ text: 'You appear to be offline — showing local data. Refresh will retry.' })
      } else {
        setBanner({ text: `Refresh failed: ${result.message}` })
      }
    })
  }, [connect])

  // Backend → UI events (the UI never polls).
  useEffect(() => {
    return window.chronicle.onEvent((event: ChronicleEventDto) => {
      switch (event.type) {
        case 'refresh:started':
          setRefreshing(true)
          setProgress(null)
          break
        case 'refresh:progress':
          setProgress({ phase: event.phase, checked: event.checked, total: event.total })
          break
        case 'refresh:done':
          setRefreshing(false)
          setProgress(null)
          loadView()
          loadChannels()
          if (event.report.outcome === 'partial') {
            setBanner({
              text: `Refresh finished, but ${event.report.channelsFailed} channel(s) failed — they will be retried next cycle.`
            })
          }
          break
        case 'auth:required':
          setRefreshing(false)
          setBanner({
            text: 'Reconnect to Google — your authorization expired. (Testing-mode projects expire weekly; publishing the app fixes this permanently.)',
            action: { label: 'Reconnect', run: connect }
          })
          break
        case 'quota:exceeded':
          setBanner({
            text: `Daily API limit reached — it resets at ${quotaResetLocalTime()} your time. Chronicle keeps working from local data; discovery via RSS continues free.`
          })
          break
      }
    })
  }, [loadView, loadChannels, connect])

  const loadMore = useCallback(() => {
    if (loadingRef.current || !nextCursor) return
    loadingRef.current = true
    const targetView = viewRef.current
    const targetChannel = channelRef.current
    void window.chronicle.getFeed(targetView, nextCursor, targetChannel).then((slice) => {
      loadingRef.current = false
      if (viewRef.current !== targetView || channelRef.current !== targetChannel) return
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
          doRefresh()
          break
        case '/':
          filterInputRef.current?.focus()
          break
        case '?':
          setHelpOpen(true)
          break
        case 'Escape':
          if (filter !== '') setFilter('')
          else setChannelFilter(null)
          break
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
          setChannelFilter(null)
          setView(VIEW_ORDER[Number(event.key) - 1])
          break
        default:
          handled = false
      }
      if (handled) event.preventDefault()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [filtered, effectiveCursor, helpOpen, actions, undoLast, doRefresh, filter])

  const showConnectPanel = auth !== null && auth.state !== 'connected' && videos.length === 0

  const statusText = refreshing
    ? progress !== null
      ? progress.phase === 'shorts'
        ? `filtering Shorts — ${progress.checked} of ${progress.total} checked…`
        : `checking ${progress.checked} of ${progress.total} channels…`
      : 'refreshing…'
    : meta.caughtUp
      ? `All caught up${meta.lastRefreshAt ? ` · last refresh ${formatClockTime(meta.lastRefreshAt)}` : ''}`
      : `${meta.unreadCount} unread`

  return (
    <div className="app">
      <Sidebar
        view={view}
        unreadCount={meta.unreadCount}
        channels={channels}
        channelFilter={channelFilter}
        onSelectView={(next) => {
          setChannelFilter(null)
          setView(next)
        }}
        onSelectChannel={setChannelFilter}
      />
      <main className="feed">
        <header className="topbar">
          <button
            className={`refresh${refreshing ? ' spinning' : ''}`}
            title="Refresh (r)"
            onClick={doRefresh}
          >
            ⟳
          </button>
          <span className="topbar-view">
            {channelFilter !== null
              ? (channels.find((c) => c.channelId === channelFilter)?.title ?? 'Channel')
              : VIEW_LABELS[view]}
          </span>
          <span className="status">{statusText}</span>
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

        {banner !== null && (
          <div className="banner">
            <span>{banner.text}</span>
            <span className="banner-actions">
              {banner.action && (
                <button className="banner-action" onClick={banner.action.run}>
                  {banner.action.label}
                </button>
              )}
              <button className="banner-dismiss" title="Dismiss" onClick={() => setBanner(null)}>
                ✕
              </button>
            </span>
          </div>
        )}

        {showConnectPanel ? (
          <ConnectPanel
            auth={auth}
            connecting={connecting}
            onImportSecret={(json) => {
              void window.chronicle.importClientSecret(json).then((result) => {
                if (result.ok) setAuth(result.value)
                else setBanner({ text: result.message })
              })
            }}
            onConnect={connect}
          />
        ) : (
          <>
            {meta.caughtUp && (view === 'all' || view === 'unread') && channelFilter === null && (
              <div className="caught-up">{statusText.startsWith('All caught up') ? statusText : 'You’re all caught up.'}</div>
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
          </>
        )}
      </main>
      {helpOpen && <HelpOverlay onClose={() => setHelpOpen(false)} />}
    </div>
  )
}
