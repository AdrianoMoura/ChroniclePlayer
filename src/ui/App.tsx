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
  PlayerVideoDto,
  ReadStatusDto,
  VideoStateDto,
  WizardStateDto
} from '../ipc/contract'
import { ConnectPanel } from './ConnectPanel'
import { FeedList, type FeedRow, type VideoActions } from './FeedList'
import { formatClockTime, quotaResetLocalTime } from './format'
import { HelpOverlay } from './HelpOverlay'
import { PlayerView } from './PlayerView'
import { Sidebar, VIEW_LABELS, VIEW_ORDER } from './Sidebar'
import { UrlPrompt } from './UrlPrompt'
import { Wizard } from './onboarding/Wizard'

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
  const [urlPromptOpen, setUrlPromptOpen] = useState(false)
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
  const [playerStack, setPlayerStack] = useState<PlayerVideoDto[]>([])
  const [newVideosPill, setNewVideosPill] = useState<number | null>(null)
  const [wizard, setWizard] = useState<WizardStateDto | null>(null)

  const viewRef = useRef<FeedViewDto>('all')
  const channelRef = useRef<string | null>(null)
  const loadingRef = useRef(false)
  const undoInfo = useRef(new Map<string, { previous: ReadStatusDto; timer: number }>())
  const lastG = useRef(0)
  const filterInputRef = useRef<HTMLInputElement>(null)
  const atTopRef = useRef(true)
  const queueRef = useRef<{ ids: string[]; index: number } | null>(null)

  const playerOpen = playerStack.length > 0
  const currentPlayerVideo = playerStack.at(-1)

  const loadView = useCallback((target?: FeedViewDto, channel?: string | null) => {
    const nextView = target ?? viewRef.current
    const nextChannel = channel === undefined ? channelRef.current : channel
    viewRef.current = nextView
    channelRef.current = nextChannel
    loadingRef.current = true
    setNewVideosPill(null)
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
    void window.chronicle.getWizardState().then(setWizard)
    loadChannels()
  }, [loadChannels])

  const changeWizard = useCallback((state: WizardStateDto) => {
    setWizard(state)
    void window.chronicle.setWizardState(state)
  }, [])

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

  const patch = useCallback((videoId: string, state: VideoStateDto) => {
    setVideos((current) =>
      current.map((video) => (video.videoId === videoId ? { ...video, state } : video))
    )
    void window.chronicle.getFeedMeta().then(setMeta)
  }, [])

  // Opening the player marks the video read immediately (playback.md).
  const openVideo = useCallback(
    (videoId: string, mode: 'push' | 'replace' = 'push') => {
      void window.chronicle.getVideo(videoId).then(async (result) => {
        if (!result.ok) {
          setBanner({ text: `Could not open the video: ${result.message}` })
          return
        }
        const state = await window.chronicle.setReadStatus(videoId, 'read')
        patch(videoId, state)
        const entry = { ...result.value, state }
        setPlayerStack((stack) => (mode === 'replace' ? [entry] : [...stack, entry]))
      })
    },
    [patch]
  )

  const openFromFeed = useCallback(
    (videoIndexInFiltered: number, filteredList: FeedVideoDto[]) => {
      const video = filteredList[videoIndexInFiltered]
      if (!video) return
      // Watch Later rows carry queue context for the explicit "Next in
      // queue" button (D-021: no auto-advance).
      queueRef.current =
        viewRef.current === 'watch-later'
          ? { ids: filteredList.map((v) => v.videoId), index: videoIndexInFiltered }
          : null
      openVideo(video.videoId)
    },
    [openVideo]
  )

  const closePlayer = useCallback(() => {
    setPlayerStack((stack) => stack.slice(0, -1))
  }, [])

  const nextInQueue = useCallback(() => {
    const queue = queueRef.current
    if (queue === null || queue.index >= queue.ids.length - 1) return
    queue.index += 1
    openVideo(queue.ids[queue.index], 'replace')
  }, [openVideo])

  const hasQueueNext =
    playerStack.length === 1 &&
    queueRef.current !== null &&
    queueRef.current.index < queueRef.current.ids.length - 1 &&
    queueRef.current.ids[queueRef.current.index] === playerStack[0]?.videoId

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
          loadChannels()
          void window.chronicle.getFeedMeta().then(setMeta)
          // New videos never shift content under the cursor (feed.md): only
          // reload in place when the user is at the top; otherwise, the pill.
          if (event.report.videosNew > 0 && !atTopRef.current) {
            setNewVideosPill(event.report.videosNew)
          } else {
            loadView()
          }
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
      // Ctrl+O works everywhere (D-029 open-by-URL).
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'o') {
        event.preventDefault()
        setUrlPromptOpen(true)
        return
      }
      if (playerOpen || urlPromptOpen) return // PlayerView/UrlPrompt own their keys

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
          if (current) openFromFeed(effectiveCursor, filtered)
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
  }, [
    filtered,
    effectiveCursor,
    helpOpen,
    actions,
    undoLast,
    doRefresh,
    filter,
    playerOpen,
    urlPromptOpen,
    openFromFeed
  ])

  const showConnectPanel = auth !== null && auth.state !== 'connected' && videos.length === 0

  // First-run: the wizard is the MVP's sole entry path (onboarding.md); the
  // quick path marks it completed and falls back to the compact panel.
  if (auth !== null && wizard !== null && !wizard.completed && auth.state !== 'connected') {
    return (
      <Wizard
        state={wizard}
        onStateChange={changeWizard}
        onQuickPath={() => changeWizard({ ...wizard, completed: true })}
        onDone={() => {
          changeWizard({ ...wizard, completed: true })
          void window.chronicle.getAuthStatus().then(setAuth)
          loadView()
          loadChannels()
        }}
      />
    )
  }

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
          setPlayerStack([])
          setChannelFilter(null)
          setView(next)
        }}
        onSelectChannel={(channelId) => {
          setPlayerStack([])
          setChannelFilter(channelId)
        }}
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
          <div className="feed-region">
            {meta.caughtUp && (view === 'all' || view === 'unread') && channelFilter === null && (
              <div className="caught-up">
                {statusText.startsWith('All caught up') ? statusText : 'You’re all caught up.'}
              </div>
            )}
            {newVideosPill !== null && (
              <button className="new-videos-pill" onClick={() => loadView()}>
                {newVideosPill} new video{newVideosPill > 1 ? 's' : ''}
              </button>
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
                onOpen={(videoIndex) => {
                  setCursorIdx(videoIndex)
                  openFromFeed(videoIndex, filtered)
                }}
                onNearEnd={loadMore}
                onAtTopChange={(atTop) => {
                  atTopRef.current = atTop
                }}
              />
            )}
            {playerOpen && currentPlayerVideo && (
              <PlayerView
                video={currentPlayerVideo}
                stackDepth={playerStack.length}
                hasQueueNext={hasQueueNext}
                onNextInQueue={nextInQueue}
                onClose={closePlayer}
                onOpenVideo={(videoId) => openVideo(videoId)}
                onStatePatched={patch}
              />
            )}
          </div>
        )}
      </main>
      {helpOpen && <HelpOverlay onClose={() => setHelpOpen(false)} />}
      {urlPromptOpen && (
        <UrlPrompt
          onOpenVideo={(videoId) => {
            queueRef.current = null
            openVideo(videoId)
          }}
          onClose={() => setUrlPromptOpen(false)}
        />
      )}
    </div>
  )
}
