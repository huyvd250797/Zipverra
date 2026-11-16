# Zipverra Pro v3.9.18 — QA Checklist

## Build & setup
- [ ] Vercel Preview `npm install` + `npm run build` thành công với `workflow` 5 và `withWorkflow`.
- [ ] Fluid Compute bật; Workflow steps hiển thị trong Vercel Observability.
- [ ] Cấu hình GitHub App / SESSION_SECRET giữ nguyên; không đưa secrets lên client.

## iPhone / PWA
- [ ] Chọn ZIP, Review, xác nhận đủ Critical, Project Mismatch, Sync.
- [ ] Khi **đang Upload Git blobs**, khóa iPhone: app **không** được báo “Push hoàn tất”; checkpoint/recovery an toàn.
- [ ] Khi đã hiện **“Server đã nhận job Push”**, chuyển app/khóa màn hình 1–3 phút, mở lại Activity: trạng thái hoàn tất hoặc còn chạy và không tạo commit trùng.
- [ ] Sau job Direct Push: SHA trùng HEAD GitHub, Activity ghi nhận 1 lần.
- [ ] Sau job PR: branch đúng, PR đúng; nếu timeout thì chỉ Read/Recover PR chứ không Push lại.
- [ ] Mở lại PWA từ icon khi sessionStorage mất: Local job receipt + recovery manifest được nhận dạng đúng tài khoản.
- [ ] Đăng nhập GitHub tài khoản khác: không truy vấn được job của tài khoản cũ.
- [ ] Mạng mất sau khi server nhận job: job vẫn tiếp tục; khi mở lại online sẽ kiểm tra status.
- [ ] Server có trạng thái `unconfirmed`/`failed`: giao diện giữ Recovery, không tự retry mutation.

## Regression
- [ ] Upload ZIP có file 0 byte, có/nhiều wrapper: metadata/CRC đúng.
- [ ] ZIP > 3 MB: kiểm tra cảnh báo Private Blob cấu hình trước Push.
- [ ] Mobile 4 tab và PC không đổi cấu trúc, Progress Upload vẫn có.
- [ ] Repo ranking chỉ lên đầu sau Commit đã được GitHub xác minh.
- [ ] Không có nút Push khả dụng khi job còn đang chạy.
