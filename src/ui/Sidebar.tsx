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
  channels: ChannelDto[]
  channelFilter: string | null
  settingsOpen: boolean
  onSelectView: (view: FeedViewDto) => void
  onSelectChannel: (channelId: string | null) => void
  onOpenSettings: () => void
}

export function Sidebar({
  view,
  unreadCount,
  channels,
  channelFilter,
  settingsOpen,
  onSelectView,
  onSelectChannel,
  onOpenSettings
}: SidebarProps) {
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
          </button>
        ))}
      </nav>

      {channels.length > 0 && (
        <div className="channel-list">
          <h3 className="channel-list-header">Channels</h3>
          {channels.map((channel) => (
            <button
              key={channel.channelId}
              className={`view channel${channelFilter === channel.channelId ? ' active' : ''}`}
              title={channel.title}
              onClick={() =>
                onSelectChannel(channelFilter === channel.channelId ? null : channel.channelId)
              }
            >
              <span className="view-label ellipsis">{channel.title}</span>
            </button>
          ))}
        </div>
      )}

      <div className="sidebar-footer">
        <button className={`view${settingsOpen ? ' active' : ''}`} onClick={onOpenSettings}>
          Settings
        </button>
      </div>
    </aside>
  )
}
