import { useEffect, useRef, type KeyboardEvent, type RefObject } from 'react'

interface DialogDismissProps {
  ref: RefObject<HTMLDivElement | null>
  tabIndex: -1
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
}

// A dialog's container owns Escape while it's open and must never let it (or
// any other key) bubble to whatever's underneath (the player's own
// Esc-to-close/dock map, the feed's own keydown handler). That only works if
// the container — or something inside it — actually has focus: a dialog
// opened via a plain click or a keyboard shortcut with no autoFocus element
// inside otherwise leaves focus on whatever triggered it, a sibling of the
// dialog rather than an ancestor, so the keydown event never bubbles through
// here at all. Spread the returned props onto the dialog's outermost element.
//
// `isOpen` only matters for a dialog whose container never unmounts (e.g. one
// rendered conditionally inside an always-mounted hook) — pass the condition
// that gates its JSX so focus is reclaimed every time it opens, not just on
// the owning component's first render. A dialog that is itself mounted/
// unmounted by its parent can omit it (mounting already is "opening").
export function useDialogDismiss(onClose: () => void, isOpen = true): DialogDismissProps {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const container = containerRef.current
    // Skip stealing focus from an element that already has it (e.g. an
    // autoFocus input rendered inside this same container) — React applies
    // autoFocus before this effect runs, so by the time it's checked here,
    // activeElement already reflects whatever the dialog itself set.
    if (container !== null && !container.contains(document.activeElement)) {
      container.focus()
    }
  }, [isOpen])

  return {
    ref: containerRef,
    tabIndex: -1,
    onKeyDown: (event) => {
      event.stopPropagation()
      if (event.key === 'Escape') onClose()
    }
  }
}
