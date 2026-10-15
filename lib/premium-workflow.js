/** Pure presentation helpers. GitHub mutation and security gates remain server-owned. */
export const WORKFLOW_LABELS = Object.freeze(['Repo', 'Upload', 'Analyze', 'Confirm', 'Push']);

export function workflowPosition(step) {
  const bounded = Number.isFinite(step) ? Math.min(5, Math.max(0, Math.floor(step))) : 0;
  return { active: Math.min(4, bounded), complete: bounded === 5, railPercent: Math.min(100, bounded / 4 * 100) };
}

const ACTIVITY_STAGES = Object.freeze({
  ANALYZING: { title: 'Đang phân tích ZIP', detail: 'Phân tích source trên thiết bị' },
  PREFLIGHT: { title: 'Đang kiểm tra GitHub', detail: 'Đọc quyền và so sánh source' },
  UPLOADING: { title: 'Đang tải source', detail: 'Gửi các file đã được chọn' },
  COMMITTING: { title: 'Đang tạo commit', detail: 'Không đóng ứng dụng khi đang ghi GitHub' },
  VERIFYING: { title: 'Đang xác minh commit', detail: 'Đối chiếu dữ liệu đã ghi trên GitHub' },
  UNCONFIRMED: { title: 'Cần xác minh GitHub', detail: 'Không Push lại khi kết quả chưa rõ' },
  SUCCEEDED: { title: 'Đã xác minh trên GitHub', detail: 'Commit đã được GitHub xác nhận' },
  FAILED: { title: 'Thao tác đã dừng', detail: 'Kiểm tra nguyên nhân bên dưới' },
});

export function activityPresentation({ phase, busy, pendingCommit, pendingPR, result, progress }) {
  if (pendingPR && !result?.pr) return { tone: 'warning', title: 'Đang chờ xác minh Pull Request', detail: 'Branch đã Push; không gửi lại source ZIP', percent: null };
  if (pendingCommit && !busy) return { tone: 'warning', title: 'Commit chưa xác minh', detail: 'Kiểm tra kết quả trên GitHub trước khi thử lại', percent: null };
  const stage = ACTIVITY_STAGES[phase];
  if (!stage || phase === 'IDLE' && !busy) return null;
  const tone = phase === 'SUCCEEDED' && !pendingPR ? 'success' : phase === 'UNCONFIRMED' || phase === 'FAILED' ? 'warning' : 'processing';
  // Only report progress while a known measured operation is in flight; never fabricate percentages.
  const percent = busy && ['ANALYZING','PREFLIGHT','UPLOADING','COMMITTING','VERIFYING'].includes(phase) && Number.isFinite(progress)
    ? Math.min(100, Math.max(0, Math.round(progress))) : null;
  return { ...stage, tone, percent };
}

export function reviewDisclosureDefaultOpen(changeCount) {
  return Number.isSafeInteger(changeCount) && changeCount <= 10 && changeCount >= 0;
}
