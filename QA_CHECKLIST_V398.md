# Zipverra Pro v3.9.8 — QA Checklist

## Mobile UX
- [ ] New session starts with **no repository selected**, including an account that previously enabled auto-restore in v3.9.7.
- [ ] Favorite/recent chips are present when authorized and do **not** auto-select anything.
- [ ] Upload initially has no redundant help paragraph, no disabled ZIP drop zone, no pre-file action button and no five-step strip.
- [ ] Choosing a repo displays ZIP selection; selecting ZIP analyzes it and shows Review.
- [ ] Saved Push Profile only activates upon explicit tap.
- [ ] Verify at 320×568, 375×667, 390×844, 430×932, including Safari keyboard and both themes.

## Risk & Push
- [ ] Critical Security warning opens consent; no automatic acceptance.
- [ ] Serious project mismatch shows severity and requires an explicit consent to proceed.
- [ ] Sync deletions require separate agreement; excluded files are preserved.
- [ ] Final Push is not available with incomplete confirmation or zero selected changes.
- [ ] Switching repository/branch with pending ZIP warns about losing the unpushed Review.
- [ ] Direct Push, Pull Request, Merge, uncertain-write Recovery and ZIP 120/200 MiB limits behave as in v3.9.7.

## Verification
- [ ] `npm install`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] Deploy Vercel Preview and inspect full UI on desktop/iPhone.
- [ ] Confirm `/api/version` returns `3.9.8` and PWA update applies.
