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

// A fixed, stable guid: Electron docs describe this as a Windows-only
// identity mechanism (getGUID() is @platform darwin,win32), so this is
// unlikely to change anything on Linux — but it's a harmless, free addition
// in case a given Linux backend does use it to distinguish/dedupe icons
// across create/destroy cycles within the same process.
const TRAY_GUID = 'dev.chronicleplayer.desktop.tray'

export function createAppTray(iconPath: string, callbacks: TrayCallbacks): Tray {
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  const tray = new Tray(icon, TRAY_GUID)
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
