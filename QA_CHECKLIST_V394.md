# Zipverra Pro v3.9.4 — Acceptance Checklist

## Setup / baseline
- [ ] `npm install`, `npm test` and `npm run build` succeed under Node >=20.9.
- [ ] `/api/version` returns `3.9.4` and PWA updates to the new public-cache version only with user consent.
- [ ] Existing authenticated GitHub user/repo/branch selection works; no new permissions required.

## Mobile — Safari, iPhone, standalone PWA
- [ ] 375x667, 390x844, 430x932 and landscape: picker fits the visual viewport, no horizontal overflow.
- [ ] Open Repo and Branch picker: clear heading, large close target, scrollable results, body remains stationary.
- [ ] Slow short downward swipe on grip springs back smoothly; deliberate long/fast downward swipe closes.
- [ ] Swiping within the repository/branch result list only scrolls the list and never closes the sheet.
- [ ] Horizontal swipe does not dismiss the sheet; Escape/close/backdrop still work as applicable.
- [ ] Focus search; Safari keyboard does not hide the active input; other sheet controls remain reachable by scrolling the **sheet**, not the underlying page.
- [ ] Close the sheet after typing; keyboard dismisses and focus/Review scroll are restored.
- [ ] Open Diff of ordinary text source: comparison appears above Review; close returns to same file list position.
- [ ] File with sensitive security findings is still not shown as a client-side Diff.
- [ ] Reduce Motion on: motion disabled without losing modal accessibility.

## PC / tablet
- [ ] 761x900, 1100x768, 1366x768 and 1600x900: picker appears as right side panel; Diff panel is wider.
- [ ] The confirmation for source secrets remains a high-visibility modal dialog.
- [ ] Native Escape, backdrop, close, focus return and keyboard tab navigation work.
- [ ] Large Diff scrolls inside its panel, leaving Review summary and Commit action in place.
- [ ] Resizing with an open panel stays within viewport boundaries.

## Security & workflows — unchanged invariants
- [ ] Direct Push and PR work on a disposable repository.
- [ ] Risk Center prevents unacknowledged Critical/Project-Mismatch/Sync Delete actions.
- [ ] One Commit/PR action only; no auto Push or auto Merge.
- [ ] 120 MiB Standard / 200 MiB explicitly acknowledged Extended ZIP handling works on supported device.
- [ ] Recovery after unconfirmed GitHub responses retains verification behavior.
- [ ] Long lists, binary Diff rejection and file selection have no client error or console warning.

## Release decision
- [ ] Production build validated in Vercel Preview.
- [ ] Real Safari (not just Chromium emulation) has been tested.
- [ ] No regressions with GitHub Push/PR and mobile keyboard/scroll interactions.
