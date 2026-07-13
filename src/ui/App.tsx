import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  AccountDto,
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
  SearchResultDto,
  SettingsDto,
  VideoStateDto,
  WizardStateDto
} from '../ipc/contract'
import { AddAccount } from './AddAccount'
import { ConnectPanel } from './ConnectPanel'
import {
  FeedList,
  GRID_CARD_SIZES,
  ITEM_SIZES,
  VideoCard,
  VideoRow,
  type FeedRow,
  type VideoActions
} from './FeedList'
import { formatClockTime, quotaResetLocalTime } from './format'
import { HelpOverlay } from './HelpOverlay'
import { t } from './i18n'
import { PlayerView } from './PlayerView'
import { SettingsView } from './SettingsView'
import { Sidebar, VIEW_LABELS, VIEW_ORDER } from './Sidebar'
import { UrlPrompt } from './UrlPrompt'
import { STEP_SEQUENCE, Wizard } from './onboarding/Wizard'
import type { WizardStepId } from './onboarding/assets'

const BUCKET_LABELS: Record<FeedBucketDto, string> = {
  today: t('app.bucket.today'),
  yesterday: t('app.bucket.yesterday'),
  'this-week': t('app.bucket.thisWeek'),
  earlier: t('app.bucket.earlier')
}

const UNDO_WINDOW_MS = 5000

interface Banner {
  text: string
  action?: { label: string; run: () => void }
}

