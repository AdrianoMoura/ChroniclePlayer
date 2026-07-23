import { useEffect, useRef, useState } from 'react'
import { PLAYLIST_NAME_MAX_LENGTH, type PlaylistDto } from '../ipc/contract'
import { t } from './i18n'

interface AddToPlaylistDialogProps {
  videoId: string
  videoTitle: string
  onClose: () => void
  // App.tsx keeps the Playlists screen's own list/detail state in sync with
  // whatever this dialog does (create, membership toggle) — it has no other
  // way to find out, since this dialog owns its own local copy for the
  // checklist.
  onPlaylistsChanged: () => void
}

// Reachable from every video card/row (list and grid, feed/channel/watch
// later/player alike) via the new "Add to Playlist" action — a checklist of
// every local playlist plus an inline "create and add" field, so the user
// never has to leave what they're doing to set up a destination first.
export function AddToPlaylistDialog({
  videoId,
  videoTitle,
  onClose,
  onPlaylistsChanged
}: AddToPlaylistDialogProps) {
  const [playlists, setPlaylists] = useState<PlaylistDto[]>([])
  const [memberIds, setMemberIds] = useState<ReadonlySet<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Unlike UrlPrompt/CreatePlaylistDialog (an autoFocus text input naturally
  // takes focus on open), this dialog has no such element — opened via a
  // click or the `a` shortcut, focus would otherwise stay on whatever
  // triggered it (a sibling of this dialog, not an ancestor), so a keydown
  // handler on this container alone would never see it: the event bubbles
  // from that other element's own ancestors instead, never passing through
  // here. Focusing the container itself on mount (tabIndex={-1} makes a
  // plain div programmatically focusable) fixes that at the source, for
  // Escape and anything else typed before the user clicks something inside.
  useEffect(() => {
    containerRef.current?.focus()
  }, [])

  useEffect(() => {
    setLoading(true)
    void Promise.all([
      window.chronicle.listPlaylists(),
      window.chronicle.getPlaylistsForVideo(videoId)
    ]).then(([allPlaylists, memberOf]) => {
      setPlaylists(allPlaylists)
      setMemberIds(new Set(memberOf))
      setLoading(false)
    })
  }, [videoId])

  function toggle(playlistId: string): void {
    const isMember = memberIds.has(playlistId)
    setMemberIds((current) => {
      const next = new Set(current)
      if (isMember) next.delete(playlistId)
      else next.add(playlistId)
      return next
    })
    const call = isMember
      ? window.chronicle.removeVideoFromPlaylist(playlistId, videoId)
      : window.chronicle.addVideoToPlaylist(playlistId, videoId)
    void call.then(onPlaylistsChanged)
  }

  function createAndAdd(): void {
    const name = newName.trim()
    if (name === '' || creating) return
    setCreating(true)
    void window.chronicle.createPlaylist(name, null).then((playlist) => {
      void window.chronicle.addVideoToPlaylist(playlist.playlistId, videoId).then(() => {
        setPlaylists((current) => [playlist, ...current])
        setMemberIds((current) => new Set(current).add(playlist.playlistId))
        setNewName('')
        setCreating(false)
        onPlaylistsChanged()
      })
    })
  }

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div
        ref={containerRef}
        tabIndex={-1}
        className="overlay add-to-playlist"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          // A dialog on top of the content owns Escape while it's open —
          // never let it bubble to whatever's underneath (the full-view
          // player's own Esc-to-close/dock map, the feed's own keydown
          // handler), regardless of which element inside currently has
          // focus (a checkbox, a button, nothing in particular).
          event.stopPropagation()
          if (event.key === 'Escape') onClose()
        }}
      >
        <h2>{t('addToPlaylist.title')}</h2>
        <p className="add-to-playlist-video-title">{videoTitle}</p>
        {loading ? null : playlists.length === 0 ? (
          <p className="add-to-playlist-empty">{t('addToPlaylist.empty')}</p>
        ) : (
          <ul className="add-to-playlist-list">
            {playlists.map((playlist) => (
              <li key={playlist.playlistId}>
                <label>
                  <input
                    type="checkbox"
                    checked={memberIds.has(playlist.playlistId)}
                    onChange={() => toggle(playlist.playlistId)}
                  />
                  {playlist.name}
                </label>
              </li>
            ))}
          </ul>
        )}
        <div className="add-to-playlist-create">
          <input
            className="filter"
            placeholder={t('addToPlaylist.newPlaylistPlaceholder')}
            value={newName}
            maxLength={PLAYLIST_NAME_MAX_LENGTH}
            onChange={(event) => setNewName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') createAndAdd()
              if (event.key === 'Escape') onClose()
              event.stopPropagation()
            }}
          />
          <button disabled={newName.trim() === '' || creating} onClick={createAndAdd}>
            {t('addToPlaylist.create')}
          </button>
        </div>
        <div className="add-to-playlist-actions">
          <button className="primary" onClick={onClose}>
            {t('addToPlaylist.done')}
          </button>
        </div>
      </div>
    </div>
  )
}
