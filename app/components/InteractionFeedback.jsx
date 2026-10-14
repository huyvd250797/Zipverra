'use client';

import { memo, useEffect } from 'react';

/** One transient message at a time; errors also remain in their original screen. */
export const FeedbackToast = memo(function FeedbackToast({ notice, onDismiss }) {
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => onDismiss(notice.id), notice.duration);
    return () => window.clearTimeout(timer);
  }, [notice?.id, notice?.duration, onDismiss]);
  return <div className="pro-toast-region" aria-label="Thông báo Zipverra">
    {notice && <div key={notice.id} className={`pro-toast pro-toast--${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'} aria-live={notice.tone === 'error' ? 'assertive' : 'polite'} aria-atomic="true">
      <span className="pro-toast-symbol" aria-hidden="true">{notice.tone === 'success' ? '✓' : notice.tone === 'error' ? '!' : notice.tone === 'warning' ? '!' : 'i'}</span>
      <div className="pro-toast-copy"><strong>{notice.title}</strong><p>{notice.detail}</p></div>
      <button className="pro-toast-dismiss" type="button" onClick={() => onDismiss(notice.id)} aria-label="Đóng thông báo">×</button>
    </div>}
  </div>;
});

/** Same reusable skeleton for route chunks and repository fetching. */
export function LoadingSkeleton({ kind = 'panel', label = 'Đang tải dữ liệu…' }) {
  return <div className={`pro-skeleton pro-skeleton--${kind}${kind === 'repos' ? ' repo-skeleton' : ''}`} role="status" aria-label={label} aria-busy="true">
    <div className="pro-skeleton-head" aria-hidden="true"><span className="pro-skeleton-avatar"/><span className="pro-skeleton-title"/></div>
    <div className="pro-skeleton-lines" aria-hidden="true"><span/><span/><span/></div>
    <span className="pro-skeleton-caption">{label}</span>
  </div>;
}
