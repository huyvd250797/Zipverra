/** Pure, non-sensitive UI decisions. Server-side GitHub permission and scan gates remain authoritative. */
export function reviewReadiness({ hasPreview = false, selectedCount = 0, critical = 0, authenticated = false,
  online = false, busy = false, pending = false, confirmed = false, syncDeleteCount = 0,
  syncConfirmed = false, sensitiveConsent = false, sensitiveFindings = 0 } = {}) {
  if (!hasPreview) return { code: 'NO_PREVIEW', tone: 'info', ready: false, title: 'Chưa có bản Review', detail: 'Chọn ZIP để phân tích thay đổi trước khi Push.' };
  if (busy) return { code: 'BUSY', tone: 'info', ready: false, title: 'Đang xử lý', detail: 'Vui lòng chờ thao tác hiện tại hoàn tất.' };
  if (pending) return { code: 'PENDING', tone: 'warning', ready: false, title: 'Cần xác minh GitHub', detail: 'Mở Activity và xác minh thao tác trước khi gửi commit mới.' };
  if (!authenticated) return { code: 'AUTH', tone: 'warning', ready: false, title: 'Chưa kết nối GitHub', detail: 'Đăng nhập GitHub App để tiếp tục.' };
  if (!online) return { code: 'OFFLINE', tone: 'warning', ready: false, title: 'Đang offline', detail: 'Kết nối Internet trước khi Push hoặc tạo PR.' };
  if ((critical > 0 || sensitiveFindings > 0) && !sensitiveConsent) return { code: 'SECURITY', tone: 'warning', ready: false, title: 'Cần xác nhận cảnh báo bảo mật', detail: `Phát hiện ${critical} Critical và ${sensitiveFindings} cảnh báo credential. Nhấn Có / Không để xem rủi ro, rồi chọn tiếp tục hoặc quay lại kiểm tra.` };
  if (selectedCount < 1) return { code: 'NO_CHANGES', tone: 'info', ready: false, title: 'Chưa chọn thay đổi', detail: 'Chọn ít nhất một file trong danh sách Review.' };
  if (syncDeleteCount > 0 && !syncConfirmed) return { code: 'SYNC', tone: 'warning', ready: false, title: 'Xác nhận xóa file trong Sync', detail: `Cần đồng ý xóa ${syncDeleteCount} file trước khi Push.` };
  if (!confirmed) return { code: 'CONFIRM', tone: 'info', ready: false, title: 'Chờ xác nhận Review', detail: 'Kiểm tra file và tick xác nhận trước khi Push.' };
  return { code: 'READY', tone: 'success', ready: true, title: 'Sẵn sàng cập nhật GitHub', detail: `Đã chọn ${selectedCount} thay đổi. Chỉ Push khi bạn nhấn nút xác nhận.` };
}

export function trimSha(sha) {
  return typeof sha === 'string' && /^[a-f0-9]{40}$/i.test(sha) ? sha.slice(0, 12) : '';
}

export function selectedRepoLabel(owner, repo) {
  const a = typeof owner === 'string' ? owner.trim() : '';
  const b = typeof repo === 'string' ? repo.trim() : '';
  return a && b ? `${a}/${b}` : '';
}

export function themeChoice(value) {
  return ['dark', 'light', 'system'].includes(value) ? value : 'dark';
}

export function resolveTheme(choice, prefersLight = false) {
  return themeChoice(choice) === 'system' ? (prefersLight ? 'light' : 'dark') : themeChoice(choice);
}
