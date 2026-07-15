import { t } from './i18n'

// Two groups rather than one flat list: several keys mean different things
// depending on where they're pressed (`s` sidebar-toggle in the feed vs.
// subscribe in the player), and this overlay is reachable from both screens
// (B-102 fixed `?` doing nothing in the player) — showing both groups
// always, regardless of which screen it was opened from, is simpler and
// more honest than trying to filter the list by context.
const FEED_SHORTCUTS: readonly [string, () => string][] = [
  ['j / k  ·  ↓ / ↑', () => t('help.action.nextPrev')],
  ['Enter / o', () => t('help.action.play')],
  ['Ctrl+O', () => t('help.action.openByUrl')],
  ['b', () => t('help.action.openInBrowser')],
  ['m', () => t('help.action.toggleReadUnread')],
  ['i', () => t('help.action.ignore')],
  ['u', () => t('help.action.undoIgnore')],
  ['f', () => t('help.action.toggleFavorite')],
  ['w', () => t('help.action.toggleWatchLater')],
  ['M', () => t('help.action.markAllRead')],
  ['v', () => t('help.action.toggleLayout')],
  ['gg / G', () => t('help.action.topEnd')],
  ['1…5', () => t('help.action.switchView')],
  ['r', () => t('help.action.reload')],
  ['/', () => t('help.action.filter')],
  ['c', () => t('help.action.findChannel')],
  ['s', () => t('help.action.toggleSidebar')]
]

// Acts on whichever video is currently open (playback.md).
const PLAYER_SHORTCUTS: readonly [string, () => string][] = [
  ['Space', () => t('help.action.playPause')],
  ['← →', () => t('help.action.seek')],
  ['b', () => t('help.action.openInBrowser')],
  ['m', () => t('help.action.toggleReadUnread')],
  ['i', () => t('help.action.ignorePlayer')],
  ['f', () => t('help.action.toggleFavorite')],
  ['w', () => t('help.action.toggleWatchLater')],
  ['l', () => t('help.action.toggleLike')],
  ['s', () => t('help.action.toggleSubscribe')],
  ['c', () => t('help.action.toggleComments')],
  ['n', () => t('help.action.nextInQueue')],
  ['p', () => t('help.action.extractWindow')],
  ['/', () => t('help.action.filter')]
]

// Only live while the player is docked to its corner box (B-045) — the feed
// is fully interactive underneath then, so these are handled by the feed's
// own keydown map (App.tsx), not PlayerSurface's, guarded on `miniplayer`
// being true.
const MINIPLAYER_SHORTCUTS: readonly [string, () => string][] = [
  ['e', () => t('help.action.maximizeMiniplayer')],
  ['x', () => t('help.action.closeMiniplayer')]
]

const GLOBAL_SHORTCUTS: readonly [string, () => string][] = [
  ['?', () => t('help.action.thisOverlay')],
  ['Esc', () => t('help.action.backClose')]
]

function ShortcutTable({ rows }: { rows: readonly [string, () => string][] }) {
  return (
    <table>
      <tbody>
        {rows.map(([keys, action]) => (
          <tr key={keys}>
            <td className="keys">{keys}</td>
            <td>{action()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function HelpOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="overlay" onClick={(event) => event.stopPropagation()}>
        <h2>{t('help.title')}</h2>
        <h3>{t('help.section.feed')}</h3>
        <ShortcutTable rows={FEED_SHORTCUTS} />
        <h3>{t('help.section.player')}</h3>
        <ShortcutTable rows={PLAYER_SHORTCUTS} />
        <h3>{t('help.section.miniplayer')}</h3>
        <ShortcutTable rows={MINIPLAYER_SHORTCUTS} />
        <ShortcutTable rows={GLOBAL_SHORTCUTS} />
      </div>
    </div>
  )
}
