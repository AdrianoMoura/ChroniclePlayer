import { XMLParser } from 'fast-xml-parser'
import { internal } from '../../core/errors'
import type { ChannelSyncInfo, DiscoveredVideo, RssFeedResult } from '../../core/ports'
import { request, type FetchFn } from '../http'

// The free discovery tier of the hybrid feed source (D-007): public channel
// feeds, no auth, no quota. Politeness (youtube-api.md §RSS): conditional
// GET via ETag/Last-Modified; the sync engine bounds concurrency.

const FEED_BASE = 'https://www.youtube.com/feeds/videos.xml'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_'
})

export class YouTubeRssClient {
  constructor(private readonly fetchFn: FetchFn) {}

  async discoverRecent(channel: ChannelSyncInfo): Promise<RssFeedResult> {
    const headers: Record<string, string> = {}
    if (channel.rssEtag !== null) headers['if-none-match'] = channel.rssEtag
    if (channel.rssLastModified !== null) headers['if-modified-since'] = channel.rssLastModified

    const response = await request(
      this.fetchFn,
      `${FEED_BASE}?channel_id=${encodeURIComponent(channel.channelId)}`,
      { headers }
    )

    if (response.status === 304) return { kind: 'not-modified' }
    // A 404 here isn't reliable proof a channel is gone for good — YouTube's
    // RSS edge can return one transiently, so it's treated as an ordinary
    // retryable fetch failure, never a permanent "channel deleted" verdict (D-048).
    if (!response.ok) throw internal(`RSS fetch failed with ${response.status}`)

    return {
      kind: 'ok',
      entries: parseFeed(await response.text()),
      etag: response.headers.get('etag'),
      lastModified: response.headers.get('last-modified')
    }
  }
}

export function parseFeed(xml: string): DiscoveredVideo[] {
  let document: Record<string, unknown>
  try {
    document = parser.parse(xml) as Record<string, unknown>
  } catch (cause) {
    throw internal('malformed RSS feed', cause)
  }
  const feed = document['feed'] as Record<string, unknown> | undefined
  const rawEntries = feed?.['entry']
  if (rawEntries === undefined) return []
  const entries = Array.isArray(rawEntries) ? rawEntries : [rawEntries]

  return entries.flatMap((raw) => {
    const entry = raw as Record<string, unknown>
    const videoId = entry['yt:videoId']
    const published = entry['published']
    if (typeof videoId !== 'string' || typeof published !== 'string') return []
    const media = entry['media:group'] as Record<string, unknown> | undefined
    const thumbnail = media?.['media:thumbnail'] as Record<string, unknown> | undefined
    const description = media?.['media:description']
    return [
      {
        videoId,
        title: String(entry['title'] ?? ''),
        publishedAt: new Date(published).toISOString(),
        thumbnailUrl: typeof thumbnail?.['@_url'] === 'string' ? thumbnail['@_url'] : null,
        description: typeof description === 'string' ? description : null
      }
    ]
  })
}
