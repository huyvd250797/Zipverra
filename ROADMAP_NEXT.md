# Zipverra v1.5.0 — GitHub App Authentication (phiên bản tiếp theo)

## Mục tiêu
Chuyển ứng dụng từ OAuth App sử dụng scope `repo workflow` rộng sang GitHub App có thể cài riêng cho các repository được cho phép. Luồng ZIP → preview → commit → verify phải giữ nguyên.

## Hạng mục xây dựng
1. GitHub App registration và installation onboarding trên iPhone; phân biệt tài khoản người dùng với installation.
2. Đăng nhập an toàn và callback GitHub App; xác minh state, tránh CSRF; server lưu bí mật và quản lý installation token ngắn hạn.
3. Permissions tối thiểu: Metadata (read), Contents (read/write), Workflows (write khi thực sự cần); cảnh báo khi installation không cấp quyền sửa workflow.
4. Danh sách repository chỉ bao gồm repository trong installation; hỗ trợ organization policy.
5. Migration không gián đoạn: OAuth App hiện tại chỉ tắt sau khi login+push qua GitHub App được xác minh.
6. Tests: repo public/private, access denied, token expiry/refresh, branch protection, GitHub actions files, 404/403 diagnostics, GitHub Commit verification.
7. Không lưu token trình duyệt; không đưa secrets vào source/ZIP.

## Tiêu chí nghiệm thu
- Chủ tài khoản có thể chọn repository được Zipverra truy cập, thay vì mở quyền toàn bộ repository như OAuth App cũ.
- Các thao tác upload blob, create tree, create commit, verify hoạt động trên repo đã cài app.
- Các repo không được cấp quyền bị từ chối rõ ràng; UI giải thích cách cấp thêm quyền.
- E2E kiểm thử trên repo thử nghiệm và Next.js production build được xác nhận trước khi phát hành.

## Sau v1.5.0
- v1.6.0 History & Safe Rollback.
- v1.7.0 Advanced ZIP & Large Source.
- v1.8.0 Vercel Deployment Tracking.
- v1.9.0 Repository Workspace.
