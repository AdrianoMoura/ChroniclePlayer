import type { KeyboardEvent } from 'react'
import type { SearchResultDto } from '../ipc/contract'
import { formatDuration, formatSubscriberCount } from './format'
import { t } from './i18n'

// Search results reuse the feed's item-size/layout conventions (row vs.
// card markup, the same duration/Short-badge classes) instead of a bespoke
// fixed-size list, and channel results get a circular avatar plus
// subscriber count instead of the same square video-thumb treatment.

type VideoResult = Extract<SearchResultDto, { kind: 'video' }>
type ChannelResult = Extract<SearchResultDto, { kind: 'channel' }>

function thumbSrc(url: string): string {
  return `thumb://img/${encodeURIComponent(url)}`
}

function useActivate(onOpen: () => void) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    onClick: onOpen,
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onOpen()
      }
    }
  }
}

export function SearchVideoRow({ result, onOpen }: { result: VideoResult; onOpen: () => void }) {
  return (
    <div className="row search-result-row" {...useActivate(onOpen)}>
      {result.thumbnailUrl !== null ? (
        <img className="thumb" loading="lazy" alt="" src={thumbSrc(result.thumbnailUrl)} />
      ) : (
        <div className="thumb" />
      )}
      <div className="row-text">
        <span className="title">{result.title}</span>
        <span className="meta">{result.channelTitle}</span>
      </div>
      {result.isShort && <span className="short-badge">{t('feed.card.shortBadge')}</span>}
      {result.durationSeconds !== null && (
        <span className="duration">{formatDuration(result.durationSeconds)}</span>
      )}
    </div>
  )
}

export function SearchVideoCard({ result, onOpen }: { result: VideoResult; onOpen: () => void }) {
  return (
    <div className="card search-result-card" {...useActivate(onOpen)}>
      <div className="card-thumb-wrap">
        {result.thumbnailUrl !== null ? (
          <img className="thumb" loading="lazy" alt="" src={thumbSrc(result.thumbnailUrl)} />
        ) : (
          <div className="thumb" />
        )}
        {result.isShort && (
          <span className="short-badge card-short-badge">{t('feed.card.shortBadge')}</span>
        )}
        {result.durationSeconds !== null && (
          <span className="duration card-duration">{formatDuration(result.durationSeconds)}</span>
        )}
      </div>
      <span className="title">{result.title}</span>
      <span className="meta">{result.channelTitle}</span>
    </div>
  )
}

export function SearchChannelRow({
  result,
  onSubscribe
}: {
  result: ChannelResult
  onSubscribe: () => void
}) {
  return (
    <div className="row search-result-row search-result-channel">
      {result.thumbnailUrl !== null ? (
        <img className="search-channel-avatar" loading="lazy" alt="" src={thumbSrc(result.thumbnailUrl)} />
      ) : (
        <div className="search-channel-avatar" />
      )}
      <div className="row-text">
        <span className="title">{result.title}</span>
        {result.subscriberCount !== null && (
          <span className="meta">{formatSubscriberCount(result.subscriberCount)}</span>
        )}
      </div>
      <button className="primary" disabled={result.subscribed} onClick={onSubscribe}>
        {result.subscribed ? t('search.subscribedButton') : t('search.subscribeButton')}
      </button>
    </div>
  )
}

export function SearchChannelCard({
  result,
  onSubscribe
}: {
  result: ChannelResult
  onSubscribe: () => void
}) {
  return (
    <div className="card search-result-channel-card">
      {result.thumbnailUrl !== null ? (
        <img className="search-channel-avatar" loading="lazy" alt="" src={thumbSrc(result.thumbnailUrl)} />
      ) : (
        <div className="search-channel-avatar" />
      )}
      <span className="title">{result.title}</span>
      {result.subscriberCount !== null && (
        <span className="meta">{formatSubscriberCount(result.subscriberCount)}</span>
      )}
      <button className="primary" disabled={result.subscribed} onClick={onSubscribe}>
        {result.subscribed ? t('search.subscribedButton') : t('search.subscribeButton')}
      </button>
    </div>
  )
}
