import { useState } from 'react'
import { parseYouTubeUrl } from '../ipc/youtube-url'
import { t } from './i18n'

// Ctrl+O (ui.md, D-029): open any pasted YouTube video URL in-app.
interface UrlPromptProps {
  onOpenVideo: (videoId: string) => void
  onClose: () => void
}

export function UrlPrompt({ onOpenVideo, onClose }: UrlPromptProps) {
  const [value, setValue] = useState('')
  const [notice, setNotice] = useState<string | null>(null)

  function submit(): void {
    const link = parseYouTubeUrl(value)
    switch (link.kind) {
      case 'video':
        onOpenVideo(link.videoId)
        onClose()
        break
      case 'shorts':
        // D-028: Chronicle never plays Shorts; offer the browser instead.
        setNotice(t('urlPrompt.notice.shorts'))
        void window.chronicle.openExternalUrl(value.trim())
        setTimeout(onClose, 1600)
        break
      case 'channel':
      case 'playlist':
        setNotice(t('urlPrompt.notice.channelOrPlaylist'))
        void window.chronicle.openExternalUrl(value.trim())
        setTimeout(onClose, 1600)
        break
      default:
        setNotice(t('urlPrompt.notice.invalid'))
    }
  }

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="overlay url-prompt" onClick={(event) => event.stopPropagation()}>
        <h2>{t('urlPrompt.title')}</h2>
        <input
          autoFocus
          className="filter url-input"
          placeholder={t('urlPrompt.placeholder')}
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
            setNotice(null)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') submit()
            if (event.key === 'Escape') onClose()
            event.stopPropagation()
          }}
        />
        {notice !== null && <p className="url-notice">{notice}</p>}
      </div>
    </div>
  )
}
