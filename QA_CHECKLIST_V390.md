# Zipverra Pro v3.9.0 — Desktop acceptance checklist

## Layout and navigation
- [ ] iPhone 375–430 px: existing mobile bottom nav, no desktop rail, no horizontal overflow.
- [ ] iPad/small laptop 768, 900, 1024 px: compact icon rail is visible and functional.
- [ ] Desktop 1100, 1366, 1600 px: full left rail, top context and balanced Upload/Review columns.
- [ ] Each desktop tab shows only the intended panels (Repos, Upload, Activity, History, Settings).
- [ ] Upload left / Review right remain usable at 1100 px and 1366 px.
- [ ] Large Review/Risk Center content scrolls within Review and Commit/PR actions remain accessible.
- [ ] Long repo names and ZIP filenames do not cause horizontal page scrolling.

## Motion, accessibility and theme
- [ ] Switching tabs animates but preserves source/branch/review state.
- [ ] Sidebar reset prompts where applicable and does not bypass Recovery or unsaved editor protections.
- [ ] Tab and Shift+Tab reach all desktop navigation items, with visible focus.
- [ ] Reduced Motion eliminates nonessential animations.
- [ ] Dark / Light / System theme persists without flash and all labels remain legible.
- [ ] Mouse, trackpad, touch and keyboard can operate dialogs and repo/branch selectors.

## GitHub workflow / release gate
- [ ] Choose repo + branch → ZIP 120 MiB or Extended ZIP → Analyze → Review.
- [ ] Critical security / mismatch / Sync deletion acknowledgements still gate Commit/PR.
- [ ] Direct Push + signed proof + Verify result; PR creation + Merge and branch protection.
- [ ] Recovery for uncertain commits, offline transitions, and refresh during long ZIP handling.
- [ ] GitHub permissions and API routes behave exactly as in v3.8.9.
- [ ] Vercel Preview `npm run build` succeeds, `/api/version` reports `3.9.0` and PWA refresh serves new version.
