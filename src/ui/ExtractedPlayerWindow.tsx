import { useCallback, useEffect, useRef } from 'react'

// B-045 "extract to an always-on-top window": a second BrowserWindow is a
// separate renderer process, so there's no way to move the main window's
// iframe DOM node into it — this reuses the same renderer bundle (loaded
// with an `?extract=` query string, see main.tsx) as a genuinely fresh,
// minimal instance instead: a bare clean-embed iframe filling the window,
// seeked to the snapshot the main window handed off. No Chronicle chrome,
// no keyboard shortcuts — this window is meant to be a small floating
// video, not a second copy of the app. It does speak the same postMessage
// widget protocol PlayerSurface uses, for three reasons: (1) the URL's own
// `autoplay=1` alone wasn't reliably starting playback in this top-level
// (not nested-iframe) context, so this issues an explicit `playVideo()`
// command once the embed announces itself; (2) `resumePositionSeconds`
// needs to be kept current so that closing this window and having the
// main window's miniplayer pick the video back up doesn't lose the
// user's place; (3) D-038's default playback rate has to be applied the
// same way PlayerSurface applies it — there's no URL param for playback
// rate, and the main window's rate isn't otherwise handed off to this fresh
// instance at all. Reissuing it once on `onStateChange(playing)` (as
// PlayerSurface does) wasn't enough here: that event isn't reliably observed
// for the *autoplay-initiated* transition (see `RATE_RETRY_WINDOW_MS`), so
// this reissues on every `infoDelivery` tick for a few seconds instead.

const VIDEO_ID_PATTERN = /^[\w-]{1,64}$/
const PLAYER_ORIGIN = 'https://www.youtube.com'
const RESUME_MIN_SECONDS = 10
// D-038's rate reissue normally fires on the first onStateChange(playing)
// event — but B-045's own round 5 already found that the *autoplay-initiated*
// onStateChange isn't reliably observed at all (the same reason
// isStillGoing() had to stop trusting a strict state check). Reissuing on
// every infoDelivery tick instead — a steady heartbeat once the widget is
// genuinely up, unrelated to which state-change events happened to land —
// for this short window after load is a more reliable way to land the
// command at least once after YouTube's own reset-to-1x-on-start. Measured
// in wall-clock time since load, not video position, since most extractions
// hand off mid-video rather than starting near 0:00.
const RATE_RETRY_WINDOW_MS = 3000

export function ExtractedPlayerWindow({
  videoId,
  title,
  startSeconds,
  autoplay,
  defaultPlaybackRate
}: {
  videoId: string
  title: string
  startSeconds: number
  autoplay: boolean
  defaultPlaybackRate: number
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const currentTimeRef = useRef(startSeconds)

  // D-051: index.html's static <title>Chronicle</title> would otherwise
  // apply here too (this window loads the exact same renderer bundle),
  // making this window indistinguishable from the main one at the OS level
  // (taskbar/alt-tab/window-switcher/compositor window rules) even though
  // neither shows its own visible titlebar. Electron mirrors a page's
  // document.title into the native window title by default.
  useEffect(() => {
    document.title = title ? `${title} - Chronicle` : 'Chronicle'
  }, [title])
  // Wall-clock, not video position: most extractions hand off mid-video (not
  // near 0:00), so gating the retry window on currentTime would never fire
  // for anything but a video extracted in its first few seconds.
  const loadedAtRef = useRef(Date.now())

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
    // D-038: same as PlayerSurface — set the default rate up front, and
    // reissue it once playback actually starts (below), since YouTube can
    // reset it back to 1x the moment the stream begins.
    if (defaultPlaybackRate !== 1) command('setPlaybackRate', [defaultPlaybackRate])
  }, [command, autoplay, defaultPlaybackRate])

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
        if (defaultPlaybackRate !== 1 && Date.now() - loadedAtRef.current < RATE_RETRY_WINDOW_MS) {
          command('setPlaybackRate', [defaultPlaybackRate])
        }
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [command, defaultPlaybackRate])

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
      allowFullScreen
      onLoad={announce}
    />
  )
}
