import { useEffect, useRef } from 'react'
import { t } from './i18n'

// Two groups rather than one flat list: several keys mean different things
// depending on where they're pressed (`s` sidebar-toggle in the feed vs.
// subscribe in the player). Both groups always show, regardless of which
// screen the overlay was opened from, rather than filtering by context.
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
  ['a', () => t('help.action.addToPlaylist')],
  ['l', () => t('help.action.toggleLike')],
  ['s', () => t('help.action.toggleSubscribe')],
  ['c', () => t('help.action.toggleComments')],
  ['n', () => t('help.action.nextInQueue')],
  ['p', () => t('help.action.extractWindow')],
  ['/', () => t('help.action.filter')]
]

// Only live while the player is docked to its corner box — the feed is
// fully interactive underneath then, so these are handled by the feed's
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
  const containerRef = useRef<HTMLDivElement>(null)

  // No text input here to naturally take focus on open (usually triggered
  // by `?` alone) — without this, a keydown handler on this container would
  // never actually receive Escape (it'd bubble from whatever had focus
  // before, a sibling of this dialog, not through it). See
  // AddToPlaylistDialog's own copy of this comment for the full reasoning.
  useEffect(() => {
    containerRef.current?.focus()
  }, [])

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div
        ref={containerRef}
        tabIndex={-1}
        className="overlay"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          // A dialog on top of the content owns Escape while it's open —
          // never let it bubble to whatever's listening underneath (the
          // full-view player's own Esc-to-close/dock map, the feed's own
          // keydown handler), regardless of which element inside has focus.
          event.stopPropagation()
          if (event.key === 'Escape') onClose()
        }}
      >
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
