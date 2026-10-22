# Zipverra Pro v3.9.10 — Directional Tabs QA

## Navigation / interaction
- [ ] Upload → Activity: Upload slides **left**, Activity comes from **right**.
- [ ] Activity → Upload: Activity slides **right**, Upload comes from **left**.
- [ ] Upload → History/Settings and the reverse: direction follows the relative taskbar position.
- [ ] Activity → History → Settings and reverse: same 240ms horizontal transition; taskbar remains stable.
- [ ] Repeated quick taps do not leave stale dark overlays, transition styles or unreachable tabs.
- [ ] Active-tab tap does not replay the entire navigation animation.
- [ ] Tap Commit & Push (after all required approvals): the confirmation sheet closes, then Activity slides in and displays real upload progress; no black backdrop appears over the sliding screen and ambiguous GitHub commits are never automatically retried.
- [ ] Dark and Light themes do not flash black when switching between tabs.
- [ ] Browser with native View Transitions shows both screens moving simultaneously; browser without support switches without delayed fade.
- [ ] Reduced Motion enabled: tab changes immediately without horizontal motion.
- [ ] Safari standalone PWA tab switching restores page scroll to top and does not hide Activity progress.

## Regression / devices
- [ ] iPhone Safari/PWA: 375×667, 390×844, 430×932.
- [ ] Tablet 820×1180 and PC 1366×768 / 1920×1080.
- [ ] No horizontal overflow or stuck viewport; modal/sheet focus and keyboard behavior remain correct.
- [ ] Upload, Download ZIP, Review, Risk Center, Direct Push, PR/Merge and Recovery all work as in v3.9.9.
- [ ] ZIP 120/200 MiB limits and all security/Sync confirmations remain unchanged.
- [ ] `npm install && npm test && npm run build` in network-enabled environment.
- [ ] Vercel Preview and physical iPhone QA complete before marking production Stable.
