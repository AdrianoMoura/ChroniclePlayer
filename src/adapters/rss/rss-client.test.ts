import { describe, expect, it } from 'vitest'
import { parseFeed, YouTubeRssClient } from './rss-client'
import type { ChannelSyncInfo } from '../../core/ports'
import type { FetchFn } from '../http'

// Sanitized capture of the real channel feed shape (stable for ~15 years;
// youtube-api.md Assumption).
const FEED_XML = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015"
      xmlns:media="http://search.yahoo.com/mrss/"
      xmlns="http://www.w3.org/2005/Atom">
  <title>Fixture Channel</title>
  <entry>
    <id>yt:video:vid-aaa</id>
    <yt:videoId>vid-aaa</yt:videoId>
    <yt:channelId>UCfix</yt:channelId>
    <title>First fixture video</title>
    <published>2026-07-10T15:00:00+00:00</published>
    <updated>2026-07-10T16:00:00+00:00</updated>
    <media:group>
      <media:title>First fixture video</media:title>
      <media:thumbnail url="https://i.ytimg.example/vi/vid-aaa/hqdefault.jpg" width="480" height="360"/>
      <media:description>A description with several lines.</media:description>
    </media:group>
  </entry>
  <entry>
    <id>yt:video:vid-bbb</id>
    <yt:videoId>vid-bbb</yt:videoId>
    <yt:channelId>UCfix</yt:channelId>
    <title>Second fixture video</title>
    <published>2026-07-09T09:30:00+00:00</published>
    <media:group>
      <media:title>Second fixture video</media:title>
    </media:group>
  </entry>
</feed>`

const SINGLE_ENTRY_XML = FEED_XML.replace(/<entry>[\s\S]*?<\/entry>\s*(?=<entry>)/, '')

const channel: ChannelSyncInfo = {
  channelId: 'UCfix',
  title: 'Fixture Channel',
  uploadsPlaylist: null,
  rssEtag: 'etag-1',
  rssLastModified: 'Wed, 09 Jul 2026 09:30:00 GMT',
  lastSyncedAt: null
}

describe('parseFeed', () => {
  it('extracts videoId, title, published, thumbnail and description', () => {
    const entries = parseFeed(FEED_XML)
    expect(entries).toHaveLength(2)
    expect(entries[0]).toEqual({
      videoId: 'vid-aaa',
      title: 'First fixture video',
      publishedAt: '2026-07-10T15:00:00.000Z',
      thumbnailUrl: 'https://i.ytimg.example/vi/vid-aaa/hqdefault.jpg',
      description: 'A description with several lines.'
    })
    expect(entries[1]).toMatchObject({ videoId: 'vid-bbb', thumbnailUrl: null })
  })

  it('handles a feed with a single entry (parser yields an object, not array)', () => {
    const entries = parseFeed(SINGLE_ENTRY_XML)
    expect(entries).toHaveLength(1)
  })

  it('returns empty for a feed with no entries', () => {
    expect(parseFeed('<feed xmlns="http://www.w3.org/2005/Atom"><title>x</title></feed>')).toEqual([])
  })
})

describe('YouTubeRssClient', () => {
  it('sends conditional GET headers and passes new validators through', async () => {
    let headers: Record<string, string> = {}
    const fetchFn: FetchFn = (_url, init) => {
      headers = init?.headers as Record<string, string>
      return Promise.resolve(
        new Response(FEED_XML, {
          status: 200,
          headers: { etag: 'etag-2', 'last-modified': 'Fri, 11 Jul 2026 08:00:00 GMT' }
        })
      )
    }
    const result = await new YouTubeRssClient(fetchFn).discoverRecent(channel)
    expect(headers['if-none-match']).toBe('etag-1')
    expect(headers['if-modified-since']).toBe('Wed, 09 Jul 2026 09:30:00 GMT')
    expect(result).toMatchObject({ kind: 'ok', etag: 'etag-2' })
  })

  it('maps 304 to not-modified', async () => {
    const fetchFn: FetchFn = () => Promise.resolve(new Response(null, { status: 304 }))
    await expect(new YouTubeRssClient(fetchFn).discoverRecent(channel)).resolves.toEqual({
      kind: 'not-modified'
    })
  })

  it('maps 404 to channel-unavailable', async () => {
    const fetchFn: FetchFn = () => Promise.resolve(new Response('gone', { status: 404 }))
    await expect(new YouTubeRssClient(fetchFn).discoverRecent(channel)).rejects.toMatchObject({
      kind: 'channel-unavailable'
    })
  })
})
