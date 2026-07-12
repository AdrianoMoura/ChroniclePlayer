import { t } from './i18n'

const SHORTCUTS: readonly [string, () => string][] = [
  ['j / k  ·  ↓ / ↑', () => t('help.action.nextPrev')],
  ['Enter / o', () => t('help.action.play')],
  ['Ctrl+O', () => t('help.action.openByUrl')],
  ['Space · ← → · f', () => t('help.action.playerControls')],
  ['b', () => t('help.action.openInBrowser')],
  ['m', () => t('help.action.toggleReadUnread')],
  ['i', () => t('help.action.ignore')],
  ['u', () => t('help.action.undoIgnore')],
  ['f', () => t('help.action.toggleFavorite')],
  ['w', () => t('help.action.toggleWatchLater')],
  ['gg / G', () => t('help.action.topEnd')],
  ['1…5', () => t('help.action.switchView')],
  ['r', () => t('help.action.reload')],
  ['/', () => t('help.action.filter')],
  ['c', () => t('help.action.findChannel')],
  ['s', () => t('help.action.toggleSidebar')],
  ['?', () => t('help.action.thisOverlay')],
  ['Esc', () => t('help.action.backClose')]
]

export function HelpOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="overlay" onClick={(event) => event.stopPropagation()}>
        <h2>{t('help.title')}</h2>
        <table>
          <tbody>
            {SHORTCUTS.map(([keys, action]) => (
              <tr key={keys}>
                <td className="keys">{keys}</td>
                <td>{action()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
