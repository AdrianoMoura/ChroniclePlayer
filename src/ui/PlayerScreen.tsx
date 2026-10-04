import type { RefObject } from 'react'
import type { FeedVideoDto, PlayerVideoDto, VideoStateDto } from '../ipc/contract'
import { t } from './i18n'
import { MiniPlayerBar } from './MiniPlayerBar'
import { PlayerDetails, type PlayerDetailsHandle } from './PlayerDetails'
import { PlayerSurface, type PlayerSurfaceHandle } from './PlayerSurface'
import { UpNextCard } from './UpNextCard'

interface PlayerScreenProps {
  video: PlayerVideoDto
  playerSurfaceRef: RefObject<PlayerSurfaceHandle | null>
  playerDetailsRef: RefObject<PlayerDetailsHandle | null>
  stackDepth: number
  hasQueueNext: boolean
  defaultPlaybackRate: number
  miniplayer: boolean
  fullSlot: HTMLDivElement | null
  miniSlot: HTMLDivElement | null
  onFullSlotRef: (element: HTMLDivElement | null) => void
  onMiniSlotRef: (element: HTMLDivElement | null) => void
  helpOpen: boolean
  onNextInQueue: () => void
  onClose: () => void
  onDock: () => void
  onMaximize: () => void
  onFocusSearch: () => void
  onToggleHelp: () => void
  onExtract: () => void
  onRemoveUnavailable: () => void
  onStatePatched: (videoId: string, state: VideoStateDto) => void
  onEnded: () => void
  upNext: FeedVideoDto | null
  upNextPlaylistName: string | null
  onOpenUpNext: () => void
  onDismissUpNext: () => void
  chatSurface: 'closed' | 'column' | 'extracted'
  onToggleChat: () => void
  onExtractChat: () => void
  onOpenVideo: (videoId: string) => void
  onOpenChannel: (channelId: string, channelTitle: string) => void
  onOpenSettings: () => void
  miniplayerWidth: number
  onResizeMiniplayer: (width: number) => void
}

// The full-view/docked player and everything that only exists while a video
// is open (up-next card, chat). Rendered as a single stable element inside
// the always-mounted layout (D-058's own fix for the Playlists-screen
// iframe-remount bug) — never conditionally swapped out for a different
// component tree while a video is playing.
export function PlayerScreen({
  video,
  playerSurfaceRef,
  playerDetailsRef,
  stackDepth,
  hasQueueNext,
  defaultPlaybackRate,
  miniplayer,
  fullSlot,
  miniSlot,
  onFullSlotRef,
  onMiniSlotRef,
  helpOpen,
  onNextInQueue,
  onClose,
  onDock,
  onMaximize,
  onFocusSearch,
  onToggleHelp,
  onExtract,
  onRemoveUnavailable,
  onStatePatched,
  onEnded,
  upNext,
  upNextPlaylistName,
  onOpenUpNext,
  onDismissUpNext,
  chatSurface,
  onToggleChat,
  onExtractChat,
  onOpenVideo,
  onOpenChannel,
  onOpenSettings,
  miniplayerWidth,
  onResizeMiniplayer
}: PlayerScreenProps) {
  return (
    <>
      <PlayerSurface
        ref={playerSurfaceRef}
        video={video}
        state={video.state}
        stackDepth={stackDepth}
        hasQueueNext={hasQueueNext}
        defaultPlaybackRate={defaultPlaybackRate}
        active={!miniplayer}
        alignTarget={miniplayer ? miniSlot : fullSlot}
        helpOpen={helpOpen}
        onNextInQueue={onNextInQueue}
        onClose={onClose}
        onDock={onDock}
        onFocusSearch={onFocusSearch}
        onToggleHelp={onToggleHelp}
        onToggleLike={() => playerDetailsRef.current?.toggleLike()}
        onToggleSubscribe={() => playerDetailsRef.current?.toggleSubscribe()}
        onToggleComments={() => playerDetailsRef.current?.toggleComments()}
        onAddToPlaylist={() => playerDetailsRef.current?.openAddToPlaylist()}
        onExtract={onExtract}
        onRemoveUnavailable={onRemoveUnavailable}
        onStatePatched={onStatePatched}
        onEnded={onEnded}
      />
      {upNext && !miniplayer && (
        <UpNextCard
          video={upNext}
          label={
            upNextPlaylistName !== null
              ? t('player.upNext.labelPlaylist', { name: upNextPlaylistName })
              : t('player.upNext.label')
          }
          onOpen={onOpenUpNext}
          onDismiss={onDismissUpNext}
        />
      )}
      <PlayerDetails
        ref={playerDetailsRef}
        video={video}
        state={video.state}
        stackDepth={stackDepth}
        hidden={miniplayer}
        slotRef={onFullSlotRef}
        chatSurface={chatSurface}
        onToggleChat={onToggleChat}
        onExtractChat={onExtractChat}
        onClose={() => playerSurfaceRef.current?.requestClose()}
        onExtract={onExtract}
        onGetCurrentTimeSeconds={() =>
          playerSurfaceRef.current?.getPlaybackSnapshot()?.currentTimeSeconds ?? 0
        }
        onResumePlayback={() => playerSurfaceRef.current?.play()}
        onOpenVideo={onOpenVideo}
        onOpenChannel={onOpenChannel}
        onStatePatched={onStatePatched}
        onSeekTo={(seconds) => playerSurfaceRef.current?.seekTo(seconds)}
        onPause={() => playerSurfaceRef.current?.pause()}
        onOpenSettings={onOpenSettings}
      />
      <MiniPlayerBar
        video={video}
        hidden={!miniplayer}
        width={miniplayerWidth}
        slotRef={onMiniSlotRef}
        onMaximize={onMaximize}
        onClose={onClose}
        onExtract={onExtract}
        onResizeEnd={onResizeMiniplayer}
      />
    </>
  )
}
