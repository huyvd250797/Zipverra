# Zipverra Pro v3.9.6 — QA Checklist

- [ ] `npm install`, `npm test`, `npm run build` succeed in Vercel Preview/CI.
- [ ] Check Safari/PWA (375×667, 390×844, 430×932) and PC (1366×768, 1920×1080), including Dark/Light and larger text.
- [ ] After expanding the file list and scrolling, no floating "Tới xác nhận & Push" button overlaps file rows or warning text.
- [ ] Risk Summary is immediately visible in Review, never clipped by the Commit action bar.
- [ ] Suspected wrong-project ZIP opens a large Risk sheet with readable project/path evidence; canceling does not approve.
- [ ] Sensitive file warning dialog takes priority when ZIP also has a critical project mismatch.
- [ ] Risk sheet security warning and Sync Delete approvals still require separate explicit decisions; changing the file selection invalidates approvals.
- [ ] With one or more pending approvals, the mobile fixed bottom action only opens the Risk sheet; no Commit & Push button is shown there.
- [ ] Only after all required approvals: a second, user-invoked confirmation sheet contains a final checkbox and a disabled Push button until checked.
- [ ] Changing repo, branch, ZIP, release mode or file selection clears stale confirmations.
- [ ] Direct Push, PR, Merge, PWA update, GitHub permissions and unconfirmed-commit recovery continue to work.
- [ ] Run a real ZIP Review containing 0, 1, 100 and 2,500 changes; verify performance and no unintended nested horizontal scroll.
- [ ] Verify bottom CTA clears the iOS navigation bar and the native keyboard never blocks form input.
- [ ] Test PC retains the original primary action with the same confirmation constraints.
- [ ] Verify no new GitHub server mutation endpoints have been introduced.
