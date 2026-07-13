import { describe, expect, it } from 'vitest'
import { GithubReleaseSource } from './github-release-source'
import type { FetchFn } from '../http'

describe('GithubReleaseSource', () => {
  it('parses tag_name (stripping the leading v) and html_url from a 200', async () => {
    const fetchFn: FetchFn = () =>
      Promise.resolve(
        new Response(JSON.stringify({ tag_name: 'v1.2.3', html_url: 'https://github.example/releases/v1.2.3' }), {
          status: 200
        })
      )
    const result = await new GithubReleaseSource(fetchFn).latestRelease()
    expect(result).toEqual({ version: '1.2.3', url: 'https://github.example/releases/v1.2.3' })
  })

  it('returns null when there are no releases yet (404)', async () => {
    const fetchFn: FetchFn = () => Promise.resolve(new Response('', { status: 404 }))
    expect(await new GithubReleaseSource(fetchFn).latestRelease()).toBeNull()
  })

  it('returns null on a network error rather than throwing', async () => {
    const fetchFn: FetchFn = () => Promise.reject(new Error('offline'))
    expect(await new GithubReleaseSource(fetchFn).latestRelease()).toBeNull()
  })

  it('returns null on a malformed response body', async () => {
    const fetchFn: FetchFn = () =>
      Promise.resolve(new Response(JSON.stringify({ nope: true }), { status: 200 }))
    expect(await new GithubReleaseSource(fetchFn).latestRelease()).toBeNull()
  })
})
