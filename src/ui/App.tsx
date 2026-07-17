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
  SearchVideoResultDto,
  SettingsDto,
  SyncFailureDetailDto,
  VideoStateDto,
  WizardStateDto
} from '../ipc/contract'
import { AddAccount } from './AddAccount'
import { ChannelHeader } from './ChannelHeader'
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
import { MiniPlayerBar } from './MiniPlayerBar'
import { PlayerDetails, type PlayerDetailsHandle } from './PlayerDetails'
import { PlayerSurface, type PlayerSurfaceHandle } from './PlayerSurface'
import { SettingsView } from './SettingsView'
import {
  SearchChannelCard,
  SearchChannelRow,
  SearchVideoCard,
  SearchVideoRow
} from './SearchResults'
import { Sidebar, VIEW_LABELS, VIEW_ORDER } from './Sidebar'
import { UrlPrompt } from './UrlPrompt'
import { useWriteScopeGate } from './useWriteScopeGate'
import { STEP_SEQUENCE, Wizard } from './onboarding/Wizard'
import type { WizardStepId } from './onboarding/assets'

const BUCKET_LABELS: Record<FeedBucketDto, string> = {
  today: t('app.bucket.today'),
  yesterday: t('app.bucket.yesterday'),
  'this-week': t('app.bucket.thisWeek'),
  earlier: t('app.bucket.earlier')
}

const UNDO_WINDOW_MS = 5000

