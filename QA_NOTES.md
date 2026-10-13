# QA & Deployment Checklist — Zipverra v1.6.0

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
11. Open on iPhone Safari and installed PWA: splash, status bar safe area, no horizontal overflow, tabs Home/Repos/Activity/Settings.
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
11. Thử symlink, submodule, `.env.production`, hơn 1.200 thay đổi hoặc Git tree bị truncated → không được rollback.
12. Kiểm thử iPhone PWA độc lập: đồng hồ/Dynamic Island không che UI, tab History hiển thị trên màn hình 320/375/390/430 px, scrolling/diff không tràn ngang; Light/Dark.

Rollback v1.6.0 khôi phục **toàn bộ tree của commit cũ** chứ không chỉ revert một commit. Phải sao lưu trạng thái source quan trọng và đánh giá database migrations trước khi xác nhận.
