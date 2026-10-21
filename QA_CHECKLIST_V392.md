# v3.9.2 — Manual Acceptance Checklist

Release cannot be labeled Production Stable until completed against a Vercel Preview and a disposable authorized GitHub repository. Record OS, browser, viewport, repository, SHA and actual outcome.

## 1. Build / version
- [ ] `npm install` / `npm test` / `npm run build` complete on CI (Node 22)
- [ ] `/api/version` reports `3.9.2`; PWA SW activates only through supported update flow
- [ ] No unexpected console errors, hydration errors, missing CSS or broken network requests
- [ ] Compare GitHub API permission semantics with v3.9.1

## 2. Upload → Review → Push
- [ ] New session opens Upload and shows Continue with GitHub when unauthenticated
- [ ] After login, repo selector works on Upload without switching tabs
- [ ] Branch selector works, correct branch is visible and same-repo reselection does not destroy a Review
- [ ] Changing repo or branch with an uncommitted ZIP triggers warning and discards stale preview only on confirmation
- [ ] Selecting ZIP starts analysis; resulting Review appears in the same viewport; no auto-push
- [ ] Source strip shows correct ZIP name, size, mode and count; Replace ZIP works, even when using Files on iPhone
- [ ] Advanced Merge/Sync, Direct/PR controls retain behavior; changing them invalidates stale analysis
- [ ] Exactly one active Push action; can only push after manual confirmation; still disabled while busy, offline or pending verification
- [ ] File-list checkbox, select all/deselect all, filter, search, Diff and diagnostics update Review counters and invalidate consent
- [ ] Long file list scrolls inside Review without page extending by thousands of rows
- [ ] After returning from file list, keyboard focus returns to visible action dock
- [ ] PR flow creates/verifies branch and PR, does not auto-merge; branch protection still enforced
- [ ] Direct Push results and uncertain-commit recovery still work with no duplicate commit

## 3. Security guards
- [ ] Zip traversal, oversized archive, oversized single file, file count over limit and invalid ZIP rejected
- [ ] Standard 120 MiB and explicit Extended 200 MiB consent remain intact
- [ ] Critical content requires explicit Yes/No; selecting No blocks Push
- [ ] Project Mismatch Critical requires explicit acknowledgement and never silently auto-accepts
- [ ] Sync deletions require separate confirmation; selected files and repo/branch reflect actual target
- [ ] Any ZIP or selection change clears appropriate consents
- [ ] GitHub API never receives a commit before the UI and server validations have passed

## 4. Responsive and accessibility
- [ ] iPhone 375×667, 390×844, 430×932, with browser toolbar expanded/collapsed
- [ ] iPhone Safari standalone PWA, safe-area/home indicator and virtual keyboard
- [ ] Desktop 1100×700, 1366×768, 1600×900 and 1920×1080
- [ ] Tablet 768×1024 and 1024×768; sidebar navigation remains reachable
- [ ] Normal Review requires no full-document scroll where viewport allows; nested Review scroll remains functional
- [ ] The dock never covers security warnings, input controls, tab navigation, or modal actions
- [ ] Dark/Light/System and high text zoom; no clipped file names or horizontal document scrolling
- [ ] Keyboard-only operation, screen-reader labels, focus after dialogs, reduced-motion preference
- [ ] Worker cancellation, network interruption and PWA reload do not trigger unintended GitHub writes