// B-097: the banner itself stays a one-line count; per-channel detail is an
// on-demand disclosure rather than always-rendered clutter.
function BannerBar({
  banner,
  showAction = false,
  detailsOpen,
  onToggleDetails,
  onDismiss
}: {
  banner: Banner
  showAction?: boolean
  detailsOpen: boolean
  onToggleDetails: () => void
  onDismiss: () => void
}) {
  const hasDetails = banner.failureDetails !== undefined && banner.failureDetails.length > 0
  return (
    <>
      <div className="banner">
        <span>{banner.text}</span>
        <span className="banner-actions">
          {showAction && banner.action && (
            <button className="banner-action" onClick={banner.action.run}>
              {banner.action.label}
            </button>
          )}
          {hasDetails && (
            <button
              className="banner-detail-toggle"
              title={t('app.banner.showDetailsTitle')}
              onClick={onToggleDetails}
            >
              {detailsOpen ? t('app.banner.hideDetails') : t('app.banner.showDetails')}
            </button>
          )}
          <button
            className="banner-dismiss"
            title={t('app.banner.dismissTitle')}
            onClick={onDismiss}
          >
            ✕
          </button>
        </span>
      </div>
      {hasDetails && detailsOpen && (
        <div className="banner-detail-panel">
          <ul>
            {banner.failureDetails!.map((failure, index) => (
              <li key={index}>
                <strong>{failure.channelTitle ?? t('app.banner.failureAccountLevel')}</strong>
                {' — '}
                {failure.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}

interface Banner {
  text: string
  action?: { label: string; run: () => void }
  // B-097: raw per-channel error detail behind a partial-refresh banner,
  // shown on demand via an info toggle instead of cluttering the one-line
  // count that's already there.
  failureDetails?: SyncFailureDetailDto[]
}

export function App() {
  const writeScopeGate = useWriteScopeGate()
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
  const [failureDetailsOpen, setFailureDetailsOpen] = useState(false)
  const [channels, setChannels] = useState<ChannelDto[]>([])
  // B-042: unread videos from favorited channels — bucket-less priority
  // section shown above the chronological feed (main views only, D-039).
  const [priorityVideos, setPriorityVideos] = useState<FeedVideoDto[]>([])
  // B-009/D-031: search is inert until the user presses Enter — never
  // fired on keystroke (search.list costs 100 units/call).
  const [searchResults, setSearchResults] = useState<SearchResultDto[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchNextPageToken, setSearchNextPageToken] = useState<string | null>(null)
  const [searchLoadingMore, setSearchLoadingMore] = useState(false)
  // Browsing a not-yet-subscribed channel's uploads, opened from a search
  // channel result — a transient, never-persisted sibling of channelFilter's
  // usual (subscribed) feed pipeline; only rendered while its channelId
  // still matches channelFilter.
  const [channelPreview, setChannelPreview] = useState<{
    channelId: string
    title: string
    thumbnailUrl: string | null
    videos: SearchVideoResultDto[]
    nextPageToken: string | null
    loading: boolean
    loadingMore: boolean
  } | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [progress, setProgress] = useState<{
    phase: 'channels' | 'shorts'
    checked: number
    total: number
  } | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [playerStack, setPlayerStack] = useState<PlayerVideoDto[]>([])
  // B-045: docked to a corner instead of full view — the video keeps
  // playing (PlayerSurface stays mounted regardless) while the feed
  // underneath becomes interactive again.
  const [miniplayer, setMiniplayer] = useState(false)
  const [fullSlot, setFullSlot] = useState<HTMLDivElement | null>(null)
  const [miniSlot, setMiniSlot] = useState<HTMLDivElement | null>(null)
  const playerSurfaceRef = useRef<PlayerSurfaceHandle>(null)
  const playerDetailsRef = useRef<PlayerDetailsHandle>(null)

  // B-045: any "hard" navigation away from the player (sidebar clicks,
  // submitting a search, switching accounts) used to just clear playerStack
  // outright, bypassing the dock-vs-close decision entirely — leaving via
  // any of those paths never docked, even mid-playback. This collapses the
  // stack down to just the current (top) video and docks it if still going,
  // otherwise clears the stack exactly like before. Safe to call with no
  // player open at all: isStillGoing() reads false via the `?? false`
  // fallback, so it just falls through to the same clear as always. Declared
  // early (before runSearch/selectAccount/etc. reference it) since those are
  // themselves declared well before the rest of the player-related callbacks.
  const leavePlayerForNavigation = useCallback(() => {
    if (playerSurfaceRef.current?.isStillGoing() ?? false) {
      setPlayerStack((stack) => (stack.length > 0 ? [stack[stack.length - 1]] : []))
      setMiniplayer(true)
    } else {
      setPlayerStack([])
      setMiniplayer(false)
    }
  }, [])

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
    defaultPlaybackRate: 1,
    checkForUpdates: true,
    miniplayerWidth: 360,
    autoStart: false,
    backgroundMode: false,
    startMinimized: false,
    notifyNewVideos: false,
    notifyScope: 'all',
    notifyShorts: true,
    autoNotifyFavorites: false,
    popOutOnClose: true
  })
  const [appVersion, setAppVersion] = useState('')

  const viewRef = useRef<FeedViewDto>('all')
  const channelRef = useRef<string | null>(null)
  const accountRef = useRef<string | null>(null)
  const loadingRef = useRef(false)
  const undoInfo = useRef(new Map<string, { previous: ReadStatusDto; timer: number }>())
  const lastG = useRef(0)
  const filterInputRef = useRef<HTMLInputElement>(null)
  const channelQueryRef = useRef<HTMLInputElement>(null)
  const searchResultsRef = useRef<HTMLDivElement>(null)
  const channelPreviewRef = useRef<HTMLDivElement>(null)
  const atTopRef = useRef(true)
  const queueRef = useRef<{ ids: string[]; index: number } | null>(null)
  const sidebarBeforePlayerRef = useRef<boolean | null>(null)
  const backfillingRef = useRef(false)
  // Bumped by every loadView call; loadMore/backfill capture the value in
  // flight and check it again on resolve — a mismatch means a newer
  // loadView happened meanwhile, so the response is fully discarded rather
  // than partially applied (previously a bare viewRef/channelRef check,
  // which couldn't tell "superseded" apart from "still current" precisely
  // enough and left loadingRef stuck true on the superseded path).
  const requestGenerationRef = useRef(0)
  const [archiveExhausted, setArchiveExhausted] = useState<ReadonlySet<string>>(new Set())
  // Videos are already hydrated and persisted well before the (slower)
  // Shorts-identification phase starts — it's a separate pass over rows
  // already in the DB — so a feed that's still empty when that phase begins
  // doesn't need to keep waiting for the full refresh:done event. Tracked
  // via refs (not state) so the progress-event handler below can read the
  // latest value without resubscribing on every video/refresh-cycle change.
  const feedEmptyRef = useRef(true)
  const emptyFeedLoadTriggeredRef = useRef(false)

  const playerOpen = playerStack.length > 0
  const currentPlayerVideo = playerStack.at(-1)

  const toggleSidebar = useCallback(() => setSidebarCollapsed((collapsed) => !collapsed), [])

  // B-045: only the full-view layout wants the sidebar out of the way —
  // docked-to-a-corner mode is "back to browsing the feed," sidebar included.
  useEffect(() => {
    const fullView = playerOpen && !miniplayer
    if (fullView) {
      setSidebarCollapsed((current) => {
        sidebarBeforePlayerRef.current = current
        return true
      })
    } else if (sidebarBeforePlayerRef.current !== null) {
      setSidebarCollapsed(sidebarBeforePlayerRef.current)
      sidebarBeforePlayerRef.current = null
    }
  }, [playerOpen, miniplayer])

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
    if (
      channelRef.current === null &&
      (viewRef.current === 'all' || viewRef.current === 'unread')
    ) {
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
      const generation = ++requestGenerationRef.current
      loadingRef.current = true
      setNewVideosPill(null)
      void window.chronicle.getFeed(nextView, null, nextChannel, nextAccount).then((slice) => {
        // A newer loadView call started after this one — a stale response
        // must never touch loadingRef/videos/nextCursor, or it could either
        // clobber the newer session's data or leave loadingRef stuck true
        // forever (blocking all future pagination for the new session).
        if (requestGenerationRef.current !== generation) return
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

  useEffect(() => {
    feedEmptyRef.current = videos.length === 0
  }, [videos])

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
    void window.chronicle.getAppVersion().then(setAppVersion)
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
      void writeScopeGate
        .run(
          () => window.chronicle.unsubscribeChannel(channelId),
          () => window.chronicle.requestWriteScopeForChannel(channelId)
        )
        .then((result) => {
          if (!result.ok) {
            if (result.errorKind === 'cancelled') {
              // User declined the write-scope dialog — no error to show.
            } else if (result.errorKind === 'auth-expired') {
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
    [channelFilter, connect, loadChannels, loadView, writeScopeGate]
  )

  // B-009/D-031: explicit user action only — never fired on keystroke.
  const runSearch = useCallback(
    (query: string) => {
      const q = query.trim()
      if (q === '') {
        setSearchResults(null)
        setSearchNextPageToken(null)
        return
      }
      // Submitting an actual search is a navigation like any other — it always
      // leaves the player, even though focusing the field to type it does not.
      leavePlayerForNavigation()
      setSearchQuery(q)
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
          setSearchNextPageToken(null)
          return
        }
        setSearchResults(result.value.results)
        setSearchNextPageToken(result.value.nextPageToken)
      })
    },
    [leavePlayerForNavigation]
  )

  // Explicit navigation (a sidebar view/channel/account/settings click)
  // always leaves search, even when the destination happens to already
  // match the current view/channel/account — state setters alone don't
  // fire the "navigation changed" effect on a same-value no-op click.
  const closeSearch = useCallback(() => {
    setFilter('')
    setSearchResults(null)
    setSearchQuery('')
    setSearchNextPageToken(null)
    setSearching(false)
    setChannelPreview(null)
  }, [])

  const loadMoreSearchResults = useCallback(() => {
    if (searchNextPageToken === null || searchLoadingMore) return
    setSearchLoadingMore(true)
    void window.chronicle.searchYouTube(searchQuery, searchNextPageToken).then((result) => {
      setSearchLoadingMore(false)
      if (!result.ok) return
      setSearchResults((current) => [...(current ?? []), ...result.value.results])
      setSearchNextPageToken(result.value.nextPageToken)
    })
  }, [searchQuery, searchNextPageToken, searchLoadingMore])

  // B-107 follow-up: search results only page via the `.search-results`
  // container's own onScroll handler, same as the near-end check this
  // fixed in FeedList.tsx — a small result count, a small grid item size,
  // or a tall window can all mean the first page never actually overflows,
  // so that scroll handler never fires and pagination silently stalls
  // exactly like the original report. `loadMoreSearchResults` itself
  // already no-ops without a `searchNextPageToken`/while already loading,
  // so this can't loop.
  useEffect(() => {
    const el = searchResultsRef.current
    if (el && el.clientHeight > 0 && el.scrollHeight <= el.clientHeight) loadMoreSearchResults()
  }, [searchResults, settings.itemSize, settings.layout, settings.showShorts, loadMoreSearchResults])

  // D-030: the other half of B-010's unsubscribe — subscribes on YouTube,
  // may open the system browser once for incremental write-scope consent.
  const subscribeToChannel = useCallback(
    (channelId: string) => {
      void writeScopeGate
        .run(() => window.chronicle.subscribeChannel(channelId))
        .then((result) => {
          if (!result.ok) {
            if (result.errorKind === 'cancelled') {
              // User declined the write-scope dialog — no error to show.
            } else if (result.errorKind === 'auth-expired') {
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
              : current.map((r) =>
                  r.kind === 'channel' && r.channelId === channelId ? { ...r, subscribed: true } : r
                )
          )
        })
    },
    [connect, loadChannels, writeScopeGate]
  )

  // Opens a search channel result's screen even though it isn't subscribed
  // yet — ChannelHeader/getChannelDetail already work for any channelId;
  // only the video list needs this channel-preview path instead of the
  // usual local-feed pipeline (which has nothing for an unsynced channel).
  const openChannelPreview = useCallback(
    (channelId: string, title: string, thumbnailUrl: string | null) => {
      setSearchResults(null)
      setChannelFilter(channelId)
      setChannelPreview({
        channelId,
        title,
        thumbnailUrl,
        videos: [],
        nextPageToken: null,
        loading: true,
        loadingMore: false
      })
      void window.chronicle.getChannelVideos(channelId).then((result) => {
        setChannelPreview((current) => {
          if (current === null || current.channelId !== channelId) return current
          if (!result.ok) return { ...current, loading: false }
          return {
            ...current,
            loading: false,
            videos: result.value.videos,
            nextPageToken: result.value.nextPageToken
          }
        })
      })
    },
    []
  )

  const loadMoreChannelPreview = useCallback(() => {
    setChannelPreview((current) => {
      if (current === null || current.nextPageToken === null || current.loadingMore) return current
      const { channelId, nextPageToken } = current
      void window.chronicle.getChannelVideos(channelId, nextPageToken).then((result) => {
        setChannelPreview((c) => {
          if (c === null || c.channelId !== channelId) return c
          if (!result.ok) return { ...c, loadingMore: false }
          return {
            ...c,
            loadingMore: false,
            videos: [...c.videos, ...result.value.videos],
            nextPageToken: result.value.nextPageToken
          }
        })
      })
      return { ...current, loadingMore: true }
    })
  }, [])

  // B-107 follow-up: same "no overflow, so the onScroll near-end check
  // never fires" gap as search results above, for the channel-preview list
  // (browsing a not-yet-subscribed channel's uploads from a search result).
  useEffect(() => {
    const el = channelPreviewRef.current
    if (el && el.clientHeight > 0 && el.scrollHeight <= el.clientHeight) loadMoreChannelPreview()
  }, [channelPreview, settings.itemSize, settings.layout, loadMoreChannelPreview])

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

  // D-050: local-only "Custom" notification-scope membership — never touches
  // YouTube, same shape as toggleChannelFavorite above.
  const toggleChannelNotify = useCallback(
    (channelId: string) => {
      void window.chronicle.toggleChannelNotify(channelId).then(() => {
        loadChannels()
      })
    },
    [loadChannels]
  )

  // B-003: selecting an account is a second, independent filter dimension —
  // same mechanics as selecting a channel (clears on reselect).
  const selectAccount = useCallback(
    (accountId: string | null) => {
      closeSearch()
      leavePlayerForNavigation()
      setScreen('feed')
      setAccountFilter(accountId)
    },
    [closeSearch, leavePlayerForNavigation]
  )

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

  const syncAccountNow = useCallback(
    (accountId: string) => {
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
    },
    [connect]
  )

  function handleTopbarUnsubscribe(): void {
    if (!confirmingUnsubscribe) {
      setConfirmingUnsubscribe(true)
      confirmUnsubscribeTimer.current = window.setTimeout(
        () => setConfirmingUnsubscribe(false),
        6000
      )
      return
    }
    if (confirmUnsubscribeTimer.current !== null)
      window.clearTimeout(confirmUnsubscribeTimer.current)
    setConfirmingUnsubscribe(false)
    if (channelFilter !== null) unsubscribeChannel(channelFilter)
  }

  const patch = useCallback(
    (videoId: string, state: VideoStateDto) => {
      setVideos((current) =>
        current.map((video) => (video.videoId === videoId ? { ...video, state } : video))
      )
      // B-045: playerStack entries used to never get updated after the
      // initial open — harmless while the player only ever fully
      // remounted on a fresh openVideo() call, but PlayerDetails now stays
      // mounted (just hidden) across the miniplayer toggle, so its local
      // `state` (read/favorite/watch-later) would otherwise flicker back to
      // whatever it was when the video was first opened.
      setPlayerStack((current) =>
        current.map((video) => (video.videoId === videoId ? { ...video, state } : video))
      )
      syncMeta()
      // The sidebar's per-channel unread badge is a separate data source
      // (channels state) from the topbar's count (meta) — a read/unread
      // toggle needs to refresh both, or the sidebar number goes stale
      // until something unrelated happens to reload it.
      loadChannels()
    },
    [syncMeta, loadChannels]
  )

  // Opening the player marks the video read immediately (playback.md).
  const openVideo = useCallback(
    (videoId: string, mode: 'push' | 'replace' = 'push', startMini = false) => {
      void window.chronicle.getVideo(videoId).then(async (result) => {
        if (!result.ok) {
          setBanner({ text: t('app.banner.openVideoFailed', { message: result.message }) })
          return
        }
        const state = await window.chronicle.setReadStatus(videoId, 'read')
        patch(videoId, state)
        const entry = { ...result.value, state }
        setPlayerStack((stack) => (mode === 'replace' ? [entry] : [...stack, entry]))
        // Normally starts in full view, even if a previous video was docked
        // — startMini is only for the B-045 extract-window-closed path,
        // which hands a video back to the miniplayer, not the full view.
        setMiniplayer(startMini)
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
      // B-045: 'replace', not the default 'push' — opening a video from the
      // feed is a fresh browsing action, not "diving deeper" from within a
      // video's own description (which is what 'push' — the queue-stack
      // model — is for). Mattered only once mini mode existed: with a video
      // docked and playing, opening an unrelated one from the feed used to
      // push it on top of the docked one, leaving the docked video reachable
      // via Back as if it were a "previous screen" rather than a separate,
      // already-left-behind session.
      openVideo(video.videoId, 'replace')
    },
    [openVideo]
  )

  const closePlayer = useCallback(() => {
    setPlayerStack((stack) => stack.slice(0, -1))
    setMiniplayer(false)
  }, [])

  // Called automatically by PlayerSurface's own Esc/Back dock-vs-close
  // decision (`closeOrDock`) — there's no manual "dock" button in the UI
  // (removed per product-owner feedback: the ask was purely automatic).
  const dockPlayer = useCallback(() => setMiniplayer(true), [])

  // B-045: hands off a playback snapshot to a brand-new always-on-top
  // window rather than moving the live iframe there (impossible across
  // renderer processes) — then fully closes the in-app player, since the
  // video now lives in that window instead. `auto` (D-051) marks an
  // extraction triggered by closing the window to the tray rather than the
  // user pressing `p` — see extractPlayer's own doc comment for what that
  // changes about the extract window's close behavior.
  const extractToWindowInternal = useCallback(
    (auto: boolean) => {
      const video = playerStack.at(-1)
      if (video === undefined) return
      const snapshot = playerSurfaceRef.current?.getPlaybackSnapshot()
      void window.chronicle.extractPlayer(
        video.videoId,
        video.title,
        snapshot?.currentTimeSeconds ?? 0,
        snapshot?.playing ?? false,
        settings.defaultPlaybackRate,
        auto
      )
      setPlayerStack([])
      setMiniplayer(false)
    },
    [playerStack, settings.defaultPlaybackRate]
  )

  // Kept zero-arg on purpose, unlike extractToWindowInternal above: this is
  // handed straight to onClick/onKeyDown props elsewhere (PlayerDetails'
  // and MiniPlayerBar's Extract buttons, PlayerSurface's `p` handler), and a
  // raw `onClick={extractToWindow}` binding would otherwise forward the
  // click's MouseEvent as the first argument — exactly what broke live once
  // extractToWindowInternal grew an `auto` parameter for D-051: the event
  // object isn't structured-cloneable, so the IPC call silently failed while
  // the player had already closed, leaving no extract window at all.
  const extractToWindow = useCallback(() => extractToWindowInternal(false), [extractToWindowInternal])

  // D-051: the main window just closed to the tray (backgroundMode on) —
  // without this, a still-playing video would keep running silently behind
  // the tray icon with no easy way to stop it. popOutOnClose true (default)
  // pops it into the always-on-top extract window instead, same as `p`;
  // false just pauses it. No-op if nothing was playing.
  const handleClosedToTray = useCallback(() => {
    if (!(playerSurfaceRef.current?.isStillGoing() ?? false)) return
    if (settings.popOutOnClose) {
      extractToWindowInternal(true)
    } else {
      playerSurfaceRef.current?.pause()
    }
  }, [settings.popOutOnClose, extractToWindowInternal])

  // A channel name (in the feed, or from the player's video info) is its own
  // navigation target, distinct from opening the video/leaving the player. A
  // channel the user isn't subscribed to (e.g. reached from an external
  // video) has nothing in the local-feed pipeline, so it falls back to the
  // same channel-preview path search results use.
  const navigateToChannel = useCallback(
    (channelId: string, channelTitle: string) => {
      leavePlayerForNavigation()
      setScreen('feed')
      setView('all')
      if (channels.some((c) => c.channelId === channelId)) {
        setChannelFilter(channelId)
      } else {
        openChannelPreview(channelId, channelTitle, null)
      }
    },
    [channels, openChannelPreview, leavePlayerForNavigation]
  )

  // `/` while playing only focuses the search field — playback is left alone
  // until an actual search is submitted (runSearch itself leaves the player
  // then, since submitting is the real navigation, not focusing the field).
  const focusSearch = useCallback(() => {
    requestAnimationFrame(() => filterInputRef.current?.focus())
  }, [])

  // Shared by the feed's own `?`/Escape handling and the player's (B-102:
  // the player had no `?` case at all, so it never reached setHelpOpen).
  const toggleHelp = useCallback(() => setHelpOpen((open) => !open), [])

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
          emptyFeedLoadTriggeredRef.current = false
          break
        case 'refresh:progress':
          setProgress({ phase: event.phase, checked: event.checked, total: event.total })
          // The Shorts-identification phase only starts once every newly
          // discovered video is already hydrated and persisted — so if the
          // feed is still empty when it begins, there's already something
          // real to show instead of waiting out that (often slow) phase too.
          if (
            event.phase === 'shorts' &&
            feedEmptyRef.current &&
            !emptyFeedLoadTriggeredRef.current
          ) {
            emptyFeedLoadTriggeredRef.current = true
            loadView()
            loadChannels()
          }
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
          // B-110/D-048: YouTube's own RSS backend is flaky enough in
          // ordinary operation that a handful of per-cycle channel failures
          // is now expected background noise (retried automatically next
          // cycle) rather than something the owner can act on — surfacing
          // it every cycle regardless would just be a banner nobody can
          // ever make go away, working against a calm/predictable UI. Only
          // surface a *systemic* failure: every polled channel failing at
          // once, on a poll wide enough that random per-channel noise
          // couldn't plausibly explain it (a real network/connectivity
          // problem, unlike an ordinary transient 404/500 spread).
          if (event.report.outcome === 'failed' && event.report.channelsPolled > 1) {
            setFailureDetailsOpen(false)
            setBanner({
              text: t('app.banner.refreshAllFailed', { count: event.report.channelsFailed }),
              failureDetails: event.report.failures
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
        case 'update:available':
          setBanner({
            text: t('app.banner.updateAvailable', { version: event.version }),
            action: {
              label: t('app.banner.updateAction'),
              run: () => void window.chronicle.openExternalUrl(event.url)
            }
          })
          break
        case 'player:restoreFromExtract':
          queueRef.current = null
          openVideo(event.videoId, 'replace', true)
          break
        case 'app:closedToTray':
          handleClosedToTray()
          break
      }
    })
  }, [loadView, loadChannels, connect, syncMeta, openVideo, handleClosedToTray])

  const loadMore = useCallback(() => {
    if (loadingRef.current) return
    const targetView = viewRef.current
    const targetChannel = channelRef.current
    const targetAccount = accountRef.current
    // Captured, not incremented — loadMore continues the current session
    // rather than starting a new one. If a loadView call happens before
    // this resolves, the generation moves on and this response is discarded
    // outright (see loadView's own comment for why that matters).
    const generation = requestGenerationRef.current

    if (nextCursor) {
      loadingRef.current = true
      setLoadingMore(true)
      void window.chronicle
        .getFeed(targetView, nextCursor, targetChannel, targetAccount)
        .then((slice) => {
          if (requestGenerationRef.current !== generation) return
          loadingRef.current = false
          setLoadingMore(false)
          setVideos((current) => [...current, ...slice.videos])
          setNextCursor(slice.nextCursor)
        })
      return
    }

    // Local archive exhausted in a channel-filtered view — fetch older
    // videos from YouTube (uploads playlist paging + hydration) on demand,
    // then resume the exact same page instead of resetting to the top.
    if (targetChannel === null || archiveExhausted.has(targetChannel) || backfillingRef.current) {
      return
    }
    backfillingRef.current = true
    setLoadingMore(true)
    // The resume cursor comes from the last video actually on screen, not a
    // separately-tracked "last requested cursor" — the backend already
    // reports nextCursor as null once the local page comes back short of
    // the page limit (the common case for a channel whose whole archive is
    // one RSS-sized page), so a cursor tracked only inside the "there's
    // another local page" branch never gets set and silently stays at its
    // initial null. Retrying with a null cursor after backfill re-requests
    // page one from scratch, appending it as a duplicate "next page."
    const lastVideo = videos.at(-1)
    const cursorToRetry: FeedCursorDto | null = lastVideo
      ? {
          publishedAt: lastVideo.publishedAt,
          channelTitle: lastVideo.channelTitle,
          videoId: lastVideo.videoId
        }
      : null
    // B-002's own page cap (youtube-api.md: "bounded at 4 pages/call,
    // resumable") is a per-call pacing device, not a give-up point — a
    // channel whose next uploads-playlist stretch is entirely
    // already-known videos comes back `{ videosNew: 0, exhausted: false }`
    // with a resume token saved server-side. Nothing else re-triggers
    // FeedList's onNearEnd checks in that case (row count didn't change),
    // so without this loop the channel silently stalls forever once that
    // batch happens to land on an all-duplicates stretch.
    const runBackfill = (): void => {
      void window.chronicle.backfillChannelArchive(targetChannel).then((result) => {
        if (requestGenerationRef.current !== generation) {
          backfillingRef.current = false
          return
        }
        if (!result.ok) {
          backfillingRef.current = false
          setLoadingMore(false)
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
          backfillingRef.current = false
          setLoadingMore(false)
          void window.chronicle
            .getFeed(targetView, cursorToRetry, targetChannel, targetAccount)
            .then((slice) => {
              if (requestGenerationRef.current !== generation) return
              setVideos((current) => [...current, ...slice.videos])
              setNextCursor(slice.nextCursor)
            })
          return
        }
        if (!result.value.exhausted) {
          runBackfill()
          return
        }
        backfillingRef.current = false
        setLoadingMore(false)
      })
    }
    runBackfill()
  }, [nextCursor, archiveExhausted, connect, videos])

  // The `/` filter is a YouTube-search trigger only — it never re-filters
  // the already-loaded feed, so browsing local subscriptions and searching
  // YouTube can't be confused for two modes of the same field.
  const filtered = videos

  // A channel whose recent uploads are all Shorts comes back from getFeed
  // with zero rows once "Show Shorts" is off (the filter runs in SQL, so
  // nextCursor is already null) — exactly the condition loadMore's
  // channel-archive-backfill branch exists to handle. But that branch only
  // ever runs from FeedList's own onNearEnd/zero-height effects, and
  // FeedList isn't rendered at all when the feed is empty (replaced by the
  // "no videos" message below) — so an all-Shorts channel just sat on "no
  // videos" forever with no backfill request ever made. Same zero-height
  // fallback idea as the search-results/channel-preview effects elsewhere in
  // this file, but keyed on the empty state itself since there's no
  // scrollable container to measure when nothing renders. loadMore already
  // no-ops without a channel filter, mid-backfill, or once exhausted, so
  // this can't loop.
  useEffect(() => {
    if (filtered.length === 0 && channelFilter !== null) loadMore()
  }, [filtered.length, channelFilter, loadMore])

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
      // B-045: docked mode hands global keys back to normal feed navigation
      // — only the full-view layout (PlayerSurface's own keydown map) owns
      // them.
      if ((playerOpen && !miniplayer) || urlPromptOpen) return
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
        case 'M':
          // Capital, matching the existing g/G (single row vs. whole list)
          // convention — bulk actions get the shifted key of their
          // single-item counterpart.
          if (view === 'all' || view === 'unread') markAllRead()
          break
        case 'v':
          changeSettings({ ...settings, layout: settings.layout === 'grid' ? 'list' : 'grid' })
          break
        // B-105: the docked miniplayer's own maximize/close buttons
        // (MiniPlayerBar) had no keyboard path — only reachable while
        // `miniplayer` is actually docked (`playerOpen && miniplayer`),
        // same guard MiniPlayerBar's own rendering uses. `e` mirrors the
        // corner box's "⤢ expand" button; `x` mirrors its "✕ close" button.
        case 'e':
          if (playerOpen && miniplayer) setMiniplayer(false)
          break
        case 'x':
          if (playerOpen && miniplayer) closePlayer()
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
    miniplayer,
    urlPromptOpen,
    openFromFeed,
    screen,
    toggleSidebar,
    view,
    markAllRead,
    settings,
    changeSettings,
    closePlayer
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
  // B-105: a hover tooltip on the (i) icon next to the status text explains
  // what each sync phase actually does — only shown while a sync is running,
  // since the caught-up/unread-count states are self-explanatory.
  const statusInfoTitle = refreshing
    ? progress !== null
      ? progress.phase === 'shorts'
        ? t('app.status.filteringShortsInfo')
        : t('app.status.checkingChannelsInfo')
      : t('app.status.refreshingInfo')
    : null

  return (
    <div className={`app${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      {sidebarCollapsed ? (
        <button
          className="sidebar-expand"
          title={t('app.sidebar.showTitle')}
          onClick={toggleSidebar}
        >
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
            closeSearch()
            leavePlayerForNavigation()
            setScreen('feed')
            setChannelFilter(null)
            setView(next)
          }}
          onSelectChannel={(channelId) => {
            closeSearch()
            leavePlayerForNavigation()
            setScreen('feed')
            // A channel is a different scope entirely from the five views —
            // carrying over Unread/Watch Later/Favorites/Ignored made the
            // channel screen look broken (usually nothing in that
            // intersection).
            setView('all')
            setChannelFilter(channelId)
          }}
          onOpenSettings={() => {
            closeSearch()
            leavePlayerForNavigation()
            setScreen('settings')
            // B-015: refetch so the granted-scope line reflects any write
            // action (comment/like/subscribe/unsubscribe) taken since mount.
            void window.chronicle.getAuthStatus().then(setAuth)
          }}
          onToggleCollapse={toggleSidebar}
          onUnsubscribe={unsubscribeChannel}
          onToggleFavorite={toggleChannelFavorite}
          onToggleNotify={toggleChannelNotify}
          showNotifyControl={settings.notifyNewVideos && settings.notifyScope === 'selected'}
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
              <BannerBar
                banner={banner}
                detailsOpen={failureDetailsOpen}
                onToggleDetails={() => setFailureDetailsOpen((open) => !open)}
                onDismiss={() => setBanner(null)}
              />
            )}
            <SettingsView
              auth={auth}
              primaryAccountLabel={
                accounts.find((a) => a.isPrimary)?.label ?? t('app.topbar.channelFallback')
              }
              settings={settings}
              appVersion={appVersion}
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
              onChannelsChanged={loadChannels}
            />
          </>
        ) : (
          <>
            <header className="topbar">
              <button className="refresh" title={t('app.topbar.refreshTitle')} onClick={doRefresh}>
                <span className={`refresh-icon${refreshing ? ' spinning' : ''}`}>⟳</span>
              </button>
              <span className="topbar-view">
                {VIEW_LABELS[view]}
                {accountFilter !== null && (
                  <span className="topbar-account-suffix">
                    {' · '}
                    {accounts.find((a) => a.accountId === accountFilter)?.label ??
                      t('app.topbar.channelFallback')}
                  </span>
                )}
              </span>
              <span className="status">
                {statusText}
                {statusInfoTitle !== null && (
                  <span className="status-info" title={statusInfoTitle}>
                    ⓘ
                  </span>
                )}
              </span>
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
                      closeSearch()
                      filterInputRef.current?.focus()
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
              {(!playerOpen || miniplayer) && (
                <input
                  className="size-slider"
                  type="range"
                  min={0}
                  max={ITEM_SIZES.length - 1}
                  step={1}
                  value={ITEM_SIZES.indexOf(settings.itemSize)}
                  title={t('app.topbar.itemSizeTitle', { size: settings.itemSize })}
                  onChange={(event) =>
                    changeSettings({
                      ...settings,
                      itemSize: ITEM_SIZES[Number(event.target.value)]
                    })
                  }
                />
              )}
              {(!playerOpen || miniplayer) && (
                <button
                  className="layout-toggle"
                  title={
                    settings.layout === 'grid'
                      ? t('app.topbar.switchToListView')
                      : t('app.topbar.switchToGridView')
                  }
                  onClick={() =>
                    changeSettings({
                      ...settings,
                      layout: settings.layout === 'grid' ? 'list' : 'grid'
                    })
                  }
                >
                  {settings.layout === 'grid' ? '☰' : '⊞'}
                </button>
              )}
            </header>

            {(!playerOpen || miniplayer) &&
              channelFilter !== null &&
              searchResults === null &&
              (() => {
                const selectedChannel = channels.find((c) => c.channelId === channelFilter)
                const preview = channelPreview?.channelId === channelFilter ? channelPreview : null
                const headerChannel =
                  selectedChannel ??
                  (preview !== null
                    ? {
                        channelId: preview.channelId,
                        title: preview.title,
                        thumbnailUrl: preview.thumbnailUrl,
                        unreadCount: 0,
                        favorite: false,
                        notify: false
                      }
                    : undefined)
                return headerChannel !== undefined ? (
                  <ChannelHeader
                    channel={headerChannel}
                    subscribed={selectedChannel !== undefined}
                    confirmingUnsubscribe={confirmingUnsubscribe}
                    onUnsubscribe={handleTopbarUnsubscribe}
                    onSubscribe={() => subscribeToChannel(channelFilter)}
                    onToggleFavorite={() => toggleChannelFavorite(channelFilter)}
                    onToggleNotify={() => toggleChannelNotify(channelFilter)}
                    showNotifyControl={settings.notifyNewVideos && settings.notifyScope === 'selected'}
                    onOpenInBrowser={() =>
                      void window.chronicle.openExternalUrl(
                        `https://www.youtube.com/channel/${channelFilter}`
                      )
                    }
                  />
                ) : null
              })()}

            {banner !== null && (
              <BannerBar
                banner={banner}
                showAction
                detailsOpen={failureDetailsOpen}
                onToggleDetails={() => setFailureDetailsOpen((open) => !open)}
                onDismiss={() => setBanner(null)}
              />
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
                  <div
                    ref={searchResultsRef}
                    className={`search-results size-${settings.itemSize}`}
                    onScroll={(event) => {
                      const el = event.currentTarget
                      if (el.scrollHeight - el.scrollTop - el.clientHeight < 300)
                        loadMoreSearchResults()
                    }}
                  >
                    {searching && <div className="empty">{t('search.searching')}</div>}
                    {!searching && searchResults.length === 0 && (
                      <div className="empty">{t('search.empty')}</div>
                    )}
                    {(() => {
                      const visible = searchResults.filter(
                        (result) =>
                          result.kind !== 'video' || settings.showShorts || !result.isShort
                      )
                      if (settings.layout === 'grid') {
                        return (
                          <div
                            className="grid-row"
                            style={{
                              gridTemplateColumns: `repeat(auto-fill, minmax(${GRID_CARD_SIZES[settings.itemSize].minWidth}px, 1fr))`
                            }}
                          >
                            {visible.map((result) =>
                              result.kind === 'video' ? (
                                <SearchVideoCard
                                  key={result.videoId}
                                  result={result}
                                  onOpen={() => openVideo(result.videoId, 'replace')}
                                />
                              ) : (
                                <SearchChannelCard
                                  key={result.channelId}
                                  result={result}
                                  onOpen={() =>
                                    openChannelPreview(
                                      result.channelId,
                                      result.title,
                                      result.thumbnailUrl
                                    )
                                  }
                                  onSubscribe={() => subscribeToChannel(result.channelId)}
                                />
                              )
                            )}
                          </div>
                        )
                      }
                      // This list has no other keyboard path (unlike the main
                      // FeedList, which has global j/k/Enter navigation) — each
                      // row/card is individually focusable.
                      return visible.map((result) =>
                        result.kind === 'video' ? (
                          <SearchVideoRow
                            key={result.videoId}
                            result={result}
                            onOpen={() => openVideo(result.videoId, 'replace')}
                          />
                        ) : (
                          <SearchChannelRow
                            key={result.channelId}
                            result={result}
                            onOpen={() =>
                              openChannelPreview(
                                result.channelId,
                                result.title,
                                result.thumbnailUrl
                              )
                            }
                            onSubscribe={() => subscribeToChannel(result.channelId)}
                          />
                        )
                      )
                    })()}
                    {searchLoadingMore && (
                      <div className="feed-loading-more">{t('search.loadingMore')}</div>
                    )}
                  </div>
                ) : channelPreview !== null && channelPreview.channelId === channelFilter ? (
                  <div
                    ref={channelPreviewRef}
                    className={`search-results size-${settings.itemSize}`}
                    onScroll={(event) => {
                      const el = event.currentTarget
                      if (el.scrollHeight - el.scrollTop - el.clientHeight < 300)
                        loadMoreChannelPreview()
                    }}
                  >
                    {channelPreview.loading && <div className="empty">{t('search.searching')}</div>}
                    {!channelPreview.loading && channelPreview.videos.length === 0 && (
                      <div className="empty">{t('search.empty')}</div>
                    )}
                    {(() => {
                      const visible = channelPreview.videos.filter(
                        (video) => settings.showShorts || !video.isShort
                      )
                      if (settings.layout === 'grid') {
                        return (
                          <div
                            className="grid-row"
                            style={{
                              gridTemplateColumns: `repeat(auto-fill, minmax(${GRID_CARD_SIZES[settings.itemSize].minWidth}px, 1fr))`
                            }}
                          >
                            {visible.map((video) => (
                              <SearchVideoCard
                                key={video.videoId}
                                result={video}
                                onOpen={() => openVideo(video.videoId, 'replace')}
                              />
                            ))}
                          </div>
                        )
                      }
                      return visible.map((video) => (
                        <SearchVideoRow
                          key={video.videoId}
                          result={video}
                          onOpen={() => openVideo(video.videoId, 'replace')}
                        />
                      ))
                    })()}
                    {channelPreview.loadingMore && (
                      <div className="feed-loading-more">{t('search.loadingMore')}</div>
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
                                onOpen={() => openVideo(video.videoId, 'replace')}
                                onOpenChannel={() =>
                                  navigateToChannel(video.channelId, video.channelTitle)
                                }
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
                              onOpen={() => openVideo(video.videoId, 'replace')}
                              onOpenChannel={() =>
                                navigateToChannel(video.channelId, video.channelTitle)
                              }
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
                        onOpenChannel={(channelId) => {
                          const title =
                            filtered.find((v) => v.channelId === channelId)?.channelTitle ?? ''
                          navigateToChannel(channelId, title)
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
                  <>
                    <PlayerSurface
                      ref={playerSurfaceRef}
                      video={currentPlayerVideo}
                      state={currentPlayerVideo.state}
                      stackDepth={playerStack.length}
                      hasQueueNext={hasQueueNext}
                      defaultPlaybackRate={settings.defaultPlaybackRate}
                      active={!miniplayer}
                      alignTarget={miniplayer ? miniSlot : fullSlot}
                      helpOpen={helpOpen}
                      onNextInQueue={nextInQueue}
                      onClose={closePlayer}
                      onDock={dockPlayer}
                      onFocusSearch={focusSearch}
                      onToggleHelp={toggleHelp}
                      onToggleLike={() => playerDetailsRef.current?.toggleLike()}
                      onToggleSubscribe={() => playerDetailsRef.current?.toggleSubscribe()}
                      onToggleComments={() => playerDetailsRef.current?.toggleComments()}
                      onExtract={extractToWindow}
                      onStatePatched={patch}
                    />
                    <PlayerDetails
                      ref={playerDetailsRef}
                      video={currentPlayerVideo}
                      state={currentPlayerVideo.state}
                      stackDepth={playerStack.length}
                      hidden={miniplayer}
                      slotRef={setFullSlot}
                      onClose={() => playerSurfaceRef.current?.requestClose()}
                      onExtract={extractToWindow}
                      onOpenVideo={(videoId) => openVideo(videoId)}
                      onOpenChannel={navigateToChannel}
                      onStatePatched={patch}
                    />
                    <MiniPlayerBar
                      video={currentPlayerVideo}
                      hidden={!miniplayer}
                      width={settings.miniplayerWidth}
                      slotRef={setMiniSlot}
                      onMaximize={() => setMiniplayer(false)}
                      onClose={closePlayer}
                      onExtract={extractToWindow}
                      onResizeEnd={(width) =>
                        changeSettings({ ...settings, miniplayerWidth: width })
                      }
                    />
                  </>
                )}
              </div>
            )}
          </>
        )}
      </main>
      {helpOpen && <HelpOverlay onClose={() => setHelpOpen(false)} />}
      {writeScopeGate.dialog}
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
            openVideo(videoId, 'replace')
          }}
          onClose={() => setUrlPromptOpen(false)}
        />
      )}
    </div>
  )
}
