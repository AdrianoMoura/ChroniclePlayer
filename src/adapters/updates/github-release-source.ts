import type { UpdateRelease, UpdateSource } from '../../core/ports'
import { request, type FetchFn } from '../http'

// D-026: an unauthenticated GET against GitHub's public Releases API — the
// same privacy guarantee a hand-rolled signed manifest would give (no
// identifiers, no telemetry) with nothing extra to sign or publish, since
// `tag_name` already *is* the version. Never throws — an update check is
// never critical to the app working.
const RELEASES_URL = 'https://api.github.com/repos/AdrianoMoura/ChroniclePlayer/releases/latest'

export class GithubReleaseSource implements UpdateSource {
  constructor(private readonly fetchFn: FetchFn) {}

  async latestRelease(): Promise<UpdateRelease | null> {
    try {
      const response = await request(this.fetchFn, RELEASES_URL, {
        headers: { accept: 'application/vnd.github+json' },
        timeoutMs: 10_000
      })
      if (!response.ok) return null
      const body = (await response.json()) as { tag_name?: unknown; html_url?: unknown }
      if (typeof body.tag_name !== 'string' || typeof body.html_url !== 'string') return null
      return { version: body.tag_name.replace(/^v/, ''), url: body.html_url }
    } catch {
      return null
    }
  }
}
