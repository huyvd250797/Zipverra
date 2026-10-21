'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { lockModalScroll } from '../../lib/modal-scroll-lock.js';
import { modalViewportGeometry } from '../../lib/modal-viewport.js';
import { shouldDismissSheetDrag, focusedFieldScrollDelta } from '../../lib/adaptive-sheet.js';
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
  const dragRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [snapping, setSnapping] = useState(false);
  const snapTimerRef = useRef(null);
  const snapFrameRef = useRef(null);
  const lastContentsRef = useRef({ title, children });
  callbackRef.current = onClose;
  if (open) lastContentsRef.current = { title, children };

  const requestClose = () => startExitRef.current?.(true);
  const onGripPointerDown = event => {
    if (event.pointerType !== 'touch' || window.innerWidth > 760 || event.button !== 0) return;
    const dialog = dialogRef.current;
    if (!dialog?.open || dialog.classList.contains('zip-modal--exiting')) return;
    const keyboardOpen = parseFloat(dialog.style.getPropertyValue('--zip-keyboard-inset') || '0') > 100;
    if (keyboardOpen) return;
    window.clearTimeout(snapTimerRef.current);
    window.cancelAnimationFrame(snapFrameRef.current);
    setSnapping(false);
    dialog.style.setProperty('--zip394-drag-y', '0px');
    dragRef.current = { id:event.pointerId, x:event.clientX, y:event.clientY, start:performance.now() };
    setDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onGripPointerMove = event => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    const distanceY = Math.max(0, event.clientY - drag.y);
    dialogRef.current?.style.setProperty('--zip394-drag-y', `${Math.min(distanceY, 320)}px`);
  };
  const onGripPointerEnd = event => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    dragRef.current = null;
    const dialog = dialogRef.current;
    const distanceY = Math.max(0, event.clientY - drag.y);
    const keyboardOpen = parseFloat(dialog?.style.getPropertyValue('--zip-keyboard-inset') || '0') > 100;
    const dismiss = event.type !== 'pointercancel' && shouldDismissSheetDrag({
      distanceX:event.clientX - drag.x, distanceY,
      elapsedMs:performance.now() - drag.start, fromHandle:true, keyboardOpen
    });
    if (dismiss) {
      setDragging(false);
      dialog?.style.removeProperty('--zip394-drag-y');
      requestClose();
    } else {
      // Preserve the actual drag transform, then ease it to zero next frame.
      // Re-running the entrance animation here causes the visible "jump".
      setSnapping(true);
      setDragging(false);
      snapFrameRef.current = window.requestAnimationFrame(() => {
        dialog?.style.setProperty('--zip394-drag-y', '0px');
      });
      snapTimerRef.current = window.setTimeout(() => {
        setSnapping(false);
        dialog?.style.removeProperty('--zip394-drag-y');
      }, 220);
    }
  };

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
    let fieldFrame = 0;
    let focusedField = null;

    const updateViewport = () => {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(() => {
        const layoutHeight = document.documentElement.clientHeight || window.innerHeight;
        const { visibleHeight, keyboardInset } = modalViewportGeometry(
          layoutHeight, viewport?.height || layoutHeight, viewport?.offsetTop || 0
        );
        dialog.style.setProperty('--zip-visible-height', `${visibleHeight}px`);
        dialog.style.setProperty('--zip-keyboard-inset', `${keyboardInset}px`);
        // Wait for the new visual viewport/keyboard geometry before adjusting
        // the inner scroll area. Do not invoke scrollIntoView on the document.
        window.cancelAnimationFrame(fieldFrame);
        fieldFrame = window.requestAnimationFrame(() => {
          if (!focusedField?.isConnected || !scrollRegion?.contains(focusedField)) return;
          const delta = focusedFieldScrollDelta(focusedField.getBoundingClientRect(), scrollRegion.getBoundingClientRect());
          if (delta) scrollRegion.scrollTop += delta;
        });
      });
    };
    const onFocusWithin = event => {
      if (scrollRegion?.contains(event.target) && event.target.matches?.('input, textarea, select, [contenteditable="true"]')) {
        focusedField = event.target;
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
      window.cancelAnimationFrame(fieldFrame);
      window.cancelAnimationFrame(snapFrameRef.current);
      window.clearTimeout(snapTimerRef.current);
      focusedField = null;
      dragRef.current = null;
      setDragging(false);
      setSnapping(false);
      dialog.style.removeProperty('--zip394-drag-y');
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
      const duration = ['sheet', 'picker', 'diff'].some(kind => dialog.classList.contains(`zip-modal--${kind}`)) ? 250 : 210;
      closeTimerRef.current = window.setTimeout(() => closeNow(notify), duration);
    };
    openDialogRef.current = () => {
      // Rapid close→reopen: cancel the old timer rather than closing the new sheet.
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
      exitActiveRef.current = false;
      setExiting(false);
      window.clearTimeout(snapTimerRef.current);
      window.cancelAnimationFrame(snapFrameRef.current);
      setSnapping(false);
      dialog.style.removeProperty('--zip394-drag-y');
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
    const onFocusOut = event => {
      if (event.relatedTarget && scrollRegion?.contains(event.relatedTarget)) return;
      focusedField = null;
    };
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
    dialog.addEventListener('focusout', onFocusOut);
    return () => {
      window.clearTimeout(closeTimerRef.current);
      dialog.removeEventListener('cancel', onCancel);
      dialog.removeEventListener('close', onNativeClose);
      dialog.removeEventListener('focusin', onFocusWithin);
      dialog.removeEventListener('focusout', onFocusOut);
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
  return <dialog ref={dialogRef} className={`zip-modal zip-modal--${variant}${exiting ? ' zip-modal--exiting' : ''}${dragging ? ' zip394-dragging' : ''}${snapping ? ' zip394-snapping' : ''}`} aria-labelledby={titleId}
    onClick={event => { if (event.target === event.currentTarget) requestClose(); }}>
    <div className="zip-modal-panel">
      {['sheet','picker','diff'].includes(variant) && <div className="zip394-sheet-grip-zone"
        aria-hidden="true" onPointerDown={onGripPointerDown} onPointerMove={onGripPointerMove}
        onPointerUp={onGripPointerEnd} onPointerCancel={onGripPointerEnd}>
        <span className="zip394-sheet-grip"/>
      </div>}
      <header className="zip-modal-header">
        <strong id={titleId}>{rendered.title}</strong>
        <UiIconButton className="zip-modal-close" onClick={requestClose} label={`Đóng ${rendered.title}`} aria-label={`Đóng ${rendered.title}`}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></UiIconButton>
      </header>
      <div className="zip-modal-scroll" data-modal-scroll-region>{rendered.children}</div>
    </div>
  </dialog>;
}
