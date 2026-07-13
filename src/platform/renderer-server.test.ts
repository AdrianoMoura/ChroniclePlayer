import { afterEach, describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { startRendererServer, type RendererServer } from './renderer-server'

function fixtureDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'chronicle-renderer-'))
  writeFileSync(join(dir, 'index.html'), '<!doctype html><title>Chronicle</title>')
  mkdirSync(join(dir, 'assets'))
  writeFileSync(join(dir, 'assets', 'app.js'), 'console.log("hi")')
  return dir
}

describe('renderer server', () => {
  let server: RendererServer | null = null

  afterEach(() => {
    server?.close()
    server = null
  })

  it('serves a real http:// origin, not file:// (playback.md — Error 153 fix)', async () => {
    server = await startRendererServer(fixtureDir())
    expect(server.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/)
  })

  it('serves index.html at the root', async () => {
    server = await startRendererServer(fixtureDir())
    const response = await fetch(`${server.url}/index.html`)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/html')
    expect(await response.text()).toContain('Chronicle')
  })

  it('serves nested assets with the right content type', async () => {
    server = await startRendererServer(fixtureDir())
    const response = await fetch(`${server.url}/assets/app.js`)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/javascript')
    expect(await response.text()).toContain('console.log')
  })

  it('404s an unknown path instead of throwing', async () => {
    server = await startRendererServer(fixtureDir())
    const response = await fetch(`${server.url}/nope.txt`)
    expect(response.status).toBe(404)
  })

  it('refuses to serve outside the renderer directory', async () => {
    server = await startRendererServer(fixtureDir())
    const response = await fetch(`${server.url}/../../../../etc/passwd`)
    expect([403, 404]).toContain(response.status)
  })
})
