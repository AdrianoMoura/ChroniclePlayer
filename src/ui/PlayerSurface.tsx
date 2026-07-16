import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState
} from 'react'
import type { PlayerVideoDto, VideoStateDto } from '../ipc/contract'
import { t } from './i18n'

// The live iframe + its postMessage widget protocol (playback.md, D-006) —
// split out of what used to be the whole PlayerView so it can stay mounted
// (and therefore never restart the video) across the full-view ↔ miniplayer
// transition (B-045).
//
// This renders at one single, fixed position in the tree (App.tsx) and is
// *never* reparented into PlayerDetails or MiniPlayerBar — a React portal
// was tried first and reverted, because moving an <iframe> to a different
// DOM parent (which is what a portal does under the hood, even without
// ever removing it from the document) makes Chromium reload it, same as
// any other cross-parent move. Instead this measures whichever "slot"
// placeholder element the current layout hands it (`alignTarget` — an
// empty div PlayerDetails/MiniPlayerBar render exactly where the video
// should visually appear) and mirrors its on-screen rect via a `position:
// fixed` wrapper. The iframe's actual DOM parent chain never changes.

const PLAYER_ORIGIN = 'https://www.youtube.com'

// A video within this many seconds (or this close to the end) of finishing
// counts as "done," not "in progress" — resuming from 0:03 or from the last
// few seconds of the credits would be more annoying than starting over.
const RESUME_MIN_SECONDS = 10
const RESUME_END_MARGIN_SECONDS = 30

function resumeValueFor(currentTime: number, durationSeconds: number | null): number | null {
  if (currentTime < RESUME_MIN_SECONDS) return null
  if (durationSeconds !== null && currentTime >= durationSeconds - RESUME_END_MARGIN_SECONDS) {
    return null
  }
  return Math.floor(currentTime)
}

type Surface = 'playing' | 'ended' | 'embed-blocked'

export interface PlayerSurfaceHandle {
  // B-045 extract-to-window: there's no way to move this iframe's DOM node
  // into a different BrowserWindow's renderer process, so extracting hands
  // off a snapshot (position + playing/paused) to a fresh instance there
  // instead — this is what reads that snapshot at the moment of extraction.
  getPlaybackSnapshot: () => { currentTimeSeconds: number; playing: boolean }
  // PlayerDetails' own topbar "Back" button lives in a different component
  // (it's only rendered in the full-view layout) but the dock-vs-close
  // decision needs the live playerStateRef this component owns — exposed
  // here so that button can trigger the exact same logic Esc/the mouse
  // back-button already use.
  requestClose: () => void
  // B-045: used both by this component's own dock-vs-close decision and by
  // App.tsx's "hard" navigation-away actions (sidebar clicks, submitting a
  // search, switching accounts) so leaving the player through any of those
  // paths docks consistently, not just Esc/Back. See `closeOrDock`'s own
  // comment for why this is deliberately lenient rather than a strict
  // `=== 1` (playing) check.
  isStillGoing: () => boolean
}

interface PlayerSurfaceProps {
  video: PlayerVideoDto
  state: VideoStateDto
  stackDepth: number
  hasQueueNext: boolean
  defaultPlaybackRate: number
  // Only the full-view layout owns global keyboard shortcuts and the mouse
  // back-button — the miniplayer hands the app back to normal feed
  // navigation (App.tsx's own j/k shortcuts resume instead).
  active: boolean
  alignTarget: HTMLElement | null
  // The shortcuts overlay is App.tsx state, not this component's — while
  // it's open, every key here except Escape/`?` (which close it) must be
  // swallowed instead of also acting on the video underneath.
  helpOpen: boolean
  onNextInQueue: () => void
  onClose: () => void
  onDock: () => void
  onFocusSearch: () => void
  onToggleHelp: () => void
  onToggleLike: () => void
  onToggleSubscribe: () => void
  onToggleComments: () => void
  onExtract: () => void
  onStatePatched: (videoId: string, state: VideoStateDto) => void
}

