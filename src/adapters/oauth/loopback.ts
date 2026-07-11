import { createServer, type Server } from 'node:http'
import { internal } from '../../core/errors'

// Loopback redirect target for the desktop OAuth flow (authentication.md):
// bound to 127.0.0.1 on an ephemeral port, single-use state, rejects
// mismatches, times out after 5 minutes, exists only during the handshake.

const HANDSHAKE_TIMEOUT_MS = 5 * 60_000

const RESPONSE_PAGE = `<!doctype html><meta charset="utf-8">
<title>Chronicle</title>
<body style="font-family: system-ui; background:#101014; color:#e8e8ea;
display:grid; place-items:center; height:100vh; margin:0">
<p>Chronicle is connected. You can close this tab.</p>`

export interface LoopbackHandshake {
  redirectUri: string
  waitForCode(expectedState: string): Promise<string>
  close(): void
}

export function startLoopback(timeoutMs = HANDSHAKE_TIMEOUT_MS): Promise<LoopbackHandshake> {
  return new Promise((resolveStart, rejectStart) => {
    let settleCode: ((code: string) => void) | undefined
    let failCode: ((error: Error) => void) | undefined
    let expected: string | undefined

    const server: Server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1')
      const state = url.searchParams.get('state')
      const code = url.searchParams.get('code')
      const error = url.searchParams.get('error')

      if (expected === undefined || state !== expected) {
        res.writeHead(400, { 'content-type': 'text/plain' }).end('state mismatch')
        return
      }
      res.writeHead(200, { 'content-type': 'text/html' }).end(RESPONSE_PAGE)
      if (error !== null) failCode?.(internal(`authorization refused: ${error}`))
      else if (code !== null) settleCode?.(code)
      else failCode?.(internal('callback carried neither code nor error'))
    })

    server.on('error', rejectStart)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (address === null || typeof address === 'string') {
        rejectStart(internal('loopback listener has no port'))
        return
      }
      resolveStart({
        redirectUri: `http://127.0.0.1:${address.port}`,
        waitForCode: (expectedState: string) =>
          new Promise<string>((resolve, reject) => {
            expected = expectedState
            const timer = setTimeout(() => {
              reject(internal('authorization timed out (5 minutes)'))
              server.close()
            }, timeoutMs)
            settleCode = (code) => {
              clearTimeout(timer)
              resolve(code)
            }
            failCode = (error) => {
              clearTimeout(timer)
              reject(error)
            }
          }),
        close: () => server.close()
      })
    })
  })
}
