'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { lockModalScroll } from '../../lib/modal-scroll-lock.js';
import { modalViewportGeometry } from '../../lib/modal-viewport.js';
import { UiIconButton } from './UnifiedUI.jsx';

/**
 * Native top-layer sheet/dialog. Its exit animation completes BEFORE the native
 * dialog closes, including when the parent changes `open` directly (picker
 * selection, confirmation, app navigation). The last contents stay rendered
 * during that exit so a dialog never fades out as an empty rectangle.
 */
export default function ModalSheet({ open, onClose, title, children, variant = 'sheet' }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const [exiting, setExiting] = useState(false);
  const closeTimerRef = useRef(null);
  const exitActiveRef = useRef(false);
  const callbackRef = useRef(onClose);
  const openDialogRef = useRef(null);
  const startExitRef = useRef(null);
  const lastContentsRef = useRef({ title, children });
  callbackRef.current = onClose;
  if (open) lastContentsRef.current = { title, children };

  const requestClose = () => startExitRef.current?.(true);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const scrollRegion = dialog.querySelector('[data-modal-scroll-region]');
    const viewport = window.visualViewport;
    let unlock = null;
    let opener = null;
    let resizeFrame = 0;
    let focusFrame = 0;
    let programmaticClose = false;

    const updateViewport = () => {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(() => {
        const layoutHeight = document.documentElement.clientHeight || window.innerHeight;
        const { visibleHeight, keyboardInset } = modalViewportGeometry(
          layoutHeight, viewport?.height || layoutHeight, viewport?.offsetTop || 0
        );
        dialog.style.setProperty('--zip-visible-height', `${visibleHeight}px`);
        dialog.style.setProperty('--zip-keyboard-inset', `${keyboardInset}px`);
      });
    };
    const onFocusWithin = event => {
      if (scrollRegion?.contains(event.target) && event.target.matches?.('input, textarea, select, [contenteditable="true"]')) {
        updateViewport();
      }
    };
    const restoreFocus = () => {
      window.cancelAnimationFrame(focusFrame);
      focusFrame = window.requestAnimationFrame(() => {
        if (opener?.isConnected && !document.querySelector('dialog[open]')) opener.focus?.({ preventScroll: true });
        opener = null;
      });
    };
    const release = () => {
      unlock?.();
      unlock = null;
      viewport?.removeEventListener('resize', updateViewport);
      viewport?.removeEventListener('scroll', updateViewport);
      window.cancelAnimationFrame(resizeFrame);
      dialog.style.removeProperty('--zip-visible-height');
      dialog.style.removeProperty('--zip-keyboard-inset');
      restoreFocus();
    };
    const closeNow = (notify) => {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
      exitActiveRef.current = false;
      programmaticClose = true;
      if (dialog.open) dialog.close();
      release();
      // A click on a choice already sets `open=false` externally. Only a
      // backdrop/Escape/X dismissal should invoke the parent's cancel callback.
      if (notify) callbackRef.current?.();
    };
    startExitRef.current = (notify = false) => {
      if (exitActiveRef.current) return;
      if (!dialog.open) { if (notify) callbackRef.current?.(); return; }
      exitActiveRef.current = true;
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      if (reduced) { closeNow(notify); return; }
      setExiting(true);
      const duration = dialog.classList.contains('zip-modal--sheet') ? 250 : 210;
      closeTimerRef.current = window.setTimeout(() => closeNow(notify), duration);
    };
    openDialogRef.current = () => {
      // Rapid close→reopen: cancel the old timer rather than closing the new sheet.
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
      exitActiveRef.current = false;
      setExiting(false);
      if (dialog.open) return;
      opener = document.activeElement;
      try {
        if (scrollRegion) scrollRegion.scrollTop = 0;
        unlock = lockModalScroll(document, window, scrollRegion);
        programmaticClose = false;
        dialog.showModal();
        viewport?.addEventListener('resize', updateViewport);
        viewport?.addEventListener('scroll', updateViewport);
        updateViewport();
        // Never auto-focus picker search inputs (avoids iOS keyboard popup).
        dialog.querySelector('.zip-modal-close')?.focus({ preventScroll: true });
      } catch {
        if (dialog.open) { programmaticClose = true; dialog.close(); }
        release();
        callbackRef.current?.();
      }
    };
    const onCancel = event => { event.preventDefault(); requestClose(); };
    const onNativeClose = () => {
      if (programmaticClose) { programmaticClose = false; return; }
      // Only unexpected native closes reach this path.
      window.clearTimeout(closeTimerRef.current);
      exitActiveRef.current = false;
      release();
      callbackRef.current?.();
    };
    dialog.addEventListener('cancel', onCancel);
    dialog.addEventListener('close', onNativeClose);
    dialog.addEventListener('focusin', onFocusWithin);
    return () => {
      window.clearTimeout(closeTimerRef.current);
      dialog.removeEventListener('cancel', onCancel);
      dialog.removeEventListener('close', onNativeClose);
      dialog.removeEventListener('focusin', onFocusWithin);
      if (dialog.open) { programmaticClose = true; dialog.close(); }
      release();
      window.cancelAnimationFrame(focusFrame);
      openDialogRef.current = null;
      startExitRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (open) openDialogRef.current?.();
    else if (dialogRef.current?.open) startExitRef.current?.(false);
  }, [open]);

  const rendered = open ? { title, children } : lastContentsRef.current;
  return <dialog ref={dialogRef} className={`zip-modal zip-modal--${variant}${exiting ? ' zip-modal--exiting' : ''}`} aria-labelledby={titleId}
    onClick={event => { if (event.target === event.currentTarget) requestClose(); }}>
    <div className="zip-modal-panel">
      <header className="zip-modal-header">
        <strong id={titleId}>{rendered.title}</strong>
        <UiIconButton className="zip-modal-close" onClick={requestClose} label={`Đóng ${rendered.title}`} aria-label={`Đóng ${rendered.title}`}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></UiIconButton>
      </header>
      <div className="zip-modal-scroll" data-modal-scroll-region>{rendered.children}</div>
    </div>
  </dialog>;
}
