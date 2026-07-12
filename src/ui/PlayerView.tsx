import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PlayerVideoDto, VideoStateDto } from '../ipc/contract'
import { parseYouTubeUrl } from '../ipc/youtube-url'
import { formatDuration, publishedLabel } from './format'

// The clean-embed player view (playback.md, D-006): everything around the
// video surface is Chronicle's; the IFrame is driven over its postMessage
// protocol directly (no external API script), so `ended` swaps in our own
// end panel before YouTube's related-videos screen can appear.

const PLAYER_ORIGIN = 'https://www.youtube.com'

interface PlayerViewProps {
  video: PlayerVideoDto
  stackDepth: number
  hasQueueNext: boolean
  onNextInQueue: () => void
  onClose: () => void
  onOpenVideo: (videoId: string) => void
  onStatePatched: (videoId: string, state: VideoStateDto) => void
}

type Surface = 'playing' | 'ended' | 'embed-blocked'

export function PlayerView({
  video,
  stackDepth,
  hasQueueNext,
  onNextInQueue,
  onClose,
  onOpenVideo,
  onStatePatched
}: PlayerViewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const playerStateRef = useRef(-1)
  const currentTimeRef = useRef(0)
  const [surface, setSurface] = useState<Surface>('playing')
  const [state, setState] = useState(video.state)
  const [descriptionOpen, setDescriptionOpen] = useState(false)

  useEffect(() => {
    setSurface('playing')
    setState(video.state)
    setDescriptionOpen(false)
  }, [video.videoId, video.state])

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
        if (payload.info === 0) setSurface('ended') // our overlay, never YouTube's
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
  }, [])

  const announce = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'listening', id: 'chronicle', channel: 'widget' }),
      PLAYER_ORIGIN
    )
  }, [])

  // Player keyboard map (playback.md): keys are proxied through the widget
  // protocol because the iframe swallows focus.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.target instanceof HTMLInputElement) return
      switch (event.key) {
        case ' ':
          command(playerStateRef.current === 1 ? 'pauseVideo' : 'playVideo')
          break
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
            onClose()
          }
          break
        case 'b':
          openInBrowser()
          break
        default:
          return
      }
      event.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command, onClose, video.videoId])

  function patch(next: VideoStateDto): void {
    setState(next)
    onStatePatched(video.videoId, next)
  }

  function openInBrowser(): void {
    void window.chronicle.openInBrowser(video.videoId)
  }

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
    return `${PLAYER_ORIGIN}/embed/${video.videoId}?${params.toString()}`
  }, [video.videoId])

  return (
    <div className="player-view">
      <div className="player-topbar">
        <button className="player-back" onClick={onClose}>
          ← {stackDepth > 1 ? 'Back' : 'Back to feed'} <kbd>Esc</kbd>
        </button>
      </div>
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

        {surface === 'ended' && (
          <div className="player-overlay">
            <p className="overlay-title">That’s the end.</p>
            <div className="overlay-actions">
              <button className="primary" onClick={onClose}>
                {stackDepth > 1 ? 'Back (Esc)' : 'Back to feed (Esc)'}
              </button>
              {hasQueueNext && (
                <button className="primary" onClick={onNextInQueue}>
                  Next in queue
                </button>
              )}
              {state.watchLater && (
                <button
                  className="primary"
                  onClick={() =>
                    void window.chronicle.toggleWatchLater(video.videoId).then(patch)
                  }
                >
                  Remove from Watch Later
                </button>
              )}
              <button className="primary" onClick={() => setSurface('playing')}>
                Replay
              </button>
            </div>
          </div>
        )}

        {surface === 'embed-blocked' && (
          <div className="player-overlay">
            <p className="overlay-title">This channel disabled embedded playback.</p>
            <div className="overlay-actions">
              <button className="primary" onClick={openInBrowser}>
                Open in browser
              </button>
              <button className="primary" onClick={onClose}>
                Back (Esc)
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="player-info">
        <h1 className="player-title">{video.title}</h1>
        <div className="player-meta">
          {video.channelTitle} · {publishedLabel(video.publishedAt)}
          {video.durationSeconds !== null && <> · {formatDuration(video.durationSeconds)}</>}
        </div>

        <div className="player-actions">
          <ActionButton
            label={state.readStatus === 'read' ? 'Mark unread' : 'Mark read'}
            onClick={() =>
              void window.chronicle
                .setReadStatus(video.videoId, state.readStatus === 'read' ? 'unread' : 'read')
                .then(patch)
            }
          />
          <ActionButton
            label={state.favorite ? '★ Favorited' : '☆ Favorite'}
            active={state.favorite}
            onClick={() => void window.chronicle.toggleFavorite(video.videoId).then(patch)}
          />
          <ActionButton
            label={state.watchLater ? 'In Watch Later' : 'Watch later'}
            active={state.watchLater}
            onClick={() => void window.chronicle.toggleWatchLater(video.videoId).then(patch)}
          />
          <ActionButton
            label="Ignore"
            onClick={() =>
              void window.chronicle
                .setReadStatus(video.videoId, 'ignored')
                .then((next) => {
                  patch(next)
                  onClose()
                })
            }
          />
          <ActionButton label="Open in browser (b)" onClick={openInBrowser} />
        </div>

        {video.description !== null && video.description.length > 0 && (
          <div className="player-description">
            <button className="description-toggle" onClick={() => setDescriptionOpen((o) => !o)}>
              {descriptionOpen ? 'Hide description' : 'Show description'}
            </button>
            {descriptionOpen && (
              <Description text={video.description} onOpenVideo={onOpenVideo} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ActionButton({
  label,
  active = false,
  onClick
}: {
  label: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <button className={`primary${active ? ' active' : ''}`} onClick={onClick}>
      {label}
    </button>
  )
}

// Description links follow the D-029 rules: video → in-app (navigation
// stack), Shorts → browser (D-028), everything else → browser.
const URL_PATTERN = /(https?:\/\/[^\s<>()]+)/g

function Description({
  text,
  onOpenVideo
}: {
  text: string
  onOpenVideo: (videoId: string) => void
}) {
  const parts = text.split(URL_PATTERN)
  return (
    <p className="description-text">
      {parts.map((part, index) => {
        if (!URL_PATTERN.test(part) && !/^https?:\/\//.test(part)) {
          return <span key={index}>{part}</span>
        }
        const link = parseYouTubeUrl(part)
        return (
          <a
            key={index}
            href={part}
            onClick={(event) => {
              event.preventDefault()
              if (link.kind === 'video') onOpenVideo(link.videoId)
              else void window.chronicle.openExternalUrl(part)
            }}
            title={link.kind === 'shorts' ? 'Shorts open in the browser (Chronicle never plays Shorts)' : part}
          >
            {part}
          </a>
        )
      })}
    </p>
  )
}
