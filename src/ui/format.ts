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

// A currently-airing video's own effectiveDate is pinned to "now" (so it
// sorts to the top of Today), which would make publishedLabel always read
// "0 min ago" — this shows real elapsed time since it actually started.
export function startedLabel(startedAt: string, now = Date.now()): string {
  const minutes = Math.floor((now - Date.parse(startedAt)) / 60_000)
  if (minutes < 60) return t('format.startedMinutesAgo', { minutes: Math.max(minutes, 0) })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('format.startedHoursAgo', { hours })
  const days = Math.floor(hours / 24)
  if (days <= 7) return t('format.startedDaysAgo', { days })
  return t('format.startedOn', { date: new Date(startedAt).toLocaleDateString() })
}

// Labels a feed row by the same instant core/feed.ts's effectiveDate uses to
// bucket it (ui/ can't import core/ directly, per architecture.md, so this
// narrow rule is mirrored rather than shared) — except while a video is
// actually airing, when startedLabel is more useful than "0 min ago".
export function feedItemLabel(
  video: {
    publishedAt: string
    liveContent: 'none' | 'live' | 'upcoming'
    liveStartedAt: string | null
    liveEndedAt: string | null
  },
  now = Date.now()
): string {
  if (video.liveContent === 'live') {
    return startedLabel(video.liveStartedAt ?? video.publishedAt, now)
  }
  const publishedAt = Date.parse(video.publishedAt)
  const effectiveAt =
    video.liveEndedAt !== null ? Math.max(Date.parse(video.liveEndedAt), publishedAt) : publishedAt
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

// Settings' storage indicator (D-020 exercised, local-data.md §Retention).
// Unit abbreviations (MB/GB) are the same string in every shipped locale, so
// this skips t() rather than adding translation keys for them.
export function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  if (mb < 1024) return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`
  return `${(mb / 1024).toFixed(1)} GB`
}

// Playlist card meta (ui.md): hours:minutes, no seconds — coarser than a
// single video's own mm:ss/h:mm:ss duration since this is a running total.
export function formatPlaylistDuration(totalSeconds: number): string {
  const totalMinutes = Math.round(totalSeconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}:${String(minutes).padStart(2, '0')}`
}

export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const mm = hours > 0 ? String(minutes).padStart(2, '0') : String(minutes)
  const ss = String(seconds).padStart(2, '0')
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`
}
