import type { RefObject } from 'react'
import type { AccountDto, FeedViewDto, SettingsDto } from '../ipc/contract'
import { ITEM_SIZES } from './FeedList'
import { t } from './i18n'
import { viewLabel } from './Sidebar'

interface TopbarProps {
  screen: 'feed' | 'settings' | 'playlists'
  settings: SettingsDto
  onSettingsChange: (settings: SettingsDto) => void
  view: FeedViewDto
  accountFilter: string | null
  accounts: AccountDto[]
  channelFilter: string | null
  refreshing: boolean
  onRefresh: () => void
  statusText: string
  statusInfoTitle: string | null
  showMarkAllRead: boolean
  onMarkAllRead: () => void
  filter: string
  onFilterChange: (value: string) => void
  onRunSearch: () => void
  onClearFilter: () => void
  filterInputRef: RefObject<HTMLInputElement | null>
  playerOpen: boolean
  miniplayer: boolean
}

// Two variants sharing the same `.topbar` shell: the Playlists screen only
// needs item-size/layout controls, every other screen gets the full
// refresh/status/search bar. Hidden behind `screen === 'playlists'` rather
// than two components, since both read the same settings.itemSize/layout
// toggle logic.
export function Topbar({
  screen,
  settings,
  onSettingsChange,
  view,
  accountFilter,
  accounts,
  channelFilter,
  refreshing,
  onRefresh,
  statusText,
  statusInfoTitle,
  showMarkAllRead,
  onMarkAllRead,
  filter,
  onFilterChange,
  onRunSearch,
  onClearFilter,
  filterInputRef,
  playerOpen,
  miniplayer
}: TopbarProps) {
  const itemSizeSlider = (
    <input
      className="size-slider"
      type="range"
      min={0}
      max={ITEM_SIZES.length - 1}
      step={1}
      value={ITEM_SIZES.indexOf(settings.itemSize)}
      title={t('app.topbar.itemSizeTitle', { size: settings.itemSize })}
      onChange={(event) =>
        onSettingsChange({ ...settings, itemSize: ITEM_SIZES[Number(event.target.value)] })
      }
    />
  )
  const layoutToggle = (
    <button
      className="layout-toggle"
      title={
        settings.layout === 'grid' ? t('app.topbar.switchToListView') : t('app.topbar.switchToGridView')
      }
      onClick={() =>
        onSettingsChange({ ...settings, layout: settings.layout === 'grid' ? 'list' : 'grid' })
      }
    >
      {settings.layout === 'grid' ? '☰' : '⊞'}
    </button>
  )

  if (screen === 'playlists') {
    return (
      <header className="topbar">
        <span className="topbar-view">{t('sidebar.view.playlists')}</span>
        <span className="topbar-spacer" />
        {itemSizeSlider}
        {layoutToggle}
      </header>
    )
  }

  return (
    <header className="topbar">
      <button className="refresh" title={t('app.topbar.refreshTitle')} onClick={onRefresh}>
        <span className={`refresh-icon${refreshing ? ' spinning' : ''}`}>⟳</span>
      </button>
      <span className="topbar-view">
        {viewLabel(view)}
        {accountFilter !== null && (
          <span className="topbar-account-suffix">
            {' · '}
            {accounts.find((a) => a.accountId === accountFilter)?.label ??
              t('app.topbar.channelFallback')}
          </span>
        )}
      </span>
      <span className="status">
        {statusText}
        {statusInfoTitle !== null && (
          <span className="status-info" title={statusInfoTitle}>
            ⓘ
          </span>
        )}
      </span>
      {showMarkAllRead && (
        <button className="mark-all-read" onClick={onMarkAllRead}>
          {t('app.topbar.markAllRead')}
        </button>
      )}
      <div className="field-wrap">
        <input
          ref={filterInputRef}
          className="filter"
          placeholder={t(
            channelFilter !== null
              ? 'app.topbar.searchChannelPlaceholder'
              : 'app.topbar.searchYouTubePlaceholder'
          )}
          value={filter}
          onChange={(event) => onFilterChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onRunSearch()
          }}
        />
        {filter !== '' && (
          <button className="field-clear" title={t('app.topbar.clearFilterTitle')} onClick={onClearFilter}>
            ✕
          </button>
        )}
      </div>
      {(!playerOpen || miniplayer) && itemSizeSlider}
      {(!playerOpen || miniplayer) && layoutToggle}
    </header>
  )
}
