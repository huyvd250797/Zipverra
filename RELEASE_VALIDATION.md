# Zipverra v1.12.0 — Release Validation

Release date: 2026-10-14 · Source baseline: v1.11.0

## Automated checks

- `npm test`: **143/143 passed** (v1.11.0 regression tests plus 12 dedicated source-security and Quick Edit security tests).
- TypeScript transpile/parser syntax check for JSX/JS/MJS, verify relative import paths (see final QA checks).
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


## Security v1.12.0

- Source validation: `lib/source-security.js` (shared Web Worker/browser/server), `lib/source-security-server.js` (HMAC-proof enforcement).
- Upload gate: `app/api/github/blob/route.js`; Commit gate: `app/api/github/commit/route.js`.
- Quick Edit preview & save gate: `lib/workspace.js`.
- Tests: `tests/source-security.test.js` plus all previous regression tests.
- `next build` cannot be confirmed in this packaging environment if npm registry unavailable; GitHub Actions CI remains configured to execute it.
