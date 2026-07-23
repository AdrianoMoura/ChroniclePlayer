import { useEffect, useRef, useState } from 'react'
import { PLAYLIST_DESCRIPTION_MAX_LENGTH, PLAYLIST_NAME_MAX_LENGTH, type PlaylistDto } from '../ipc/contract'
import { GRID_CARD_SIZES, type ItemSize } from './FeedList'
import { formatPlaylistDuration } from './format'
import { t } from './i18n'
import { PlaylistThumb } from './PlaylistThumb'

interface PlaylistsViewProps {
  playlists: PlaylistDto[]
  layout: 'list' | 'grid'
  itemSize: ItemSize
  onOpen: (playlistId: string) => void
  onCreated: (playlist: PlaylistDto) => void
  // So this screen's own j/k/Enter keydown handler (below) can stay quiet
  // while the shortcuts overlay is open — same reasoning as
  // PlaylistDetailView's own helpOpen prop.
  helpOpen: boolean
  // This screen stays mounted (and its keydown listener live) even while a
  // full-view player covers it entirely (docked playback over the list is
  // fine and should keep working) — see PlaylistDetailView's own prop of
  // the same name for the full reasoning.
  playerFullView: boolean
}

// The Playlists screen (ui.md, position 4 in the sidebar): every local
// playlist as a card/row — same visual language as a video card/row, same
// list/grid + itemSize controls the rest of the app already exposes in the
// topbar, just a different item shape (a playlist's composite thumb,
// PlaylistThumb, instead of a video's own).
export function PlaylistsView({
  playlists,
  layout,
  itemSize,
  onOpen,
  onCreated,
  helpOpen,
  playerFullView
}: PlaylistsViewProps) {
  const [creating, setCreating] = useState(false)
  const [cursorIdx, setCursorIdx] = useState(0)
  const effectiveCursor = playlists.length === 0 ? -1 : Math.min(cursorIdx, playlists.length - 1)
  const lastG = useRef(0)

  // j/k/gg/G/Enter over the playlist list itself — this screen has no other
  // keyboard path (App.tsx's global handler deliberately stays out of it,
  // see App.tsx's screen === 'playlists' branch).
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (playerFullView || helpOpen || creating) return
      const target = event.target as HTMLElement | null
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (playlists.length === 0) return

      let handled = true
      switch (event.key) {
        case 'j':
        case 'ArrowDown':
          setCursorIdx(Math.min(playlists.length - 1, effectiveCursor + 1))
          break
        case 'k':
        case 'ArrowUp':
          setCursorIdx(Math.max(0, effectiveCursor - 1))
          break
        case 'G':
          setCursorIdx(playlists.length - 1)
          break
        case 'g':
          if (Date.now() - lastG.current < 600) {
            setCursorIdx(0)
            lastG.current = 0
          } else {
            lastG.current = Date.now()
          }
          break
        case 'Enter':
        case 'o':
          if (effectiveCursor >= 0) onOpen(playlists[effectiveCursor].playlistId)
          break
        default:
          handled = false
      }
      if (handled) event.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [playlists, effectiveCursor, helpOpen, playerFullView, creating, onOpen])

  return (
    <div className={`playlists-list size-${itemSize}`}>
      <div className="playlists-toolbar">
        <button className="primary" onClick={() => setCreating(true)}>
          {t('playlists.createButton')}
        </button>
      </div>
      {playlists.length === 0 ? (
        <div className="empty">
          <p>{t('playlists.emptyTitle')}</p>
          <p className="playlists-empty-hint">{t('playlists.emptyHint')}</p>
        </div>
      ) : layout === 'grid' ? (
        <div
          className="grid-row"
          style={{
            gridTemplateColumns: `repeat(auto-fill, minmax(${GRID_CARD_SIZES[itemSize].minWidth}px, 1fr))`
          }}
        >
          {playlists.map((playlist, index) => (
            <PlaylistCard
              key={playlist.playlistId}
              playlist={playlist}
              selected={index === effectiveCursor}
              onOpen={() => onOpen(playlist.playlistId)}
            />
          ))}
        </div>
      ) : (
        playlists.map((playlist, index) => (
          <PlaylistRow
            key={playlist.playlistId}
            playlist={playlist}
            selected={index === effectiveCursor}
            onOpen={() => onOpen(playlist.playlistId)}
          />
        ))
      )}
      {creating && (
        <CreatePlaylistDialog
          onCancel={() => setCreating(false)}
          onCreated={(playlist) => {
            setCreating(false)
            onCreated(playlist)
          }}
        />
      )}
    </div>
  )
}

