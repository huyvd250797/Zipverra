# Zipverra Pro v3.9.14 — Desktop/Mobile Acceptance

## Build and app stability

- [ ] `npm install && npm test && npm run build` succeeds in a network-enabled CI environment.
- [ ] Vercel Preview opens in Dark and Light modes; no hydration or console errors.
- [ ] `/api/version` reports `3.9.14`; PWA update is applied only when no pending Push/recovery action exists.

## Desktop Upload — 1024 / 1366 / 1440 / 1920

- [ ] Repository and branch are selectable from the destination bar.
- [ ] With no ZIP analyzed, only Upload is displayed (no empty Review panel).
- [ ] Download ZIP works for the selected branch; ZIP upload remains separate and clearly labeled.
- [ ] Favorites/recents do not jump to first place on selection or Profile application.
- [ ] Selecting a ZIP triggers analysis but never mutates GitHub.
- [ ] ZIP limits and Extended Mode consent are unchanged.
- [ ] No horizontal overflow, clipped buttons or extra document scroll for a typical upload at 1366×768.

## Desktop Review

- [ ] After analysis, Upload disappears and Review takes over the workspace.
- [ ] Change summary and Risk Center are visible; long lists, Diff and diagnostics scroll within their content area.
- [ ] Right-side action panel is independent and does not overlap file content or risk warnings.
- [ ] Security, mismatch and Sync delete approvals are mandatory when applicable; Push is disabled until all conditions pass.
- [ ] Changing ZIP invalidates previous Review/consents; branch/repo changes retain existing guards.
- [ ] PR/Direct Push and verified GitHub Commit still work in a test repository.
- [ ] Only successful *verified* commits reorder frequently used repositories; duplicate SHA verification is deduplicated.

## Mobile — 375×667 / 390×844 / 430×932

- [ ] Bottom tab bar retains four items and existing spacing.
- [ ] Upload, Review, risk sheets, ZIP download and Push confirmation look and behave exactly as in v3.9.13.
- [ ] Keyboard behavior, bottom sheets, safe areas, scroll and critical risk confirmations are unaffected.

## Operations & regression

- [ ] Activity accurately reports Git blob upload, Commit, PR and recovery.
- [ ] History and Settings remain accessible; branch/PR and Quick Edit tools remain available in their existing locations.
- [ ] GitHub API route behavior is unchanged.
- [ ] Safari/PWA on a real iPhone and desktop browsers reviewed before declaring Stable.
