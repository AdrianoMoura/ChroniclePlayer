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

// execCommand is a full, already-quoted command line (binary plus any
// arguments, e.g. a dev-mode project path — see main.ts's applyAutoStart),
// not just a bare executable path.
export function setLinuxAutostart(enabled: boolean, execCommand: string): void {
  const file = autostartDesktopFilePath()
  if (!enabled) {
    if (existsSync(file)) rmSync(file, { force: true })
    return
  }
  mkdirSync(join(homedir(), '.config', 'autostart'), { recursive: true })
  const contents = `[Desktop Entry]
Type=Application
Name=Chronicle
Exec=${execCommand}
Terminal=false
X-GNOME-Autostart-enabled=true
`
  writeFileSync(file, contents)
}
