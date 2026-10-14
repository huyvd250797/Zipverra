# Zipverra Pro v2.3.0 — Release Validation

- Source baseline: user-provided v2.2.0.
- No new GitHub API routes, env vars, database or Next.js dependencies.
- Automated regression suite and TypeScript JS/JSX syntax checks: see packaging notes and `tests/workflow-ux.test.js`.
- UI layout fixture checked with Chromium at 320/375/390/430/768/1280 px; **this is not an interactive production app test**.
- `npm install` failed with registry DNS error `EAI_AGAIN` for `jszip`, so `next build` **not verified in this environment**.
- No authenticated live GitHub Push/PR, production Vercel deployment or Safe Rollback E2E executed.

## Release gate — run before production

1. GitHub Actions/Vercel: `npm install && npm test && npm run build`.
2. Check iPhone Safari and standalone PWA (notch/dynamic island, bottom bar, dark/light and 320–430 px).
3. Choose repo → ZIP auto analyze → Review → Select/exclude → Confirm → Activity; ensure no automatic Push.
4. Test PR flow (branch create, PR recovery, merge confirmation) and 403 protected branch handling.
5. Verify Security Scan blocks Critical in UI/server, Sync deletions require separate consent, ambiguous mutations do not retry.
6. Verify with a disposable repo before modifying important repositories.
7. Confirm header/footer/Settings show `v2.3.0` and cache refresh loads new CSS.

See `WORKFLOW_UX.md` and `QA_NOTES.md` for additional checks.
