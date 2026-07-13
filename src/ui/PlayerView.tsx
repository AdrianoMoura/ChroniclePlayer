import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PlayerVideoDto, VideoRatingDto, VideoStateDto } from '../ipc/contract'
import { parseYouTubeUrl } from '../ipc/youtube-url'
import { CommentsSection } from './Comments'
import { formatDuration, publishedLabel } from './format'
import { t } from './i18n'

// The clean-embed player view (playback.md, D-006): everything around the
// video surface is Chronicle's; the IFrame is driven over its postMessage
// protocol directly (no external API script), so `ended` swaps in our own
// end panel before YouTube's related-videos screen can appear.

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

interface PlayerViewProps {
  video: PlayerVideoDto
  stackDepth: number
  hasQueueNext: boolean
  defaultPlaybackRate: number
  onNextInQueue: () => void
  onClose: () => void
  onSearch: () => void
  onOpenVideo: (videoId: string) => void
  onStatePatched: (videoId: string, state: VideoStateDto) => void
}

type Surface = 'playing' | 'ended' | 'embed-blocked'

export function PlayerView({
  video,
  stackDepth,
  hasQueueNext,
  defaultPlaybackRate,
  onNextInQueue,
  onClose,
  onSearch,
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
  const [descriptionOverflows, setDescriptionOverflows] = useState(false)
  // B-006: the user's own rating, fetched silently on open (a passive
  // background check — failures, e.g. not connected, are not worth a banner).
  const [rating, setRating] = useState<VideoRatingDto>('none')
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    setSurface('playing')
    setState(video.state)
    setDescriptionOpen(false)
    setDescriptionOverflows(false)
    setRating('none')
    setActionError(null)
    void window.chronicle.getVideoRating(video.videoId).then((result) => {
      if (result.ok) setRating(result.value)
    })
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
        case '/':
          // Search shouldn't require leaving playback through a separate
          // step first — exits fully back to the feed (not just one level
          // of the queue stack, like Esc/Back) with the filter focused.
          onSearch()
          break
        default:
          return
      }
      event.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command, onClose, onSearch, video.videoId])

  // B-039: the mouse "back" side button (XButton1, event.button === 3) exits
  // the player, same as Esc/the visible Back button — mirrors what browsers
  // do with history-back.
  useEffect(() => {
    function onMouseUp(event: MouseEvent): void {
      if (event.button === 3) {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('mouseup', onMouseUp)
    return () => window.removeEventListener('mouseup', onMouseUp)
  }, [onClose])

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
    if (video.state.resumePositionSeconds !== null) {
      params.set('start', String(video.state.resumePositionSeconds))
    }
    return `${PLAYER_ORIGIN}/embed/${video.videoId}?${params.toString()}`
  }, [video.videoId, video.state.resumePositionSeconds])

  return (
    <div className="player-view">
      <div className="player-topbar">
        <button className="player-back" onClick={onClose}>
          {stackDepth > 1 ? t('player.topbar.back') : t('player.topbar.backToFeed')} <kbd>Esc</kbd>
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
                    void window.chronicle.toggleWatchLater(video.videoId).then(patch)
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

        {surface === 'embed-blocked' && (
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

      <div className="player-info">
        <h1 className="player-title">{video.title}</h1>
        <div className="player-meta">
          {video.channelTitle} · {publishedLabel(video.publishedAt)}
          {video.durationSeconds !== null && <> · {formatDuration(video.durationSeconds)}</>}
        </div>

        <div className="player-actions">
          <ActionButton
            label={state.readStatus === 'read' ? t('player.action.markUnread') : t('player.action.markRead')}
            onClick={() =>
              void window.chronicle
                .setReadStatus(video.videoId, state.readStatus === 'read' ? 'unread' : 'read')
                .then(patch)
            }
          />
          <ActionButton
            label={state.favorite ? t('player.action.favorited') : t('player.action.favorite')}
            active={state.favorite}
            onClick={() => void window.chronicle.toggleFavorite(video.videoId).then(patch)}
          />
          <ActionButton
            label={state.watchLater ? t('player.action.inWatchLater') : t('player.action.watchLater')}
            active={state.watchLater}
            onClick={() => void window.chronicle.toggleWatchLater(video.videoId).then(patch)}
          />
          <ActionButton
            label={rating === 'like' ? t('player.action.liked') : t('player.action.like')}
            active={rating === 'like'}
            onClick={() => {
              setActionError(null)
              const next = rating === 'like' ? 'none' : 'like'
              void window.chronicle.rateVideo(video.videoId, next).then((result) => {
                if (result.ok) setRating(next)
                else setActionError(result.message)
              })
            }}
          />
          <ActionButton
            label={t('player.action.ignore')}
            onClick={() =>
              void window.chronicle
                .setReadStatus(video.videoId, 'ignored')
                .then((next) => {
                  patch(next)
                  onClose()
                })
            }
          />
          <ActionButton label={t('player.action.openInBrowser')} onClick={openInBrowser} />
        </div>
        {actionError !== null && <p className="player-action-error">{actionError}</p>}

        {video.description !== null && video.description.length > 0 && (
          <div className="player-description">
            <Description
              text={video.description}
              onOpenVideo={onOpenVideo}
              clamped={!descriptionOpen}
              onOverflowChange={setDescriptionOverflows}
            />
            {(descriptionOverflows || descriptionOpen) && (
              <button
                className="description-toggle"
                onClick={() => setDescriptionOpen((o) => !o)}
              >
                {descriptionOpen ? t('player.description.showLess') : t('player.description.showMore')}
              </button>
            )}
          </div>
        )}

        <CommentsSection key={video.videoId} videoId={video.videoId} />
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
  onOpenVideo,
  clamped,
  onOverflowChange
}: {
  text: string
  onOpenVideo: (videoId: string) => void
  clamped: boolean
  onOverflowChange: (overflows: boolean) => void
}) {
  const textRef = useRef<HTMLParagraphElement>(null)

  // Only measurable while clamped: expanded, scrollHeight == clientHeight,
  // which must not retract the toggle.
  useEffect(() => {
    if (!clamped) return
    const el = textRef.current
    if (!el) return
    const measure = () => onOverflowChange(el.scrollHeight > el.clientHeight + 1)
    measure()
    // B-032: a same-mount measurement can run before web fonts finish
    // loading or before the container's final width settles (sidebar
    // toggle, window resize) — both change line-wrapping and therefore
    // whether the clamp actually cuts text off. Re-measure once layout
    // and fonts have settled, and on any later resize of the element.
    const raf = requestAnimationFrame(measure)
    void document.fonts?.ready.then(measure)
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [text, clamped, onOverflowChange])

  const parts = text.split(URL_PATTERN)
  return (
    <p ref={textRef} className={`description-text${clamped ? ' clamped' : ''}`}>
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
            title={link.kind === 'shorts' ? t('player.description.shortsLinkTitle') : part}
          >
            {part}
          </a>
        )
      })}
    </p>
  )
}
