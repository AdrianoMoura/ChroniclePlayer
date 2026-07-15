import type { PlayerVideoDto } from '../ipc/contract'
import { t } from './i18n'

// The docked miniplayer's chrome (B-045) — a small corner box with a slot
// `<div>` (see PlayerDetails for the same pattern) that PlayerSurface
// measures and visually aligns its live iframe to (see PlayerSurface.tsx
// for why it's measurement, not a portal), plus title +
// maximize/extract/close. The feed underneath is fully interactive while
// this is showing — that's the point of docking instead of closing.
// Resizable via the browser's native CSS `resize: horizontal` (styles.css).

interface MiniPlayerBarProps {
  video: PlayerVideoDto
  // Stays mounted even while hidden (full-view mode) — see PlayerDetails'
  // own `hidden` prop for why this matters (the slot must never disappear).
  hidden: boolean
  slotRef: (element: HTMLDivElement | null) => void
  onMaximize: () => void
  onClose: () => void
  onExtract: () => void
}

export function MiniPlayerBar({ video, hidden, slotRef, onMaximize, onClose, onExtract }: MiniPlayerBarProps) {
  return (
    <div className="miniplayer" style={hidden ? { display: 'none' } : undefined}>
      <div
        ref={slotRef}
        className="miniplayer-stage-slot"
        role="button"
        tabIndex={0}
        title={t('player.miniplayer.maximizeTitle')}
        onClick={onMaximize}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') onMaximize()
        }}
      />
      <div className="miniplayer-bar">
        <span className="miniplayer-title" title={video.title}>
          {video.title}
        </span>
        <div className="miniplayer-actions">
          <button title={t('player.miniplayer.extractTitle')} onClick={onExtract}>
            ⧉
          </button>
          <button title={t('player.miniplayer.maximizeTitle')} onClick={onMaximize}>
            ⤢
          </button>
          <button title={t('player.miniplayer.closeTitle')} onClick={onClose}>
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
