import { useEffect, useMemo, useState, type RefObject } from 'react'
import type { ChannelDto, FeedViewDto } from '../ipc/contract'
import { t } from './i18n'

export const VIEW_ORDER: readonly FeedViewDto[] = [
  'all',
  'unread',
  'watch-later',
  'favorites',
  'ignored'
]

export const VIEW_LABELS: Record<FeedViewDto, string> = {
  all: t('sidebar.view.all'),
  unread: t('sidebar.view.unread'),
  'watch-later': t('sidebar.view.watchLater'),
  favorites: t('sidebar.view.favorites'),
  ignored: t('sidebar.view.ignored')
}

interface SidebarProps {
  view: FeedViewDto
  unreadCount: number
  watchLaterCount: number
  channels: ChannelDto[]
  channelFilter: string | null
  channelQueryRef: RefObject<HTMLInputElement | null>
  settingsOpen: boolean
  onSelectView: (view: FeedViewDto) => void
  onSelectChannel: (channelId: string | null) => void
  onOpenSettings: () => void
  onToggleCollapse: () => void
  onUnsubscribe: (channelId: string) => void
  onToggleFavorite: (channelId: string) => void
}

export function Sidebar({
  view,
  unreadCount,
  watchLaterCount,
  channels,
  channelFilter,
  channelQueryRef,
  settingsOpen,
  onSelectView,
  onSelectChannel,
  onOpenSettings,
  onToggleCollapse,
  onUnsubscribe,
  onToggleFavorite
}: SidebarProps) {
  // Local channel-name filter (B-024) — over the user's own subscriptions,
  // never YouTube search.
  const [channelQuery, setChannelQuery] = useState('')
  // Per-row "…" context menu (B-010): armed twice before it actually acts,
  // same pattern as Settings' delete-all confirmation.
  const [menuChannelId, setMenuChannelId] = useState<string | null>(null)
  const [confirmingUnsub, setConfirmingUnsub] = useState<string | null>(null)

  const visibleChannels = useMemo(() => {
    const query = channelQuery.trim().toLowerCase()
    if (!query) return channels
    return channels.filter((channel) => channel.title.toLowerCase().includes(query))
  }, [channels, channelQuery])

  useEffect(() => {
    if (menuChannelId === null) return
    function closeMenu(): void {
      setMenuChannelId(null)
      setConfirmingUnsub(null)
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') closeMenu()
    }
    document.addEventListener('click', closeMenu)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('click', closeMenu)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuChannelId])

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <button
          className="sidebar-toggle"
          title={t('sidebar.collapseTitle')}
          onClick={onToggleCollapse}
        >
          ☰
        </button>
      </div>
      <nav>
        {VIEW_ORDER.map((candidate, index) => (
          <button
            key={candidate}
            className={`view${candidate === view && channelFilter === null ? ' active' : ''}`}
            onClick={() => onSelectView(candidate)}
          >
            <span className="view-key">{index + 1}</span>
            <span className="view-label">{VIEW_LABELS[candidate]}</span>
            {candidate === 'unread' && unreadCount > 0 && (
              <span className="view-count">{unreadCount}</span>
            )}
            {candidate === 'watch-later' && watchLaterCount > 0 && (
              <span className="view-count">{watchLaterCount}</span>
            )}
          </button>
        ))}
      </nav>

      {channels.length > 0 && (
        <div className="channel-list">
          <h3 className="channel-list-header">{t('sidebar.channelsHeader')}</h3>
          <div className="field-wrap">
            <input
              ref={channelQueryRef}
              className="channel-query"
              placeholder={t('sidebar.findChannelPlaceholder')}
              value={channelQuery}
              onChange={(event) => setChannelQuery(event.target.value)}
              onKeyDown={(event) => {
                // Owned here, not by App's global handler (which clears the
                // feed filter): Esc clears this query, Enter just leaves.
                if (event.key === 'Escape') {
                  setChannelQuery('')
                  event.currentTarget.blur()
                } else if (event.key === 'Enter') {
                  // B-030: Enter opens the first filtered match, mirroring a
                  // normal search-and-go field.
                  const first = visibleChannels[0]
                  if (first) onSelectChannel(first.channelId)
                  event.currentTarget.blur()
                }
                event.stopPropagation()
              }}
            />
            {channelQuery !== '' && (
              <button
                className="field-clear"
                title={t('sidebar.clearTitle')}
                onClick={() => {
                  setChannelQuery('')
                  channelQueryRef.current?.focus()
                }}
              >
                ✕
              </button>
            )}
          </div>
          {visibleChannels.map((channel) => (
            <div key={channel.channelId} className="channel-row">
              <button
                className={`view channel${channelFilter === channel.channelId ? ' active' : ''}`}
                title={channel.title}
                onClick={() =>
                  onSelectChannel(channelFilter === channel.channelId ? null : channel.channelId)
                }
              >
                <span className="view-label ellipsis">{channel.title}</span>
                {channel.favorite && (
                  <span className="glyph" title={t('sidebar.channelMenu.favorited')}>
                    ★
                  </span>
                )}
                {channel.unreadCount > 0 && (
                  <span className="view-count">{channel.unreadCount}</span>
                )}
              </button>
              <button
                className="channel-menu-btn"
                title={t('sidebar.channelMenu.title')}
                onClick={(event) => {
                  event.stopPropagation()
                  setConfirmingUnsub(null)
                  setMenuChannelId((current) => (current === channel.channelId ? null : channel.channelId))
                }}
              >
                ⋯
              </button>
              {menuChannelId === channel.channelId && (
                <div className="channel-menu" onClick={(event) => event.stopPropagation()}>
                  <button
                    onClick={() => {
                      onToggleFavorite(channel.channelId)
                      setMenuChannelId(null)
                    }}
                  >
                    {channel.favorite
                      ? t('sidebar.channelMenu.unfavorite')
                      : t('sidebar.channelMenu.favorite')}
                  </button>
                  <button
                    className={confirmingUnsub === channel.channelId ? 'danger' : ''}
                    onClick={() => {
                      if (confirmingUnsub === channel.channelId) {
                        onUnsubscribe(channel.channelId)
                        setMenuChannelId(null)
                        setConfirmingUnsub(null)
                      } else {
                        setConfirmingUnsub(channel.channelId)
                      }
                    }}
                  >
                    {confirmingUnsub === channel.channelId
                      ? t('sidebar.channelMenu.confirmUnsubscribe')
                      : t('sidebar.channelMenu.unsubscribe')}
                  </button>
                </div>
              )}
            </div>
          ))}
          {visibleChannels.length === 0 && (
            <p className="channel-query-empty">{t('sidebar.noChannelMatch')}</p>
          )}
        </div>
      )}

      <div className="sidebar-footer">
        <button className={`view${settingsOpen ? ' active' : ''}`} onClick={onOpenSettings}>
          <span className="view-key gear">⚙</span>
          <span className="view-label">{t('sidebar.settingsLabel')}</span>
        </button>
      </div>
    </aside>
  )
}
