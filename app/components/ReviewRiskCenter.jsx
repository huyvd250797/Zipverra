'use client';
import { memo } from 'react';
import StatusGlyph from './StatusGlyph.jsx';

/** Unified Review decision surface. Pure UI; permission checks remain in Home and GitHub API. */
export const ReviewRiskCenter = memo(function ReviewRiskCenter({
  summary, busy = false, owner = '', repo = '', branch = '',
  onSecurityDecision, onMismatchConsent, onSyncConsent, onShowDetails,
}) {
  if (!summary) return null;
  const { items, pendingCount, requiredCount, status } = summary;
  return <section className={`review-risk-center review-risk-center--${status}${summary.hasCritical ? ' review-risk-center--critical' : ''}`} aria-label="Đánh giá rủi ro trước khi Push">
    <header className="review-risk-head">
      <span className="review-risk-emblem" aria-hidden="true"><StatusGlyph kind={status === 'clear' || status === 'acknowledged' ? 'success' : summary.hasCritical ? 'critical' : 'warning'} size={20}/></span>
      <div className="review-risk-heading">
        <strong>Đánh giá rủi ro</strong>
        <small aria-live="polite">{status === 'clear' ? 'Không phát hiện cảnh báo theo các quy tắc hiện có' : pendingCount ? `${pendingCount}/${requiredCount} xác nhận cần hoàn tất` : status === 'acknowledged' ? `Đã hoàn tất ${requiredCount} xác nhận rủi ro` : `${items.length} lưu ý · Không yêu cầu xác nhận thêm`}</small>
      </div>
      <span className={`review-risk-count review-risk-count--${status}`}>{pendingCount ? `${pendingCount} cần xử lý` : status === 'clear' ? 'Không cảnh báo' : status === 'acknowledged' ? 'Đã xác nhận' : 'Cần xem'}</span>
    </header>
    {items.length ? <div className="review-risk-items">
      {items.map(item => <div className={`review-risk-item review-risk-item--${item.tone}`} key={item.id}>
        <div className="review-risk-item-top">
          <span className="review-risk-item-icon" aria-hidden="true"><StatusGlyph kind={item.kind === 'identity' ? 'identity' : item.kind === 'sync' ? 'sync' : item.tone === 'critical' ? 'critical' : 'warning'} size={17}/></span>
          <div className="review-risk-item-content">
            <strong>{item.title}</strong>
            <small>{item.detail}</small>
          </div>
          <span className={`review-risk-state${item.required && item.approved ? ' review-risk-state--done' : ''}`}>
            {item.required ? (item.approved ? 'Đã chấp nhận' : 'Cần xác nhận') : 'Lưu ý'}
          </span>
        </div>
        {item.kind === 'security' && <button type="button" className="review-risk-link" onClick={item.required ? onSecurityDecision : onShowDetails} disabled={busy}>
          {item.required ? (item.approved ? 'Xem lại quyết định Có / Không' : 'Xem cảnh báo và chọn Có / Không') : 'Xem chi tiết Security Scan'} <span aria-hidden="true">→</span>
        </button>}
        {item.kind === 'identity' && item.required && <label className="review-risk-approval"><input type="checkbox" checked={item.approved} disabled={busy} onChange={event => onMismatchConsent(event.target.checked)}/><span>Tôi đã kiểm tra <b>{owner}/{repo}</b> · <b>{branch}</b>, hiểu nguy cơ nhầm dự án và vẫn muốn tiếp tục.</span></label>}
        {item.kind === 'sync' && <label className="review-risk-approval"><input type="checkbox" checked={item.approved} disabled={busy} onChange={event => onSyncConsent(event.target.checked)}/><span>Tôi đồng ý xóa {item.count} file trên branch đích.</span></label>}
      </div>)}
    </div> : <p className="review-risk-clean">Không phát hiện rủi ro theo bộ quy tắc hiện có. Vẫn cần kiểm tra source trước khi Push.</p>}
    {items.length > 0 && <button type="button" className="review-risk-diagnostics-link" disabled={busy} onClick={onShowDetails}>Chi tiết Security Scan & ZIP Analyzer <span aria-hidden="true">↗</span></button>}
  </section>;
});
