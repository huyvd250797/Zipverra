# Zipverra v1.6.0 — Release Validation

**Build date:** 2026-10-13

## Executed in packaging environment

- `npm test`: **73/73 tests passed**, including safe rollback and GitHub mocked API failure cases.
- TypeScript syntax parser checked **43 JS/JSX/MJS modules**: 0 parse errors.
- ZIP to be verified after packaging.
- History/Compare/Rollback route paths checked; GitHub App OAuth, Push, PWA remain from v1.5.1.

## Not yet verified

- `npm install` returned `EAI_AGAIN` contacting `registry.npmjs.org`. Dependencies were not installed; `next build` **could not be run** here.
- No authenticated live GitHub App E2E rollback or private repository test was performed; the tests use mocked GitHub responses.
- No real iPhone WebKit PWA manual tests performed. Mobile layout and safe-area behavior require device validation.

## Required before production use

1. Deploy to Vercel; inspect `next build` output and runtime logs for API routes.
2. Validate GitHub App env vars (`APP_URL`, `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `GITHUB_APP_SLUG`, `SESSION_SECRET`). Existing v1.5.1 variables remain compatible; do not commit secret values.
3. Run complete rollback E2E on a noncritical sandbox branch, including branch protection and Workflows permissions.
4. Inspect the exact list of files on preview; rollback restores **entire historical Git tree**, not a single commit.
5. Only then use rollback on important repositories. GitHub branch protection may require a manual PR.

See `QA_NOTES.md` for detailed test procedures and `ROADMAP_NEXT.md` for v1.7.0.
