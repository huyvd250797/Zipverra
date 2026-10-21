import { clampWorkspaceHeight, keyboardOccluded } from './viewport-layout.js';
/** The geometry is an enhancement; no security or Commit/Push state depends on it. */
export function installViewportLayout({main, dock, win, ResizeObserverImpl}) {
  if (!main || !win) return () => {};
  const doc = main.ownerDocument;
  const viewport = win.visualViewport;
  let raf = 0;
  const update = () => {
    raf = 0;
    const grid = main.querySelector('.content-grid');
    const vh = doc.documentElement.clientHeight || win.innerHeight;
    if (grid && win.innerWidth >= 1100) {
      main.style.setProperty('--zip395-workspace-height', `${clampWorkspaceHeight({viewportHeight:vh,gridTop:grid.getBoundingClientRect().top})}px`);
    } else main.style.removeProperty('--zip395-workspace-height');
    if (dock) {
      const h = Math.ceil(dock.getBoundingClientRect().height || 0);
      if (h > 0) main.style.setProperty('--zip395-dock-height', `${h}px`);
    }
    const active = doc.activeElement;
    const focusedEditable = Boolean(active?.matches?.('input, textarea, select, [contenteditable="true"]'));
    main.dataset.keyboardOccluded = keyboardOccluded({
      layoutHeight:vh, visualHeight:viewport?.height ?? vh,
      offsetTop:viewport?.offsetTop ?? 0, editableFocused:focusedEditable
    }) ? 'true' : 'false';
  };
  const queue = () => { if (!raf) raf = win.requestAnimationFrame(update); };
  const observer = ResizeObserverImpl ? new ResizeObserverImpl(queue) : null;
  if (dock) observer?.observe(dock);
  win.addEventListener('resize',queue,{passive:true});
  win.addEventListener('orientationchange',queue,{passive:true});
  viewport?.addEventListener('resize',queue,{passive:true});
  viewport?.addEventListener('scroll',queue,{passive:true});
  doc.addEventListener('focusin',queue,true);
  doc.addEventListener('focusout',queue,true);
  queue();
  return () => {
    win.cancelAnimationFrame(raf);
    observer?.disconnect();
    win.removeEventListener('resize',queue);
    win.removeEventListener('orientationchange',queue);
    viewport?.removeEventListener('resize',queue);
    viewport?.removeEventListener('scroll',queue);
    doc.removeEventListener('focusin',queue,true);
    doc.removeEventListener('focusout',queue,true);
    main.style.removeProperty('--zip395-workspace-height');
    main.style.removeProperty('--zip395-dock-height');
    delete main.dataset.keyboardOccluded;
  };
}
