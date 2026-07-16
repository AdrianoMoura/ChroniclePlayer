import { Menu, Tray, nativeImage } from 'electron'

// D-050: the tray icon shown when "Run in background" is on. A single
// context menu covers the whole feature — no submenus, no unread count
// (that would start drifting toward a badge/streak mechanic, which
// non-goals.md bans regardless of how it's phrased).
export interface TrayCallbacks {
  onOpen: () => void
  onRefreshNow: () => void
  onQuit: () => void
}

export function createAppTray(iconPath: string, callbacks: TrayCallbacks): Tray {
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  // D-050: new Tray(icon, guid) exists, but Electron validates the guid
  // against a strict format (confirmed live: "Invalid GUID format" thrown
  // on this exact Linux setup for a plain string) and its docs mark
  // getGUID() as darwin/win32-only anyway — not a free/harmless addition on
  // Linux as hoped, so left out entirely rather than fighting the format.
  const tray = new Tray(icon)
  tray.setToolTip('Chronicle')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open Chronicle', click: () => callbacks.onOpen() },
      { label: 'Refresh now', click: () => callbacks.onRefreshNow() },
      { type: 'separator' },
      { label: 'Quit', click: () => callbacks.onQuit() }
    ])
  )
  tray.on('click', () => callbacks.onOpen())
  return tray
}
