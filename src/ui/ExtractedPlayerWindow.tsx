// B-045 "extract to an always-on-top window": a second BrowserWindow is a
// separate renderer process, so there's no way to move the main window's
// iframe DOM node into it — this reuses the same renderer bundle (loaded
// with an `?extract=` query string, see main.tsx) as a genuinely fresh,
// minimal instance instead: a bare clean-embed iframe filling the window,
// seeked to the snapshot the main window handed off. No postMessage widget
// protocol, no Chronicle chrome, no keyboard shortcuts — this window is
// meant to be a small floating video, not a second copy of the app.

const VIDEO_ID_PATTERN = /^[\w-]{1,64}$/

export function ExtractedPlayerWindow({
  videoId,
  startSeconds,
  autoplay
}: {
  videoId: string
  startSeconds: number
  autoplay: boolean
}) {
  if (!VIDEO_ID_PATTERN.test(videoId)) return null

  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    iv_load_policy: '3',
    controls: '1',
    autoplay: autoplay ? '1' : '0',
    start: String(Math.max(0, Math.floor(startSeconds)))
  })

  return (
    <iframe
      className="extracted-player-iframe"
      src={`https://www.youtube.com/embed/${videoId}?${params.toString()}`}
      title="Chronicle"
      allow="autoplay; encrypted-media; fullscreen"
    />
  )
}
