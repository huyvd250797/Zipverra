'use client';

import { useEffect, useRef, useState } from 'react';
import { lockModalScroll } from '../../lib/modal-scroll-lock.js';
import { modalViewportGeometry } from '../../lib/modal-viewport.js';
import { UiIconButton } from './UnifiedUI.jsx';

/** Native top-layer modal: only its scroll region scrolls; iOS keyboard safe. */
export default function ModalSheet({ open, onClose, title, children, variant = 'sheet' }) {
  const dialogRef = useRef(null);
  const [exiting, setExiting] = useState(false);
  const closeTimerRef = useRef(null);
  const closeRequestedRef = useRef(false);
  const callbackRef = useRef(onClose);
  callbackRef.current = onClose;
  function requestClose() {
    if (closeRequestedRef.current) return;
    closeRequestedRef.current = true;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reduced) { callbackRef.current?.(); return; }
    setExiting(true);
    closeTimerRef.current = window.setTimeout(() => { callbackRef.current?.(); }, 225);
  }

  useEffect(() => {
    if (!open) return;
    closeRequestedRef.current = false;
    // Never carry the exiting state into the next opening.
    setExiting(false);
    const dialog = dialogRef.current;
    if (!dialog) return;
    const opener = document.activeElement;
    const scrollRegion = dialog.querySelector('[data-modal-scroll-region]');
    const viewport = window.visualViewport;
    let unlock = null;
    let closing = false;
    let focusFrame = 0;
    let resizeFrame = 0;

    const updateViewport = () => {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(() => {
        const layoutHeight = document.documentElement.clientHeight || window.innerHeight;
        const { visibleHeight, keyboardInset } = modalViewportGeometry(layoutHeight, viewport?.height || layoutHeight, viewport?.offsetTop || 0);
        dialog.style.setProperty('--zip-visible-height', `${visibleHeight}px`);
        dialog.style.setProperty('--zip-keyboard-inset', `${keyboardInset}px`);
      });
    };
    const onCancel = event => { event.preventDefault(); requestClose(); };
    const onClose = () => { if (!closing) requestClose(); };
    const onFocusWithin = event => {
      if (!scrollRegion?.contains(event.target) || !event.target.matches?.('input, textarea, select, [contenteditable="true"]')) return;
      // Only the sheet scrolls when the virtual keyboard takes space.
      updateViewport();
    };
    dialog.addEventListener('cancel', onCancel);
    dialog.addEventListener('close', onClose);
    dialog.addEventListener('focusin', onFocusWithin);
    viewport?.addEventListener('resize', updateViewport);
    viewport?.addEventListener('scroll', updateViewport);
    try {
      if (scrollRegion) scrollRegion.scrollTop = 0;
      unlock = lockModalScroll(document, window, scrollRegion);
      dialog.showModal();
      updateViewport();
      // Do not focus the search input automatically; iPhone keyboard stays closed
      // until the user explicitly chooses to type.
      dialog.querySelector('.zip-modal-close')?.focus({ preventScroll: true });
    } catch {
      unlock?.();
      unlock = null;
      callbackRef.current?.();
    }
    return () => {
      closing = true;
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
      closeRequestedRef.current = false;
      dialog.removeEventListener('cancel', onCancel);
      dialog.removeEventListener('close', onClose);
      dialog.removeEventListener('focusin', onFocusWithin);
      viewport?.removeEventListener('resize', updateViewport);
      viewport?.removeEventListener('scroll', updateViewport);
      window.cancelAnimationFrame(resizeFrame);
      if (dialog.open) dialog.close();
      dialog.style.removeProperty('--zip-visible-height');
      dialog.style.removeProperty('--zip-keyboard-inset');
      unlock?.();
      // Native dialog close returns focus in some browsers, but Safari standalone
      // may lose it; restore only if no other modal is still open.
      focusFrame = window.requestAnimationFrame(() => {
        if (opener?.isConnected && !document.querySelector('dialog[open]')) opener.focus?.({ preventScroll: true });
      });
    };
  }, [open]);

  return <dialog ref={dialogRef} className={`zip-modal zip-modal--${variant}${exiting ? ' zip-modal--exiting' : ''}`} aria-label={title}
    onClick={event => { if (event.target === event.currentTarget) requestClose(); }}>
    <div className="zip-modal-panel">
      <header className="zip-modal-header">
        <strong>{title}</strong>
        <UiIconButton className="zip-modal-close" onClick={requestClose} label={`Đóng ${title}`} aria-label={`Đóng ${title}`}>×</UiIconButton>
      </header>
      <div className="zip-modal-scroll" data-modal-scroll-region>{children}</div>
    </div>
  </dialog>;
}
