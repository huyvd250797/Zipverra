/** Presentation-only notifications; never interpolate repository text, error bodies or secrets. */
const EVENTS = Object.freeze({
  'sha-copied': { tone: 'info', title: 'Đã sao chép SHA', detail: 'Mã commit đã được sao chép vào clipboard.', duration: 2600 },
  'repo-selected': { tone: 'success', title: 'Repository đã được chọn', detail: 'Tiếp tục tải ZIP lên để kiểm tra.', duration: 3200 },
  'zip-invalid': { tone: 'error', title: 'File ZIP chưa hợp lệ', detail: 'Kiểm tra định dạng hoặc dung lượng file.', duration: 5500 },
  'review-ready': { tone: 'success', title: 'Bản Review đã sẵn sàng', detail: 'Kiểm tra Security Scan trước khi xác nhận Push.', duration: 4000 },
  'no-changes': { tone: 'info', title: 'Source đã đồng bộ', detail: 'Không có thay đổi nào cần commit.', duration: 4000 },
  'push-verified': { tone: 'success', title: 'GitHub đã xác minh commit', detail: 'Xem Activity để kiểm tra SHA và kết quả.', duration: 5200 },
  'pr-verified': { tone: 'success', title: 'Pull Request đã mở', detail: 'PR đang chờ review hoặc merge, chưa cập nhật main.', duration: 5500 },
  'action-failed': { tone: 'error', title: 'Thao tác cần kiểm tra', detail: 'Xem thông tin lỗi trên màn hình hiện tại hoặc Activity.', duration: 6200 },
  'network-offline': { tone: 'warning', title: 'Đã mất kết nối mạng', detail: 'Thao tác GitHub cần có Internet. Kiểm tra Activity khi kết nối lại.', duration: 6200 },
  'network-online': { tone: 'info', title: 'Đã kết nối lại', detail: 'Kiểm tra Activity trước khi thử lại thao tác chưa rõ kết quả.', duration: 4500 },
});
export function createInteractionNotice(event) {
  const config = EVENTS[event];
  return config ? { ...config, event } : null;
}
export function shouldAnnounceEvent(event, verified = false) {
  // Durable GitHub success can only be announced after server verification.
  return !['push-verified','pr-verified'].includes(event) || verified === true;
}
