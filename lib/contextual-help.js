/** Read-only, fixed in-app help copy. Never built from source code or GitHub errors. */
const HELPS = Object.freeze({
  repositories: {
    title: 'Repositories',
    items: [
      ['Chọn repo', 'Tìm theo tên, chọn từ danh sách hoặc dùng repo gần đây. Repo phải được GitHub App cấp quyền ghi.'],
      ['Làm mới', 'Biểu tượng xoay vòng bên cạnh trạng thái kết nối sẽ cập nhật danh sách repo. Quản lý quyền trong Settings.'],
      ['Tải source', 'Download Source ZIP lấy snapshot của branch main. Nhấn Chuẩn bị ZIP, sau đó Lưu vào Tệp trên iPhone. Tên ZIP dựa vào commit mới nhất.'],
      ['Workspace', 'Mở file, xem lịch sử và chỉnh sửa file text nhỏ mà không cần upload ZIP.'],
    ],
  },
  home: {
    title: 'Upload & Review',
    items: [
      ['Luồng Push', 'Chọn repo → chọn ZIP → tự phân tích → kiểm tra file thay đổi → xác nhận và Push. App tự mở Activity sau khi Push.'],
      ['Giới hạn ZIP', 'Tối đa 80 MiB ZIP, 160 MiB sau giải nén, 2.500 file và 2,5 MB cho mỗi file riêng lẻ.'],
      ['Merge / Sync', 'Merge giữ file cũ không nằm trong ZIP. Sync có thể xóa chúng; khi có file bị xóa cần xác nhận riêng.'],
      ['Pull Request', 'Direct Push là mặc định. Chế độ PR tạo branch riêng để xem và duyệt trước khi merge.'],
      ['An toàn', 'Khi Security Scan phát hiện Critical/credential, chọn Không để kiểm tra hoặc Có để tiếp tục với rủi ro. Commit/PR vẫn cần xác nhận riêng. ZIP sai định dạng, sai quyền GitHub không thể bỏ qua.'],
      ['Tải ZIP', 'Download Source ZIP lấy branch main, không phụ thuộc branch đang chọn để Push. iPhone hỗ trợ Lưu vào Tệp qua bảng chia sẻ.'],
    ],
  },
  activity: {
    title: 'Activity',
    items: [
      ['Live Push', 'Theo dõi Validate, Upload, Commit, Verify và tạo PR nếu được chọn. Chỉ báo hoàn tất sau khi GitHub xác minh.'],
      ['Mạng gián đoạn', 'Nếu chưa xác định commit đã ghi hay chưa, dùng Xác minh trước khi tiếp tục. Zipverra không tự lặp lại commit/rollback.'],
      ['Lịch sử', 'Recent Actions lưu thông tin thao tác trên thiết bị, không chứa token hoặc ZIP.'],
    ],
  },
  history: {
    title: 'History',
    items: [
      ['Commit', 'Xem lịch sử của branch đã chọn. Chọn các SHA để so sánh thay đổi file.'],
      ['Safe Rollback', 'Preview trước; rollback tạo commit mới khôi phục nội dung cũ, không force-push hoặc viết lại lịch sử.'],
      ['Xác nhận', 'Rollback yêu cầu tick xác nhận và nhập ROLLBACK. Nếu mất mạng, xác minh lại trước khi thao tác khác.'],
    ],
  },
  settings: {
    title: 'Settings',
    items: [
      ['Tài khoản', 'GitHub App giới hạn repository theo installation và quyền người dùng. Có thể quản lý quyền và đăng xuất tại đây.'],
      ['Quyền cần thiết', 'Contents: Read & write để Push; Pull requests: Read & write để tạo PR; Workflows: Read & write khi sửa CI.'],
      ['Giao diện', 'System tự theo Dark/Light Mode của iPhone. Reduced Motion được áp dụng từ cài đặt thiết bị.'],
      ['Push Profiles', 'Lưu cấu hình riêng cho từng repo trên thiết bị; chưa đồng bộ qua điện thoại khác.'],
      ['PWA', 'Khi có bản mới, dùng Kiểm tra cập nhật; không cập nhật giữa Push hoặc Quick Edit chưa lưu.'],
    ],
  },
});
export function helpForTab(tab) {
  return HELPS[tab] ?? HELPS.repositories;
}
export function helpTabNames() {
  return Object.keys(HELPS);
}
