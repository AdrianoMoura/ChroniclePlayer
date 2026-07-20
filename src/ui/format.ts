import { t } from './i18n'

// feed.md §Feed item presentation: relative within 7 days, absolute date beyond.
export function publishedLabel(publishedAt: string, now = Date.now()): string {
  const minutes = Math.floor((now - Date.parse(publishedAt)) / 60_000)
  if (minutes < 60) return t('format.minutesAgo', { minutes: Math.max(minutes, 0) })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('format.hoursAgo', { hours })
  const days = Math.floor(hours / 24)
  if (days <= 7) return t('format.daysAgo', { days })
  return new Date(publishedAt).toLocaleDateString()
}

// B-120: feed rows must label a video by the same instant that decides its
// date bucket (core/feed.ts's effectiveDate, D-053) — otherwise a video that
// was ever live can show a relative-time label that disagrees with the
// section it's grouped under (an ended broadcast buckets by when it
// wrapped, but a publishedAt-only label keeps counting from when it
// started/was scheduled). ui/ can't import core/ directly (architecture.md),
// so this mirrors that narrow rule instead of sharing it.
export function feedItemLabel(
  video: {
    publishedAt: string
    liveContent: 'none' | 'live' | 'upcoming'
    liveEndedAt: string | null
    isPremiere: boolean
  },
  now = Date.now()
): string {
  const effectiveAt =
    video.liveContent === 'live' && !video.isPremiere
      ? now
      : video.liveEndedAt !== null
        ? Date.parse(video.liveEndedAt)
        : Date.parse(video.publishedAt)
  return publishedLabel(new Date(effectiveAt).toISOString(), now)
}

export function formatClockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

// Quota resets at midnight Pacific (youtube-api.md); shown in local time.
export function quotaResetLocalTime(): string {
  const now = new Date()
  const pacific = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  }).format(now)
  const [hours, minutes] = pacific.split(':').map(Number)
  const untilMidnightMin = 24 * 60 - (hours * 60 + minutes)
  return formatClockTime(new Date(now.getTime() + untilMidnightMin * 60_000).toISOString())
}

// D-018: shown only when the setting enables it.
export function formatViews(viewCount: number): string {
  return t('format.views', {
    count: new Intl.NumberFormat(undefined, { notation: 'compact' }).format(viewCount)
  })
}

// B-056: channel screen only — null when YouTube reports the count hidden.
export function formatSubscriberCount(count: number): string {
  return t('format.subscribers', {
    count: new Intl.NumberFormat(undefined, { notation: 'compact' }).format(count)
  })
}

export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const mm = hours > 0 ? String(minutes).padStart(2, '0') : String(minutes)
  const ss = String(seconds).padStart(2, '0')
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`
}
