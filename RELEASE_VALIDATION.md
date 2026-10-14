# Zipverra Pro v2.0.0 — Release Validation

- Source baseline: v1.12.0 provided by the user.
- Local regression and Pro suite: **154/154 tests passed**.
- JS/JSX/MJS parser and relative import checks passed (separate commands).
- Production Next.js build and GitHub E2E: not verified due to npm registry DNS outage; Vercel CI must pass before describing the deployment as production-validated.
- New REST endpoint: `/api/github/dashboard` is authenticated, origin-checked, read-only, and bounded to five GitHub App authorized repositories.
- Zero new environment variables, no new dependencies and no database added.
- Repository selection, upload security, PR, History, Rollback and GitHub App auth remain in source.

## Test before publishing to production

1. Install dependencies and run `npm test` and `npm run build` on Vercel or trusted CI.
2. Smoke-test GitHub App login and Dashboard on a disposable public/private test repository.
3. Exercise direct push, Pull Request branch, manual Merge and recovery flows.
4. Test profile application, stale preview reset, account switching and local activity on iPhone.
5. Confirm Android/iPhone safe areas, 320/375/390/430 px mobile layouts, and dark/light modes.

See `README.md`, `QA_NOTES.md` and `ROADMAP_NEXT.md` for full details.
