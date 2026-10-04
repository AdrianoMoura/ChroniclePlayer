import { useState } from 'react'
import { formatDuration } from './format'
import { t } from './i18n'
import { useDialogDismiss } from './useDialogDismiss'

interface ShareDialogProps {
  videoId: string
  videoTitle: string
  // null for a live video — no meaningful position to share, so the caller
  // never captured one and the timestamp checkbox doesn't apply.
  currentTimeSeconds: number | null
  onClose: () => void
}

// Reachable from the full-view player's topbar, next to the extract button.
// For a non-live video, opening this dialog already paused it (the
// caller's job, same rationale as the open-in-browser pause) — this
// component only builds the link and copies it.
export function ShareDialog({
  videoId,
  videoTitle,
  currentTimeSeconds,
  onClose
}: ShareDialogProps) {
  const [includeTimestamp, setIncludeTimestamp] = useState(false)
  const [copied, setCopied] = useState(false)
  const dismiss = useDialogDismiss(onClose)

  const url =
    includeTimestamp && currentTimeSeconds !== null
      ? `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(currentTimeSeconds)}s`
      : `https://www.youtube.com/watch?v=${videoId}`

  function copy(): void {
    void navigator.clipboard.writeText(url).then(() => setCopied(true))
  }

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div
        {...dismiss}
        className="overlay share-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <h2>{t('share.title')}</h2>
        <p className="share-video-title">{videoTitle}</p>
        <div className="share-url-row">
          <input
            className="filter share-url-input"
            readOnly
            value={url}
            onFocus={(event) => event.target.select()}
          />
          <button className="primary" onClick={copy}>
            {copied ? t('share.copied') : t('share.copy')}
          </button>
        </div>
        {currentTimeSeconds !== null && (
          <label className="share-timestamp-toggle">
            <input
              type="checkbox"
              checked={includeTimestamp}
              onChange={(event) => {
                setIncludeTimestamp(event.target.checked)
                setCopied(false)
              }}
            />
            {t('share.includeTimestamp', { time: formatDuration(Math.floor(currentTimeSeconds)) })}
          </label>
        )}
        <div className="share-actions">
          <button className="primary" onClick={onClose}>
            {t('share.done')}
          </button>
        </div>
      </div>
    </div>
  )
}
