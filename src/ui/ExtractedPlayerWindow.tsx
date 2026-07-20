import { useCallback, useEffect, useRef, useState } from 'react'

// "Extract to an always-on-top window" (B-045): a second BrowserWindow is a
// separate renderer process, so there's no way to move the main window's
// iframe DOM node into it. This reuses the same renderer bundle (loaded
// with an `?extract=` query string, see main.tsx) as a fresh, minimal
// instance: a bare clean-embed iframe filling the window, seeked to the
// snapshot the main window handed off — no Chronicle chrome, no keyboard
// shortcuts. It speaks the same postMessage widget protocol PlayerSurface
// uses, for three reasons: (1) the URL's own `autoplay=1` alone doesn't
// reliably start playback in this top-level context, so this issues an
// explicit `playVideo()` command once the embed announces itself; (2)
// `resumePositionSeconds` is kept current so closing this window lets the
// main window's miniplayer pick the video back up without losing the
// user's place; (3) D-038's default playback rate is applied the same way
// PlayerSurface applies it — there's no URL param for playback rate.

const VIDEO_ID_PATTERN = /^[\w-]{1,64}$/
const PLAYER_ORIGIN = 'https://www.youtube.com'
const RESUME_MIN_SECONDS = 10
// D-038's rate reissue normally fires on the first onStateChange(playing)
// event, but the autoplay-initiated onStateChange isn't reliably observed
// here. Reissuing on every infoDelivery tick instead — a steady heartbeat
// once the widget is up — reliably lands the command after YouTube's own
// reset-to-1x-on-start. Measured in wall-clock time since load, not video
// position, since most extractions hand off mid-video rather than near 0:00.
const RATE_RETRY_WINDOW_MS = 3000

export function ExtractedPlayerWindow({
  videoId: initialVideoId,
  title: initialTitle,
  startSeconds,
  autoplay: initialAutoplay,
  defaultPlaybackRate
}: {
  videoId: string
  title: string
  startSeconds: number
  autoplay: boolean
  defaultPlaybackRate: number
}) {
  // Local state (not just the URL query string's initial props) since the
  // main window can swap in a new video (loadInExtractWindow) while this
  // window stays open.
  const [videoId, setVideoId] = useState(initialVideoId)
  const [title, setTitle] = useState(initialTitle)
  const [autoplay, setAutoplay] = useState(initialAutoplay)
  // Only meaningful for the very first load — a later swap always starts
  // at 0 (there's no "resume position" for a video the user just picked
  // from the main window's feed).
  const [startAt, setStartAt] = useState(startSeconds)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const currentTimeRef = useRef(startSeconds)
  // Kept in sync so the player:loadInExtract handler below can persist the
  // *outgoing* video's position without it being a dependency of that
  // effect (which must only be set up once, like PlayerSurface's onEvent
  // subscriptions elsewhere).
  const videoIdRef = useRef(initialVideoId)
  useEffect(() => {
    videoIdRef.current = videoId
  }, [videoId])

  // Electron mirrors document.title into the native window title. Without
  // this, index.html's static <title>Chronicle</title> would make this
  // window indistinguishable from the main one at the OS level (taskbar/
  // alt-tab/compositor window rules), since both load the same bundle and
  // neither shows its own visible titlebar (D-051).
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

  // Swaps in a video picked in the main window while this window is open,
  // instead of it (also) starting in the main window. Same resume-position
  // handoff PlayerSurface does for a normal in-main-window video switch.
  useEffect(() => {
    return window.chronicle.onEvent((event) => {
      if (event.type !== 'player:loadInExtract') return
      if (currentTimeRef.current >= RESUME_MIN_SECONDS) {
        void window.chronicle.setResumePosition(
          videoIdRef.current,
          Math.floor(currentTimeRef.current)
        )
      }
      currentTimeRef.current = 0
      loadedAtRef.current = Date.now()
      setStartAt(0)
      setVideoId(event.videoId)
      setTitle(event.title)
      setAutoplay(true)
    })
  }, [])

  if (!VIDEO_ID_PATTERN.test(videoId)) return null

  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    iv_load_policy: '3',
    controls: '1',
    enablejsapi: '1',
    autoplay: autoplay ? '1' : '0',
    start: String(Math.max(0, Math.floor(startAt)))
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
