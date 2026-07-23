import { useEffect, useMemo, useRef, useState } from 'react'
import type { FeedVideoDto, PlaylistDto } from '../ipc/contract'
import { PLAYLIST_DESCRIPTION_MAX_LENGTH, PLAYLIST_NAME_MAX_LENGTH } from '../ipc/contract'
import { FeedList, type FeedRow, type ItemSize, type VideoActions } from './FeedList'
import { formatPlaylistDuration } from './format'
import { t } from './i18n'

interface PlaylistDetailViewProps {
  playlist: PlaylistDto
  videos: FeedVideoDto[]
  itemSize: ItemSize
  layout: 'list' | 'grid'
  showViewCounts: boolean
  undoable: ReadonlySet<string>
  // Base actions (markRead/toggleRead/ignore/undo/toggleFavorite/
  // toggleWatchLater/openInBrowser/addToPlaylist) already built by App.tsx —
  // this view adds its own removeFromPlaylist on top.
  actions: VideoActions
  onOpen: (videoIndex: number) => void
  onOpenChannel: (channelId: string, channelTitle: string) => void
  onReorder: (fromIndex: number, insertAt: number) => void
  onRemoveVideo: (videoId: string) => void
  onRename: (name: string, description: string | null) => void
  onDelete: () => void
  // So this screen's own keydown handler (below) can stay quiet while the
  // shortcuts overlay is open, the same way the main feed's own handler
  // does — App.tsx owns that state and this screen has no other way to
  // know about it.
  helpOpen: boolean
  // This screen stays mounted (and its keydown listener live) even while a
  // full-view player covers it entirely — the video was possibly opened
  // from right here (openFromPlaylistDetail). Without this, j/k/m/f/w typed
  // for the player would also silently act on the hidden video list
  // underneath. Docked playback is fine (this screen is the visible,
  // interactive content then) — only the full-view case needs to suppress
  // this handler, mirroring App.tsx's own `(playerOpen && !miniplayer)`
  // guard for the main feed.
  playerFullView: boolean
}

// A playlist's own screen (ui.md): title/description header (editable
// in-place, mirrors ChannelHeader's compact style) above its video list.
// Not a paginated feed view — a playlist is a small, fully-loaded, user-
// ordered queue (like Watch Later), so this renders FeedList directly with
// its own local rows/cursor rather than going through App.tsx's global feed
// state. Unlike Watch Later, opening a video here never removes it — only
// the explicit remove-from-playlist action does.
export function PlaylistDetailView({
  playlist,
  videos,
  itemSize,
  layout,
  showViewCounts,
  undoable,
  actions,
  onOpen,
  onOpenChannel,
  onReorder,
  onRemoveVideo,
  onRename,
  onDelete,
  helpOpen,
  playerFullView
}: PlaylistDetailViewProps) {
  const [cursorIdx, setCursorIdx] = useState(0)
  const effectiveCursor = videos.length === 0 ? -1 : Math.min(cursorIdx, videos.length - 1)
  const lastG = useRef(0)

  const rows: FeedRow[] = videos.map((video, videoIndex) => ({
    kind: 'video',
    key: video.videoId,
    video,
    videoIndex
  }))

  const fullActions: VideoActions = useMemo(
    () => ({ ...actions, removeFromPlaylist: (video) => onRemoveVideo(video.videoId) }),
    [actions, onRemoveVideo]
  )

  // Own keydown handler, mirroring the main feed's j/k/gg/G/Enter/m/f/w/i/b
  // bindings (App.tsx) — this screen's video list has its own cursor/video
  // array that App.tsx's global handler has no access to (and deliberately
  // stays out of, to avoid mutating the wrong feed's state), so it owns its
  // own subset of the same shortcuts instead of going without them.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (playerFullView || helpOpen) return
      const target = event.target as HTMLElement | null
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (videos.length === 0) return

      const current = effectiveCursor >= 0 ? videos[effectiveCursor] : undefined
      const move = (delta: number): void => {
        setCursorIdx(Math.max(0, Math.min(videos.length - 1, effectiveCursor + delta)))
      }

      let handled = true
      switch (event.key) {
        case 'j':
        case 'ArrowDown':
          move(1)
          break
        case 'k':
        case 'ArrowUp':
          move(-1)
          break
        case 'G':
          setCursorIdx(videos.length - 1)
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
          if (current) {
            setCursorIdx(effectiveCursor)
            onOpen(effectiveCursor)
          }
          break
        case 'm':
          if (current) fullActions.toggleRead(current)
          break
        case 'i':
          if (current) fullActions.ignore(current)
          break
        case 'f':
          if (current) fullActions.toggleFavorite(current)
          break
        case 'w':
          if (current) fullActions.toggleWatchLater(current)
          break
        case 'b':
          if (current) fullActions.openInBrowser(current)
          break
        default:
          handled = false
      }
      if (handled) event.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [videos, effectiveCursor, helpOpen, playerFullView, onOpen, fullActions])

  return (
    <>
      <PlaylistDetailHeader playlist={playlist} onRename={onRename} onDelete={onDelete} />
      {videos.length === 0 ? (
        <div className="empty">
          <p>{t('playlistDetail.empty')}</p>
          <p className="playlists-empty-hint">{t('playlistDetail.emptyHint')}</p>
        </div>
      ) : (
        <FeedList
          rows={rows}
          cursorVideoIndex={effectiveCursor}
          undoable={undoable}
          actions={fullActions}
          onOpen={(videoIndex) => {
            setCursorIdx(videoIndex)
            onOpen(videoIndex)
          }}
          onOpenChannel={(channelId) => {
            const title = videos.find((v) => v.channelId === channelId)?.channelTitle ?? ''
            onOpenChannel(channelId, title)
          }}
          onNearEnd={() => {}}
          onAtTopChange={() => {}}
          itemSize={itemSize}
          layout={layout}
          showViewCounts={showViewCounts}
          loadingMore={false}
          reorderable
          onReorder={onReorder}
        />
      )}
    </>
  )
}

