import { useEffect, useRef, useState } from 'react'
import type { PlayerVideoDto, VideoRatingDto, VideoStateDto } from '../ipc/contract'
import { parseYouTubeUrl } from '../ipc/youtube-url'
import { CommentsSection } from './Comments'
import { formatDuration, publishedLabel } from './format'
import { t } from './i18n'
import { useWriteScopeGate } from './useWriteScopeGate'

// The full-view player's chrome — title, meta, action bar, description,
// comments — everything *around* the video surface. Split out of the
// original PlayerView (B-045) so the surface itself (`PlayerSurface`, the
// live iframe) can stay mounted and keep playing while this chrome is
// hidden (miniplayer) or shown (full view). Renders a slot `<div>` where
// `PlayerSurface` portals its content in — see `slotRef`.

interface PlayerDetailsProps {
  video: PlayerVideoDto
  state: VideoStateDto
  stackDepth: number
  // Stays mounted even while hidden (miniplayer mode) — see App.tsx: the
  // portal slot this renders must never disappear, or PlayerSurface would
  // have nowhere to portal its iframe into for a render pass, which unmounts
  // (and reloads) it.
  hidden: boolean
  slotRef: (element: HTMLDivElement | null) => void
  onClose: () => void
  onDock: () => void
  onOpenVideo: (videoId: string) => void
  onOpenChannel: (channelId: string, channelTitle: string) => void
  onStatePatched: (videoId: string, state: VideoStateDto) => void
}

export function PlayerDetails({
  video,
  state,
  stackDepth,
  hidden,
  slotRef,
  onClose,
  onDock,
  onOpenVideo,
  onOpenChannel,
  onStatePatched
}: PlayerDetailsProps) {
  const [descriptionOpen, setDescriptionOpen] = useState(false)
  const [descriptionOverflows, setDescriptionOverflows] = useState(false)
  // B-006: the user's own rating, fetched silently on open (a passive
  // background check — failures, e.g. not connected, are not worth a banner).
  const [rating, setRating] = useState<VideoRatingDto>('none')
  const [subscribed, setSubscribed] = useState(video.isSubscribed)
  const [actionError, setActionError] = useState<string | null>(null)
  const writeScopeGate = useWriteScopeGate()

  useEffect(() => {
    setDescriptionOpen(false)
    setDescriptionOverflows(false)
    setRating('none')
    setSubscribed(video.isSubscribed)
    setActionError(null)
    void window.chronicle.getVideoRating(video.videoId).then((result) => {
      if (result.ok) setRating(result.value)
    })
  }, [video.videoId, video.isSubscribed])

  function patch(next: VideoStateDto): void {
    onStatePatched(video.videoId, next)
  }

  function openInBrowser(): void {
    void window.chronicle.openInBrowser(video.videoId)
  }

  return (
    <div className="player-view" style={hidden ? { display: 'none' } : undefined}>
      <div className="player-topbar">
        <button className="player-back" onClick={onClose}>
          {stackDepth > 1 ? t('player.topbar.back') : t('player.topbar.backToFeed')} <kbd>Esc</kbd>
        </button>
        <button className="player-dock" title={t('player.topbar.miniplayerTitle')} onClick={onDock}>
          {t('player.topbar.miniplayer')}
        </button>
      </div>
      <div ref={slotRef} className="player-stage-slot" />

      <div className="player-info">
        <h1 className="player-title">{video.title}</h1>
        <div className="player-meta">
          <button
            type="button"
            className="channel-link"
            onClick={() => onOpenChannel(video.channelId, video.channelTitle)}
          >
            {video.channelTitle}
          </button>{' '}
          · {publishedLabel(video.publishedAt)}
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
              void writeScopeGate.run(() => window.chronicle.rateVideo(video.videoId, next)).then((result) => {
                if (result.ok) setRating(next)
                else if (result.errorKind !== 'cancelled') setActionError(result.message)
              })
            }}
          />
          <ActionButton
            label={subscribed ? t('player.action.subscribed') : t('player.action.subscribe')}
            active={subscribed}
            onClick={() => {
              setActionError(null)
              if (subscribed) {
                void writeScopeGate
                  .run(
                    () => window.chronicle.unsubscribeChannel(video.channelId),
                    () => window.chronicle.requestWriteScopeForChannel(video.channelId)
                  )
                  .then((result) => {
                    if (result.ok) setSubscribed(false)
                    else if (result.errorKind !== 'cancelled') setActionError(result.message)
                  })
              } else {
                void writeScopeGate
                  .run(() => window.chronicle.subscribeChannel(video.channelId))
                  .then((result) => {
                    if (result.ok) setSubscribed(true)
                    else if (result.errorKind !== 'cancelled') setActionError(result.message)
                  })
              }
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
      {writeScopeGate.dialog}
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
