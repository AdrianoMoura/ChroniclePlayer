import type { DislikeEstimateDto, VideoRatingDto } from '../ipc/contract'
import { ActionLabel } from './ActionLabel'
import { t } from './i18n'
import { ThumbDownIcon, ThumbUpIcon } from './icons'

// D-068: like/dislike toggle buttons plus a proportion bar underneath, split
// out from the rest of .player-actions so the bar/counts row has its own
// layout instead of squeezing into a flat button row. The real like count
// (YouTube's own statistics.likeCount, never removed) always renders when
// available; the dislike side is an opt-in third-party estimate
// (returnyoutubedislike.com, SettingsDto.showDislikeEstimate) that can be
// off, still loading, or failed — every one of those still shows the real
// like count and a mostly-green placeholder bar rather than hiding the
// whole thing, so the user is never left with less information than before.

// Neutral placeholder split shown whenever there's no real dislike number to
// draw a proportion from (off, loading, or a failed lookup) — not a real
// ratio, just a visual "no data here" cue distinct from an empty/0% bar.
const PLACEHOLDER_LIKE_SHARE = 85

function formatCount(count: number): string {
  return new Intl.NumberFormat(undefined, { notation: 'compact' }).format(count)
}

export function LikeDislikeBar({
  likeCount,
  rating,
  dislike,
  onToggleLike,
  onToggleDislike,
  onOpenSettings
}: {
  likeCount: number | null
  rating: VideoRatingDto
  // null while the dislike estimate lookup is still in flight.
  dislike: DislikeEstimateDto | null
  onToggleLike: () => void
  onToggleDislike: () => void
  onOpenSettings: () => void
}) {
  if (likeCount === null) return null

  const likeShare =
    dislike?.status === 'ok' && (likeCount > 0 || dislike.dislikeCount > 0)
      ? (likeCount / (likeCount + dislike.dislikeCount)) * 100
      : PLACEHOLDER_LIKE_SHARE

  return (
    <div className="like-dislike-block">
      <div className="like-dislike-buttons">
        <button
          type="button"
          className={`primary${rating === 'like' ? ' active' : ''}`}
          onClick={onToggleLike}
        >
          <ActionLabel text={rating === 'like' ? t('player.action.liked') : t('player.action.like')} />
        </button>
        <button
          type="button"
          className={`primary${rating === 'dislike' ? ' active' : ''}`}
          onClick={onToggleDislike}
        >
          <ActionLabel
            text={rating === 'dislike' ? t('player.action.disliked') : t('player.action.dislike')}
          />
        </button>
      </div>
      <div className="like-dislike-bar">
        <div className="like-dislike-bar-like" style={{ width: `${likeShare}%` }} />
        <div
          className={`like-dislike-bar-dislike${dislike?.status !== 'ok' ? ' placeholder' : ''}`}
          style={{ width: `${100 - likeShare}%` }}
        />
      </div>
      <div className="like-dislike-counts">
        <span className="like-dislike-count">
          <ThumbUpIcon /> {formatCount(likeCount)}
        </span>
        {dislike?.status === 'ok' ? (
          <span className="like-dislike-count">
            {formatCount(dislike.dislikeCount)} <ThumbDownIcon />
          </span>
        ) : dislike?.status === 'disabled' ? (
          <button
            type="button"
            className="like-dislike-info"
            title={t('player.dislikeEstimate.disabledHint')}
            onClick={onOpenSettings}
          >
            ⓘ
          </button>
        ) : dislike?.status === 'error' ? (
          <span className="like-dislike-info" title={t('player.dislikeEstimate.errorHint')}>
            ⓘ
          </span>
        ) : (
          <span className="like-dislike-count-loading" aria-hidden="true" />
        )}
      </div>
    </div>
  )
}
