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
  SettingsDto,
  VideoStateDto,
  WizardStateDto
} from '../ipc/contract'
import { ConnectPanel } from './ConnectPanel'
import { FeedList, ITEM_SIZES, type FeedRow, type VideoActions } from './FeedList'
import { formatClockTime, quotaResetLocalTime } from './format'
import { HelpOverlay } from './HelpOverlay'
import { PlayerView } from './PlayerView'
import { SettingsView } from './SettingsView'
import { Sidebar, VIEW_LABELS, VIEW_ORDER } from './Sidebar'
import { UrlPrompt } from './UrlPrompt'
import { STEP_SEQUENCE, Wizard } from './onboarding/Wizard'
import type { WizardStepId } from './onboarding/assets'

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
  const [meta, setMeta] = useState<FeedMetaDto>({
    unreadCount: 0,
    caughtUp: false,
    lastRefreshAt: null,
    watchLaterCount: 0,
    refreshing: false
  })
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
  const [wizardEntry, setWizardEntry] = useState<WizardStateDto | null>(null)
  const [screen, setScreen] = useState<'feed' | 'settings'>('feed')
  // B-037: default expanded; entering the player auto-collapses it (more
  // room for the video) and leaving restores whatever the user had before.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [settings, setSettings] = useState<SettingsDto>({
    theme: 'system',
    itemSize: 'medium',
    layout: 'list',
    refreshMinutes: 30,
    showViewCounts: true,
    showShorts: true,
    defaultPlaybackRate: 1
  })

  const viewRef = useRef<FeedViewDto>('all')
  const channelRef = useRef<string | null>(null)
  const loadingRef = useRef(false)
  const undoInfo = useRef(new Map<string, { previous: ReadStatusDto; timer: number }>())
  const lastG = useRef(0)
  const filterInputRef = useRef<HTMLInputElement>(null)
  const channelQueryRef = useRef<HTMLInputElement>(null)
  const atTopRef = useRef(true)
  const queueRef = useRef<{ ids: string[]; index: number } | null>(null)
  const sidebarBeforePlayerRef = useRef<boolean | null>(null)

  const playerOpen = playerStack.length > 0
  const currentPlayerVideo = playerStack.at(-1)

  const toggleSidebar = useCallback(() => setSidebarCollapsed((collapsed) => !collapsed), [])

  useEffect(() => {
    if (playerOpen) {
      setSidebarCollapsed((current) => {
        sidebarBeforePlayerRef.current = current
        return true
      })
    } else if (sidebarBeforePlayerRef.current !== null) {
      setSidebarCollapsed(sidebarBeforePlayerRef.current)
      sidebarBeforePlayerRef.current = null
    }
  }, [playerOpen])

  // Fetches feed meta and reconciles `refreshing` against backend truth
  // (B-023): a renderer that missed a terminal sync event — mounting mid-run,
  // or one that slipped through — self-heals here instead of spinning
  // forever until a manual reload.
  const syncMeta = useCallback(() => {
    void window.chronicle.getFeedMeta().then((next) => {
      setMeta(next)
      setRefreshing(next.refreshing)
    })
  }, [])

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
    syncMeta()
  }, [syncMeta])

  const loadChannels = useCallback(() => {
    void window.chronicle.getChannels().then(setChannels)
  }, [])

  useEffect(() => {
    loadView(view, channelFilter)
  }, [view, channelFilter, loadView])

  useEffect(() => {
    void window.chronicle.getAuthStatus().then(setAuth)
    void window.chronicle.getWizardState().then(setWizard)
    void window.chronicle.getSettings().then(({ settings: loaded, warning }) => {
      setSettings(loaded)
      if (warning !== null) setBanner({ text: warning })
    })
    loadChannels()
  }, [loadChannels])

  const changeWizard = useCallback((state: WizardStateDto) => {
    setWizard(state)
    void window.chronicle.setWizardState(state)
  }, [])

  const changeSettings = useCallback(
    (next: SettingsDto) => {
      const shortsChanged = next.showShorts !== settings.showShorts
      setSettings(next)
      void window.chronicle.setSettings(next)
      // B-028: showShorts is applied server-side (it affects counts, not
      // just display), so flipping it needs a re-fetch — unlike the other
      // settings here, which only change how the renderer draws local data.
      if (shortsChanged) {
        loadView()
        loadChannels()
      }
    },
    [settings.showShorts, loadView, loadChannels]
  )

  // Manual theme override (ui.md); 'system' defers to prefers-color-scheme.
  useEffect(() => {
    if (settings.theme === 'system') delete document.documentElement.dataset['theme']
    else document.documentElement.dataset['theme'] = settings.theme
  }, [settings.theme])

  // Re-entry points from Settings (onboarding.md): an ephemeral wizard run
  // starting at the responsible step — never touches the saved completion.
  const openWizardAt = useCallback(
    (stepId: WizardStepId) => {
      setWizardEntry({
        step: STEP_SEQUENCE.indexOf(stepId),
        email: wizard?.email ?? '',
        confirmed: wizard?.confirmed ?? {},
        published: wizard?.published ?? null,
        completed: false
      })
    },
    [wizard]
  )

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
    // B-036: a channel-filtered view refreshes only that channel.
    void window.chronicle.refreshFeed(channelFilter).then((result) => {
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
  }, [connect, channelFilter])

  // Bulk unread → read over the current scope (B-020, D-010 semantics).
  const markAllRead = useCallback(() => {
    void window.chronicle.markAllRead(channelFilter).then(() => {
      loadView()
      loadChannels()
    })
  }, [channelFilter, loadView, loadChannels])

  const patch = useCallback(
    (videoId: string, state: VideoStateDto) => {
      setVideos((current) =>
        current.map((video) => (video.videoId === videoId ? { ...video, state } : video))
      )
      syncMeta()
    },
    [syncMeta]
  )

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
          syncMeta()
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
        case 'refresh:failed':
          // B-023: always pair refresh:started with a terminal event, or the
          // spinner runs forever with no recovery short of a manual reload.
          setRefreshing(false)
          setProgress(null)
          setBanner({ text: `Refresh failed: ${event.message}` })
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
  }, [loadView, loadChannels, connect, syncMeta])

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
      if (screen === 'settings') {
        if (event.key === 'Escape') setScreen('feed')
        return
      }

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
        case 'c':
          channelQueryRef.current?.focus()
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
    openFromFeed,
    screen
  ])

  const showConnectPanel = auth !== null && auth.state !== 'connected' && videos.length === 0

  // Scoped to the current view/channel (B-020) — only offered where "unread"
  // is a meaningful concept and there is something to clear.
  const currentUnreadCount =
    channelFilter !== null
      ? (channels.find((c) => c.channelId === channelFilter)?.unreadCount ?? 0)
      : meta.unreadCount
  const showMarkAllRead = (view === 'all' || view === 'unread') && currentUnreadCount > 0

  // Settings re-entry into specific wizard steps (ephemeral run).
  if (wizardEntry !== null) {
    const closeEntry = (): void => {
      setWizardEntry(null)
      void window.chronicle.getAuthStatus().then(setAuth)
      loadView()
      loadChannels()
    }
    return (
      <Wizard
        state={wizardEntry}
        onStateChange={setWizardEntry}
        onQuickPath={closeEntry}
        onDone={closeEntry}
        onExit={closeEntry}
      />
    )
  }

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
    <div className={`app${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      {sidebarCollapsed ? (
        <button className="sidebar-expand" title="Show sidebar" onClick={toggleSidebar}>
          ☰
        </button>
      ) : (
        <Sidebar
          view={view}
          unreadCount={meta.unreadCount}
          watchLaterCount={meta.watchLaterCount}
          channels={channels}
          channelFilter={channelFilter}
          channelQueryRef={channelQueryRef}
          settingsOpen={screen === 'settings'}
          onSelectView={(next) => {
            setPlayerStack([])
            setScreen('feed')
            setChannelFilter(null)
            setView(next)
          }}
          onSelectChannel={(channelId) => {
            setPlayerStack([])
            setScreen('feed')
            setChannelFilter(channelId)
          }}
          onOpenSettings={() => {
            setPlayerStack([])
            setScreen('settings')
          }}
          onToggleCollapse={toggleSidebar}
        />
      )}
      <main className="feed">
        {screen === 'settings' ? (
          <>
            {banner !== null && (
              <div className="banner">
                <span>{banner.text}</span>
                <span className="banner-actions">
                  <button className="banner-dismiss" title="Dismiss" onClick={() => setBanner(null)}>
                    ✕
                  </button>
                </span>
              </div>
            )}
            <SettingsView
              auth={auth}
              settings={settings}
              onSettingsChange={changeSettings}
              onReconnect={connect}
              onReplaceKey={() => openWizardAt('import')}
              onFixWeeklyLogout={() => openWizardAt('publish')}
              onSignOut={() => {
                void window.chronicle.signOut().then((status) => {
                  setAuth(status)
                  setBanner({ text: 'Signed out. Local data was kept — reconnect anytime.' })
                })
              }}
              onBanner={(text) => setBanner({ text })}
            />
          </>
        ) : (
          <>
        <header className="topbar">
          <button className="refresh" title="Refresh (r)" onClick={doRefresh}>
            <span className={`refresh-icon${refreshing ? ' spinning' : ''}`}>⟳</span>
          </button>
          <span className="topbar-view">
            {channelFilter !== null
              ? (channels.find((c) => c.channelId === channelFilter)?.title ?? 'Channel')
              : VIEW_LABELS[view]}
          </span>
          <span className="status">{statusText}</span>
          {showMarkAllRead && (
            <button className="mark-all-read" onClick={markAllRead}>
              Mark all as read
            </button>
          )}
          <div className="field-wrap">
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
            {filter !== '' && (
              <button
                className="field-clear"
                title="Clear"
                onClick={() => {
                  setFilter('')
                  filterInputRef.current?.focus()
                }}
              >
                ✕
              </button>
            )}
          </div>
          <input
            className="size-slider"
            type="range"
            min={0}
            max={ITEM_SIZES.length - 1}
            step={1}
            value={ITEM_SIZES.indexOf(settings.itemSize)}
            title={`Item size: ${settings.itemSize}`}
            onChange={(event) =>
              changeSettings({ ...settings, itemSize: ITEM_SIZES[Number(event.target.value)] })
            }
          />
          <button
            className="layout-toggle"
            title={settings.layout === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
            onClick={() => changeSettings({ ...settings, layout: settings.layout === 'grid' ? 'list' : 'grid' })}
          >
            {settings.layout === 'grid' ? '☰' : '⊞'}
          </button>
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
                itemSize={settings.itemSize}
                layout={settings.layout}
                showViewCounts={settings.showViewCounts}
              />
            )}
            {playerOpen && currentPlayerVideo && (
              <PlayerView
                video={currentPlayerVideo}
                stackDepth={playerStack.length}
                hasQueueNext={hasQueueNext}
                defaultPlaybackRate={settings.defaultPlaybackRate}
                onNextInQueue={nextInQueue}
                onClose={closePlayer}
                onOpenVideo={(videoId) => openVideo(videoId)}
                onStatePatched={patch}
              />
            )}
          </div>
        )}
          </>
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
