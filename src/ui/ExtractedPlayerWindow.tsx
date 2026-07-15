import { useCallback, useEffect, useRef } from 'react'

// B-045 "extract to an always-on-top window": a second BrowserWindow is a
// separate renderer process, so there's no way to move the main window's
// iframe DOM node into it — this reuses the same renderer bundle (loaded
// with an `?extract=` query string, see main.tsx) as a genuinely fresh,
// minimal instance instead: a bare clean-embed iframe filling the window,
// seeked to the snapshot the main window handed off. No Chronicle chrome,
// no keyboard shortcuts — this window is meant to be a small floating
// video, not a second copy of the app. It does speak the same postMessage
// widget protocol PlayerSurface uses, for two reasons: (1) the URL's own
// `autoplay=1` alone wasn't reliably starting playback in this top-level
// (not nested-iframe) context, so this issues an explicit `playVideo()`
// command once the embed announces itself; (2) `resumePositionSeconds`
// needs to be kept current so that closing this window and having the
// main window's miniplayer pick the video back up doesn't lose the
// user's place.

const VIDEO_ID_PATTERN = /^[\w-]{1,64}$/
const PLAYER_ORIGIN = 'https://www.youtube.com'
const RESUME_MIN_SECONDS = 10

export function ExtractedPlayerWindow({
  videoId,
  startSeconds,
  autoplay
}: {
  videoId: string
  startSeconds: number
  autoplay: boolean
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const currentTimeRef = useRef(startSeconds)

  const command = useCallback((func: string, args: unknown[] = []) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args, id: 'chronicle', channel: 'widget' }),
      PLAYER_ORIGIN
    )
  }, [])

  const announce = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'listening', id: 'chronicle', channel: 'widget' }),
      PLAYER_ORIGIN
    )
    // See the file comment: the URL's autoplay=1 alone isn't reliable here,
    // so this is issued explicitly once the widget protocol is live.
    if (autoplay) command('playVideo')
  }, [command, autoplay])

  useEffect(() => {
    function onMessage(event: MessageEvent): void {
      if (event.origin !== PLAYER_ORIGIN || typeof event.data !== 'string') return
      let payload: { event?: string; info?: unknown }
      try {
        payload = JSON.parse(event.data) as { event?: string; info?: unknown }
      } catch {
        return
      }
      if (payload.event === 'infoDelivery') {
        const info = payload.info as { currentTime?: number } | undefined
        if (typeof info?.currentTime === 'number') currentTimeRef.current = info.currentTime
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  // Best-effort: persist wherever playback got to before this window
  // closes, so reopening the video (main window's miniplayer, on the
  // 'closed' notification from main.ts) resumes close to where this left
  // off rather than back at the extraction-time position.
  useEffect(() => {
    function onBeforeUnload(): void {
      if (currentTimeRef.current < RESUME_MIN_SECONDS) return
      void window.chronicle.setResumePosition(videoId, Math.floor(currentTimeRef.current))
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [videoId])

  if (!VIDEO_ID_PATTERN.test(videoId)) return null

  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    iv_load_policy: '3',
    controls: '1',
    enablejsapi: '1',
    autoplay: autoplay ? '1' : '0',
    start: String(Math.max(0, Math.floor(startSeconds)))
  })

  return (
    <iframe
      ref={iframeRef}
      className="extracted-player-iframe"
      src={`https://www.youtube.com/embed/${videoId}?${params.toString()}`}
      title="Chronicle"
      allow="autoplay; encrypted-media; fullscreen"
      onLoad={announce}
    />
  )
}
