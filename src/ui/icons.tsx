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
