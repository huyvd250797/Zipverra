/**
 * Modal scroll isolation for Safari standalone PWA and desktop browsers.
 * Keeps an exact snapshot of inline styles/viewport and reference-counts locks.
 * The content with data-modal-scroll-region remains scrollable; document and
 * overscroll beyond the top/bottom of the sheet are prevented.
 */
const stateByDocument = new WeakMap();

function scrollableWithin(element, boundary, win) {
  let node = element;
  while (node && node !== boundary.parentElement) {
    if (node.nodeType === 1 && boundary.contains(node)) {
      const style = win.getComputedStyle?.(node);
      const mode = style?.overflowY || 'auto';
      if (/(auto|scroll)/.test(mode) && node.scrollHeight > node.clientHeight + 1) return node;
    }
    if (node === boundary) break;
    node = node.parentElement;
  }
  return boundary;
}

export function lockModalScroll(doc, win, region) {
  if (!doc?.body || !doc?.documentElement || !win || !region) return () => {};
  const existing = stateByDocument.get(doc);
  if (existing) {
    existing.regions.set(region, (existing.regions.get(region) || 0) + 1);
    existing.count += 1;
    return once(() => release(doc, region));
  }
  const html = doc.documentElement, body = doc.body;
  const y = win.scrollY ?? win.pageYOffset ?? 0;
  const x = win.scrollX ?? win.pageXOffset ?? 0;
  const htmlStyles = { overflow: html.style.overflow, overscrollBehavior: html.style.overscrollBehavior, scrollBehavior: html.style.scrollBehavior };
  const bodyStyles = { position: body.style.position, top: body.style.top, left: body.style.left,
    right: body.style.right, width: body.style.width, overflow: body.style.overflow,
    overscrollBehavior: body.style.overscrollBehavior, touchAction: body.style.touchAction };
  const info = { count: 1, regions: new Map([[region, 1]]), htmlStyles, bodyStyles, x, y, events: [] };
  const touchStart = { y: null };
  const onTouchStart = event => { touchStart.y = event.touches?.length === 1 ? event.touches[0].clientY : null; };
  const onTouchMove = event => {
    if (!event.cancelable || event.touches?.length !== 1) return;
    const target = event.target;
    const container = [...info.regions.keys()].find(node => node.contains?.(target));
    if (!container) { event.preventDefault(); return; }
    const scrollable = scrollableWithin(target, container, win);
    const yNow = event.touches[0].clientY;
    const delta = touchStart.y === null ? 0 : yNow - touchStart.y;
    touchStart.y = yNow;
    if (!scrollable || scrollable.scrollHeight <= scrollable.clientHeight + 1 ||
      (delta > 0 && scrollable.scrollTop <= 0) ||
      (delta < 0 && scrollable.scrollTop + scrollable.clientHeight >= scrollable.scrollHeight - 1)) {
      event.preventDefault();
    }
  };
  html.style.overflow = 'hidden';
  html.style.overscrollBehavior = 'none';
  body.style.position = 'fixed';
  body.style.top = `-${y}px`;
  body.style.left = `-${x}px`;
  body.style.right = '0';
  body.style.width = '100%';
  body.style.overflow = 'hidden';
  body.style.overscrollBehavior = 'none';
  // Do not apply touch-action:none to the body: on some iOS Safari versions it
  // suppresses descendant sheet scrolling even when the sheet is overflow:auto.
  doc.addEventListener('touchstart', onTouchStart, { passive: true });
  doc.addEventListener('touchmove', onTouchMove, { passive: false });
  info.events = [['touchstart',onTouchStart],['touchmove',onTouchMove]];
  stateByDocument.set(doc, info);
  return once(() => release(doc, region));
}

function once(fn) {
  let invoked = false;
  return () => { if (!invoked) { invoked = true; fn(); } };
}

function release(doc, region) {
  const info = stateByDocument.get(doc);
  if (!info) return;
  const held = info.regions.get(region) || 0;
  if (held <= 1) info.regions.delete(region); else info.regions.set(region, held - 1);
  if (--info.count > 0) return;
  stateByDocument.delete(doc);
  for (const [event, callback] of info.events) doc.removeEventListener(event, callback);
  const html = doc.documentElement, body = doc.body;
  for (const [name,value] of Object.entries(info.htmlStyles)) html.style[name] = value;
  for (const [name,value] of Object.entries(info.bodyStyles)) body.style[name] = value;
  // Existing app uses global smooth scroll. Force instantaneous restoration;
  // otherwise Safari visibly animates back to the saved long-page position.
  const previous = html.style.scrollBehavior;
  html.style.scrollBehavior = 'auto';
  try { doc.defaultView?.scrollTo?.({ left: info.x, top: info.y, behavior: 'instant' }); }
  finally { html.style.scrollBehavior = previous; }
}
