import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { autostartDesktopFilePath, setLinuxAutostart } from './linux-autostart'

const fakeHome = mkdtempSync(join(tmpdir(), 'chronicle-linux-autostart-'))
vi.mock('node:os', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:os')>()),
  homedir: () => fakeHome
}))

describe('linux autostart (D-050)', () => {
  afterEach(() => {
    setLinuxAutostart(false, '/usr/bin/chronicle')
  })

  it('writes an XDG autostart desktop entry pointing at the given exec path', () => {
    setLinuxAutostart(true, '/usr/bin/chronicle')
    const file = autostartDesktopFilePath()
    expect(existsSync(file)).toBe(true)
    const contents = readFileSync(file, 'utf8')
    expect(contents).toContain('[Desktop Entry]')
    expect(contents).toContain('Exec=/usr/bin/chronicle')
  })

  it('removes the entry when disabled, and is a no-op if already absent', () => {
    setLinuxAutostart(true, '/usr/bin/chronicle')
    setLinuxAutostart(false, '/usr/bin/chronicle')
    expect(existsSync(autostartDesktopFilePath())).toBe(false)
    expect(() => setLinuxAutostart(false, '/usr/bin/chronicle')).not.toThrow()
  })
})