export function App() {
  const [view, setView] = useState<FeedViewDto>('all')
  const [channelFilter, setChannelFilter] = useState<string | null>(null)
  // B-003: a second, independent filter dimension alongside channelFilter —
  // undefined/null means the combined feed across every connected account.
  const [accountFilter, setAccountFilter] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<AccountDto[]>([])
  const [addAccountOpen, setAddAccountOpen] = useState(false)
  const [videos, setVideos] = useState<FeedVideoDto[]>([])
  const [nextCursor, setNextCursor] = useState<FeedCursorDto | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
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
  // B-042: unread videos from favorited channels — bucket-less priority
  // section shown above the chronological feed (main views only, D-039).
  const [priorityVideos, setPriorityVideos] = useState<FeedVideoDto[]>([])
  // B-009/D-031: search is inert until the user presses Enter — never
  // fired on keystroke (search.list costs 100 units/call).
  const [searchResults, setSearchResults] = useState<SearchResultDto[] | null>(null)
  const [searching, setSearching] = useState(false)
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
  // B-010: topbar Unsubscribe arms on first click, fires on the second
  // (mirrors Settings' delete-all confirmation), auto-disarms after 6s.
  const [confirmingUnsubscribe, setConfirmingUnsubscribe] = useState(false)
  const confirmUnsubscribeTimer = useRef<number | null>(null)
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
  const accountRef = useRef<string | null>(null)
  const loadingRef = useRef(false)
  const undoInfo = useRef(new Map<string, { previous: ReadStatusDto; timer: number }>())
  const lastG = useRef(0)
  const filterInputRef = useRef<HTMLInputElement>(null)
  const channelQueryRef = useRef<HTMLInputElement>(null)
  const atTopRef = useRef(true)
  const queueRef = useRef<{ ids: string[]; index: number } | null>(null)
  const sidebarBeforePlayerRef = useRef<boolean | null>(null)
  // B-002: last cursor actually requested (as opposed to nextCursor, which
  // goes null once the local archive is exhausted) — needed to resume the
  // same page after an on-demand backfill adds fresh local rows.
  const lastCursorRef = useRef<FeedCursorDto | null>(null)
  const backfillingRef = useRef(false)
  const [archiveExhausted, setArchiveExhausted] = useState<ReadonlySet<string>>(new Set())

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
    void window.chronicle.getFeedMeta(accountRef.current).then((next) => {
      setMeta(next)
      setRefreshing(next.refreshing)
    })
    // B-042: the priority section only makes sense in the main feed
    // ('all'/'unread', unfiltered) — cleared everywhere else.
    if (channelRef.current === null && (viewRef.current === 'all' || viewRef.current === 'unread')) {
      void window.chronicle.getPriorityFeed(accountRef.current).then(setPriorityVideos)
    } else {
      setPriorityVideos([])
    }
  }, [])

  const loadView = useCallback(
    (target?: FeedViewDto, channel?: string | null, account?: string | null) => {
      const nextView = target ?? viewRef.current
      const nextChannel = channel === undefined ? channelRef.current : channel
      const nextAccount = account === undefined ? accountRef.current : account
      viewRef.current = nextView
      channelRef.current = nextChannel
      accountRef.current = nextAccount
      loadingRef.current = true
      lastCursorRef.current = null
      setNewVideosPill(null)
      void window.chronicle.getFeed(nextView, null, nextChannel, nextAccount).then((slice) => {
        if (
          viewRef.current !== nextView ||
          channelRef.current !== nextChannel ||
          accountRef.current !== nextAccount
        ) {
          return
        }
        loadingRef.current = false
        setVideos(slice.videos)
        setNextCursor(slice.nextCursor)
        setCursorIdx(0)
      })
      syncMeta()
    },
    [syncMeta]
  )

  const loadChannels = useCallback(() => {
    void window.chronicle.getChannels(accountRef.current).then(setChannels)
    void window.chronicle.listAccounts().then(setAccounts)
  }, [])

  useEffect(() => {
    loadView(view, channelFilter, accountFilter)
  }, [view, channelFilter, accountFilter, loadView])

  // Switching accounts should read as a full context switch — the sidebar's
  // channel list is account-scoped too, so it needs its own refresh here
  // rather than waiting for an unrelated action to happen to trigger one.
  useEffect(() => {
    loadChannels()
  }, [accountFilter, loadChannels])

  // B-009: search results are a transient overlay over the current
  // view/channel — navigating away always drops them.
  useEffect(() => {
    setSearchResults(null)
  }, [view, channelFilter, accountFilter])

  // Switching channels (or leaving the channel screen) disarms any pending
  // Unsubscribe confirmation — it must never carry over to a different channel.
  useEffect(() => {
    setConfirmingUnsubscribe(false)
    if (confirmUnsubscribeTimer.current !== null) {
      window.clearTimeout(confirmUnsubscribeTimer.current)
      confirmUnsubscribeTimer.current = null
    }
  }, [channelFilter])

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
        setBanner({ text: t('app.banner.connectionFailed', { message: result.message }) })
      }
    })
  }, [])

  const doRefresh = useCallback(() => {
    // B-036: a channel-filtered view refreshes only that channel. B-003: an
    // account-filtered view refreshes only that account.
    void window.chronicle.refreshFeed(channelFilter, accountFilter).then((result) => {
      if (result.ok || result.errorKind === 'busy') return
      if (result.errorKind === 'auth-expired') {
        setBanner({
          text: t('app.banner.reconnectRequired'),
          action: { label: t('app.banner.reconnectAction'), run: connect }
        })
      } else if (result.errorKind === 'network-unavailable') {
        setBanner({ text: t('app.banner.offline') })
      } else {
        setBanner({ text: t('app.banner.refreshFailed', { message: result.message }) })
      }
    })
  }, [connect, channelFilter, accountFilter])

  // Bulk unread → read over the current scope (B-020, D-010 semantics).
  const markAllRead = useCallback(() => {
    void window.chronicle.markAllRead(channelFilter, accountFilter).then(() => {
      loadView()
      loadChannels()
    })
  }, [channelFilter, accountFilter, loadView, loadChannels])

  // B-010: real subscriptions.delete plus the local soft-delete — may open
  // the system browser once for incremental write-scope consent (D-032).
  const unsubscribeChannel = useCallback(
    (channelId: string) => {
      void window.chronicle.unsubscribeChannel(channelId).then((result) => {
        if (!result.ok) {
          if (result.errorKind === 'auth-expired') {
            setBanner({
              text: t('app.banner.reconnectRequired'),
              action: { label: t('app.banner.reconnectAction'), run: connect }
            })
          } else if (result.errorKind === 'network-unavailable') {
            setBanner({ text: t('app.banner.offline') })
          } else {
            setBanner({ text: t('app.banner.unsubscribeFailed', { message: result.message }) })
          }
          return
        }
        loadChannels()
        if (channelFilter === channelId) setChannelFilter(null)
        else loadView()
      })
    },
    [channelFilter, connect, loadChannels, loadView]
  )

  // B-009/D-031: explicit user action only — never fired on keystroke.
  const runSearch = useCallback((query: string) => {
    const q = query.trim()
    if (q === '') {
      setSearchResults(null)
      return
    }
    setSearching(true)
    void window.chronicle.searchYouTube(q).then((result) => {
      setSearching(false)
      if (!result.ok) {
        if (result.errorKind === 'quota-exceeded') {
          setBanner({ text: t('app.banner.quotaExceeded', { time: quotaResetLocalTime() }) })
        } else if (result.errorKind === 'network-unavailable') {
          setBanner({ text: t('app.banner.offline') })
        } else {
          setBanner({ text: t('app.banner.searchFailed', { message: result.message }) })
        }
        setSearchResults([])
        return
      }
      setSearchResults(result.value)
    })
  }, [])

  // D-030: the other half of B-010's unsubscribe — subscribes on YouTube,
  // may open the system browser once for incremental write-scope consent.
  const subscribeToChannel = useCallback((channelId: string) => {
    void window.chronicle.subscribeChannel(channelId).then((result) => {
      if (!result.ok) {
        if (result.errorKind === 'auth-expired') {
          setBanner({
            text: t('app.banner.reconnectRequired'),
            action: { label: t('app.banner.reconnectAction'), run: connect }
          })
        } else if (result.errorKind === 'network-unavailable') {
          setBanner({ text: t('app.banner.offline') })
        } else {
          setBanner({ text: t('app.banner.subscribeFailed', { message: result.message }) })
        }
        return
      }
      loadChannels()
      setSearchResults((current) =>
        current === null
          ? null
          : current.map((r) => (r.kind === 'channel' && r.channelId === channelId ? { ...r, subscribed: true } : r))
      )
    })
  }, [connect, loadChannels])

  // B-042: local-only priority marker — never touches YouTube.
  const toggleChannelFavorite = useCallback(
    (channelId: string) => {
      void window.chronicle.toggleChannelFavorite(channelId).then(() => {
        loadChannels()
        syncMeta()
      })
    },
    [loadChannels, syncMeta]
  )

  // B-003: selecting an account is a second, independent filter dimension —
  // same mechanics as selecting a channel (clears on reselect).
  const selectAccount = useCallback((accountId: string | null) => {
    setPlayerStack([])
    setScreen('feed')
    setAccountFilter(accountId)
  }, [])

  const removeAccount = useCallback(
    (accountId: string) => {
      if (accountFilter === accountId) setAccountFilter(null)
      void window.chronicle
        .removeAccount(accountId)
        .then(() => {
          loadChannels()
          loadView()
        })
        .catch((error: unknown) => {
          setBanner({
            text: t('app.banner.removeAccountFailed', {
              message: error instanceof Error ? error.message : String(error)
            })
          })
        })
    },
    [accountFilter, loadChannels, loadView]
  )

  const syncAccountNow = useCallback((accountId: string) => {
    void window.chronicle.syncAccountNow(accountId).then((result) => {
      if (!result.ok) {
        if (result.errorKind === 'auth-expired') {
          setBanner({
            text: t('app.banner.reconnectRequired'),
            action: { label: t('app.banner.reconnectAction'), run: connect }
          })
        } else {
          setBanner({ text: t('app.banner.accountSyncFailed', { message: result.message }) })
        }
      }
    })
  }, [connect])

  function handleTopbarUnsubscribe(): void {
    if (!confirmingUnsubscribe) {
      setConfirmingUnsubscribe(true)
      confirmUnsubscribeTimer.current = window.setTimeout(
        () => setConfirmingUnsubscribe(false),
        6000
      )
      return
    }
    if (confirmUnsubscribeTimer.current !== null) window.clearTimeout(confirmUnsubscribeTimer.current)
    setConfirmingUnsubscribe(false)
    if (channelFilter !== null) unsubscribeChannel(channelFilter)
  }

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
          setBanner({ text: t('app.banner.openVideoFailed', { message: result.message }) })
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

  // `/` while playing exits fully back to the feed (not just one level of
  // the queue stack, like Esc does) and focuses the filter, so a new search
  // never requires leaving playback through a separate step.
  const exitPlayerToSearch = useCallback(() => {
    setPlayerStack([])
    requestAnimationFrame(() => filterInputRef.current?.focus())
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
              text: t('app.banner.refreshPartial', { count: event.report.channelsFailed })
            })
          }
          break
        case 'refresh:failed':
          // B-023: always pair refresh:started with a terminal event, or the
          // spinner runs forever with no recovery short of a manual reload.
          setRefreshing(false)
          setProgress(null)
          setBanner({ text: t('app.banner.refreshFailed', { message: event.message }) })
          break
        case 'auth:required':
          setRefreshing(false)
          setBanner({
            text: t('app.banner.reconnectRequired'),
            action: { label: t('app.banner.reconnectAction'), run: connect }
          })
          break
        case 'quota:exceeded':
          setBanner({
            text: t('app.banner.quotaExceeded', { time: quotaResetLocalTime() })
          })
          break
      }
    })
  }, [loadView, loadChannels, connect, syncMeta])

  const loadMore = useCallback(() => {
    if (loadingRef.current) return
    const targetView = viewRef.current
    const targetChannel = channelRef.current
    const targetAccount = accountRef.current

    if (nextCursor) {
      lastCursorRef.current = nextCursor
      loadingRef.current = true
      setLoadingMore(true)
      void window.chronicle.getFeed(targetView, nextCursor, targetChannel, targetAccount).then((slice) => {
        loadingRef.current = false
        setLoadingMore(false)
        if (viewRef.current !== targetView || channelRef.current !== targetChannel) return
        setVideos((current) => [...current, ...slice.videos])
        setNextCursor(slice.nextCursor)
      })
      return
    }

    // B-002: local archive exhausted in a channel-filtered view — fetch
    // older videos from YouTube (uploads playlist paging + hydration) on
    // demand, then resume the exact same page instead of resetting to the top.
    if (
      targetChannel === null ||
      archiveExhausted.has(targetChannel) ||
      backfillingRef.current
    ) {
      return
    }
    backfillingRef.current = true
    setLoadingMore(true)
    const cursorToRetry = lastCursorRef.current
    void window.chronicle.backfillChannelArchive(targetChannel).then((result) => {
      backfillingRef.current = false
      setLoadingMore(false)
      if (channelRef.current !== targetChannel) return
      if (!result.ok) {
        if (result.errorKind === 'auth-expired') {
          setBanner({
            text: t('app.banner.reconnectRequired'),
            action: { label: t('app.banner.reconnectAction'), run: connect }
          })
        } else if (result.errorKind === 'network-unavailable') {
          setBanner({ text: t('app.banner.offline') })
        } else if (result.errorKind === 'quota-exceeded') {
          setBanner({ text: t('app.banner.quotaExceeded', { time: quotaResetLocalTime() }) })
        }
        return
      }
      if (result.value.exhausted) {
        setArchiveExhausted((set) => new Set(set).add(targetChannel))
      }
      if (result.value.videosNew > 0) {
        void window.chronicle
          .getFeed(targetView, cursorToRetry, targetChannel, targetAccount)
          .then((slice) => {
            if (viewRef.current !== targetView || channelRef.current !== targetChannel) return
            setVideos((current) => [...current, ...slice.videos])
            setNextCursor(slice.nextCursor)
          })
      }
    })
  }, [nextCursor, archiveExhausted, connect])

  // The `/` filter is a YouTube-search trigger only — it never re-filters
  // the already-loaded feed, so browsing local subscriptions and searching
  // YouTube can't be confused for two modes of the same field.
  const filtered = videos

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
        } else if (event.key === '?') {
          // `?` must always reach the shortcuts overlay, even while typing
          // in a text input — the one global binding that can't be allowed
          // to just fall into the field as a literal character.
          event.preventDefault()
          setHelpOpen((open) => !open)
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
        case 's':
          // B-043: sidebar collapse/expand (B-037) had no keyboard path at all.
          toggleSidebar()
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
    screen,
    toggleSidebar
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
        ? t('app.status.filteringShorts', { checked: progress.checked, total: progress.total })
        : t('app.status.checkingChannels', { checked: progress.checked, total: progress.total })
      : t('app.status.refreshing')
    : meta.caughtUp
      ? `${t('app.status.caughtUp')}${meta.lastRefreshAt ? t('app.status.lastRefreshSuffix', { time: formatClockTime(meta.lastRefreshAt) }) : ''}`
      : t('app.status.unreadCount', { count: currentUnreadCount })

  return (
    <div className={`app${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      {sidebarCollapsed ? (
        <button className="sidebar-expand" title={t('app.sidebar.showTitle')} onClick={toggleSidebar}>
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
            // B-015: refetch so the granted-scope line reflects any write
            // action (comment/like/subscribe/unsubscribe) taken since mount.
            void window.chronicle.getAuthStatus().then(setAuth)
          }}
          onToggleCollapse={toggleSidebar}
          onUnsubscribe={unsubscribeChannel}
          onToggleFavorite={toggleChannelFavorite}
          accounts={accounts}
          accountFilter={accountFilter}
          onSelectAccount={selectAccount}
          onAddAccount={() => setAddAccountOpen(true)}
          onRemoveAccount={removeAccount}
          onSyncAccountNow={syncAccountNow}
        />
      )}
      <main className="feed">
        {screen === 'settings' ? (
          <>
            {banner !== null && (
              <div className="banner">
                <span>{banner.text}</span>
                <span className="banner-actions">
                  <button
                    className="banner-dismiss"
                    title={t('app.banner.dismissTitle')}
                    onClick={() => setBanner(null)}
                  >
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
                  setBanner({ text: t('app.banner.signedOut') })
                })
              }}
              onBanner={(text) => setBanner({ text })}
            />
          </>
        ) : (
          <>
        <header className="topbar">
          <button className="refresh" title={t('app.topbar.refreshTitle')} onClick={doRefresh}>
            <span className={`refresh-icon${refreshing ? ' spinning' : ''}`}>⟳</span>
          </button>
          <span className="topbar-view">
            {channelFilter !== null
              ? (channels.find((c) => c.channelId === channelFilter)?.title ??
                t('app.topbar.channelFallback'))
              : VIEW_LABELS[view]}
            {accountFilter !== null && (
              <span className="topbar-account-suffix">
                {' · '}
                {accounts.find((a) => a.accountId === accountFilter)?.label ??
                  t('app.topbar.channelFallback')}
              </span>
            )}
          </span>
          {channelFilter !== null && (
            <button
              className="open-channel-btn"
              title={t('app.topbar.openChannelTitle')}
              onClick={() =>
                void window.chronicle.openExternalUrl(`https://www.youtube.com/channel/${channelFilter}`)
              }
            >
              ↗
            </button>
          )}
          {channelFilter !== null && (
            <button
              className={`unsubscribe-btn${confirmingUnsubscribe ? ' danger' : ''}`}
              onClick={handleTopbarUnsubscribe}
            >
              {confirmingUnsubscribe
                ? t('app.topbar.confirmUnsubscribe')
                : t('app.topbar.unsubscribe')}
            </button>
          )}
          <span className="status">{statusText}</span>
          {showMarkAllRead && (
            <button className="mark-all-read" onClick={markAllRead}>
              {t('app.topbar.markAllRead')}
            </button>
          )}
          <div className="field-wrap">
            <input
              ref={filterInputRef}
              className="filter"
              placeholder={t('app.topbar.searchYouTubePlaceholder')}
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') runSearch(filter)
              }}
            />
            {filter !== '' && (
              <button
                className="field-clear"
                title={t('app.topbar.clearFilterTitle')}
                onClick={() => {
                  setFilter('')
                  setSearchResults(null)
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
            title={t('app.topbar.itemSizeTitle', { size: settings.itemSize })}
            onChange={(event) =>
              changeSettings({ ...settings, itemSize: ITEM_SIZES[Number(event.target.value)] })
            }
          />
          <button
            className="layout-toggle"
            title={
              settings.layout === 'grid'
                ? t('app.topbar.switchToListView')
                : t('app.topbar.switchToGridView')
            }
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
              <button
                className="banner-dismiss"
                title={t('app.banner.dismissTitle')}
                onClick={() => setBanner(null)}
              >
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
                {t('app.banner.newVideos', {
                  count: newVideosPill,
                  plural: newVideosPill > 1 ? 's' : ''
                })}
              </button>
            )}
            {searchResults !== null ? (
              <div className="search-results">
                {searching && <div className="empty">{t('search.searching')}</div>}
                {!searching && searchResults.length === 0 && (
                  <div className="empty">{t('search.empty')}</div>
                )}
                {searchResults.map((result) =>
                  result.kind === 'video' ? (
                    // B-043: this list has no other keyboard path (unlike the
                    // main FeedList, which has global j/k/Enter navigation).
                    <div
                      key={result.videoId}
                      className="row search-result-row"
                      role="button"
                      tabIndex={0}
                      onClick={() => openVideo(result.videoId)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          openVideo(result.videoId)
                        }
                      }}
                    >
                      {result.thumbnailUrl !== null ? (
                        <img
                          className="thumb"
                          loading="lazy"
                          alt=""
                          src={`thumb://img/${encodeURIComponent(result.thumbnailUrl)}`}
                        />
                      ) : (
                        <div className="thumb" />
                      )}
                      <div className="row-text">
                        <span className="title">{result.title}</span>
                        <span className="meta">{result.channelTitle}</span>
                      </div>
                    </div>
                  ) : (
                    <div key={result.channelId} className="row search-result-row search-result-channel">
                      {result.thumbnailUrl !== null ? (
                        <img
                          className="thumb"
                          loading="lazy"
                          alt=""
                          src={`thumb://img/${encodeURIComponent(result.thumbnailUrl)}`}
                        />
                      ) : (
                        <div className="thumb" />
                      )}
                      <div className="row-text">
                        <span className="title">{result.title}</span>
                      </div>
                      <button
                        className="primary"
                        disabled={result.subscribed}
                        onClick={() => subscribeToChannel(result.channelId)}
                      >
                        {result.subscribed ? t('search.subscribedButton') : t('search.subscribeButton')}
                      </button>
                    </div>
                  )
                )}
              </div>
            ) : (
              <>
                {priorityVideos.length > 0 && (
                  <div className={`priority-section size-${settings.itemSize}`}>
                    <h2 className="group-header">{t('app.bucket.favoriteChannels')}</h2>
                    {settings.layout === 'grid' ? (
                      <div
                        className="grid-row"
                        style={{
                          gridTemplateColumns: `repeat(auto-fill, minmax(${GRID_CARD_SIZES[settings.itemSize].minWidth}px, 1fr))`
                        }}
                      >
                        {priorityVideos.map((video) => (
                          <VideoCard
                            key={video.videoId}
                            video={video}
                            selected={false}
                            undoable={undoable.has(video.videoId)}
                            actions={actions}
                            onOpen={() => openVideo(video.videoId)}
                            showViewCounts={settings.showViewCounts}
                            focusable
                          />
                        ))}
                      </div>
                    ) : (
                      priorityVideos.map((video) => (
                        <VideoRow
                          key={video.videoId}
                          video={video}
                          selected={false}
                          undoable={undoable.has(video.videoId)}
                          actions={actions}
                          onOpen={() => openVideo(video.videoId)}
                          showViewCounts={settings.showViewCounts}
                          focusable
                        />
                      ))
                    )}
                  </div>
                )}
                {filtered.length === 0 ? (
                  <div className="empty">
                    {filter ? t('app.feed.emptyFiltered') : t('app.feed.emptyNoVideos')}
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
                    loadingMore={loadingMore}
                  />
                )}
              </>
            )}
            {playerOpen && currentPlayerVideo && (
              <PlayerView
                video={currentPlayerVideo}
                stackDepth={playerStack.length}
                hasQueueNext={hasQueueNext}
                defaultPlaybackRate={settings.defaultPlaybackRate}
                onNextInQueue={nextInQueue}
                onClose={closePlayer}
                onSearch={exitPlayerToSearch}
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
      {addAccountOpen && (
        <AddAccount
          onCancel={() => setAddAccountOpen(false)}
          onConnected={() => {
            setAddAccountOpen(false)
            loadChannels()
          }}
        />
      )}
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
