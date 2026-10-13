# Zipverra Product Roadmap — After v1.9.0

**Current baseline:** v1.9.0 — Repository Explorer & Quick Edit (2026-10-14).

## v1.10.0 — Security & Smart Source Validation (next)

- Phát hiện secrets và credentials trong **nội dung source**, không chỉ tên file; phân loại tín hiệu theo mức độ tin cậy, chặn mặc định khi đáng tin cậy cao.
- Bổ sung bảo vệ ZIP traversal, symlink, ZIP bombs, file cấu hình và kiểm tra nội dung khác nhau (Next.js/Vite/React).
- Preflight an toàn trên ZIP Push **và Workspace Quick Edit**: branch rules, đường dẫn nhạy cảm, workflow, secrets detection không để lộ dữ liệu.
- Security review theo file, lý do chặn rõ ràng, cơ chế loại trừ file thay vì vô tình push.
- Các kiểm thử bắt buộc: kiểm tra secrets giả lập, Zip bombs, GitHub App permissions, UI warnings, production Next build.

## v1.11.0 — Branch & Pull Request Manager

- Tạo/chọn branch, Quick Edit vào branch mới nếu `main` protected, tạo PR qua GitHub App.
- Review diff, theo dõi PR checks, không bypass protection và không force-push.
- Đưa branch workspace vào Explorer nhưng không thêm tab mobile.

## v1.12.0 — Advanced Performance & Recovery

- Large source ZIP optimization, adaptive batches, checkpoint/recovery, kiểm soát bộ nhớ iOS PWA.
- Thiết kế upload file đơn >2.5 MB không vượt Vercel Functions body limit.

## v2.0.0 — Zipverra Pro Mobile Git Workspace

- Multi-repository dashboard, protected publishing, Quick Edit, Pull Request, History/Rollback, ZIP Push.
- PWA tối ưu mobile, không tích hợp Vercel Deployment Tracking trừ khi có yêu cầu mới.
