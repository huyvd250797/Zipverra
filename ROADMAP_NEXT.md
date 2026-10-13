# Next release — Zipverra v1.6.0: History & Safe Rollback

## Product goal

Sau khi v1.5.0 giới hạn truy cập thông qua GitHub App, v1.6.0 sẽ cung cấp khả năng **xem lịch sử commit/push và khôi phục phiên bản có kiểm soát ngay trên iPhone**. Không cần biết lệnh Git.

## Planned modules

1. **Push History:** truy vấn lịch sử GitHub của repo/branch đã cấp quyền, hiển thị commit message, SHA, tác giả, thời gian và link mở GitHub.
2. **Compare Versions:** so sánh commit được chọn với HEAD hiện tại, hiển thị danh sách file thêm/sửa/xóa.
3. **Safe Rollback:** tạo commit đảo thay đổi hoặc PR khôi phục; **không force-push**, không ghi đè lịch sử `main` và không mặc định xóa nhầm commit của cộng tác viên.
4. **Rollback Preflight:** xác minh HEAD chưa thay đổi, branch rules và xác nhận tác động của thay đổi; nếu là commit merge hoặc có conflict, chuyển sang hướng dẫn PR thủ công.
5. **Mobile UX:** timeline lịch sử, bộ lọc commit Zipverra, xem diff trên điện thoại, chọn commit mục tiêu và xác nhận 2 bước.
6. **Recovery/E2E:** verify SHA sau khôi phục, test concurrency, test branch protection và private repositories.

## Security / architecture

- Dùng GitHub App user token hiện tại, không yêu cầu thêm quyền ngoài Contents: read/write cho rollback thông thường.
- Chưa cần database nếu chỉ đọc lịch sử GitHub; có thể ghi metadata commit vào sessionStorage mà không chứa token.
- Lưu rõ phân biệt `Revert a commit` và `Restore repository tree at a prior commit` vì phạm vi và tác động khác nhau.

## Acceptance criteria

- Có thể xem ít nhất 30 commit gần nhất trên repo người dùng được phép truy cập.
- Không rollback nếu HEAD đã đổi sau preview.
- Không có thao tác force-push/force-reset qua app.
- Hỗ trợ preview thay đổi và khôi phục an toàn trên màn hình 320–430 px.
- `npm test`, `npm run build`, cùng kiểm thử GitHub repository sandbox đều đạt trước khi phát hành.

**After v1.6.0:** v1.7.0 — Advanced ZIP & Large Source.
