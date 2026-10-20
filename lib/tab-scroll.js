/**
 * Post-render navigation positioning for Safari standalone PWA and desktop.
 * Tab content can shrink dramatically between renders, so scrolling before React
 * commits leaves iOS at the bottom of the previous (much taller) screen.
 * No history mutation or browser storage is involved.
 */
export function positionTabViewport(win, doc, tab, activityElement) {
  if (!win || !doc) return;
  const mobile = !win.matchMedia || win.matchMedia('(max-width: 760px)').matches;
  if (mobile) {
    // `auto` can inherit html{scroll-behavior:smooth}; `instant` must be explicit.
    try { win.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }
    catch { win.scrollTo(0, 0); }
    if (doc.documentElement) doc.documentElement.scrollTop = 0;
    if (doc.body) doc.body.scrollTop = 0;
  } else {
    // Desktop now displays only the active workbench panel. Align to the
    // top instead of scrolling to the Activity card and hiding its heading.

    try { win.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }
    catch { win.scrollTo(0, 0); }
  }
}

export function scheduleTabViewport(win, doc, tab, activityElement) {
  if (!win || !doc) return () => {};
  let cancelled = false;
  let rafA = null;
  let rafB = null;
  const root = doc.documentElement;
  const original = root?.style?.scrollBehavior || '';
  // Temporarily override global smooth-scroll during navigation, for older iOS.
  if (root?.style) root.style.scrollBehavior = 'auto';
  const restore = () => {
    if (root?.style) root.style.scrollBehavior = original;
  };
  const first = () => {
    if (cancelled) return;
    positionTabViewport(win, doc, tab, activityElement);
    // Second frame accounts for iOS viewport/layout correction after a tab swap.
    rafB = win.requestAnimationFrame(() => {
      if (cancelled) return;
      positionTabViewport(win, doc, tab, activityElement);
      restore();
    });
  };
  rafA = win.requestAnimationFrame(first);
  return () => {
    cancelled = true;
    if (rafA != null) win.cancelAnimationFrame?.(rafA);
    if (rafB != null) win.cancelAnimationFrame?.(rafB);
    restore();
  };
}
