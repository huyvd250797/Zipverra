# Zipverra Pro v3.9.7 — Acceptance Checklist

## Build and version

- [ ] `npm install` and `npm run build` pass on Vercel/CI.
- [ ] `/api/version` returns `3.9.7` and PWA update does not interrupt an active Push.

## Mobile UX (iPhone Safari and installed PWA)

- [ ] Check 320×568, 375×667, 390×844, 430×932 and landscape if available; no horizontal overflow, controls remain accessible.
- [ ] Repo/branch selection, selected ZIP name and advanced options read clearly without cramped copy.
- [ ] Review summary, counts and Risk Banner fit one viewport in the normal state; long Diff/details scroll only inside their bounded surfaces.
- [ ] Risk Banner for a critical project mismatch is conspicuous; risk sheet shows reason, severity and independent checkbox, with no auto-approval.
- [ ] Fixed bottom CTA never directly calls Commit & Push. Push button appears only inside the final confirmation sheet after warnings are addressed.
- [ ] Final sheet shows actual repo/branch/selected change totals and required checkbox. No stale consent after changing files, modes, branch or repo.
- [ ] Keyboard does not cover inputs or safety actions; sheet closes correctly by grip, Escape and close button.

## Desktop and accessibility

- [ ] Review at 1366×768 and 1920×1080 in Dark/Light Mode; typography/spacing consistent, no unnecessary horizontal scrolling.
- [ ] File list remains virtualized for large ZIPs; filters, search, selection and Diff work.
- [ ] Screen-reader labels, visible focus, touch targets and reduced motion still function.

## GitHub safety E2E

- [ ] Try a safe Merge/Direct Push in a disposable repository; verify SHA and final commit.
- [ ] Try Critical security finding; verify separate explicit consent is required.
- [ ] Try cross-project ZIP warning; verify separate risk consent is required before Push.
- [ ] Try Sync deletion and PR flow; never auto-delete or auto-Merge without confirmation.
- [ ] Verify Recovery path if GitHub write outcome is uncertain; do not blindly retry Commit.
