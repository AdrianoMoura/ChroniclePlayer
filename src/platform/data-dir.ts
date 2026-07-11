import { homedir } from 'node:os'
import { join } from 'node:path'

// Platform-standard app data locations per local-data.md §Locations. Not
// Electron's userData default (which is the *config* dir on Linux, not XDG data).
export function chronicleDataDir(): string {
  switch (process.platform) {
    case 'darwin':
      return join(homedir(), 'Library', 'Application Support', 'Chronicle')
    case 'win32':
      return join(process.env['APPDATA'] ?? join(homedir(), 'AppData', 'Roaming'), 'Chronicle')
    default:
      return join(process.env['XDG_DATA_HOME'] ?? join(homedir(), '.local', 'share'), 'chronicle')
  }
}
