import { networkUnavailable } from '../core/errors'

// All adapter HTTP goes through here (youtube-api.md §Failure handling):
// descriptive User-Agent, sane timeouts, transport errors mapped to the
// typed network error. fetch is injected so contract tests never touch
// the network.

export type FetchFn = typeof fetch

export const USER_AGENT = 'Chronicle/0.0.1 (local-first desktop YouTube client)'

const DEFAULT_TIMEOUT_MS = 30_000

export interface RequestOptions {
  method?: string
  headers?: Record<string, string>
  body?: string
  redirect?: 'follow' | 'error' | 'manual'
  timeoutMs?: number
}

export async function request(
  fetchFn: FetchFn,
  url: string,
  options: RequestOptions = {}
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  try {
    return await fetchFn(url, {
      method: options.method ?? 'GET',
      headers: { 'user-agent': USER_AGENT, ...options.headers },
      body: options.body,
      redirect: options.redirect,
      signal: controller.signal
    })
  } catch (cause) {
    throw networkUnavailable(cause)
  } finally {
    clearTimeout(timer)
  }
}
