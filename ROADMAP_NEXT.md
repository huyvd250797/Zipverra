# Zipverra Product Roadmap — Sau v1.8.0

**Baseline:** v1.8.0 Smart Push & Workflow 3.0. Tập trung quản lý source GitHub ngay trên điện thoại. Không tích hợp Vercel Deployment Tracking.

## v1.9.0 — Repository Explorer & Quick Edit (next)

- Duyệt cây thư mục trong repository và branch được chọn (read-only first).
- Tìm file theo path, đọc code UTF-8 với syntax highlight và giới hạn dung lượng.
- Chỉnh sửa trực tiếp một file text nhỏ, xem diff và commit với xác minh HEAD, tránh ghi đè thay đổi đồng thời.
- Chế độ tạo branch để chỉnh file nếu `main` protected; cảnh báo và không bypass branch rules.
- Từ Explorer mở History để xem các phiên bản file.
- Explorer là màn hình chức năng nâng cao, không đưa vào workflow ZIP mặc định.

**DoD:** thay đổi nhỏ trên repo thử nghiệm, so sánh đúng, commit đúng SHA, giữ GitHub App Permissions và không ghi đè source khi HEAD thay đổi; unit/E2E + Next build + iPhone PWA UI.

## v1.10.0 — Security & Smart Source Validation

- Quét credential có độ tin cậy cao, phân loại/block thông minh, kiểm tra ZIP traversal/bomb và file nhạy cảm.
- Kiểm tra manifest, lockfile, branch protection, lint/check cơ bản theo loại dự án (không chạy code ZIP không tin cậy trên server).
- Cải thiện báo cáo an toàn trước push, cơ chế override có kiểm soát.

## v1.11.0 — Branch & Pull Request Manager

- Tạo/chuyển branch, push vào branch mới, xem diff và tạo PR theo GitHub App permissions.
- Không force-push và không vượt qua branch ruleset.

## v1.12.0 — Advanced Performance & Recovery

- Xử lý số file lớn hiệu quả hơn trên mobile, checkpoint theo file và quản lý RAM.
- Hỗ trợ blob >2,5 MB bằng kiến trúc upload thích hợp, đánh giá đối chiếu SHA, tránh vượt giới hạn Vercel Functions.

## v2.0.0 — Zipverra Pro Mobile Git Workspace

- Repository workspace đa dự án, History, Safe Rollback, ZIP Push, PR và các quy tắc phát hành.
- Ưu tiên trải nghiệm PWA an toàn, tối giản, chỉ thêm hạ tầng khi thực sự cần.
