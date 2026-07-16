import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

// D-050: Electron's app.setLoginItemSettings() only covers Windows/macOS —
// Linux has no Electron-level auto-start API, so this hand-writes/removes an
// XDG Autostart desktop entry (freedesktop.org spec), plain fs, no native
// module (D-034).
export function autostartDesktopFilePath(): string {
  return join(homedir(), '.config', 'autostart', 'chronicle-player.desktop')
}

export function setLinuxAutostart(enabled: boolean, execPath: string): void {
  const file = autostartDesktopFilePath()
  if (!enabled) {
    if (existsSync(file)) rmSync(file, { force: true })
    return
  }
  mkdirSync(join(homedir(), '.config', 'autostart'), { recursive: true })
  const contents = `[Desktop Entry]
Type=Application
Name=Chronicle
Exec=${execPath}
Terminal=false
X-GNOME-Autostart-enabled=true
`
  writeFileSync(file, contents)
}
