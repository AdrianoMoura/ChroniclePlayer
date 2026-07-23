import { createServer, type Server } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize, sep } from 'node:path'

// A packaged build must serve the renderer over a real http:// origin, not
// file:// (playback.md): the embedded YouTube player uses enablejsapi=1
// for the postMessage widget protocol (D-006), and YouTube rejects that
// handshake with "Error 153: Video player configuration error" when the
// top frame's origin isn't one it can validate — file:// gives every load
// its own opaque origin, which is exactly that case. Dev mode already
// works because electron-vite serves the renderer from its own
// http://localhost dev server; this gives the packaged build the same
// kind of origin. The hostname specifically has to be `localhost`, not just
// any loopback address — D-056's docked live chat iframe (`live_chat?...
// &embed_domain=localhost`) needs the embedding page's own origin to match
// that literal value, and YouTube checks it exactly.

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
}

export interface RendererServer {
  url: string
  close: () => void
}

export function startRendererServer(rendererDir: string): Promise<RendererServer> {
  const root = normalize(rendererDir)

  const server: Server = createServer((req, res) => {
    void (async () => {
      const requestPath = decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/')
      const relative = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '')
      const filePath = normalize(join(root, relative))
      // Path traversal guard: the resolved file must stay inside rendererDir.
      if (filePath !== root && !filePath.startsWith(root + sep)) {
        res.writeHead(403).end()
        return
      }
      try {
        const body = await readFile(filePath)
        res.writeHead(200, {
          'content-type': MIME_TYPES[extname(filePath)] ?? 'application/octet-stream'
        })
        res.end(body)
      } catch {
        res.writeHead(404).end()
      }
    })()
  })

  return new Promise((resolve) => {
    // localhost only (never 0.0.0.0) — this serves no secrets, but there's
    // no reason to expose it past loopback either; Node resolves the
    // hostname to a loopback address the same as an explicit 127.0.0.1
    // would. Port 0 = OS-assigned, so packaging never has to reserve one.
    server.listen(0, 'localhost', () => {
      const address = server.address()
      const port = typeof address === 'object' && address !== null ? address.port : 0
      resolve({ url: `http://localhost:${port}`, close: () => server.close() })
    })
  })
}