function PlaylistDetailHeader({
  playlist,
  onRename,
  onDelete
}: {
  playlist: PlaylistDto
  onRename: (name: string, description: string | null) => void
  onDelete: () => void
}) {
  const [editingName, setEditingName] = useState(false)
  const [editingDescription, setEditingDescription] = useState(false)
  const [nameDraft, setNameDraft] = useState(playlist.name)
  const [descriptionDraft, setDescriptionDraft] = useState(playlist.description ?? '')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  // A different playlist was opened (or this one changed under us) — drop
  // any in-progress edit rather than silently saving stale text over it.
  useEffect(() => {
    setEditingName(false)
    setEditingDescription(false)
    setNameDraft(playlist.name)
    setDescriptionDraft(playlist.description ?? '')
    setConfirmingDelete(false)
  }, [playlist.playlistId, playlist.name, playlist.description])

  // Same double-click-to-confirm-then-auto-disarm pattern as the channel
  // screen's own Unsubscribe button (App.tsx's confirmingUnsubscribe).
  useEffect(() => {
    if (!confirmingDelete) return
    const timer = window.setTimeout(() => setConfirmingDelete(false), 6000)
    return () => window.clearTimeout(timer)
  }, [confirmingDelete])

  function saveName(): void {
    const trimmed = nameDraft.trim()
    setEditingName(false)
    if (trimmed === '' || trimmed === playlist.name) {
      setNameDraft(playlist.name)
      return
    }
    onRename(trimmed, playlist.description)
  }

  function saveDescription(): void {
    const trimmed = descriptionDraft.trim()
    setEditingDescription(false)
    if (trimmed === (playlist.description ?? '')) return
    onRename(playlist.name, trimmed === '' ? null : trimmed)
  }

  return (
    <div className="channel-header playlist-detail-header">
      <div className="channel-header-scrim playlist-detail-scrim">
        <div className="channel-header-info playlist-detail-info">
          {editingName ? (
            <input
              autoFocus
              className="filter playlist-detail-name-input"
              value={nameDraft}
              maxLength={PLAYLIST_NAME_MAX_LENGTH}
              onChange={(event) => setNameDraft(event.target.value)}
              onBlur={saveName}
              onKeyDown={(event) => {
                if (event.key === 'Enter') saveName()
                if (event.key === 'Escape') {
                  setNameDraft(playlist.name)
                  setEditingName(false)
                }
                event.stopPropagation()
              }}
            />
          ) : (
            <span className="channel-header-title playlist-detail-editable-row">
              {playlist.name}
              <button
                className="playlist-detail-edit-btn"
                title={t('playlistDetail.editNameTitle')}
                onClick={() => setEditingName(true)}
              >
                ✎
              </button>
            </span>
          )}
          {editingDescription ? (
            <textarea
              autoFocus
              className="playlist-detail-description-input"
              value={descriptionDraft}
              maxLength={PLAYLIST_DESCRIPTION_MAX_LENGTH}
              onChange={(event) => setDescriptionDraft(event.target.value)}
              onBlur={saveDescription}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  setDescriptionDraft(playlist.description ?? '')
                  setEditingDescription(false)
                }
                event.stopPropagation()
              }}
            />
          ) : (
            <span className="channel-header-subs playlist-detail-editable-row">
              {playlist.description ?? t('playlistDetail.addDescriptionPlaceholder')}
              <button
                className="playlist-detail-edit-btn"
                title={t('playlistDetail.editDescriptionTitle')}
                onClick={() => setEditingDescription(true)}
              >
                ✎
              </button>
            </span>
          )}
          <span className="channel-header-subs">
            {t('playlists.videoCount', {
              count: playlist.videoCount,
              plural: playlist.videoCount === 1 ? '' : 's'
            })}
            {' · '}
            {formatPlaylistDuration(playlist.totalDurationSeconds)}
          </span>
        </div>
        <div className="channel-header-actions">
          <button
            className={`unsubscribe-btn${confirmingDelete ? ' danger' : ''}`}
            onClick={() => {
              if (confirmingDelete) onDelete()
              else setConfirmingDelete(true)
            }}
          >
            {confirmingDelete ? t('playlistDetail.confirmDelete') : t('playlistDetail.deleteButton')}
          </button>
        </div>
      </div>
    </div>
  )
}
