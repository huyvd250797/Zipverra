'use client';
import { memo } from 'react';

/** Presentation-only: no GitHub writes or client-side bypass of security gates. */
export const ReviewSummary = memo(function ReviewSummary({ selected, total, bytes, strategy, target }) {
  return <div className="premium-review-overview" aria-label="Tổng quan Review">
    <div className="premium-overview-main"><span className="premium-eyebrow">REVIEW</span><strong>{selected}/{total} thay đổi</strong><small>{bytes} được chọn</small></div>
    <div className="premium-overview-target"><span>{strategy === 'pr' ? 'Pull Request' : 'Direct Push'}</span><strong title={target}>{target}</strong></div>
  </div>;
});


/** Compact, redacted safety headline shown before confirmation.
 * Full findings remain available below without forcing file-list scrolling. */
export const ReviewRiskSnapshot = memo(function ReviewRiskSnapshot({ report, insights }) {
  if (!report) return null;
  const critical = Math.max(0, report.critical || 0);
  const warning = Math.max(0, report.warning || 0);
  const structural = (insights?.warnings || []).filter(item => item.severity !== 'info' && item.code !== 'SECRET_FILE');
  const tone = critical || report.blocked ? 'critical' : warning || structural.length ? 'warning' : 'clear';
  const criticalPaths = [...new Set((report.findings || []).filter(item => item.severity === 'critical').map(item => item.path).filter(Boolean))].slice(0, 2);
  return <section className={`premium-risk-snapshot premium-risk-${tone}`} aria-label="Tổng quan bảo mật" role="status">
    <span className="premium-risk-icon" aria-hidden="true">{tone === 'critical' ? '!' : tone === 'warning' ? '!' : '✓'}</span>
    <div className="premium-risk-content">
      <strong>{tone === 'critical' ? `Đã chặn Push · ${critical} Critical` : tone === 'warning' ? `${warning + structural.length} cảnh báo cần lưu ý` : 'Không phát hiện Critical'}</strong>
      <small>{tone === 'critical' ? 'Loại bỏ hoặc bỏ chọn file Critical trước khi Push.' : tone === 'warning' ? 'Mở chi tiết bảo mật khi cần kiểm tra thêm.' : 'Quét theo các quy tắc hiện có, không bảo đảm tuyệt đối.'}</small>
      {criticalPaths.length > 0 && <span className="premium-risk-paths">{criticalPaths.join(' · ')}</span>}
    </div>
  </section>;
});

export const LiveActivityFocus = memo(function LiveActivityFocus({ presentation }) {
  if (!presentation) return null;
  return <section className={`premium-activity-focus premium-activity-${presentation.tone}`} aria-label="Bước đang xử lý" role="status" aria-live="polite">
    <span className="premium-activity-emblem" aria-hidden="true">{presentation.tone === 'success' ? '✓' : presentation.tone === 'warning' ? '!' : '↻'}</span>
    <div className="premium-activity-info"><strong>{presentation.title}</strong><small>{presentation.detail}</small></div>
    {presentation.percent !== null && <output aria-label="Tiến độ hiện tại">{presentation.percent}%</output>}
  </section>;
});
