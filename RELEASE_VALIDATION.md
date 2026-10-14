# Zipverra Pro v2.5.0 — Release Validation

- Baseline: user-provided Zipverra Pro v2.4.0 ZIP. Full source, not patch-only.
- Automated Node tests: **186/186 passed** (177 inherited + 9 Workspace UX tests).
- Static code checks: **87 JS/JSX/MJS files**, **156 relative imports** and **4 CSS files** (TypeScript JS/JSX parser and PostCSS; zero syntax or missing-path errors).
- `npm install` was attempted and failed with `EAI_AGAIN` resolving registry.npmjs.org/jszip. **`next build` is not verified here.**
- No real authenticated GitHub Quick Edit, PR, ZIP Push or Rollback E2E run. No production Vercel build or real iPhone Safari responsive QA performed in this environment.
- No new environment variables, database, paid service or GitHub backend routes.

## Production release gate (mandatory)

1. On CI or Vercel with access to npm: `npm install && npm test && npm run build`. Do not claim deployment success from syntax tests alone.
2. On iPhone 320/375/390/430 and iPad/desktop: test Workspace breadcrumb, file tree, search, Code/Edit/Review/History tabs, keyboard, dark/light and safe-area navigation.
3. Type without committing, switch main tab (confirm then return: draft retained); switch repo/branch or profile (cancel vs confirm); leave file/Workspace (cancel vs confirm). Confirm no accidental data loss.
4. Quick Edit a harmless UTF-8 file in a **disposable** repo. Preview, confirm, commit; verify GitHub SHA and path changed once. Force HEAD to change during preview/save; confirm refusal and recovery without duplicate commits.
5. Test branch/PR list toggle, Draft PR merge-disabled, MERGE confirmation; verify History filtering only applies to loaded commits. Verify Security Scan and Rollback regression.
6. Test ZIP upload workflow end-to-end (repo → ZIP → review/security → confirm → Activity) and pending-journal recovery; no automatic Push/PR Merge.
7. Verify version `v2.5.0` in header, Settings and footer; hard-refresh the PWA and check new stylesheet is loaded.
