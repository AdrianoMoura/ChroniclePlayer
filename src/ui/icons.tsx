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
