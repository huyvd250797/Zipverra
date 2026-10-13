# Zipverra v1.8.0 — Release Validation

Release: 2026-10-13 · Based on v1.7.0

## Verified locally

- `node --test tests/*.test.js`: **96/96 passed**.
- JS/JSX syntax parsed using global TypeScript parser; 50 modules passed (record the final count in QA_NOTES if changed).
- GitHub App, Safe Rollback, Worker archive, PWA, and batch checkpoint modules preserved.
- ZIP integrity to be checked after packaging.

## Not verified

- `npm install` could not reach `registry.npmjs.org` (EAI_AGAIN); therefore **`npm run build` was not performed locally**.
- GitHub App live login, push of selected files, Vercel deploy, and Safari PWA full-device E2E require testing after deployment.

## Acceptance checklist

1. On a test branch, run `npm install`, `npm test`, `npm run build` (GitHub Actions / Vercel Build Logs).
2. Login with GitHub App; pick repo, branch `main`; verify favorites persist.
3. Analyze a ZIP with Next.js and `.github/workflows` files, confirm warnings.
4. Exclude one add/modify/delete path and push to test repo; verify the excluded path remains untouched.
5. For Sync mode, exclude a deletion; ensure it remains on GitHub after push.
6. Test text diff read on same HEAD, and stale preview detection after a concurrent commit.
7. Test Activity telemetry, completion and SHA verification, reconnect/resume, uncertain commit journal.
8. Test History + Safe Rollback to sandbox commit; never force push.
9. Verify iPhone PWA safe area, dark/light layout at 320px and larger, offline handling.
10. No additional environment variables; keep GitHub App secrets server-side.
