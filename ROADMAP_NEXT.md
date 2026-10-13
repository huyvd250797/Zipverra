# Zipverra v1.4.0 — Mobile UX/UI 2.0 (Kế hoạch tiếp theo)

## Mục tiêu
Biến Zipverra từ responsive website thành trải nghiệm PWA trên iPhone tương tự ứng dụng native, ít thao tác hơn khi upload source và theo dõi push. **Không thay đổi các ràng buộc an toàn của v1.3.4.**

## Phạm vi ưu tiên
1. **App shell / navigation:** bottom navigation `Home · Repositories · Activity · Settings`, an toàn với Dynamic Island và Home Indicator; các tab vẫn dùng một nguồn trạng thái chuẩn.
2. **Mobile upload flow:** khu vực chọn ZIP dễ dùng bằng một tay; trạng thái file + tên commit rõ ràng; chọn repo/branch với tìm kiếm và nhắc repo gần đây (lưu local không chứa token).
3. **Push timeline:** hiển thị Validate → Upload → Commit → Verify, hỗ trợ retry blob / Verify Push mà không khiến người dùng tạo commit trùng.
4. **Merge/Sync UX:** hiển thị số file thay đổi và xóa, cảnh báo Sync có xác nhận riêng, danh sách thay đổi lọc theo Added/Modified/Deleted.
5. **Visual design:** chuẩn hóa spacing, typography, màu dark/light, skeleton/loading và empty states; đảm bảo accessibility và prefers-reduced-motion.
6. **iPhone PWA tests:** layout 320/375/390/430px, standalone, Safari, xoay màn hình, zoom/font size, keyboard và safe-area.

## Ngoài phạm vi v1.4.0
- GitHub App permissions per repository (dự kiến v1.5.0)
- Lịch sử commit dài hạn và rollback (dự kiến v1.6.0)
- Xử lý ZIP lớn hơn 20 MiB (dự kiến v1.7.0)

## Tiêu chí nghiệm thu
- Giao diện không bị status bar che, không tràn ngang ở 320–430px.
- `main` được chọn mặc định; commit message vẫn lấy đúng tên ZIP.
- `npm test` và `npm run build` chạy thành công trên CI/Vercel.
- Không tự retry commit; mọi trạng thái unconfirmed có hành động xác minh rõ ràng.
