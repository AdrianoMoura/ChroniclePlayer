import type { FeedVideoDto } from '../ipc/contract'
import { t } from './i18n'

// Thumbnails go through the backend cache (thumb:// protocol) — the
// renderer never talks to Google hosts directly (architecture.md).
function thumbSrc(url: string): string {
  return `thumb://img/${encodeURIComponent(url)}`
}

interface UpNextCardProps {
  video: FeedVideoDto
  // "Up next from Watch Later" normally (D-055); "Next in {playlist name}"
  // when the video that just ended was opened from a playlist's own screen
  // instead — same card, same no-autoplay contract, just a different source.
  label: string
  onOpen: () => void
  onDismiss: () => void
}

// D-055: shown once the current video ends, if the Watch Later queue (or the
// playlist the current video was opened from) has a suggestion. Purely a
// suggestion — no autoplay, no timer, dismissible, gone the moment another
// video starts (non-goals.md: nothing plays without a click).
export function UpNextCard({ video, label, onOpen, onDismiss }: UpNextCardProps) {
  return (
    <div className="up-next-card">
      <button
        type="button"
        className="up-next-dismiss"
        onClick={onDismiss}
        title={t('player.upNext.dismiss')}
      >
        ×
      </button>
      <button type="button" className="up-next-open" onClick={onOpen}>
        {video.thumbnailUrl !== null && (
          <img className="up-next-thumb" loading="lazy" alt="" src={thumbSrc(video.thumbnailUrl)} />
        )}
        <div className="up-next-info">
          <span className="up-next-label">{label}</span>
          <span className="up-next-title">{video.title}</span>
        </div>
      </button>
    </div>
  )
}
