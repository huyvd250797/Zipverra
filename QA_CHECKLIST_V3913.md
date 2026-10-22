# Zipverra v3.9.13 — Checklist nghiệm thu

- [ ] Vercel Preview: `npm install`, `npm test`, `npm run build` thành công.
- [ ] PC 1366×768: ban đầu chỉ thấy Upload ở giữa; không có khung Review trống.
- [ ] PC 1920×1080: Upload không kéo dãn cả màn hình; repo, branch, ZIP rõ ràng.
- [ ] PC 900×740: không tràn ngang; sidebar icon và nút chọn ZIP vẫn dùng được.
- [ ] Chọn repo A rồi B rồi A: thứ tự **Repo thường dùng** không đổi.
- [ ] Đổi branch/áp dụng profile/phân tích ZIP: thứ tự repo không đổi.
- [ ] Phân tích ZIP xong: Upload ẩn, Review hiển thị full width, có nút **Đổi ZIP**.
- [ ] Bấm **Đổi ZIP**: file picker mở; chọn file mới buộc Review lại và reset xác nhận cũ.
- [ ] ZIP có 0 thay đổi: không thể Push, Review nêu đúng nguyên nhân.
- [ ] Phát hiện Critical, mismatch, hoặc Sync Delete: chốt an toàn vẫn bắt xác nhận riêng.
- [ ] Review file dài: chỉ vùng Review cuộn; hàng Commit/Push không che cảnh báo.
- [ ] Direct Push thành công và được GitHub xác minh: repo vừa Push lên đầu.
- [ ] PR branch được GitHub xác minh: repo lên đầu; PR có thể xác minh sau mà không tạo commit trùng.
- [ ] Push thất bại/chưa xác minh: repo **không** lên đầu trước khi xác minh.
- [ ] iPhone Safari/PWA 375×667 và 390×844: layout Upload/Review/Bottom Sheet giữ nguyên so với v3.9.9.
- [ ] Mobile/PC Dark, Light và Reduce Motion không tràn khung.
- [ ] PWA cập nhật cache lên v3.9.13, không reload khi có pending commit.
