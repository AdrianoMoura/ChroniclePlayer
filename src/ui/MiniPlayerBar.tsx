import { useRef, useState } from 'react'
import { MINIPLAYER_MAX_WIDTH, MINIPLAYER_MIN_WIDTH, type PlayerVideoDto } from '../ipc/contract'
import { t } from './i18n'

// The docked miniplayer's chrome (B-045) — a small corner box with a slot
// `<div>` (see PlayerDetails for the same pattern) that PlayerSurface
// measures and visually aligns its live iframe to (see PlayerSurface.tsx
// for why it's measurement, not a portal), plus title +
// maximize/extract/close. The feed underneath is fully interactive while
// this is showing — that's the point of docking instead of closing.
// Resizable via a custom drag handle in a dedicated left-edge strip (not the
// browser's native `resize`, which anchors its own handle to the box's
// bottom-right corner — exactly where this box already sits against the
// screen's own corner). The strip is real layout (a flex sibling of
// `.miniplayer-content`), not an absolutely-positioned overlay, because the
// live video iframe is a separate floating element mirroring the stage
// slot's rect at a higher z-index (see PlayerSurface.tsx / styles.css's
// stacking-order note) — an overlay handle sitting inside that rect would be
// painted over and unclickable, which is exactly what happened before this.

interface MiniPlayerBarProps {
  video: PlayerVideoDto
  // Stays mounted even while hidden (full-view mode) — see PlayerDetails'
  // own `hidden` prop for why this matters (the slot must never disappear).
  hidden: boolean
  width: number
  slotRef: (element: HTMLDivElement | null) => void
  onMaximize: () => void
  onClose: () => void
  onExtract: () => void
  // Committed once, on drag end — not on every mousemove, to avoid spamming
  // settings.json writes mid-drag.
  onResizeEnd: (width: number) => void
}

export function MiniPlayerBar({
  video,
  hidden,
  width,
  slotRef,
  onMaximize,
  onClose,
  onExtract,
  onResizeEnd
}: MiniPlayerBarProps) {
  // Local, immediate feedback while dragging; `width` (the persisted prop)
  // only updates once the drag ends and the parent's setting is saved.
  const [dragWidth, setDragWidth] = useState<number | null>(null)
  const dragStartRef = useRef<{ x: number; width: number } | null>(null)

  function startResize(event: React.MouseEvent): void {
    event.preventDefault()
    dragStartRef.current = { x: event.clientX, width }
    function onMouseMove(moveEvent: MouseEvent): void {
      const start = dragStartRef.current
      if (start === null) return
      // Right edge is anchored (bottom/right, styles.css) — dragging the
      // left-edge handle *left* must grow the box, hence start.x - clientX.
      const next = Math.min(
        MINIPLAYER_MAX_WIDTH,
        Math.max(MINIPLAYER_MIN_WIDTH, start.width + (start.x - moveEvent.clientX))
      )
      setDragWidth(next)
    }
    function onMouseUp(): void {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      const start = dragStartRef.current
      dragStartRef.current = null
      setDragWidth((current) => {
        if (current !== null && start !== null && current !== start.width) onResizeEnd(current)
        return null
      })
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  return (
    <div
      className="miniplayer"
      style={{ width: dragWidth ?? width, ...(hidden ? { display: 'none' } : undefined) }}
    >
      <div
        className="miniplayer-resize-handle"
        title={t('player.miniplayer.resizeTitle')}
        onMouseDown={startResize}
      />
      <div className="miniplayer-content">
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
    </div>
  )
}
