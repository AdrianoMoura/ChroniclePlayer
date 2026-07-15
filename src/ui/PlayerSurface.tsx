import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { PlayerVideoDto, VideoStateDto } from '../ipc/contract'
import { t } from './i18n'

// The live iframe + its postMessage widget protocol (playback.md, D-006) —
// split out of what used to be the whole PlayerView so it can stay mounted
// (and therefore never restart the video) across the full-view ↔ miniplayer
// transition (B-045). Portals its rendered output into whichever slot
// element the caller currently hands it — see `portalTarget`.

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
  portalTarget: HTMLElement | null
  onNextInQueue: () => void
  onClose: () => void
  onDock: () => void
  onFocusSearch: () => void
  onStatePatched: (videoId: string, state: VideoStateDto) => void
}

export const PlayerSurface = forwardRef<PlayerSurfaceHandle, PlayerSurfaceProps>(function PlayerSurface(
  {
    video,
    state,
    stackDepth,
    hasQueueNext,
    defaultPlaybackRate,
    active,
    portalTarget,
    onNextInQueue,
    onClose,
    onDock,
    onFocusSearch,
    onStatePatched
  },
  ref
) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const playerStateRef = useRef(-1)
  const currentTimeRef = useRef(0)
  const [surface, setSurface] = useState<Surface>('playing')

  useEffect(() => {
    setSurface('playing')
  }, [video.videoId])

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

  // B-045: leaving the full view while the video is actually playing docks
  // to the miniplayer instead of stopping it — but only from the outermost
  // level of the queue stack (a "Back" deeper in the stack still means "go
  // to the previous video," same as it always has) and only via Esc/the
  // Back button, matching the original ask ("leaving the player screen
  // while a video is playing"). Paused/ended, or deeper in the stack, closes
  // exactly as before.
  const closeOrDock = useCallback(() => {
    if (stackDepth === 1 && playerStateRef.current === 1) onDock()
    else onClose()
  }, [stackDepth, onDock, onClose])

  useImperativeHandle(
    ref,
    () => ({
      getPlaybackSnapshot: () => ({
        currentTimeSeconds: currentTimeRef.current,
        playing: playerStateRef.current === 1
      }),
      requestClose: () => closeOrDock()
    }),
    [closeOrDock]
  )

  // Player keyboard map (playback.md): keys are proxied through the widget
  // protocol because the iframe swallows focus. Only live in the full-view
  // layout — the miniplayer hands global keys back to normal feed
  // navigation (`active` is false there).
  useEffect(() => {
    if (!active) return
    function onKeyDown(event: KeyboardEvent): void {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
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
        case 'f':
          if (document.fullscreenElement) void document.exitFullscreen()
          else void wrapperRef.current?.requestFullscreen()
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
        default:
          return
      }
      event.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, command, onFocusSearch, video.videoId])

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

  if (portalTarget === null) return null

  return createPortal(
    <div className="player-stage" ref={wrapperRef}>
      {surface !== 'embed-blocked' && (
        <iframe
          ref={iframeRef}
          key={video.videoId}
          className="player-iframe"
          src={embedSrc}
          title={video.title}
          allow="autoplay; encrypted-media; fullscreen"
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
    </div>,
    portalTarget
  )
})
