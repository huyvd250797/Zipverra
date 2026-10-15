'use client';
import { memo } from 'react';

/** Presentation-only: no GitHub writes or client-side bypass of security gates. */
export const ReviewSummary = memo(function ReviewSummary({ selected, total, bytes, strategy, target }) {
  return <div className="premium-review-overview" aria-label="Tổng quan Review">
    <div className="premium-overview-main"><span className="premium-eyebrow">REVIEW</span><strong>{selected}/{total} thay đổi</strong><small>{bytes} được chọn</small></div>
    <div className="premium-overview-target"><span>{strategy === 'pr' ? 'Pull Request' : 'Direct Push'}</span><strong title={target}>{target}</strong></div>
  </div>;
});

export const LiveActivityFocus = memo(function LiveActivityFocus({ presentation }) {
  if (!presentation) return null;
  return <section className={`premium-activity-focus premium-activity-${presentation.tone}`} aria-label="Bước đang xử lý" role="status" aria-live="polite">
    <span className="premium-activity-emblem" aria-hidden="true">{presentation.tone === 'success' ? '✓' : presentation.tone === 'warning' ? '!' : '↻'}</span>
    <div className="premium-activity-info"><strong>{presentation.title}</strong><small>{presentation.detail}</small></div>
    {presentation.percent !== null && <output aria-label="Tiến độ hiện tại">{presentation.percent}%</output>}
  </section>;
});
