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
      title: flagged ? 'Security Scan · Phát hiện thông tin nhạy cảm' : 'Security Scan · Cảnh báo cần xem',
      detail: `${critical} Critical · ${warnings} Warning${structural ? ` · ${structural} lưu ý cấu trúc` : ''}. Không hiển thị giá trị bí mật.`,
      required: needsSecurity, approved: needsSecurity && Boolean(sensitiveConsent),
    });
  }
  if (identity?.severity === 'critical') {
    items.push({ id: 'identity', kind: 'identity', tone: 'critical',
      title: 'Có thể upload nhầm dự án',
      detail: `Trùng ${nonNegative(identity.common)} đường dẫn đặc trưng${identity.differentNames ? ' · Tên package.json khác nhau' : ''}. Chỉ là đánh giá tương đồng, không phải kết luận chắc chắn.`,
      required: true, approved: Boolean(mismatchConsent),
    });
  } else if (identity?.severity === 'uncertain') {
    items.push({ id: 'identity', kind: 'identity', tone: 'warning',
      title: 'Chưa đủ dữ liệu xác định cùng dự án',
      detail: 'ZIP và repository ít đường dẫn chung; hãy kiểm tra tên dự án và branch.',
      required: false, approved: false,
    });
  }
  if (mode === 'sync' && nonNegative(deleteCount) > 0) {
    const count = nonNegative(deleteCount);
    items.push({ id: 'sync', kind: 'sync', tone: 'warning',
      title: `Sync sẽ xóa ${count} file trên GitHub`,
      detail: 'Có thể bao gồm file cấu hình triển khai. File bỏ chọn trong Review sẽ được giữ nguyên.',
      required: true, approved: Boolean(syncConfirmed), count,
    });
  }
  const requiredCount = items.filter(x => x.required).length;
  const pendingCount = items.filter(x => x.required && !x.approved).length;
  const hasCritical = items.some(x => x.tone === 'critical');
  const status = pendingCount ? 'pending' : requiredCount ? 'acknowledged' : items.length ? 'advisory' : 'clear';
  return { items, requiredCount, pendingCount, critical, warnings, info, status, hasCritical };
}
