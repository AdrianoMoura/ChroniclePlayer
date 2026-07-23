import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefObject
} from 'react'
import { createPortal } from 'react-dom'
import type { AccountDto, ChannelDto, FeedViewDto } from '../ipc/contract'
import { t } from './i18n'
import { BellIcon } from './icons'

// The channel/account "…" menus live inside a scrollable list (overflow:
// auto) — an in-flow absolutely positioned menu gets clipped whenever it
// opens near the edge of the visible scroll area. Portaling to <body> with
// a viewport-anchored fixed position avoids that regardless of scroll
// position, and flips above the trigger when there isn't room below.
function ContextMenu({
  anchorRect,
  onMenuClick,
  children
}: {
  anchorRect: DOMRect
  onMenuClick: (event: ReactMouseEvent) => void
  children: ReactNode
}) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<CSSProperties>({
    position: 'fixed',
    top: anchorRect.bottom + 4,
    right: Math.max(8, window.innerWidth - anchorRect.right)
  })

  useLayoutEffect(() => {
    const el = menuRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const top =
      anchorRect.bottom + 4 + rect.height > window.innerHeight - 8
        ? Math.max(8, anchorRect.top - rect.height - 4)
        : anchorRect.bottom + 4
    const right =
      anchorRect.right - rect.width < 8
        ? Math.max(8, window.innerWidth - anchorRect.left - rect.width)
        : window.innerWidth - anchorRect.right
    setStyle({ position: 'fixed', top, right })
  }, [anchorRect.top, anchorRect.right, anchorRect.bottom, anchorRect.left])

  return createPortal(
    <div ref={menuRef} className="channel-menu" style={style} onClick={onMenuClick}>
      {children}
    </div>,
    document.body
  )
}

// The sidebar's nav list interleaves the five FeedViews with the Playlists
// screen (its own screen, not a FeedView — a playlist has no read/unread
// concept) at position 4, per the product owner's own placement. Keyboard
// digit shortcuts (App.tsx) index into this same array, so its order is the
// single source of truth for both the rendered list and `1`-`6`.
export type NavEntry = { kind: 'view'; view: FeedViewDto } | { kind: 'playlists' }

export const NAV_ORDER: readonly NavEntry[] = [
  { kind: 'view', view: 'all' },
  { kind: 'view', view: 'unread' },
  { kind: 'view', view: 'watch-later' },
  { kind: 'playlists' },
  { kind: 'view', view: 'favorites' },
  { kind: 'view', view: 'ignored' }
]

// A function, not a module-level object — the label must resolve against
// whichever language is active *right now*. A plain object here would bake
// in whatever `t()` returned at import time (before Settings' language
// setting even loads) and never update again on a language switch (D-054).
export function viewLabel(view: FeedViewDto): string {
  switch (view) {
    case 'all':
      return t('sidebar.view.all')
    case 'unread':
      return t('sidebar.view.unread')
    case 'watch-later':
      return t('sidebar.view.watchLater')
    case 'favorites':
      return t('sidebar.view.favorites')
    case 'ignored':
      return t('sidebar.view.ignored')
  }
}

interface SidebarProps {
  view: FeedViewDto
  unreadCount: number
  watchLaterCount: number
  channels: ChannelDto[]
  channelFilter: string | null
  channelQueryRef: RefObject<HTMLInputElement | null>
  settingsOpen: boolean
  playlistsOpen: boolean
  onSelectView: (view: FeedViewDto) => void
  onSelectChannel: (channelId: string | null) => void
  onOpenSettings: () => void
  onOpenPlaylists: () => void
  onToggleCollapse: () => void
  onUnsubscribe: (channelId: string) => void
  onToggleFavorite: (channelId: string) => void
  onToggleNotify: (channelId: string) => void
  // Only meaningful (and shown) when notifications are on globally and the
  // scope is "Selected Channels" — with "All Channels" or notifications
  // off, every/no channel notifies regardless of this flag.
  showNotifyControl: boolean
  accounts: AccountDto[]
  accountFilter: string | null
  onSelectAccount: (accountId: string | null) => void
  onAddAccount: () => void
  onRemoveAccount: (accountId: string) => void
  onSyncAccountNow: (accountId: string) => void
}

