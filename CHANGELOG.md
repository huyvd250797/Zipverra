# Changelog

## v3.0.0 — Stable Release (2026-10-14)

- Promoted Zipverra Pro to a Stable Release baseline after preserving all previously implemented GitHub App, Security Validation, rollback and recovery protections.
- Removed the large Connected / Refresh status bar from the repository selection area on mobile to reduce UI clutter.
- Introduced compact repository status controls in the top-right Repositories header: a connected check icon and a refresh icon button.
- Fixed the iPhone skip-link visual glitch; the accessibility shortcut is now fully hidden by default and appears only on proper keyboard/accessibility focus.
- Updated in-app version strings, offline shell version, PWA public cache namespace and regression expectations to v3.0.0.
- Regression suite passes 222/222 local tests in the packaging environment.
- Build, live GitHub App E2E and real-device production validation should still be completed after deployment.

## v2.9.0 — Production Hardening (2026-10-14)

- Fixed the iPhone Activity tab after Push retaining the previous long-screen scroll position; scroll now occurs after React tab commit, plus a second Safari correction frame.
- Ordered live operation progress ahead of Recovery Center/Recent Actions on Activity.
- Added a bounded 4 MiB streamed GitHub JSON request parser and safe 400/413 error handling.
- Added baseline security response headers, disabled X-Powered-By and created safe error/404 pages.
- Added production-hardening unit tests, refreshed PWA version and Service Worker public cache namespace.
- Continued using the same GitHub App permissions/credentials and previous safety protocols; no new env vars.
- Build, device E2E and live GitHub integration still require networked CI/production validation.


## v2.8.0 — Advanced UX Polish (2026-10-14)

- Direct upgrade from v2.6.0; v2.7.0 features were not included.
- Added Workspace Launchpad, actionable empty states, Review Readiness and confirmed outcome card with copyable SHA.
- Added Dark / Light / System appearance preference, responsive/keyboard/accessibility refinement.
- Preserved all GitHub mutations, authorization checks, Security Scan, rollback and recovery protocols.
- Bumped PWA offline public cache to v2.8.0; no new env vars.

## v2.6.0 — PWA Optimization & Reliability (2026-10-14)

- Introduced an opt-in service worker with public offline shell/icons only; GitHub/auth/API/private HTML/source are never cached by the service worker.
- Added no-store `/api/version` for update and network reachability checks, and a manual update prompt that is locked during mutation, unsaved editing and unresolved recovery journals.
- Added lifecycle handling for foreground/background return and session revalidation without force reload or automatic GitHub writes.
- Added Recovery Center for user-initiated Push verification, PR check/create and History-based Rollback verification, authorized-repo-only.
- Reduced splash screen waiting and added responsive offline/update/recovery states.
- Added regression tests for caching boundaries, version API, safety guards and offline behavior; no new GitHub mutation endpoint or environment variable.

## v2.5.0 — Workspace UX & Navigation (2026-10-14)

- Reorganized Workspace into four explicit file views (Code / Edit / Review / History), with a line-numbered code viewer and mobile indentation toolbar.
- Improved Explorer with horizontally scrollable breadcrumbs, alphabetical directory-first sorting, local folder pins and consolidated search.
- Added navigation protection for unsaved Quick Edit content when leaving Workspace, changing branch/repo, applying profiles or logging out. Tab switches preserve the draft in memory; identity changes explicitly discard after user confirmation.
- Added separate Branches / Pull Requests tabs within the existing expandable manager and a local filter for already-fetched History commits.
- New semantic `lib/workspace-ux.js` helpers and scoped responsive stylesheet; backend mutation routes, signed preview, GitHub authorization and safe recovery unchanged.
- Added 9 Workspace UX regression tests. Next production build and real-device QA still required; npm registry DNS is unavailable in packaging environment.

## v2.4.0 — Premium Interaction & Motion (2026-10-14)

- Added shared `pro-motion.css` motion tokens with subtle tab enter, tactile tap feedback, and connected stepper movement without changing workflow state.
- Added one-at-a-time, dismissible, accessible toast notifications sourced only from fixed non-sensitive messages. Push and PR success require GitHub verification.
- Added reusable skeleton placeholders for loading repositories, session, ZIP analysis and dynamically imported GitHub panels.
- Reduced-motion rules remove nonessential animation and shimmer; desktop Activity scroll now respects device accessibility preferences.
- Added automated interaction/motion regression tests; preserved ZIP Push, PR, Quick Edit, Security Scan, History, Rollback and Push Profiles.
- Known QA limitations: npm registry DNS prevents local `next build`; headless Chromium times out in this environment, so actual mobile device testing remains required.

## v2.3.0 — Smart Workflow UX 4.0 (2026-10-14)

- Automatic ZIP analysis after selection; remains read-only until explicit Review confirmation and Push.
- Reduced Upload screen vertical clutter and consolidated advanced Merge/Sync and Direct Push/PR options.
- Guided Review navigation and actionable verified-success shortcut to push another ZIP on the same repo.
- Code-split optional Workspace/History/PR modules, memoized review filtering and coalesced progress rendering.
- Retained GitHub App authorization, signed blob security attestations, safe commit verification and rollback invariants.
- New workflow UX tests and viewport screenshots for a **static layout fixture** (not Next/Vercel E2E).

