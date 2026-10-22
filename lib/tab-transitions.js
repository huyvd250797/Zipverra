/** Direction is derived from the visible navigation order, not historical tab IDs. */
export const TAB_ORDER = Object.freeze(['home', 'activity', 'history', 'settings']);

export function tabSlideDirection(from, to, order = TAB_ORDER) {
  const current = order.indexOf(from);
  const next = order.indexOf(to);
  if (current === -1 || next === -1 || current === next) return 'none';
  return next > current ? 'forward' : 'backward';
}

/** Native View Transitions are progressive enhancement, never a navigation requirement. */
export function canSlideTabs(doc, win) {
  return Boolean(doc && typeof doc.startViewTransition === 'function' &&
    !win?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
}