export const PlayerSurface = forwardRef<PlayerSurfaceHandle, PlayerSurfaceProps>(
  function PlayerSurface(
    {
      video,
      state,
      stackDepth,
      hasQueueNext,
      defaultPlaybackRate,
      active,
      alignTarget,
      helpOpen,
      onNextInQueue,
      onClose,
      onDock,
      onFocusSearch,
      onToggleHelp,
      onToggleLike,
      onToggleSubscribe,
      onToggleComments,
      onExtract,
      onStatePatched
    },
    ref
  ) {
    const iframeRef = useRef<HTMLIFrameElement>(null)
    const wrapperRef = useRef<HTMLDivElement>(null)
    const playerStateRef = useRef(-1)
    const currentTimeRef = useRef(0)
    const [surface, setSurface] = useState<Surface>('playing')
    const [rect, setRect] = useState<{
      top: number
      left: number
      width: number
      height: number
      // How much of the stage's own box to clip off its top/bottom edge so
      // it disappears behind `.player-view`'s visible bounds when scrolled,
      // instead of the fixed-position wrapper (which escapes that
      // container's `overflow-y: auto` clipping entirely) painting over the
      // topbar above it.
      clipTop: number
      clipBottom: number
    } | null>(null)

    useEffect(() => {
      setSurface('playing')
    }, [video.videoId])

    // Mirrors alignTarget's on-screen box exactly, without ever touching the
    // iframe's own DOM parent. The full-view stage slot lives in the normally
    // scrolling page (PlayerDetails/styles.css), so its on-screen rect changes
    // on every scroll tick, not just on resize/layout changes — re-measuring
    // is throttled to one `requestAnimationFrame` per tick rather than
    // recomputing synchronously on each scroll event.
    useEffect(() => {
      if (alignTarget === null) {
        setRect(null)
        return
      }
      let frame: number | null = null
      const measure = () => {
        const box = alignTarget.getBoundingClientRect()
        // Only the full-view slot sits inside a scrolling container — the
        // miniplayer's slot doesn't scroll, so there's nothing to clip
        // against there.
        const scrollParent = alignTarget.closest<HTMLElement>('.player-view')
        const containerBox = scrollParent?.getBoundingClientRect() ?? null
        const clipTop = containerBox === null ? 0 : Math.max(0, containerBox.top - box.top)
        const clipBottom =
          containerBox === null ? 0 : Math.max(0, box.top + box.height - containerBox.bottom)
        setRect({
          top: box.top,
          left: box.left,
          width: box.width,
          height: box.height,
          clipTop,
          clipBottom
        })
      }
      const scheduleMeasure = () => {
        if (frame !== null) return
        frame = requestAnimationFrame(() => {
          frame = null
          measure()
        })
      }
      measure()
      const observer = new ResizeObserver(scheduleMeasure)
      observer.observe(alignTarget)
      window.addEventListener('resize', scheduleMeasure)
      // `capture: true`: scroll events don't bubble, but do fire in the
      // capture phase on ancestors (including window) as they travel down to
      // whichever element actually scrolled — this is what lets one listener
      // here catch the page scrolling without needing a reference to
      // `.player-view` itself.
      window.addEventListener('scroll', scheduleMeasure, { capture: true, passive: true })
      return () => {
        if (frame !== null) cancelAnimationFrame(frame)
        observer.disconnect()
        window.removeEventListener('resize', scheduleMeasure)
        window.removeEventListener('scroll', scheduleMeasure, { capture: true })
      }
    }, [alignTarget])

    const command = useCallback((func: string, args: unknown[] = []) => {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func, args, id: 'chronicle', channel: 'widget' }),
        PLAYER_ORIGIN
      )
    }, [])

    // IFrame widget protocol: announce we're listening, then consume events.
    useEffect(() => {
      function onMessage(event: MessageEvent): void {
        if (event.origin !== PLAYER_ORIGIN || typeof event.data !== 'string') return
        let payload: { event?: string; info?: unknown }
        try {
          payload = JSON.parse(event.data) as { event?: string; info?: unknown }
        } catch {
          return
        }
        if (payload.event === 'onStateChange' && typeof payload.info === 'number') {
          playerStateRef.current = payload.info
          if (payload.info === 0) {
            setSurface('ended') // our overlay, never YouTube's
            void window.chronicle.setResumePosition(video.videoId, null)
          }
          // B-038: quality only takes effect once playback actually starts —
          // requesting it on ready alone isn't enough, YouTube can still pick
          // a bandwidth-heuristic default the moment the stream begins.
          if (payload.info === 1) {
            command('setPlaybackQuality', ['highres'])
            // D-038: same reissue-on-start safety net as quality above.
            if (defaultPlaybackRate !== 1) command('setPlaybackRate', [defaultPlaybackRate])
          }
          // Paused: a natural checkpoint to persist how far the user got,
          // without polling continuously while playing.
          if (payload.info === 2) {
            void window.chronicle.setResumePosition(
              video.videoId,
              resumeValueFor(currentTimeRef.current, video.durationSeconds)
            )
          }
        }
        if (payload.event === 'onError' && typeof payload.info === 'number') {
          // 101/150 = embedding disabled by the owner (playback.md).
          if (payload.info === 101 || payload.info === 150) setSurface('embed-blocked')
        }
        if (payload.event === 'infoDelivery') {
          const info = payload.info as { currentTime?: number } | undefined
          if (typeof info?.currentTime === 'number') currentTimeRef.current = info.currentTime
        }
      }
      window.addEventListener('message', onMessage)
      return () => window.removeEventListener('message', onMessage)
    }, [command, defaultPlaybackRate, video.videoId, video.durationSeconds])

    const announce = useCallback(() => {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'listening', id: 'chronicle', channel: 'widget' }),
        PLAYER_ORIGIN
      )
      // B-038: request the highest quality up front too, so it's already
      // set once playback starts (the onStateChange re-issue is the fallback
      // for the case YouTube resets it when the stream actually begins).
      command('setPlaybackQuality', ['highres'])
      // D-038: default playback speed, set from Settings. Applied here and
      // re-issued on actual playback start (above) for the same reason quality
      // is — YouTube can reset it once the stream begins.
      if (defaultPlaybackRate !== 1) command('setPlaybackRate', [defaultPlaybackRate])
    }, [command, defaultPlaybackRate])

    function openInBrowser(): void {
      void window.chronicle.openInBrowser(video.videoId)
    }

    // B-045: "is it still going" for the dock-vs-close decision — deliberately
    // lenient (true unless we have positive evidence otherwise: explicitly
    // ended (0) or paused (2)) rather than a strict `=== 1` (playing) check.
    // `playerStateRef` only updates once the iframe posts back its own
    // `onStateChange`, and that round trip firing promptly (or at all) for the
    // *autoplay-initiated* state, as opposed to a state change our own
    // `command()` calls triggered, isn't something to gate a core feature on —
    // treating unstarted/buffering/cued the same as playing means a real
    // in-progress video still docks even if that event happened to be slow,
    // dropped, or never distinctly observed.
    const isStillGoing = useCallback(() => {
      return playerStateRef.current !== 0 && playerStateRef.current !== 2
    }, [])

    // Leaving the full view while the video is still going docks to the
    // miniplayer instead of stopping it — but only from the outermost level of
    // the queue stack (a "Back" deeper in the stack still means "go to the
    // previous video," same as it always has). Explicitly paused/ended, or
    // deeper in the stack, closes exactly as before.
    const closeOrDock = useCallback(() => {
      if (stackDepth === 1 && isStillGoing()) onDock()
      else onClose()
    }, [stackDepth, onDock, onClose, isStillGoing])

    useImperativeHandle(
      ref,
      () => ({
        getPlaybackSnapshot: () => ({
          currentTimeSeconds: currentTimeRef.current,
          // Same lenient check as isStillGoing(), not a strict `=== 1`: the
          // autoplay-initiated onStateChange round trip isn't guaranteed to
          // have landed yet at the moment the user hits Extract, and a false
          // negative here means the handed-off window opens paused.
          playing: isStillGoing()
        }),
        requestClose: () => closeOrDock(),
        isStillGoing
      }),
      [closeOrDock, isStillGoing]
    )

    // Player keyboard map (playback.md): keys are proxied through the widget
    // protocol because the iframe swallows focus. Only live in the full-view
    // layout — the miniplayer hands global keys back to normal feed
    // navigation (`active` is false there).
    useEffect(() => {
      if (!active) return
      function onKeyDown(event: KeyboardEvent): void {
        if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
          return
        // The overlay owns Escape/`?` to close itself while open; every other
        // key is swallowed rather than also reaching the video underneath
        // (mirrors App.tsx's own `if (helpOpen)` guard for the feed).
        if (helpOpen) {
          if (event.key === 'Escape' || event.key === '?') {
            event.preventDefault()
            onToggleHelp()
          }
          return
        }
        switch (event.key) {
          case ' ': {
            // playerStateRef only updates once the iframe posts back its own
            // onStateChange — a round trip that isn't guaranteed to land
            // before the next keypress. Waiting for it made a second, rapid
            // Space press read the still-stale pre-command state and reissue
            // the same command as a no-op. Updating the ref optimistically,
            // right when the command is sent, means every subsequent press
            // toggles correctly regardless of that round trip's timing; the
            // real onStateChange event still arrives and reconciles it either
            // way, same as it always did.
            const playing = playerStateRef.current === 1
            command(playing ? 'pauseVideo' : 'playVideo')
            playerStateRef.current = playing ? 2 : 1
            break
          }
          case 'ArrowLeft':
            command('seekTo', [Math.max(0, currentTimeRef.current - 5), true])
            break
          case 'ArrowRight':
            command('seekTo', [currentTimeRef.current + 5, true])
            break
          case 'Escape':
            if (document.fullscreenElement) {
              void document.exitFullscreen()
            } else {
              closeOrDock()
            }
            break
          case 'b':
            openInBrowser()
            break
          case '/':
            // Only focuses the search field — playback keeps running
            // untouched. Actually leaving the video is left to submitting a
            // search (Enter in the field), not to focusing it.
            onFocusSearch()
            break
          // m/w/i/f mirror the feed's own single-key bindings for the video
          // currently open (parity gap identified alongside the `?` bug: these
          // already had a mouse path in PlayerDetails' action bar, just no
          // keyboard one while the player owned the keydown map). `f` is free
          // to reuse here — Chronicle's own fullscreen shortcut was removed
          // (bugs.md B-089).
          case 'm':
            void window.chronicle
              .setReadStatus(video.videoId, state.readStatus === 'read' ? 'unread' : 'read')
              .then((next) => onStatePatched(video.videoId, next))
            break
          case 'w':
            void window.chronicle
              .toggleWatchLater(video.videoId)
              .then((next) => onStatePatched(video.videoId, next))
            break
          case 'f':
            void window.chronicle
              .toggleFavorite(video.videoId)
              .then((next) => onStatePatched(video.videoId, next))
            break
          case 'i':
            // Same as PlayerDetails' mouse Ignore button: always sets
            // 'ignored' (no un-ignore toggle here, unlike the feed's `i` —
            // watching an already-ignored video in the player is rare enough
            // not to warrant it) and leaves the video the same way Esc/Back
            // would.
            void window.chronicle.setReadStatus(video.videoId, 'ignored').then((next) => {
              onStatePatched(video.videoId, next)
              closeOrDock()
            })
            break
          case 'l':
            onToggleLike()
            break
          case 's':
            onToggleSubscribe()
            break
          case 'c':
            onToggleComments()
            break
          case 'n':
            if (hasQueueNext) onNextInQueue()
            break
          case 'p':
            onExtract()
            break
          case '?':
            onToggleHelp()
            break
          default:
            return
        }
        event.preventDefault()
      }
      window.addEventListener('keydown', onKeyDown)
      return () => window.removeEventListener('keydown', onKeyDown)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      active,
      command,
      onFocusSearch,
      video.videoId,
      state.readStatus,
      state.favorite,
      state.watchLater,
      onStatePatched,
      closeOrDock,
      hasQueueNext,
      onNextInQueue,
      onExtract,
      onToggleLike,
      onToggleSubscribe,
      onToggleComments,
      helpOpen,
      onToggleHelp
    ])

    // B-039: the mouse "back" side button (XButton1, event.button === 3) exits
    // the player, same as Esc/the visible Back button — mirrors what browsers
    // do with history-back. Full-view only, same reasoning as the keyboard map.
    useEffect(() => {
      if (!active) return
      function onMouseUp(event: MouseEvent): void {
        if (event.button === 3) {
          event.preventDefault()
          closeOrDock()
        }
      }
      window.addEventListener('mouseup', onMouseUp)
      return () => window.removeEventListener('mouseup', onMouseUp)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active])

    // Persists the playback position for *this* video right as it's about to
    // stop being the one on screen — switching to another video (queue,
    // search) or closing the player entirely. Captures videoId/durationSeconds
    // in the closure at effect-creation time on purpose: the cleanup must save
    // the outgoing video's position, not whatever's incoming.
    useEffect(() => {
      const videoId = video.videoId
      const durationSeconds = video.durationSeconds
      return () => {
        void window.chronicle.setResumePosition(
          videoId,
          resumeValueFor(currentTimeRef.current, durationSeconds)
        )
      }
    }, [video.videoId, video.durationSeconds])

    // Clean-embed parameters (playback.md §The "clean embed" mandate).
    // Assumption noted in spec: modestbranding/rel have weakened over the
    // years; rel=0 still restricts related videos to the same channel.
    const embedSrc = useMemo(() => {
      const params = new URLSearchParams({
        autoplay: '1',
        rel: '0',
        modestbranding: '1',
        iv_load_policy: '3',
        controls: '1',
        enablejsapi: '1'
      })
      if (video.state.resumePositionSeconds !== null) {
        params.set('start', String(video.state.resumePositionSeconds))
      }
      return `${PLAYER_ORIGIN}/embed/${video.videoId}?${params.toString()}`
    }, [video.videoId, video.state.resumePositionSeconds])

    return (
      <>
        <div
          className="player-stage"
          ref={wrapperRef}
          style={
            rect === null
              ? { display: 'none' }
              : {
                  position: 'fixed',
                  top: rect.top,
                  left: rect.left,
                  width: rect.width,
                  height: rect.height,
                  clipPath:
                    rect.clipTop === 0 && rect.clipBottom === 0
                      ? undefined
                      : `inset(${rect.clipTop}px 0 ${rect.clipBottom}px 0)`
                }
          }
        >
          {surface !== 'embed-blocked' && (
            <iframe
              ref={iframeRef}
              key={video.videoId}
              className="player-iframe"
              src={embedSrc}
              title={video.title}
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
              onLoad={announce}
            />
          )}

          {active && surface === 'ended' && (
            <div className="player-overlay">
              <p className="overlay-title">{t('player.overlay.ended.title')}</p>
              <div className="overlay-actions">
                <button className="primary" onClick={onClose}>
                  {stackDepth > 1 ? t('player.overlay.back') : t('player.overlay.backToFeed')}
                </button>
                {hasQueueNext && (
                  <button className="primary" onClick={onNextInQueue}>
                    {t('player.overlay.nextInQueue')}
                  </button>
                )}
                {state.watchLater && (
                  <button
                    className="primary"
                    onClick={() =>
                      void window.chronicle
                        .toggleWatchLater(video.videoId)
                        .then((next) => onStatePatched(video.videoId, next))
                    }
                  >
                    {t('player.overlay.removeFromWatchLater')}
                  </button>
                )}
                <button className="primary" onClick={() => setSurface('playing')}>
                  {t('player.overlay.replay')}
                </button>
              </div>
            </div>
          )}

          {active && surface === 'embed-blocked' && (
            <div className="player-overlay">
              <p className="overlay-title">{t('player.overlay.embedBlockedTitle')}</p>
              <div className="overlay-actions">
                <button className="primary" onClick={openInBrowser}>
                  {t('player.overlay.openInBrowser')}
                </button>
                <button className="primary" onClick={onClose}>
                  {t('player.overlay.back')}
                </button>
              </div>
            </div>
          )}
        </div>
      </>
    )
  }
)