# Zipverra Changelog

## v2.1.0 — Professional UI Design System (2026-10-14)

- Migrated app chrome to semantic, shared light/dark visual tokens with consistent spacing, typography, borders and interactions.
- New presentational UI primitives: WorkflowStrip, CurrentRepository, StatusIndicator, UXViewIntro and StatusEmpty.
- Refreshed repository selection, upload flow, review and activity visuals; clear actionable selected repository and status indicators.
- Five-tab mobile navigation retained; keyboard focus rings, reduced motion and safe areas reinforced.
- GitHub App authentication, Git blob upload, PR, Quick Edit, Security Scan, History and Safe Rollback not modified.
- 162/162 unit tests passed; syntax and relative-import scans passed; Next build not verified due npm DNS.


## v2.0.0 — Zipverra Pro: Mobile Git Workspace (2026-10-14)

- Pro Dashboard in Repos: quick multi-repo HEAD status with server-side GitHub App permission checks (up to five repos).
- Push Profiles per repository in Settings: branch, mode, release strategy; explicit Apply and stale-preview invalidation.
- Local Activity feed with verified ZIP pushes, PRs, merges, Safe Rollback and Quick Edit actions; filter and clear.
- Account-scoped metadata caches. No source code, tokens, Vercel tracking or new infrastructure.
- Kept original 5-tab PWA experience, GitHub App, Security Scan, ZIP Worker and History/PR features.
- Added tests for authorization, cache validation and profile safety; existing regression suite preserved.
- v1.12.0 is the source baseline. v1.13/v1.14 features are planned, not implicitly included.


## v1.12.0 — Security & Smart Source Validation (2026-10-14)

- ZIP Push và Pull Request có Security Review Critical / Warning / Information theo file được chọn; chặn Critical và giữ file bị loại trừ.
- Scanner chia sẻ logic Web Worker và server; secret high-confidence không được upload lên GitHub.
- API upload Git blob tạo HMAC attestation 1 giờ theo GitHub user/repo/path/SHA, commit kiểm tra chứng nhận trước ghi Git tree.
- Upload resume chỉ sử dụng lại checkpoint có chứng nhận quét còn hạn; bản cũ SHA-only phải upload lại.
- Quick Edit có quét ở Preview và Save, không phụ thuộc vào JavaScript giao diện.
- Giữ nguyên GitHub App Authentication, PR Manager, Git History, Safe Rollback, PWA mobile.
- Known limitations: rule-based scan, binary không được quét sâu, source đã tồn tại/rollback/PR ngoài Zipverra không được scan tự động.


## v1.11.0 — Branch & Pull Request Manager (2026-10-14)

- Based **directly on v1.9.0**; does not include planned v1.10.0 deep security scanner.
- Optional PR mode in ZIP Upload; Direct Push stays default.
- Create collision-resistant `zipverra/…` branches from exact reviewed HEAD; never force-update an existing branch.
- PR creation is idempotent through GitHub lookup, checked against verified commit SHA.
- Repos → expandable Branch & Pull Requests manager; list branches/open PRs, optional merge with typed confirmation and GitHub protection checks.
- Activity shows branch-pushed / PR-open status separately and holds a resumable PR creation journal after network failures.
- GitHub App repository `Pull requests: write` permission required for PR actions (manual reapproval), Contents/Workflows permissions unchanged.
- 5-tab mobile PWA, Quick Edit, ZIP analyzer, Smart Diff, History, Safe Rollback preserved; no Vercel Tracking.
- Unit tests: 131/131 passed; JS/JSX static parser and relative imports checked. Live GitHub PR E2E and Next production build require external verification.


## v1.9.0 — Repository Explorer & Quick Edit (2026-10-14)

- Repo-first workflow giữ nguyên; mở Workspace từ **Repos**, không thêm tab điều hướng.
- Duyệt thư mục, tìm file toàn repo giới hạn 60 kết quả, xem UTF-8 text 64 KiB với syntax highlighting cơ bản.
- Chỉnh sửa một file hiện có, review diff, xác nhận, commit qua GitHub Contents API với SHA guard.
- Preview ký HMAC (5 phút), bind GitHub user ID, repo, branch, HEAD và nội dung; chặn token bị sửa/hết hạn, branch/file SHA stale.
- Kiểm tra Workflows permission, chặn credentials, binary, symlink, submodule và source quá lớn; xác minh Git blob SHA trước khi hiển thị.
- File history ngay trong Explorer; liên kết GitHub commit; trạng thái save chưa xác minh không bị tự replay.
- Không có Vercel Deployment Tracking, không có token Vercel mới hoặc database.
- Unit tests: 113/113 đạt; responsive fixture Chromium: 320–1280 px không tràn ngang. Production build/E2E cần chạy sau triển khai do npm registry EAI_AGAIN.


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
