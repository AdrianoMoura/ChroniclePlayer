import type { ChannelSyncInfo, HydratedVideo, RssFeedResult, VideoSource } from '../../core/ports'
import type { YouTubeRssClient } from '../rss/rss-client'
import type { YouTubeApiClient } from './api-client'

// The hybrid VideoSource (D-007): RSS discovers for free, the API hydrates
// in batches and serves gap/archive backfill.
export class HybridVideoSource implements VideoSource {
  constructor(
    private readonly rss: YouTubeRssClient,
    private readonly api: YouTubeApiClient
  ) {}

  discoverRecent(channel: ChannelSyncInfo): Promise<RssFeedResult> {
    return this.rss.discoverRecent(channel)
  }

  hydrate(videoIds: readonly string[]): Promise<HydratedVideo[]> {
    return this.api.hydrate(videoIds)
  }

  listUploads(
    playlistId: string,
    pageToken?: string
  ): Promise<{ videoIds: string[]; nextPageToken: string | null }> {
    return this.api.listUploads(playlistId, pageToken)
  }
}
