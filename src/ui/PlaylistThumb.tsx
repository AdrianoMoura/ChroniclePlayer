// Thumbnails go through the backend cache (thumb:// protocol) — the
// renderer never talks to Google hosts directly (architecture.md).
function thumbSrc(url: string): string {
  return `thumb://img/${encodeURIComponent(url)}`
}

interface PlaylistThumbProps {
  thumbnailUrls: string[]
  className?: string
}

// A playlist's composite cover: 1-6 of its own videos' thumbnails (playlist
// order, core/playlist.ts's MAX_PLAYLIST_THUMBS) arranged in a grid inside
// the exact same `.thumb` area a single video's thumbnail occupies — every
// per-itemSize width/aspect-ratio rule (styles.css) already targets `.thumb`
// by class, so this inherits sizing for free at every list/grid size. An
// empty playlist (or one whose videos have no thumbnail yet) falls back to
// the same bare placeholder a thumbnail-less video renders.
export function PlaylistThumb({ thumbnailUrls, className = '' }: PlaylistThumbProps) {
  const shown = thumbnailUrls.slice(0, 6)
  if (shown.length === 0) return <div className={`thumb ${className}`} />
  return (
    <div className={`thumb playlist-thumb-grid count-${shown.length} ${className}`}>
      {shown.map((url, index) => (
        <img key={index} loading="lazy" alt="" draggable={false} src={thumbSrc(url)} />
      ))}
    </div>
  )
}
