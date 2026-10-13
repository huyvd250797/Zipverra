# Zipverra Changelog

## v1.8.0 — Smart Push & Workflow 3.0 (2026-10-13)

- Source baseline v1.7.0. **Không có Vercel Deployment Tracking.**
- Repositories: pin favorite + ưu tiên repo gần đây; vẫn repo-first và App Access trong Settings.
- Analyzer nhận diện framework, cảnh báo file cấu hình/workflow/Sync deletion, thông tin ZIP ignored paths.
- Review: tìm file, chọn/bỏ chọn từng thay đổi, chọn tất cả, view text diff với HEAD SHA guard.
- Sync bảo toàn file bỏ chọn; chỉ gửi file đã chọn đến backend, checkpoint hash tính lại theo tập thay đổi được chọn.
- Activity: tiến độ upload blob theo file và byte, batch, estimated throughput/ETA; giữ Verify Push/Recovery.
- Read-only endpoint `api/github/text`, kiểm tra quyền GitHub App và tránh lộ file lớn/nhị phân.
- Automated tests: 96/96 đạt; parser JS/JSX, relative imports và ZIP integrity kiểm tra riêng. Production build/E2E cần xác minh trên Vercel vì không truy cập npm registry ở môi trường đóng gói.


## v1.7.0 — Advanced ZIP & Repo-first Mobile Flow (2026-10-13)

- **Repo-first mobile:** Repos mặc định → chọn repo (main) → Upload ZIP → Phân tích/Preview → Xác nhận & Push → tự mở Activity.
- Di chuyển GitHub Account & App Access, Install/Manage và Logout vào Settings; Repos chỉ còn thao tác chính, repo gần đây lọc theo quyền được cấp; thay repo xóa ZIP đã chọn và reset Merge.
- Bỏ đoạn giới thiệu dài theo yêu cầu; giữ slogan ngắn Push to GitHub. From Your Phone.
- Worker giải nén ZIP + Git SHA-1 ngoài UI thread, transfer buffers; fallback lazy-load khi Worker không có.
- Giới hạn tổng: 80 MiB ZIP, 160 MiB unpacked, 2.500 file/commit, 12.000 file snapshot; 2,5 MB một file theo Vercel API body.
- Upload blobs thành batch 12, concurrency 2, progress trên Activity; checkpoint metadata trong localStorage 24 giờ, SHA-256 manifest ràng buộc repo/HEAD/mode/content; reselect ZIP để tiếp tục sau lỗi trước commit.
- Giữ GitHub App user auth, Push Verify và Safe Rollback; không tự retry mutation commit.
- Unit tests bổ sung cho batch/recovery/worker/UX; production build và E2E GitHub cần chạy khi deploy.


## v1.6.0 — History & Safe Rollback (2026-10-13)

- Thêm tab History cho PWA: liệt kê commit, SHA, tác giả, thời gian, phân trang 20/trang và link GitHub.
- So sánh hai Git trees đầy đủ, xem file Thêm/Sửa/Xóa.
- Preview rollback signed HMAC (10 phút), kiểm tra commit đích là tổ tiên branch, HEAD guard và cấp quyền workflow.
- Tạo commit khôi phục trỏ đến tree cũ với parent là HEAD hiện tại; cập nhật branch `force:false` và xác minh commit SHA. Không reset, force-push hoặc viết lại lịch sử.
- Journal phục hồi sessionStorage + Verify rollback chỉ đọc, không tạo thêm commit nếu mạng chập chờn.
- Chặn rollback nhạy cảm (env secrets, key files), symlink/submodule, >1.200 thay đổi và GitHub truncated tree.
- Giữ nguyên GitHub App Authentication v1.5.1, ZIP upload, Merge/Sync, push recovery, PWA safe area và light/dark.
- Node unit tests 73/73 đạt; chưa xác minh Next production build hay E2E GitHub thật tại môi trường đóng gói.


## v1.5.1 — GitHub App Client ID compatibility hotfix (2026-10-13)

- Chấp nhận GitHub App Client ID mới dạng `Iv23...` không có dấu chấm, ngoài dạng cũ `Iv1...`.
- Phân biệt biến env sai/thiếu và lỗi `APP_URL` trước khi redirect OAuth.
- Lỗi đăng nhập không bao giờ hiển thị secret hay giá trị credential.
- Giữ nguyên GitHub App permissions, PWA và Git push.


## v1.5.0 — GitHub App Authentication (2026-10-13)

- Thay OAuth App scopes `repo workflow` bằng GitHub App user-to-server flow với OAuth `state` + `offline_access`.
- GitHub App install/manage URL và danh sách repository bị giới hạn theo người dùng + App installation; hỗ trợ owner/organization.
- Preflight Contents: write, Workflows: write, user push rights và revalidate tại commit.
- Phiên cookie AES-256-GCM v2 chứa access + refresh token; token rotation và singleflight best-effort.
- Giữ Mobile UX/UI 2.0, push recovery, Merge/Sync, PWA.
- Cấu hình Vercel mới và tài liệu migrate.

## v1.4.0 — Mobile UX/UI 2.0 (2026-10-13)

### Added
- Mobile-first bottom navigation: Home, Repos, Activity, Settings. Views keep shared GitHub/ZIP state while switching.
- Quick repo target card on Home and return-to-upload CTA on Repos.
- Client-side repository search, loading skeleton, and up to five recent repo names saved locally.
- A four-stage push timeline (Validate, Upload, Commit, Verify), with uncertain state distinguished from success.
- Error/progress shortcut when another mobile tab is active, plus recovery alert.
- Preview filters: All, Added, Modified, Deleted.
- Separate explicit consent for Sync deletions.
- Light/Dark display preference and reduced-motion support.
- Scroll into preview after analyze on mobile, with reduced-motion respected.

### Preserved
- GitHub OAuth (server-side encrypted HttpOnly session).
- ZIP commit message = filename without `.zip`.
- Default branch `main`, Merge/Sync, source guardrails, binary blob upload.
- Commit verification and cautious recovery from v1.3.4. No blind retry of ambiguous commit mutations.
- PWA safe area, splash and zoom lock from v1.3.3.

### Verification
- 52/52 automated unit tests passed.
- JSX checked by TypeScript parser/transpiler.
- Chromium static CSS/layout harness at 320, 375, 390, 430, 768 and 1280 px: no horizontal overflow in fixture.
- Next.js production build and live GitHub E2E push NOT verified in packaging environment: npm registry DNS unavailable.

## v1.3.4 — Push Reliability & Error Recovery
- Safe API retries, verification, recovery journal, and network state handling.