function PlaylistMeta({ playlist }: { playlist: PlaylistDto }) {
  return (
    <span className="meta">
      {t('playlists.videoCount', {
        count: playlist.videoCount,
        plural: playlist.videoCount === 1 ? '' : 's'
      })}
      {' · '}
      {formatPlaylistDuration(playlist.totalDurationSeconds)}
    </span>
  )
}

function PlaylistRow({
  playlist,
  selected,
  onOpen
}: {
  playlist: PlaylistDto
  selected: boolean
  onOpen: () => void
}) {
  return (
    <div className={`row${selected ? ' selected' : ''}`} onClick={onOpen}>
      <PlaylistThumb thumbnailUrls={playlist.thumbnailUrls} />
      <div className="row-text">
        <span className="title">{playlist.name}</span>
        <PlaylistMeta playlist={playlist} />
      </div>
    </div>
  )
}

function PlaylistCard({
  playlist,
  selected,
  onOpen
}: {
  playlist: PlaylistDto
  selected: boolean
  onOpen: () => void
}) {
  return (
    <div className={`card${selected ? ' selected' : ''}`} onClick={onOpen}>
      <div className="card-thumb-wrap">
        <PlaylistThumb thumbnailUrls={playlist.thumbnailUrls} />
      </div>
      <div className="row-text">
        <span className="title">{playlist.name}</span>
        <PlaylistMeta playlist={playlist} />
      </div>
    </div>
  )
}

function CreatePlaylistDialog({
  onCancel,
  onCreated
}: {
  onCancel: () => void
  onCreated: (playlist: PlaylistDto) => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  function submit(): void {
    const trimmed = name.trim()
    if (trimmed === '' || saving) return
    setSaving(true)
    void window.chronicle.createPlaylist(trimmed, description.trim() || null).then(onCreated)
  }

  return (
    <div className="overlay-backdrop" onClick={onCancel}>
      <div
        className="overlay create-playlist"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          // A dialog on top of the content owns Escape while it's open —
          // never let it bubble to whatever's underneath.
          event.stopPropagation()
          if (event.key === 'Escape') onCancel()
        }}
      >
        <h2>{t('playlists.dialog.createTitle')}</h2>
        <label className="create-playlist-label">{t('playlists.dialog.nameLabel')}</label>
        <input
          autoFocus
          className="filter"
          placeholder={t('playlists.dialog.namePlaceholder')}
          value={name}
          maxLength={PLAYLIST_NAME_MAX_LENGTH}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') submit()
            if (event.key === 'Escape') onCancel()
            event.stopPropagation()
          }}
        />
        <label className="create-playlist-label">{t('playlists.dialog.descriptionLabel')}</label>
        <textarea
          className="create-playlist-description"
          placeholder={t('playlists.dialog.descriptionPlaceholder')}
          value={description}
          maxLength={PLAYLIST_DESCRIPTION_MAX_LENGTH}
          onChange={(event) => setDescription(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') onCancel()
            event.stopPropagation()
          }}
        />
        <div className="create-playlist-actions">
          <button onClick={onCancel}>{t('playlists.dialog.cancel')}</button>
          <button className="primary" disabled={name.trim() === '' || saving} onClick={submit}>
            {t('playlists.dialog.create')}
          </button>
        </div>
      </div>
    </div>
  )
}
