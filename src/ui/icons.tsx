// A plain, monochrome (currentColor) inline icon — no emoji, no icon
// font/library. Filled vs. outline mirrors the app's ★/☆ favorite convention.
export function BellIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" focusable="false">
      <path
        d="M8 1.6c-.83 0-1.5.67-1.5 1.5v.33C4.7 3.9 3.5 5.6 3.5 7.7v2.8l-1.1 1.4v.7h11.2v-.7l-1.1-1.4V7.7c0-2.1-1.2-3.8-3-4.27V3.1c0-.83-.67-1.5-1.5-1.5z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 1.1}
        strokeLinejoin="round"
      />
      <path
        d="M6.2 13.1a1.8 1.8 0 0 0 3.6 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  )
}

// D-068: Material Symbols' "thumb_up"/"thumb_down" glyphs — small, purely
// decorative markers flanking the like/dislike counts, not interactive
// controls (the actual toggle buttons stay text-label ActionButtons).
export function ThumbUpIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" focusable="false">
      <path
        d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"
        fill="currentColor"
      />
    </svg>
  )
}

export function ThumbDownIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" focusable="false">
      <path
        d="M15 3H6c-.83 0-1.54.5-1.84 1.22L1.14 11.27c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"
        fill="currentColor"
      />
    </svg>
  )
}

// Material Symbols' own "share" glyph (three connected nodes) — the
// recognizable share icon, not a text-character approximation.
export function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      <path
        d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"
        fill="currentColor"
      />
    </svg>
  )
}
