# QA — Zipverra v1.12.0

Add these checks to the existing v1.9.0 regression suite:

- [ ] Direct Push (default) on writable branch unchanged.
- [ ] PR workflow requires manual GitHub App Pull requests Write grant and installation reapproval.
- [ ] Unique source branch created from reviewed base HEAD, no force-push.
- [ ] Refusal on changed base or pre-existing branch; no accidental push into main.
- [ ] PR opened with expected HEAD SHA and base; no automatic merge.
- [ ] Ambiguous PR network result reconciled by lookup; Activity recovery survives PWA reload.
- [ ] Merge requires typed MERGE, exact PR source SHA, mergeable clean and GitHub policy enforcement.
- [ ] PR manager remains collapsed by default in Repos; no extra bottom navigation tab.
- [ ] Activity clearly shows branch pushed vs PR opened vs merged.
- [ ] Mobile safe-area, dark/light contrast, accessible touch controls.
- [ ] npm run build and real GitHub App smoke tests before production usage.

# QA Notes — Zipverra v1.9.0

- Added Repository Explorer & Quick Edit without modifying the 5-tab mobile ZIP Push flow.
- One-file UTF-8 editing with HMAC preview, HEAD/file SHA checks, GitHub Contents API conditional update, and workflow permission check.
- Tested signed proof tamper/expiry/identity binding, concurrent HEAD changes, text-size caps, unsafe paths, branch protection, Search and read-only File History.
- **113/113 unit tests passed**. Parser check, ZIP integrity and import graph are validated separately.
- `next build` NOT verified locally (npm registry DNS EAI_AGAIN); requires successful build on Vercel.
- Test with a disposable repository before `main`, including omitted Sync deletes and stale-HEAD prevention.
- The analyzer is heuristic and **not** a complete secrets scanner; full security analysis is in v1.10.0.
- Activity throughput and ETA are estimates and reset each push; they are not guarantees.
- In-app GitHub blob previews are read-only, UTF-8, max 64 KiB/side; protect private repositories and avoid sharing screenshots of sensitive source.

# QA & Deployment Checklist — Zipverra v1.7.0

## Before deploying

