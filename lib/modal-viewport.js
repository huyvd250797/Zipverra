/** Pure viewport calculations for iOS Safari visual-viewport keyboard transitions.
 * The docked sheet shrinks instead of letting fields slip behind the keyboard. */
export function modalViewportGeometry(layoutHeight, visualHeight, offsetTop = 0) {
  const layout = Number.isFinite(layoutHeight) && layoutHeight > 0 ? layoutHeight : 0;
  const visible = Number.isFinite(visualHeight) && visualHeight > 0 ? visualHeight : layout;
  const offset = Number.isFinite(offsetTop) ? Math.max(0, offsetTop) : 0;
  const bottomInset = Math.max(0, Math.round(layout - Math.min(layout, visible + offset)));
  return { visibleHeight: Math.max(120, Math.round(visible)), keyboardInset: bottomInset };
}
