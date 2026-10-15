# Zipverra Pro v3.8.2 — Security Warning Confirmation

## Các trường hợp được phép tiếp tục sau xác nhận

Trong **Upload ZIP → Analyze → Review → Direct Push / Create PR**, Security Scan phát hiện Critical, tên file nhạy cảm (`.npmrc`, `.env`, `.pem`, v.v.) hoặc credential nghi vấn sẽ **cảnh báo thay vì chặn tuyệt đối**.

1. Hiển thị modal tự động khi phân tích ZIP xong: **Không, kiểm tra lại** / **Có, tôi hiểu rủi ro · Tiếp tục**.
2. **Không**: giữ Push/PR bị vô hiệu hóa với các file nhạy cảm. Có thể bỏ chọn chúng hoặc xem lại cảnh báo.
3. **Có**: chấp nhận rủi ro **chỉ với file đang được chọn**, tiếp tục Review. Vẫn phải đánh dấu xác nhận Commit/PR, và xác nhận Sync-delete độc lập nếu có.
4. Server tiếp tục quét lại từng blob, yêu cầu `allowSensitiveUpload` và xác nhận tại Commit `allowSensitiveCommit`, chữ ký HMAC ràng buộc blob/path/repo/user và thời hạn; không tự động đẩy source.
5. Khi thay đổi ZIP/repo/branch/selection/strategy/mode: xóa xác nhận rủi ro và xác nhận Push.

## Không thể bỏ qua

- ZIP chứa đường dẫn traversal/tuyệt đối, `.git`, symlink hoặc đối tượng Git không hỗ trợ, ZIP lỗi hoặc vượt giới hạn.
- Hết quyền GitHub App, repo/branch không hợp lệ, branch protection, GitHub Push Protection, required checks.
- Mất kết nối, đang có commit/PR chưa xác minh, không có thay đổi, Sync delete chưa được xác nhận, Git server error.
- Quick Edit / Workspace và Rollback giữ bảo vệ riêng, không bị mở khóa bởi consent của ZIP Review.

## Chú ý bootstrapping từ v3.8.0

Bản cũ v3.8.0 vẫn chặn Critical vô điều kiện khi bạn chưa deploy hotfix. Để upload chính source Zipverra v3.8.2 qua v3.8.0, một fixture mô phỏng private key trong `tests/source-security.test.js` đã được sửa để *không chứa toàn bộ private key header dạng nguyên văn trên đĩa*. Bài test vẫn ghép header tại runtime và đảm bảo scanner nhận diện.

Trong trường hợp GitHub thực tế từ chối PR hoặc Push bởi push protection, phải chỉnh source/revoke secret theo chỉ dẫn GitHub; app không thể ghi đè chính sách GitHub.

## QA

- `npm test`: 310/310 PASS.
- Quét lại toàn bộ file source dự kiến phát hành bằng scanner nội bộ: 0 Critical.
- JSX static syntax check được chạy riêng.
- `next build` chưa xác nhận được tại môi trường đóng gói vì thiếu dependency offline; cần xác minh trên Vercel/CI.
- Chưa chạy GitHub App E2E và Safari iPhone thực.
