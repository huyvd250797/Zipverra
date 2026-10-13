# Zipverra v1.5.1 — Release Validation

**Build date:** 2026-10-13

## Executed checks

- `npm test`: **56 passed, 0 failed**.
- Parsed **35 JavaScript/JSX/MJS modules** via TypeScript syntax parser: **0 parse errors**.
- ZIP artifact integrity: verified after packaging.
- Original v1.4.0 mobile PWA features and GitHub safe push/recovery tests retained.

## Not executable in this packaging environment

- `npm install` failed with `EAI_AGAIN` resolving `registry.npmjs.org` (network/DNS unavailable). No `node_modules` or lockfile generated.
- Consequently **`next build` / Vercel production deployment not verified here**.
- Real GitHub App OAuth login/installation, permissions acceptance, protected branches and live Commit & Push require external credentials and an owner-approved sandbox repository; **not tested**.

## Required before production rollout

1. Set new GitHub App environment variables on Vercel (README §4).
2. Complete `npm run build` on Vercel/GitHub Actions and inspect build logs.
3. Install App on a sandbox repository and run manual E2E checklist in `QA_NOTES.md`.
4. Verify Workflows:write or avoid changing `.github/workflows/*` without the grant.
5. Only switch over production workflows after verified successful push on sandbox.


## v1.5.1 targeted fix verification

- Fix source: `lib/auth/github-app.js` regex no longer mandates `Iv1.`. Valid modern GitHub App IDs like `Iv23...` now pass.
- Login error source: `app/api/auth/login/route.js` returns sanitized, variable-specific configuration errors rather than a blanket error.
- Automated suite: 58/58 tests passed (`npm test`), including two new tests for modern IDs and safe errors.
- `node --check` for JS/MJS files passed.
- Next.js `npm run build` and real GitHub authorization were not exercised in packaging environment; verify on Vercel after deploy.
