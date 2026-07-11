import { useEffect, useState } from 'react'
import type { FeedBucketDto, FeedDto, FeedVideoDto } from '../ipc/contract'

const GROUP_LABELS: Record<FeedBucketDto, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  'this-week': 'This Week',
  earlier: 'Earlier'
}

export function App() {
  const [feed, setFeed] = useState<FeedDto | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.chronicle.getFeed().then(setFeed, (reason: unknown) => setError(String(reason)))
  }, [])

  return (
    <div className="app">
      <aside className="sidebar">
        <nav>
          <span className="view active">Feed</span>
        </nav>
      </aside>
      <main className="feed">
        {error !== null && <div className="banner">{error}</div>}
        {feed?.groups.map((group) => (
          <section key={group.bucket}>
            <h2 className="group-header">{GROUP_LABELS[group.bucket]}</h2>
            <ul className="rows">
              {group.videos.map((video) => (
                <FeedRow key={video.videoId} video={video} />
              ))}
            </ul>
          </section>
        ))}
      </main>
    </div>
  )
}

function FeedRow({ video }: { video: FeedVideoDto }) {
  return (
    <li className="row">
      <div className="thumb" />
      <div className="row-text">
        <span className="title">{video.title}</span>
        <span className="meta">
          {video.channelTitle} · {publishedLabel(video.publishedAt)}
        </span>
      </div>
      {video.durationSeconds !== null && (
        <span className="duration">{formatDuration(video.durationSeconds)}</span>
      )}
    </li>
  )
}

// feed.md §Feed item presentation: relative within 7 days, absolute date beyond.
function publishedLabel(publishedAt: string): string {
  const minutes = Math.floor((Date.now() - Date.parse(publishedAt)) / 60_000)
  if (minutes < 60) return `${Math.max(minutes, 0)} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.floor(hours / 24)
  if (days <= 7) return `${days} d ago`
  return new Date(publishedAt).toLocaleDateString()
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const mm = hours > 0 ? String(minutes).padStart(2, '0') : String(minutes)
  const ss = String(seconds).padStart(2, '0')
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`
}
