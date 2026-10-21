# Zipverra v3.9.3 — QA Checklist

## Functional
- [ ] Login account A; select repository via Quick Access, test fallback picker, pin/unpin, recent history and popularity.
- [ ] Logout/login account B; ensure shortcuts/Preferences/Profiles for account A do not appear.
- [ ] Remove GitHub App access to a previously pinned repo; confirm it disappears after repository refresh.
- [ ] Save current `main` / Merge / Direct Profile from Upload; restart and verify it is available only after selecting the appropriate repo.
- [ ] Save a release branch / PR Profile, switch mode and test `Dùng Profile` requires an explicit click, does not Push, and resets Review for changed settings.
- [ ] Save a Sync Profile and test explicit Sync warning, Review deletions checkbox and final Push confirmation remain mandatory.
- [ ] Select a ZIP, Review, then attempt to apply profile from Settings; Cancel must leave ZIP/Review intact.
- [ ] Enable Auto Restore, reload, ensure latest authorized repo is selected but branch=`main`, mode=`Merge`, strategy=`Direct`; no ZIP/consent restored.
- [ ] Disable Auto Restore and reload, verify repo no longer auto-selected.
- [ ] When previous repo is no longer authorized or local metadata is corrupted, auto-restore must not select it.

## UX
- [ ] iPhone Safari/PWA 320/375/390/430px and desktop 900/1100/1366/1600px; no horizontal page overflow.
- [ ] Dark/Light; high zoom (200%); focus visible; VoiceOver labels and tap targets; reduced motion.
- [ ] During ZIP analyze Quick Actions may be visible; after Review it must disappear; ensure decision dock remains usable without whole-page scroll.
- [ ] Profile names and repository chip truncation, tooltips, and selected status remain understandable.

## Safety & regression
- [ ] No automated Push, PR, merge, deletion, risk consent or security exception from Quick Actions.
- [ ] Validate Project Mismatch, credentials warning, Sync delete, GitHub branch protection, pending Commit Recovery and PR Recovery unchanged.
- [ ] ZIP Standard 120 MiB and Extended 200 MiB, Worker lazy-extract and SHA verification unchanged.
- [ ] Run `npm ci` (or `npm install` if lockfile is absent), `npm test`, `npm run build` on Node >=20.9 and deploy Vercel Preview.
- [ ] Verify a real draft PR and a Direct Push on isolated disposable GitHub repositories before production.
