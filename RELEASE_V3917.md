# Zipverra Pro v3.9.17 — Smart ZIP Compatibility Hotfix

## Chức năng
- Đọc kích thước và CRC từ ZIP Central Directory (hỗ trợ file 0 byte). Không dùng `_data.uncompressedSize` của JSZip.
- Xác thực Central Directory, kích thước, CRC, giới hạn file, path, collision, scan bảo mật trước Review.
- Bỏ một wrapper theo logic cũ và tối đa hai wrapper nữa khi chắc chắn có dấu hiệu project root ở dưới. Không tự thay đổi nội dung file rỗng.
- Thông báo lỗi chỉ rõ file CRC, metadata, path không hợp lệ; trong lúc phân tích hiển thị số file được kiểm tra trên PC.
- Upload PC: layout mới không có card rỗng, chọn repo rồi kéo thả ZIP/nhấn chọn, Review và Push giữ nguyên confirmation gate.
- Activity PC: ẩn thanh progress cấp trang trùng lặp; hiển thị repo/branch tại Live Activity khi hoạt động.
- Không thay đổi backend GitHub API; giữ Mobile theo layout hiện hành.

## Giới hạn / bảo đảm
- Không tự động Push. Mọi cảnh báo Security Scan/Project Mismatch và xác nhận Sync/Delete giữ nguyên.
- ZIP malformed / CRC khác / thành phần bị trùng bị từ chối, không tự bỏ qua.
- File lớn trên 3 MB vẫn yêu cầu Vercel Private Blob configuration như v3.9.16.
- Production build và nghiệm thu PWA Safari/Vercel vẫn cần thực hiện với đầy đủ Next.js dependencies.
