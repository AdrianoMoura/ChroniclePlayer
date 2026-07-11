import type { FeedViewDto } from '../ipc/contract'

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
  onSelectView: (view: FeedViewDto) => void
}

export function Sidebar({ view, unreadCount, onSelectView }: SidebarProps) {
  return (
    <aside className="sidebar">
      <nav>
        {VIEW_ORDER.map((candidate, index) => (
          <button
            key={candidate}
            className={`view${candidate === view ? ' active' : ''}`}
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
      <div className="sidebar-footer">
        <span className="view disabled" title="Settings arrive with M5">
          Settings
        </span>
      </div>
    </aside>
  )
}
