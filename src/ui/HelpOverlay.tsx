const SHORTCUTS: readonly [string, string][] = [
  ['j / k  ·  ↓ / ↑', 'next / previous video'],
  ['Enter / o', 'play (opens the player view)'],
  ['Ctrl+O', 'open a video by URL'],
  ['Space · ← → · f', 'player: pause / seek / fullscreen'],
  ['b', 'open in browser'],
  ['m', 'toggle read / unread'],
  ['i', 'ignore (undo with u)'],
  ['u', 'undo last ignore'],
  ['f', 'toggle favorite'],
  ['w', 'toggle watch later'],
  ['gg / G', 'top / end of loaded feed'],
  ['1…5', 'switch view (All, Unread, WL, Fav, Ignored)'],
  ['r', 'reload from local data'],
  ['/', 'filter in view'],
  ['c', 'find channel (sidebar)'],
  ['?', 'this overlay'],
  ['Esc', 'back / close']
]

export function HelpOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="overlay" onClick={(event) => event.stopPropagation()}>
        <h2>Keyboard shortcuts</h2>
        <table>
          <tbody>
            {SHORTCUTS.map(([keys, action]) => (
              <tr key={keys}>
                <td className="keys">{keys}</td>
                <td>{action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
