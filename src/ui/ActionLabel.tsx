// A trailing " (x)" keyboard-shortcut hint, split out of an action button's
// label and rendered smaller/dimmer than the rest — shared by every button
// that embeds one (PlayerDetails.tsx's ActionButton, LikeDislikeBar.tsx's
// Like button), so they all read the same way. Dimmed via opacity rather
// than a fixed color, so it works against whatever color the button
// currently has — the default text color in either theme, or the accent
// color a button.primary.active takes on — instead of only one of them.
const SHORTCUT_PATTERN = /^(.*) \(([^()]+)\)$/

export function ActionLabel({ text }: { text: string }) {
  const match = SHORTCUT_PATTERN.exec(text)
  if (match === null) return <>{text}</>
  const [, label, shortcut] = match
  return (
    <>
      {label} <span className="action-shortcut">({shortcut})</span>
    </>
  )
}
