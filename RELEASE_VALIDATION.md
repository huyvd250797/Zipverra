# Zipverra Pro v2.4.0 — Release Validation

- Source baseline: user-provided v2.3.0.
- No new GitHub API routes, env vars, database or Next.js dependencies.
- Automated regression suite: **177/177 Node tests passed** (168 inherited + 9 new motion/interaction tests).
- Static checks: **86 JS/JSX/MJS modules**, **168 relative imports**, **3 stylesheets** (zero reported syntax/import/CSS parser errors). See `tests/interaction-motion.test.js`.
- Attempted Chromium fixture at 390 px; browser timed out in this runtime. Responsive and actual PWA interaction **not verified in browser**.
- `npm install` failed with registry DNS error `EAI_AGAIN` for `jszip`, so `next build` **not verified in this environment**. JS/JSX parse and CSS syntax checked statically.
- No authenticated live GitHub Push/PR, production Vercel deployment or Safe Rollback E2E executed.

## Release gate — run before production

1. GitHub Actions/Vercel: `npm install && npm test && npm run build`.
2. Check iPhone Safari and standalone PWA (notch/dynamic island, bottom bar, dark/light and 320–430 px).
3. Choose repo → ZIP auto analyze → Review → Select/exclude → Confirm → Activity; ensure no automatic Push.
4. Test PR flow (branch create, PR recovery, merge confirmation) and 403 protected branch handling.
5. Verify Security Scan blocks Critical in UI/server, Sync deletions require separate consent, ambiguous mutations do not retry.
6. Verify with a disposable repo before modifying important repositories.
7. Confirm header/footer/Settings show `v2.4.0` and a hard refresh loads new `pro-motion.css`.

See `WORKFLOW_UX.md` and `QA_NOTES.md` for additional checks.

## Additional v2.4.0 interaction acceptance checks

- Switch every tab repeatedly on iPhone 320/375/390/430 widths; animation must not hide content or reset selected ZIP/Review.
- Select a repository → show toast, choose invalid ZIP → show error toast; close notice then trigger a new event and verify the old dismissal timer cannot hide it.
- Toggle offline/online and verify notices do not imply GitHub commit success; Activity retains full error and recovery actions.
- Analyze valid ZIP → skeleton then Review ready notice; verify Security Scan + manual confirmation still block unattended Push.
- Complete actual GitHub Direct Push and PR on a disposable repo; only verified success must trigger success notice.
- Enable iOS Reduce Motion: no tab animation, toast animation, skeleton shimmer or smooth scrolling. Check VoiceOver and keyboard focus.
- Check dark and light palettes, Dynamic Island, safe areas, Toast above tab bar; actual device/Browsers not verified here.
