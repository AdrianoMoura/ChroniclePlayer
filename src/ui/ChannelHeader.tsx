import { useEffect, useState } from 'react'
import type { ChannelDto } from '../ipc/contract'
import { formatSubscriberCount } from './format'
import { t } from './i18n'

interface ChannelHeaderProps {
  channel: ChannelDto
  confirmingUnsubscribe: boolean
  onUnsubscribe: () => void
  onOpenInBrowser: () => void
}

function thumbSrc(url: string): string {
  return `thumb://img/${encodeURIComponent(url)}`
}

// A compact channel screen header — avatar, banner, subscriber count,
// Unsubscribe/Open-in-browser. Deliberately a slim strip rather than
// YouTube's full-height banner: content should fill the available screen
// (D-004), and a giant banner eating the feed's vertical space would be the
// algorithm's aesthetic imposing itself, not the user's.
export function ChannelHeader({
  channel,
  confirmingUnsubscribe,
  onUnsubscribe,
  onOpenInBrowser
}: ChannelHeaderProps) {
  const [bannerUrl, setBannerUrl] = useState<string | null>(null)
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null)

  useEffect(() => {
    setBannerUrl(null)
    setSubscriberCount(null)
    // Fetched live on every visit rather than cached in the DB — 1 unit,
    // cheap enough, and it stays fresh without a staleness policy to design.
    void window.chronicle.getChannelDetail(channel.channelId).then((result) => {
      if (result.ok) {
        setBannerUrl(result.value.bannerUrl)
        setSubscriberCount(result.value.subscriberCount)
      }
    })
  }, [channel.channelId])

  return (
    <div
      className={`channel-header${bannerUrl !== null ? ' has-banner' : ''}`}
      style={bannerUrl !== null ? { backgroundImage: `url(${thumbSrc(bannerUrl)})` } : undefined}
    >
      <div className="channel-header-scrim">
        {channel.thumbnailUrl !== null ? (
          <img className="channel-header-avatar" alt="" src={thumbSrc(channel.thumbnailUrl)} />
        ) : (
          <div className="channel-header-avatar" />
        )}
        <div className="channel-header-info">
          <span className="channel-header-title">{channel.title}</span>
          {subscriberCount !== null && (
            <span className="channel-header-subs">{formatSubscriberCount(subscriberCount)}</span>
          )}
        </div>
        <div className="channel-header-actions">
          <button
            className="open-channel-btn"
            title={t('app.topbar.openChannelTitle')}
            onClick={onOpenInBrowser}
          >
            ↗
          </button>
          <button
            className={`unsubscribe-btn${confirmingUnsubscribe ? ' danger' : ''}`}
            onClick={onUnsubscribe}
          >
            {confirmingUnsubscribe ? t('app.topbar.confirmUnsubscribe') : t('app.topbar.unsubscribe')}
          </button>
        </div>
      </div>
    </div>
  )
}
