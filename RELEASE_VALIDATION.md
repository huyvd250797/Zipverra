# Zipverra v1.7.0 — Release Validation

**Date:** 2026-10-13

## Performed during source packaging

- `npm test`: **83/83 unit tests passed**, including new worker/batch/resume/repo-first workflow checks.
- TypeScript parser validated **47 JS/JSX/MJS modules**: 0 syntax errors; relative import paths were checked: 0 missing.
- Confirmed files still include existing GitHub App auth, PWA components, History/Rollback and GitHub API routes.
- File names, branch flow and batch/resume logic reviewed.
- ZIP archive integrity and contents verified after packaging.

## Not verified in this environment

- `npm install` failed with `EAI_AGAIN` reaching `registry.npmjs.org`, therefore no local `next build` or Next.js browser E2E.
- No live GitHub App private-repo commit/rollback or Vercel production deploy.
- iPhone Safari PWA standalone and memory handling for 80 MiB ZIP need actual-device tests.

## Production release checklist

1. Push source to a **test branch** first when possible, let Vercel build and confirm Next.js 16/React 19/Worker bundling succeeds.
2. Run `npm test` and `npm run build` in GitHub Actions or Vercel, check runtime logs.
3. Confirm GitHub App 5 env variables remain configured; no new environment variables needed.
4. Validate Repo→ZIP→Preview→Commit & Push→Activity→SHA verified on a sandbox repository.
5. Confirm resume after disconnect before commit, verify unknown status after commit, and rollback safety.
6. On real iPhone, confirm safe area, small-screen navigation, Dark/Light, ZIP memory behavior.

**User-visible release status:** Source ready to test on Vercel; production acceptance is conditional on successful build and E2E.
