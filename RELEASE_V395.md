# Zipverra Pro v3.9.5 — Zero-Scroll QA & Performance Polish

## Scope and source baseline

Built directly on v3.9.4 Adaptive Sheets & Smooth Flow. This is a presentation/performance release only: **no Vercel Workspace**, new database, extra GitHub permission, new deployment action, automatic Push/Merge, or changes to the server GitHub API routes.

## Delivered

1. **Large-list virtualization:** `VirtualReviewList.jsx` replaces the previous 100-items-at-a-time load-more flow. When over 90 changes match, only visible rows plus overscan are mounted. Scrolling reveals any of the up to 2,500 changes. Selection, search, add/modify/delete filters and Diff remain available. Nonmatching search results show an empty state. Rows use fixed 46px height with complete file paths available in the tooltip and checkbox accessible name.
2. **Viewport-aware geometry:** `installViewportLayout` measures the actual top of the Review workspace and available display height on PC. It also measures the live dock height to reserve mobile space for errors and review details. Listeners/observers are released on tab change/unmount. No fixed 768px assumption.
3. **Safer mobile viewport:** keeps the sticky/fixed confirmation and Push action above the real bottom navigation and safe area. Uses `visualViewport` (where supported) to detect overlap of an active editable field with the keyboard; the dock is hidden during that overlap instead of covering typing. Does not interfere with native zoom or touches.
4. **Reduced page scroll:** the Review footer is hidden during active Review, while Upload/Review/Push stay in their existing panels; long Diff, file lists and security explanations retain intentional inner scrolling. Only new Review state repositions Review's own scroll, not the entire browser document.
5. **Performance and accessibility:** a bounded file list avoids creating thousands of checkbox/button DOM nodes; keyboard focus, readable full paths through labels, 44px interaction targets and reduced-motion handling remain in place.

## Risk controls retained

- `canSubmitPush` still gates the **one** Commit/Push control. Explicit Critical, Project Mismatch, Sync Delete and general Review acknowledgements are mandatory under the same conditions as v3.9.4.
- No changes to ZIP 120/200 MiB profiles or lazy archive worker/SHA verification.
- No changes to signed attestations, GitHub commit/PR/merge/recovery endpoints.
- Switching file selections still invalidates acknowledgements; disabled actions stay disabled.

## Verification results

- 440 / 440 Node automated tests pass, including 13 new v3.9.5 tests covering virtual viewport bounds, keyboard occlusion, responsive height calculations, observer cleanup and non-bypassed Push gating.
- 153 JS/JSX/MJS files parse successfully with TypeScript's parser, and 29 CSS files with PostCSS.
- Chromium headless **static CSS fixture**: dark and light themes at 375×667, 390×844, 430×932, 761×900, 1100×768, 1366×768, 1440×900 and 1920×1080; no horizontal page overflow. Desktop fixture fits within height at 1100/1366/1440/1920 widths, mobile Push dock does not overlap the 5-tab navigation after tuning. This fixture is **not** a hydrated Next.js application.
- All original GitHub API route files compare byte-for-byte against v3.9.4.
- `npm install` cannot fetch dependencies from registry.npmjs.org in this environment (`EAI_AGAIN`), so the actual `next build`, authenticated GitHub E2E and iPhone Safari/PWA tests were **not** executed.

## Production readiness / deployment

**Release Candidate** until networked Vercel Preview and physical mobile QA are green. Extract archive; place the **contents** of `Zipverra-v3.9.5/` at repository root; keep the same Vercel/GitHub App environment variables. Run `npm install`, `npm test`, `npm run build` in CI and perform `QA_CHECKLIST_V395.md`. Do not interpret this release as automatically approved for production.
