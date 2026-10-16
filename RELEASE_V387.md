# Zipverra Pro v3.8.7 — Accessibility & Visual QA Release

**Base:** v3.8.6 Premium Visual & Interaction Polish. **Scope:** UI/accessibility maintenance only. **Date:** 2026-10-17.

## Changes

1. **Native browser zoom restored:** removed `maximumScale: 1`, `userScalable: false` and the old `MobileViewportGuard` gesture/touch cancellation; changed historical `touch-action:pan-x pan-y` to `touch-action:auto`. Browser/device accessibility magnification remains available, including iOS Safari.
2. **Form focus on iPhone:** text, search, password and related form controls are 16px below 761px, preventing unintended iOS input-focus zoom without disabling intentional pinch zoom.
3. **Keyboard/screen-reader navigation:** on an explicit change of bottom tab, focus moves to the `main` landmark with `preventScroll`. Its accessible name references the active view heading. Initial hydration and programmatic GitHub state changes do not force focus. Existing `scheduleTabViewport` scroll behavior remains.
4. **Native dialog naming:** dialog's accessible name now references its visible title using `useId` and `aria-labelledby`; Escape/backdrop handling, scroll-lock, exit animation and focus restoration remain intact.
5. **Small-screen Visual QA:** screen widths 320–430px get better wrapping for long paths and the Risk Center. At 320px the Risk Center status pill moves to a separate line rather than squeezing its heading to single-word lines. The mobile navigation labels are more legible and form labels/notes use more readable sizes.
6. **Reduced Motion/contrast:** additive CSS for keyboard focus rings, high-contrast preferences, and reduced motion; uses existing semantic Dark/Light palette. Loading labels have Vietnamese screen-reader copy.
7. **Version sync:** app/package, public PWA cache and API version return 3.8.7. Existing design and routing systems retained.

## Automated validation

- Baseline v3.8.6: **351/351 Node tests passed**.
- v3.8.7: **364/364 Node tests passed** (13 additional tests, including 320px wrapping safeguard).
- Syntax parser: **100/100 JS/JSX/MJS and 21/21 CSS** parsed with no diagnostics.
- GitHub API: **31/31 route files byte-identical** to the supplied v3.8.6 source.
- Chromium **static CSS fixture**, representing representative Review/Risk Center/Nav/Toast surfaces: **7 widths (320, 360, 375, 390, 430, 768, 1280) × 2 themes**, no horizontal scroll overflow; input 16px on narrow screens and 44px toast dismiss. The 320px Risk Center title-wrapping regression was caught and corrected before packaging.
- Basic semantic text contrast spot-checks using theme tokens: default body and muted foreground contrast ratios exceeded 4.5:1 on their target surfaces (see `QA_CHECKLIST_V387.md`).

### Explicit limitations

- **NOT VERIFIED:** `npm run build` / Next.js production build. The environment cannot reach `registry.npmjs.org`; `npm install` fails with `EAI_AGAIN`. Build on Vercel Preview or GitHub Actions to approve release.
- **NOT VERIFIED:** actual live app screenshots via Next.js, authenticated GitHub push/PR/merge, real iPhone Safari and installed PWA, VoiceOver / TalkBack. Chromium fixture tests **CSS in isolation**, not a running authenticated Zipverra app.
- Do not call the release fully production-certified until manual acceptance on a real iPhone, Vercel build and an authorized *disposable* repository succeeds.

## Safety boundaries

- No modifications to GitHub auth, source ZIP handling, tree/commit algorithms, signed sensitive-file attestations, secret detection, Risk Center approvals, project-mismatch consent, Sync delete consent, PR/merge, History, Rollback or Recovery.
- No new environment variables, external services, databases or permissions.
- Theme bootstrap and pending-operation preservation are unchanged.

## Deploy & sign-off

Push the **contents** of `Zipverra-v3.8.7/` to the repository root, deploy a **Vercel Preview**, run `npm test && npm run build`, check `/api/version` is 3.8.7 and review `QA_CHECKLIST_V387.md` prior to production.

This is the planned final UX/UI polish. **Feature Freeze** resumes after user acceptance; only bug fixes should follow.
