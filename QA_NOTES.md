# QA & Deployment Checklist — Zipverra v1.5.0

## Before deploying

- [ ] `npm install`, `npm test`, `npm run build` passed on CI/Vercel.
- [ ] APP_URL matches production origin and GitHub App Callback URL exactly.
- [ ] GitHub App ID is **not** used instead of Client ID; Client ID starts `Iv1.`.
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
