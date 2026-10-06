import { useRef, useState } from 'react'
import { MINIPLAYER_MAX_WIDTH, MINIPLAYER_MIN_WIDTH, type PlayerVideoDto } from '../ipc/contract'
import { t } from './i18n'

// The docked miniplayer's chrome — a small corner box with a slot `<div>`
// (see PlayerDetails for the same pattern) that PlayerSurface measures and
// visually aligns its live iframe to, plus title + maximize/extract/close.
// The feed underneath stays fully interactive while this is showing.
// Resizable via a custom drag handle in a dedicated left-edge strip rather
// than the browser's native `resize` (which anchors to the bottom-right
// corner, where this box already sits against the screen's corner). The
// strip is real layout (a flex sibling of `.miniplayer-content`), not an
// absolutely-positioned overlay — the live video iframe is a separate
// floating element mirroring the stage slot's rect at a higher z-index, so
// an overlay handle sitting inside that rect would be painted over and
// unclickable.

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
  const barRef = useRef<HTMLDivElement | null>(null)

  function startResize(event: React.MouseEvent): void {
    event.preventDefault()
    dragStartRef.current = { x: event.clientX, width }
    // Grow freely up to the window's own current size, in whichever
    // dimension the box would hit first — width directly, height via the
    // stage slot's fixed 16:9 ratio plus the title bar and border beneath
    // it. Deliberately window.innerWidth/innerHeight, not window.screen
    // (the display's own resolution): the latter reads smaller than the
    // window itself on at least one real Wayland setup, which made this
    // stop short of the window's real edge for no visible reason. Mirrors
    // the CSS passive clamp in styles.css exactly, so dragging can't keep
    // going past where the box would visually stop anyway. Read once per
    // drag, not per move.
    const chromeHeight = (barRef.current?.offsetHeight ?? 40) + 2
    const widthMax = window.innerWidth - 32
    const heightMax = window.innerHeight - 32 - chromeHeight
    const maxWidth = Math.min(MINIPLAYER_MAX_WIDTH, widthMax, Math.round((heightMax * 16) / 9))
    function onMouseMove(moveEvent: MouseEvent): void {
      const start = dragStartRef.current
      if (start === null) return
      // Right edge is anchored (bottom/right, styles.css) — dragging the
      // left-edge handle *left* must grow the box, hence start.x - clientX.
      const next = Math.min(
        maxWidth,
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
      >
        <span className="miniplayer-resize-grip" aria-hidden="true" />
      </div>
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
        <div className="miniplayer-bar" ref={barRef}>
          <span className="miniplayer-title" title={video.title}>
            {video.title}
          </span>
          <div className="miniplayer-actions">
            <button title={t('player.extractTitle')} onClick={onExtract}>
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
