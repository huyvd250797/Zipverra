/** v3.8.5 — Presentation-only risk summary.
 * GitHub authorization, secret scanning and mutation guards remain server-backed.
 * No credential values or file contents are retained in this model.
 */
const nonNegative = value => Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

export function summarizeReviewRisks({
  report = null, identity = null, insights = null, mode = 'merge', deleteCount = 0,
  requiresConsent = false, sensitiveConsent = false, mismatchConsent = false, syncConfirmed = false,
} = {}) {
  const items = [];
  const critical = nonNegative(report?.critical);
  const warnings = nonNegative(report?.warning);
  const info = nonNegative(report?.info);
  const structural = (insights?.warnings || []).filter(w => w?.code !== 'SECRET_FILE' && w?.severity !== 'info').length;
  const needsSecurity = Boolean(requiresConsent);
  if (needsSecurity || critical || warnings || structural) {
    const flagged = critical > 0 || needsSecurity;
    items.push({
      id: 'security', kind: 'security', tone: flagged ? 'critical' : 'warning',
      title: flagged ? 'Phát hiện file nhạy cảm' : 'Cảnh báo bảo mật',
      detail: `${critical} Critical · ${warnings} Warning${structural ? ` · ${structural} cấu trúc` : ''}. Không hiển thị nội dung nhạy cảm.`,
      required: needsSecurity, approved: needsSecurity && Boolean(sensitiveConsent),
    });
  }
  if (identity?.severity === 'critical') {
    items.push({ id: 'identity', kind: 'identity', tone: 'critical',
      title: 'Có thể upload nhầm dự án',
      detail: `${identity.differentNames ? 'Tên package khác' : 'Cấu trúc khác biệt'} · ${nonNegative(identity.common)} đường dẫn chung. Cần kiểm tra đúng repo.`,
      required: true, approved: Boolean(mismatchConsent),
    });
  } else if (identity?.severity === 'uncertain') {
    items.push({ id: 'identity', kind: 'identity', tone: 'warning',
      title: 'Chưa xác minh được dự án',
      detail: 'Ít đường dẫn chung. Kiểm tra repo và branch.',
      required: false, approved: false,
    });
  }
  if (mode === 'sync' && nonNegative(deleteCount) > 0) {
    const count = nonNegative(deleteCount);
    items.push({ id: 'sync', kind: 'sync', tone: 'warning',
      title: `Sync sẽ xóa ${count} file trên GitHub`,
      detail: 'Có thể xóa file cấu hình. File bỏ chọn được giữ lại.',
      required: true, approved: Boolean(syncConfirmed), count,
    });
  }
  const requiredCount = items.filter(x => x.required).length;
  const pendingCount = items.filter(x => x.required && !x.approved).length;
  const hasCritical = items.some(x => x.tone === 'critical');
  const status = pendingCount ? 'pending' : requiredCount ? 'acknowledged' : items.length ? 'advisory' : 'clear';
  return { items, requiredCount, pendingCount, critical, warnings, info, status, hasCritical };
}