- [ ] `npm install`, `npm test`, `npm run build` passed on CI/Vercel.
- [ ] APP_URL matches production origin and GitHub App Callback URL exactly.
- [ ] GitHub App ID is **not** used instead of Client ID; Client ID starts with `Iv` (for example `Iv23...` or legacy `Iv1...`).
- [ ] GitHub App settings: request authorization during installation disabled, token expiration enabled.
- [ ] GitHub App Contents `Read & write`, Metadata `Read`, Workflows `Read & write` if editing workflow files.
- [ ] New env vars `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `GITHUB_APP_SLUG`, `SESSION_SECRET`, `APP_URL` are configured for production.
- [ ] No real `.env.local` or token committed.
- [ ] Old v1.4.0 OAuth session appropriately forces re-login once.

## Manual E2E checks on sandbox repository

1. Login through GitHub App → identity loads in UI.
2. With **no installed repo**, list is empty; Install / Manage GitHub App opens correct GitHub install page.
3. Install to one repo → Refresh shows exactly selected writable repo; other private repos are not leaked.
4. On organization repository, owner/admin grants installation → account can select repo if user has Write permission.
5. Upload a small ZIP → preview matches repository → Commit & Push → Verify reports correct SHA and link.
6. Add `.github/workflows/ci.yml` → success if Workflows: write granted; otherwise preflight denies with clear message.
7. Switch to read-only user → repo is not listed or preflight denies.
8. Pull permission or uninstall app → future requests deny, no new commits.
9. Force near-expired token in test environment → refresh and new cookie; ensure no token appears in UI/HTML/API response/logs.
10. Test Sync deletion confirmation, stale HEAD, branch protected, offline network and Verify Push journal.
11. Open on iPhone Safari and installed PWA: splash, status bar safe area, no horizontal overflow, tabs Repos/Upload/Activity/History/Settings.
12. Review GitHub App authorization in GitHub Settings → Applications; logout clears Zipverra session.

## Testing limitations

- Node built-in unit tests cover business logic and mocked GitHub API. They **do not** prove the live GitHub app is installed/authorized or Vercel production build succeeds.
- Refresh token singleflight currently works in one running Function instance; multi-instance atomic refresh needs a central session store in a future version. Under races, re-login may be required.
- Branch rules, organization policies, and permission changes need live GitHub integration tests.


## v1.6.0 — History & Rollback E2E (cần chạy trên GitHub sandbox)

1. Install GitHub App trên repo thử nghiệm, cấp Contents write; Workflows write khi cần.
2. Tạo ba commit thử nghiệm A → B → C trên branch riêng có thể push; mở History và xác nhận message/SHA/ngày tác giả khớp GitHub.
3. So sánh A và C, kiểm tra số file added/modified/deleted; thử commit có executable bit.
4. Preview rollback về A, kiểm tra warning về việc xóa/sửa file và proof thời hạn 10 phút.
5. Nhập sai mã xác nhận `ROLLBACK`, đảm bảo nút mutation vẫn disabled.
6. Sau preview, tạo commit D trên GitHub → rollback phải bị chặn `ROLLBACK_STALE_HEAD`, không cập nhật branch.
7. Refresh preview khi HEAD thay đổi, xác nhận, thực thi rollback → GitHub phải có một commit mới, parent chính là HEAD trước đó, tree SHA bằng commit A; không có force-push.
8. Bật branch protection/ruleset → rollback phải từ chối quyền, không làm lệch HEAD; tạo Pull Request bằng GitHub thủ công nếu cần.
9. Thử repo có `.github/workflows/ci.yml` bị thay đổi khi quyền Workflows chỉ read → preview phải từ chối trước mutation.
10. Giả lập mạng mất sau PATCH → dùng History → Xác minh rollback để phát hiện đúng trạng thái; không tạo thêm commit.
11. Thử symlink, submodule, `.env.production`, hơn 2.500 thay đổi hoặc Git tree bị truncated → không được rollback.
12. Kiểm thử iPhone PWA độc lập: đồng hồ/Dynamic Island không che UI, tab History hiển thị trên màn hình 320/375/390/430 px, scrolling/diff không tràn ngang; Light/Dark.

Rollback v1.6.0 khôi phục **toàn bộ tree của commit cũ** chứ không chỉ revert một commit. Phải sao lưu trạng thái source quan trọng và đánh giá database migrations trước khi xác nhận.


## v1.7.0 — Advanced ZIP / Flow E2E (cần thực hiện trên Vercel + iPhone thật)

1. Mở PWA mới, mặc định **Repos**. Chọn một repo được phép ghi → tự chuyển **Upload**; chưa chọn repo không được chọn file ZIP.
2. Chọn repo B sau repo A đã gắn ZIP → ZIP cũ bị xóa, mode trở về Merge; không push nhầm A sang B.
3. Phân tích ZIP hợp lệ, xác nhận Commit & Push → **Activity** phải xuất hiện ngay khi bắt đầu gửi blob; hiển thị 4 bước và batch progress.
4. Thử Sync có file xóa → ngoài tick thường phải xác nhận riêng số file xóa.
5. Kiểm tra **Settings** chứa GitHub Account & App Access, nút Manage App, Refresh, Logout; Repos không chứa bảng installation dài.
6. ZIP đến 80 MiB (số file <= 2.500, mỗi file <= 2,5 MB), giải nén tổng <= 160 MiB; so sánh kết quả GitHub bằng SHA.
7. ZIP 81 MiB, file > 2,5 MB, quá 2.500 file, archive traversal, symlink, `.env.local` và ZIP bomb phải bị chặn rõ lý do.
8. Ngắt Wi-Fi khi upload blob; hoạt động lại, chọn lại cùng ZIP/repo, phân tích lại; kiểm tra file blob đã xác thực SHA được bỏ qua và không duplicate commit.
9. Thử HEAD thay đổi kể từ checkpoint → không áp dụng checkpoint cũ, phải tạo preview theo HEAD mới.
10. Giả lập offline **sau mutation** → Activity hiển thị trạng thái chưa xác minh và nút xác minh, không tự commit lại.
11. Kiểm tra iPhone PWA standalone: safe area, thanh Home, cỡ màn 320/375/390/430; chuyển tab và loading không tràn ngang; Light/Dark.
12. History và Safe Rollback cũ không hồi quy; không force-push; branch protection/Workflows permissions được giữ.

Không có multipart upload cho file đơn > 2,5 MB trong bản này. Giới hạn tăng của ZIP là dung lượng **tổng** do phân chia theo file.


## v1.12.0 security validation checklist

- [ ] GitHub App user token vẫn lưu server-side/session cookie; không có secrets trong log hay response.
- [ ] ZIP có token giả => Critical và không gọi GitHub API upload blob.
- [ ] API commit trực tiếp không có chứng nhận file => chặn trước GitHub mutation.
- [ ] Proof giả/tamper/different session/path/repo/SHA/expired => chặn.
- [ ] Upload resume bị hết hạn proof => phải upload lại.
- [ ] Warning config/assignment được hiển thị, không tiết lộ đoạn chứa password.
- [ ] Quick Edit preview/save đều chặn secret Critical.
- [ ] File bị loại khỏi Review không thành lệnh xóa, kể cả Sync.
- [ ] ZIP path traversal, symlink, ZIP bomb, duplicate path, binary và false-positive tests.
- [ ] `npm run build` production và E2E với repo test sau deploy (chưa xác minh ở môi trường tạo source).