export function Sidebar({
  view,
  unreadCount,
  watchLaterCount,
  channels,
  channelFilter,
  channelQueryRef,
  settingsOpen,
  playlistsOpen,
  onSelectView,
  onSelectChannel,
  onOpenSettings,
  onOpenPlaylists,
  onToggleCollapse,
  onUnsubscribe,
  onToggleFavorite,
  onToggleNotify,
  showNotifyControl,
  accounts,
  accountFilter,
  onSelectAccount,
  onAddAccount,
  onRemoveAccount,
  onSyncAccountNow
}: SidebarProps) {
  // Local channel-name filter over the user's own subscriptions, never
  // YouTube search.
  const [channelQuery, setChannelQuery] = useState('')
  // Per-row "…" context menu: armed twice before it actually acts, same
  // pattern as Settings' delete-all confirmation.
  const [menuChannelId, setMenuChannelId] = useState<string | null>(null)
  const [channelMenuAnchor, setChannelMenuAnchor] = useState<DOMRect | null>(null)
  const [confirmingUnsub, setConfirmingUnsub] = useState<string | null>(null)
  // Same double-arm pattern, for the Accounts "…" menu.
  const [menuAccountId, setMenuAccountId] = useState<string | null>(null)
  const [accountMenuAnchor, setAccountMenuAnchor] = useState<DOMRect | null>(null)
  const [confirmingRemove, setConfirmingRemove] = useState<string | null>(null)

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

  useEffect(() => {
    if (menuAccountId === null) return
    function closeMenu(): void {
      setMenuAccountId(null)
      setConfirmingRemove(null)
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
  }, [menuAccountId])

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
        {NAV_ORDER.map((entry, index) =>
          entry.kind === 'playlists' ? (
            <button
              key="playlists"
              className={`view${playlistsOpen ? ' active' : ''}`}
              onClick={onOpenPlaylists}
            >
              <span className="view-key">{index + 1}</span>
              <span className="view-label">{t('sidebar.view.playlists')}</span>
            </button>
          ) : (
            <button
              key={entry.view}
              className={`view${entry.view === view && channelFilter === null && !playlistsOpen ? ' active' : ''}`}
              onClick={() => onSelectView(entry.view)}
            >
              <span className="view-key">{index + 1}</span>
              <span className="view-label">{viewLabel(entry.view)}</span>
              {entry.view === 'unread' && unreadCount > 0 && (
                <span className="view-count">{unreadCount}</span>
              )}
              {entry.view === 'watch-later' && watchLaterCount > 0 && (
                <span className="view-count">{watchLaterCount}</span>
              )}
            </button>
          )
        )}
      </nav>

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
                // Enter opens the first filtered match, mirroring a
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
              {channel.unreadCount > 0 && <span className="view-count">{channel.unreadCount}</span>}
            </button>
            <button
              className={`channel-favorite-btn${channel.favorite ? ' favorited' : ''}`}
              title={
                channel.favorite
                  ? t('sidebar.channelMenu.unfavorite')
                  : t('sidebar.channelMenu.favorite')
              }
              onClick={(event) => {
                event.stopPropagation()
                onToggleFavorite(channel.channelId)
              }}
            >
              {channel.favorite ? '★' : '☆'}
            </button>
            {showNotifyControl && (
              <button
                className={`channel-notify-btn${channel.notify ? ' notifying' : ''}`}
                title={
                  channel.notify
                    ? t('sidebar.channelMenu.unnotify')
                    : t('sidebar.channelMenu.notify')
                }
                onClick={(event) => {
                  event.stopPropagation()
                  onToggleNotify(channel.channelId)
                }}
              >
                <BellIcon filled={channel.notify} />
              </button>
            )}
            <button
              className="channel-menu-btn"
              title={t('sidebar.channelMenu.title')}
              onClick={(event) => {
                event.stopPropagation()
                setConfirmingUnsub(null)
                setChannelMenuAnchor(event.currentTarget.getBoundingClientRect())
                setMenuChannelId((current) =>
                  current === channel.channelId ? null : channel.channelId
                )
              }}
            >
              ⋯
            </button>
            {menuChannelId === channel.channelId && channelMenuAnchor && (
              <ContextMenu
                anchorRect={channelMenuAnchor}
                onMenuClick={(event) => event.stopPropagation()}
              >
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
              </ContextMenu>
            )}
          </div>
        ))}
        {visibleChannels.length === 0 && (
          <p className="channel-query-empty">
            {channels.length === 0 ? t('sidebar.noChannels') : t('sidebar.noChannelMatch')}
          </p>
        )}
      </div>

      <div className="account-list">
        <h3 className="channel-list-header">{t('sidebar.accountsHeader')}</h3>
        {accounts.map((account) => (
          <div key={account.accountId} className="channel-row">
            <button
              className={`view channel${accountFilter === account.accountId ? ' active' : ''}`}
              title={account.label}
              onClick={() =>
                onSelectAccount(accountFilter === account.accountId ? null : account.accountId)
              }
            >
              <span className="view-label ellipsis">{account.label}</span>
              {!account.connected && (
                <span className="account-badge">{t('sidebar.accountDisconnected')}</span>
              )}
            </button>
            <button
              className="channel-menu-btn"
              title={t('sidebar.accountMenu.title')}
              onClick={(event) => {
                event.stopPropagation()
                setConfirmingRemove(null)
                setAccountMenuAnchor(event.currentTarget.getBoundingClientRect())
                setMenuAccountId((current) =>
                  current === account.accountId ? null : account.accountId
                )
              }}
            >
              ⋯
            </button>
            {menuAccountId === account.accountId && accountMenuAnchor && (
              <ContextMenu
                anchorRect={accountMenuAnchor}
                onMenuClick={(event) => event.stopPropagation()}
              >
                <button
                  onClick={() => {
                    onSyncAccountNow(account.accountId)
                    setMenuAccountId(null)
                  }}
                >
                  {t('sidebar.accountMenu.syncNow')}
                </button>
                <button
                  className={confirmingRemove === account.accountId ? 'danger' : ''}
                  disabled={account.isPrimary}
                  title={
                    account.isPrimary ? t('sidebar.accountMenu.removeDisabledTitle') : undefined
                  }
                  onClick={() => {
                    if (account.isPrimary) return
                    if (confirmingRemove === account.accountId) {
                      onRemoveAccount(account.accountId)
                      setMenuAccountId(null)
                      setConfirmingRemove(null)
                    } else {
                      setConfirmingRemove(account.accountId)
                    }
                  }}
                >
                  {confirmingRemove === account.accountId
                    ? t('sidebar.accountMenu.confirmRemove')
                    : t('sidebar.accountMenu.remove')}
                </button>
              </ContextMenu>
            )}
          </div>
        ))}
        <button className="view account-add" onClick={onAddAccount}>
          <span className="view-label">{t('sidebar.addAccount')}</span>
        </button>
      </div>

      <div className="sidebar-footer">
        <button className={`view${settingsOpen ? ' active' : ''}`} onClick={onOpenSettings}>
          <span className="view-key gear">⚙</span>
          <span className="view-label">{t('sidebar.settingsLabel')}</span>
        </button>
      </div>
    </aside>
  )
}
