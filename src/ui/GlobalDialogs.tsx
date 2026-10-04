import type { ReactNode } from 'react'
import { AddAccount } from './AddAccount'
import { AddToPlaylistDialog } from './AddToPlaylistDialog'
import { HelpOverlay } from './HelpOverlay'
import { UrlPrompt } from './UrlPrompt'

interface GlobalDialogsProps {
  helpOpen: boolean
  onCloseHelp: () => void
  writeScopeDialog: ReactNode
  addAccountOpen: boolean
  onCancelAddAccount: () => void
  onAddAccountConnected: () => void
  urlPromptOpen: boolean
  onOpenVideoFromUrlPrompt: (videoId: string) => void
  onCloseUrlPrompt: () => void
  addToPlaylistVideo: { videoId: string; title: string } | null
  onCloseAddToPlaylist: () => void
  onAddToPlaylistChanged: () => void
}

// Every App-level dialog that isn't owned by a specific screen — reachable
// from anywhere (a video card/row, the sidebar, a keyboard shortcut), so
// none of them belongs to any one screen's own component.
export function GlobalDialogs({
  helpOpen,
  onCloseHelp,
  writeScopeDialog,
  addAccountOpen,
  onCancelAddAccount,
  onAddAccountConnected,
  urlPromptOpen,
  onOpenVideoFromUrlPrompt,
  onCloseUrlPrompt,
  addToPlaylistVideo,
  onCloseAddToPlaylist,
  onAddToPlaylistChanged
}: GlobalDialogsProps) {
  return (
    <>
      {helpOpen && <HelpOverlay onClose={onCloseHelp} />}
      {writeScopeDialog}
      {addAccountOpen && (
        <AddAccount onCancel={onCancelAddAccount} onConnected={onAddAccountConnected} />
      )}
      {urlPromptOpen && (
        <UrlPrompt onOpenVideo={onOpenVideoFromUrlPrompt} onClose={onCloseUrlPrompt} />
      )}
      {addToPlaylistVideo && (
        <AddToPlaylistDialog
          videoId={addToPlaylistVideo.videoId}
          videoTitle={addToPlaylistVideo.title}
          onClose={onCloseAddToPlaylist}
          onPlaylistsChanged={onAddToPlaylistChanged}
        />
      )}
    </>
  )
}
