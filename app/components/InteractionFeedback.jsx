'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import ModalSheet from './ModalSheet.jsx';

/** A single accessible toast, shown sequentially by the bounded notification queue. */
export const FeedbackToast = memo(function FeedbackToast({ notice, queuedCount = 0, onDismiss }) {
  const [exiting, setExiting] = useState(false);
  const [paused, setPaused] = useState(false);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  const startClose = useCallback((id) => {
    if (!Number.isSafeInteger(id)) return;
    setExiting(true);
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reduced) onDismissRef.current(id);
    else window.setTimeout(() => onDismissRef.current(id), 170);
  }, []);
  useEffect(() => { setExiting(false); setPaused(false); }, [notice?.id]);
  useEffect(() => {
    if (!notice || paused || exiting || !Number.isFinite(notice.duration) || notice.duration <= 0) return;
    const timer = window.setTimeout(() => startClose(notice.id), notice.duration);
    return () => window.clearTimeout(timer);
  }, [notice?.id, notice?.duration, paused, exiting, startClose]);
  useEffect(() => {
    if (!notice) return;
    const visibility = () => setPaused(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', visibility);
    visibility();
    return () => document.removeEventListener('visibilitychange', visibility);
  }, [notice?.id]);
  return <div className="pro-toast-region" aria-label="Thông báo Zipverra">
    {notice && <div key={notice.id} className={`pro-toast pro-toast--${notice.tone}${exiting ? ' pro-toast--exiting' : ''}`} role={notice.tone === 'error' ? 'alert' : 'status'} aria-live={notice.tone === 'error' ? 'assertive' : 'polite'} aria-atomic="true" onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}>
      <span className="pro-toast-symbol" aria-hidden="true">{notice.tone === 'success' ? '✓' : notice.tone === 'error' ? '!' : notice.tone === 'warning' ? '!' : 'i'}</span>
      <div className="pro-toast-copy"><strong>{notice.title}</strong><p>{notice.detail}</p>{queuedCount > 0 && <small className="pro-toast-pending">Còn {queuedCount} thông báo</small>}</div>
      <button className="pro-toast-dismiss" type="button" onClick={() => startClose(notice.id)} disabled={exiting} aria-label="Đóng thông báo">×</button>
    </div>}
  </div>;
});

/** Reusable persistent contextual information. Warning/critical conditions aren't auto-dismissed. */
export function FeedbackBanner({ tone = 'info', title, children, actions = null, className = '' }) {
  const severity = ['info', 'success', 'warning', 'error', 'critical'].includes(tone) ? tone : 'info';
  return <aside className={`zip-feedback-banner zip-feedback-banner--${severity} ${className}`.trim()} role={severity === 'critical' || severity === 'error' ? 'alert' : 'status'}>
    <span className="zip-feedback-banner-icon" aria-hidden="true">{severity === 'success' ? '✓' : severity === 'info' ? 'i' : '!'}</span>
    <div className="zip-feedback-banner-body"><strong>{title}</strong><div>{children}</div></div>
    {actions && <div className="zip-feedback-banner-actions">{actions}</div>}
  </aside>;
}

/** User-directed modal; never treats dismissal as consent. */
export function ConfirmationDialog({ request, onAnswer }) {
  return <ModalSheet open={Boolean(request)} onClose={() => onAnswer(false)} title={request?.title || 'Xác nhận thao tác'} variant="confirm">
    <div className="zip-confirm-content">
      <p>{request?.message}</p>
      <div className="zip-confirm-actions">
        <button type="button" className="button secondary" onClick={() => onAnswer(false)}>{request?.cancelLabel || 'Hủy'}</button>
        <button type="button" className={`button ${request?.danger ? 'danger' : 'primary'}`} onClick={() => onAnswer(true)}>{request?.confirmLabel || 'Tiếp tục'}</button>
      </div>
    </div>
  </ModalSheet>;
}

/** Exactly one decision at a time; safe default is always cancel. */
export function useConfirmationDialog() {
  const [request, setRequest] = useState(null);
  const pendingRef = useRef(null);
  const ask = useCallback((options) => {
    if (pendingRef.current) return Promise.resolve(false);
    return new Promise(resolve => {
      pendingRef.current = resolve;
      setRequest({
        title: String(options?.title || 'Xác nhận thao tác'),
        message: String(options?.message || ''),
        confirmLabel: String(options?.confirmLabel || 'Tiếp tục'),
        cancelLabel: String(options?.cancelLabel || 'Hủy'),
        danger: Boolean(options?.danger),
      });
    });
  }, []);
  const answer = useCallback(value => {
    const resolve = pendingRef.current;
    if (!resolve) return;
    pendingRef.current = null;
    setRequest(null);
    resolve(value === true);
  }, []);
  useEffect(() => () => { if (pendingRef.current) { pendingRef.current(false); pendingRef.current = null; } }, []);
  return { ask, request, answer };
}

/** Same reusable skeleton for route chunks and repository fetching. */
export function LoadingSkeleton({ kind = 'panel', label = 'Đang tải dữ liệu…' }) {
  return <div className={`pro-skeleton pro-skeleton--${kind}${kind === 'repos' ? ' repo-skeleton' : ''}`} role="status" aria-label={label} aria-busy="true">
    <div className="pro-skeleton-head" aria-hidden="true"><span className="pro-skeleton-avatar"/><span className="pro-skeleton-title"/></div>
    <div className="pro-skeleton-lines" aria-hidden="true"><span/><span/><span/></div>
    <span className="pro-skeleton-caption">{label}</span>
  </div>;
}
