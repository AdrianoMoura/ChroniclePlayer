import type { KeyboardEvent, MouseEvent } from 'react'
import type { SearchResultDto } from '../ipc/contract'
import { formatDuration, formatSubscriberCount } from './format'
import { t } from './i18n'

// Search results reuse the feed's item-size/layout conventions (row vs.
// card markup, the same duration/Short-badge classes) instead of a bespoke
// fixed-size list, and channel results get a circular avatar plus
// subscriber count instead of the same square video-thumb treatment.

type VideoResult = Extract<SearchResultDto, { kind: 'video' }>
type ChannelResult = Extract<SearchResultDto, { kind: 'channel' }>

// B-131: favorite/Watch Later/Add to Playlist/open-in-browser for a video
// result — free-text search or a non-subscribed channel's preview. No
// ignore here (unlike the main feed's own VideoActions) — same call as
// B-128's for a playlist's own rows: ignoring a video from a channel the
// user doesn't even follow reads as a non-action, not "hide this".
export interface SearchVideoActions {
  toggleFavorite: (result: VideoResult) => void
  toggleWatchLater: (result: VideoResult) => void
  addToPlaylist: (result: VideoResult) => void
  openInBrowser: (result: VideoResult) => void
}

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

function stop(event: MouseEvent, action: () => void): void {
  event.stopPropagation()
  action()
}

function VideoActionButtons({
  result,
  actions,
  className
}: {
  result: VideoResult
  actions: SearchVideoActions
  className: string
}) {
  return (
    <div className={className}>
      <button
        title={t('feed.card.toggleFavoriteTitle')}
        onClick={(e) => stop(e, () => actions.toggleFavorite(result))}
      >
        ★
      </button>
      <button
        title={t('feed.card.addToPlaylistTitle')}
        onClick={(e) => stop(e, () => actions.addToPlaylist(result))}
      >
        ⊕
      </button>
      <button
        title={t('feed.card.toggleWatchLaterTitle')}
        onClick={(e) => stop(e, () => actions.toggleWatchLater(result))}
      >
        ▶︎⁺
      </button>
      <button
        title={t('feed.card.openInBrowserTitle')}
        onClick={(e) => stop(e, () => actions.openInBrowser(result))}
      >
        ↗
      </button>
    </div>
  )
}

export function SearchVideoRow({
  result,
  onOpen,
  actions
}: {
  result: VideoResult
  onOpen: () => void
  actions?: SearchVideoActions
}) {
  const dimmed = result.readStatus !== 'unread'
  return (
    <div className={`row search-result-row${dimmed ? ' dimmed' : ''}`} {...useActivate(onOpen)}>
      {result.thumbnailUrl !== null ? (
        <img className="thumb" loading="lazy" alt="" src={thumbSrc(result.thumbnailUrl)} />
      ) : (
        <div className="thumb" />
      )}
      <div className="row-text">
        <span className="title">{result.title}</span>
        <span className="meta">
          {result.channelTitle}
          {result.favorite && <span className="glyph" title={t('feed.card.favoriteTitle')}> ★</span>}
          {result.watchLater && (
            <span className="glyph" title={t('feed.card.watchLaterTitle')}> ▶︎⁺</span>
          )}
        </span>
      </div>
      {actions !== undefined && (
        <VideoActionButtons result={result} actions={actions} className="row-actions" />
      )}
      {result.isShort && <span className="short-badge">{t('feed.card.shortBadge')}</span>}
      {result.durationSeconds !== null && (
        <span className="duration">{formatDuration(result.durationSeconds)}</span>
      )}
    </div>
  )
}

export function SearchVideoCard({
  result,
  onOpen,
  actions
}: {
  result: VideoResult
  onOpen: () => void
  actions?: SearchVideoActions
}) {
  const dimmed = result.readStatus !== 'unread'
  return (
    <div className={`card search-result-card${dimmed ? ' dimmed' : ''}`} {...useActivate(onOpen)}>
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
        {actions !== undefined && (
          <VideoActionButtons result={result} actions={actions} className="row-actions card-actions" />
        )}
      </div>
      <span className="title">{result.title}</span>
      <span className="meta">
        {result.channelTitle}
        {result.favorite && <span className="glyph" title={t('feed.card.favoriteTitle')}> ★</span>}
        {result.watchLater && (
          <span className="glyph" title={t('feed.card.watchLaterTitle')}> ▶︎⁺</span>
        )}
      </span>
    </div>
  )
}

export function SearchChannelRow({
  result,
  onOpen,
  onSubscribe
}: {
  result: ChannelResult
  onOpen: () => void
  onSubscribe: () => void
}) {
  return (
    <div className="row search-result-row search-result-channel" {...useActivate(onOpen)}>
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
      <button
        className="primary"
        disabled={result.subscribed}
        onClick={(event) => {
          event.stopPropagation()
          onSubscribe()
        }}
      >
        {result.subscribed ? t('search.subscribedButton') : t('search.subscribeButton')}
      </button>
    </div>
  )
}

export function SearchChannelCard({
  result,
  onOpen,
  onSubscribe
}: {
  result: ChannelResult
  onOpen: () => void
  onSubscribe: () => void
}) {
  return (
    <div className="card search-result-channel-card" {...useActivate(onOpen)}>
      {result.thumbnailUrl !== null ? (
        <img className="search-channel-avatar" loading="lazy" alt="" src={thumbSrc(result.thumbnailUrl)} />
      ) : (
        <div className="search-channel-avatar" />
      )}
      <span className="title">{result.title}</span>
      {result.subscriberCount !== null && (
        <span className="meta">{formatSubscriberCount(result.subscriberCount)}</span>
      )}
      <button
        className="primary"
        disabled={result.subscribed}
        onClick={(event) => {
          event.stopPropagation()
          onSubscribe()
        }}
      >
        {result.subscribed ? t('search.subscribedButton') : t('search.subscribeButton')}
      </button>
    </div>
  )
}
