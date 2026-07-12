import { useMemo, useState, type RefObject } from 'react'
import type { ChannelDto, FeedViewDto } from '../ipc/contract'

export const VIEW_ORDER: readonly FeedViewDto[] = [
  'all',
  'unread',
  'watch-later',
  'favorites',
  'ignored'
]

export const VIEW_LABELS: Record<FeedViewDto, string> = {
  all: 'All',
  unread: 'Unread',
  'watch-later': 'Watch Later',
  favorites: 'Favorites',
  ignored: 'Ignored'
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
  onOpenSettings
}: SidebarProps) {
  // Local channel-name filter (B-024) — over the user's own subscriptions,
  // never YouTube search.
  const [channelQuery, setChannelQuery] = useState('')

  const visibleChannels = useMemo(() => {
    const query = channelQuery.trim().toLowerCase()
    if (!query) return channels
    return channels.filter((channel) => channel.title.toLowerCase().includes(query))
  }, [channels, channelQuery])

  return (
    <aside className="sidebar">
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
          <h3 className="channel-list-header">Channels</h3>
          <div className="field-wrap">
            <input
              ref={channelQueryRef}
              className="channel-query"
              placeholder="Find channel  c"
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
                title="Clear"
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
            <button
              key={channel.channelId}
              className={`view channel${channelFilter === channel.channelId ? ' active' : ''}`}
              title={channel.title}
              onClick={() =>
                onSelectChannel(channelFilter === channel.channelId ? null : channel.channelId)
              }
            >
              <span className="view-label ellipsis">{channel.title}</span>
              {channel.unreadCount > 0 && (
                <span className="view-count">{channel.unreadCount}</span>
              )}
            </button>
          ))}
          {visibleChannels.length === 0 && (
            <p className="channel-query-empty">No channel matches.</p>
          )}
        </div>
      )}

      <div className="sidebar-footer">
        <button className={`view${settingsOpen ? ' active' : ''}`} onClick={onOpenSettings}>
          <span className="view-key gear">⚙</span>
          <span className="view-label">Settings</span>
        </button>
      </div>
    </aside>
  )
}
