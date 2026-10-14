# Zipverra v1.11.0 — Release Validation

Release date: 2026-10-14 · Source baseline: v1.9.0

## Automated checks

- `npm test`: **131/131 passed** (original v1.9.0 regression tests plus 18 dedicated Branch/PR tests).
- TypeScript transpile/parser syntax check for JSX/JS/MJS, verify relative import paths.
- `npm run build`: **not independently confirmed** if npm registry unavailable; must confirm in Vercel Build Logs.
- Live GitHub App / GitHub API, branch-protection, required reviews, merge and PWA E2E: **not run with production credentials**.

## Acceptance scenarios

1. GitHub App: grant Pull requests Read/Write, approve installation changes; confirm Direct Push still works without PR permission.
2. Preview PR source ZIP, create branch from exact reviewed main HEAD and verify only that branch is modified.
3. Move `main` HEAD after ZIP Review, expect 409 and no release branch created.
4. PR branch already exists, expect 409 and no force or overwrite.
5. Simulate GitHub timeout immediately after successful PR POST; recovery should find original PR without creating a duplicate.
6. Disconnect network after branch push but before PR response, reload PWA, then Activity → Kiểm tra / Tạo PR.
7. Reject merge when SHA stale, PR draft/closed, checks not clean, or confirmation not `MERGE`.
8. When merge succeeds, verify target branch HEAD on GitHub; do not claim PR creation automatically merges.
9. Run ZIP Push/History/Rollback/Quick Edit regression tests on a disposable repo.
10. Confirm no Vercel API Token and no v1.8.0 Deployment Tracking paths or dependencies.
