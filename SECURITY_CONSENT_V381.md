# Zipverra Pro v3.8.1 — Security Consent Hotfix

## Vấn đề đã xác định

`.npmrc` bị chặn ngay từ `assertSafeContentPath` trong quá trình giải nén ZIP, trước khi giao diện Security Scan có cơ hội cảnh báo. Các tầng `calculateChanges`, server `/blob` và xác minh `/commit` cũng có cổng kiểm tra riêng.

## Hành vi sau hotfix

1. Đọc ZIP và kiểm tra tính hợp lệ, đường dẫn, symlink, số lượng file, kích thước như trước.
2. Quét và phân loại file có tên nhạy cảm, token có mẫu xác định hoặc chuỗi có vẻ là credential được gán trực tiếp. Không chuyển giá trị secret vào báo cáo.
3. Mở modal hỏi `Không, kiểm tra lại` hoặc `Có, tôi hiểu rủi ro · Tiếp tục`.
4. Chọn Không: đóng modal, giữ gate Push/PR đóng; có thể bỏ chọn file liên quan trong Review.
5. Chọn Có: mở khóa gate rủi ro cho **lựa chọn hiện tại**, vẫn phải tick xác nhận Commit/PR và Sync delete (nếu có).
6. Server quét lại từng Git blob; cần `allowSensitiveUpload` với file nhạy cảm; chữ ký HMAC bao gồm cờ sensitive, path, blob SHA, user, repo và hạn 1 giờ. Commit/PR cần `allowSensitiveCommit` và chứng nhận hợp lệ; không chấp nhận proof đã bị chỉnh sửa.
7. Đổi ZIP, repo, branch, mode, strategy hoặc lựa chọn file sẽ reset consent. Consent không được lưu lâu dài.

**Không thay đổi:** Cơ chế Quick Edit/Workspace, Rollback, bảo vệ `.git`/traversal, hạn mức ZIP, GitHub permissions, xử lý commit không rõ kết quả, PR verification.

**Lưu ý:** Đồng ý cho phép ứng dụng gửi file lên GitHub nhưng không vượt qua Push Protection của GitHub. Tốt nhất luôn loại credential thật khỏi source và rotate nếu đã từng chia sẻ.

## Verification

- `npm test`: **304/304 PASS**.
- Kiểm tra cú pháp JSX `app/page.jsx`, `PremiumWorkflow.jsx`, `ModalSheet.jsx`: **0 lỗi parse**.
- Production `next build`: **chưa chạy được trong container vì `npm install` bị timeout do giới hạn tải dependencies**; CI GitHub và Vercel cần chạy lại.
- GitHub App E2E và Safari/PWA iPhone thật: **chưa được kiểm chứng**.

## QA khi deploy

- ZIP chứa `.npmrc` với cấu hình không có token thật: phải hiển thị cảnh báo, không hiện lỗi đỏ khi đọc ZIP.
- Chọn **Không**, xác nhận Commit/Push bị chặn cho file nhạy cảm; bỏ chọn file đó thì có thể tiếp tục phần an toàn.
- Chọn **Có**, vẫn phải tick xác nhận Commit/Push/PR trước khi upload.
- Chọn file mới hoặc thay đổi lựa chọn sẽ hỏi lại nếu còn file nhạy cảm.
- GitHub App bảo vệ branch/Push Protection có thể từ chối riêng; app không được tự retry commit chưa xác minh.
