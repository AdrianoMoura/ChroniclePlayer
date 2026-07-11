// feed.md §Feed item presentation: relative within 7 days, absolute date beyond.
export function publishedLabel(publishedAt: string, now = Date.now()): string {
  const minutes = Math.floor((now - Date.parse(publishedAt)) / 60_000)
  if (minutes < 60) return `${Math.max(minutes, 0)} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.floor(hours / 24)
  if (days <= 7) return `${days} d ago`
  return new Date(publishedAt).toLocaleDateString()
}

export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const mm = hours > 0 ? String(minutes).padStart(2, '0') : String(minutes)
  const ss = String(seconds).padStart(2, '0')
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`
}
