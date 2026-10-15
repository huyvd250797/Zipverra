'use client';

import { useEffect, useRef } from 'react';
import { lockModalScroll } from '../../lib/modal-scroll-lock.js';
import { UiIconButton } from './UnifiedUI.jsx';

/** Accessible native top-layer dialog with iPhone-specific background scroll lock. */
export default function ModalSheet({ open, onClose, title, children, variant = 'sheet' }) {
  const dialogRef = useRef(null);
  const callbackRef = useRef(onClose);
  callbackRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    let unlock = null;
    let closing = false;
    const closeHandler = () => {
      if (!closing) callbackRef.current?.();
    };
    dialog.addEventListener('close', closeHandler);
    try {
      // Reopening a picker always starts at quick suggestions, not its old scroll position.
      const scrollRegion = dialog.querySelector('[data-modal-scroll-region]');
      if (scrollRegion) scrollRegion.scrollTop = 0;
      unlock = lockModalScroll(document, window, dialog.querySelector('[data-modal-scroll-region]'));
      dialog.showModal();
    } catch {
      unlock?.();
      unlock = null;
      callbackRef.current?.();
    }
    return () => {
      closing = true;
      dialog.removeEventListener('close', closeHandler);
      if (dialog.open) dialog.close();
      unlock?.();
    };
  }, [open]);

  return <dialog ref={dialogRef} className={`zip-modal zip-modal--${variant}`} aria-label={title}
    onClick={event => { if (event.target === event.currentTarget) onClose?.(); }}>
    <div className="zip-modal-panel">
      <header className="zip-modal-header">
        <strong>{title}</strong>
        <UiIconButton className="zip-modal-close" onClick={onClose} label={`Đóng ${title}`} aria-label={`Đóng ${title}`}>×</UiIconButton>
      </header>
      <div className="zip-modal-scroll" data-modal-scroll-region>{children}</div>
    </div>
  </dialog>;
}
