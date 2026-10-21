# Zipverra Pro v3.9.5 — Acceptance Checklist

## Prerequisites
- [ ] CI/Vercel Preview builds with Node 22; `npm test` and `npm run build` succeed.
- [ ] `/api/version` returns `3.9.5`; the PWA public asset cache updates with consent.
- [ ] No new permissions or secrets required; no Vercel integration from discontinued v3.10.0 included.

## Mobile (iPhone Safari and installed PWA)
- [ ] 375×667, 390×844, 430×932 and landscape: no horizontal scroll or truncated destination labels.
- [ ] Review ready: repo/branch, ZIP context, Review summary and Push confirmation reachable without repeated full-page scrolling.
- [ ] Fixed Push bar is visibly **above** bottom navigation, never obscured by five tabs, home indicator or keyboard.
- [ ] Tapping search/typing makes the dock give way; keyboard dismissal restores it.
- [ ] Open expanded file list with 2,500 changes and scroll to the final file; no "Load more" button and no blank gaps.
- [ ] Select/deselect files, search, filter and inspect Diff; all selections survive list scrolling.
- [ ] Open/close Diff and Repo/Branch sheets; no document-scroll jump or accidental sheet dismissal.
- [ ] Long warnings, Sync delete details and error states can be reviewed in independent scrollable regions.
- [ ] Dark/Light, Reduce Motion, larger dynamic text and keyboard focus remain accessible.

## PC / tablet
- [ ] 761×900, 1100×768, 1366×768, 1440×900, 1920×1080: active Review fits viewport where content allows.
- [ ] Upload and Review are separately scrollable when the viewport is short; Push action remains reachable.
- [ ] Resize window while Review/Push visible: no hidden buttons, unintended document scroll or overlapping action bar.
- [ ] Virtual list filtering and keyboard access works for a large change set.

## GitHub/security regression (throwaway authorized repo only)
- [ ] Standard and explicitly consented Extended ZIP checks remain at 120/200 MiB.
- [ ] No Critical/Project Mismatch/Sync Delete consent can be bypassed.
- [ ] Selecting or deselecting a file invalidates prior confirmations.
- [ ] One final Commit/Push action only; Direct Push and PR flow behave as before.
- [ ] Resume/Recovery after ambiguous network result verifies SHA/PR rather than creating an unsafe duplicate.
- [ ] GitHub App authorization, branch protection and sensitive-file Diff blocking unchanged.

## Release signoff
- [ ] Actual Next.js production build verified on Vercel Preview.
- [ ] Chrome and iPhone Safari/PWA authenticated E2E completed.
- [ ] Long review 2,500 items and 200 MiB ZIP benchmarked on the target iPhone.
- [ ] Any remaining device-specific memory/keyboard limitations documented before marking Stable.
