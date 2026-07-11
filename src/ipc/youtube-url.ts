// Link routing rules for D-029 (playback.md §Universal video opening):
// video links open in-app; Shorts links never play in-app (D-028) — the UI
// offers the browser; channel/playlist/anything-else goes to the browser.
// Lives in ipc/ because links are routed at the renderer boundary and ui/
// may only import from ipc/ (architecture.md §Dependency rule); it is pure.

export type YouTubeLink =
  | { kind: 'video'; videoId: string }
  | { kind: 'shorts'; videoId: string }
  | { kind: 'channel' }
  | { kind: 'playlist' }
  | { kind: 'other' }

const VIDEO_ID = /^[\w-]{11}$/

export function parseYouTubeUrl(raw: string): YouTubeLink {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return { kind: 'other' }
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return { kind: 'other' }

  const host = url.hostname.replace(/^www\.|^m\./, '')

  if (host === 'youtu.be') {
    return asVideo(url.pathname.slice(1).split('/')[0])
  }
  if (host !== 'youtube.com' && host !== 'youtube-nocookie.com') {
    return { kind: 'other' }
  }

  const segments = url.pathname.split('/').filter((s) => s.length > 0)
  const head = segments[0] ?? ''

  if (head === 'watch') return asVideo(url.searchParams.get('v') ?? '')
  if (head === 'live' || head === 'embed' || head === 'v') return asVideo(segments[1] ?? '')
  if (head === 'shorts') {
    const id = segments[1] ?? ''
    return VIDEO_ID.test(id) ? { kind: 'shorts', videoId: id } : { kind: 'other' }
  }
  if (head === 'playlist') return { kind: 'playlist' }
  if (head === 'channel' || head === 'c' || head === 'user' || head.startsWith('@')) {
    return { kind: 'channel' }
  }
  return { kind: 'other' }
}

function asVideo(id: string): YouTubeLink {
  return VIDEO_ID.test(id) ? { kind: 'video', videoId: id } : { kind: 'other' }
}
