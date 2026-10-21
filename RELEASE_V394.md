# Zipverra Pro v3.9.4 — Adaptive Sheets & Smooth Flow

## Baseline and scope

Based on v3.9.3 Quick Action & Smart Defaults. This release updates presentation and navigation only; it does not add Vercel Workspace, alter any GitHub API route, automatically commit/merge, or change security-consent conditions.

## Delivered

1. **Responsive sheet presentation**. Repository and branch pickers are bottom sheets on mobile (<=760px) and right-side panels on desktop/tablet (>=761px). Security consent dialogs remain modal and prominent; they do not become an undifferentiated background drawer.
2. **Drag-to-dismiss for touch devices**. A dedicated grip is used to drag down to close mobile sheets. Small gestures spring back; sideways gestures and scrolling within the sheet do not dismiss it. Drag is disabled while the virtual keyboard is detected.
3. **Keyboard and visual viewport handling**. Sheet geometry follows `window.visualViewport` during iOS keyboard resize/scroll. Focused fields are scrolled *within* the modal scroll region; the body stays scroll-locked and the opener regains focus without changing document scroll.
4. **Diff is an overlay, not expanding inline content**. File comparison opens as a dedicated side-panel on desktop or bottom sheet on mobile. Review position, selected changes and Risk Center remain intact. Client Diff still refuses sensitive files and still uses the lazy archive worker.
5. **Navigation without unnecessary document scrolling**. The explicit “Xem Review” action scrolls the bounded Review panel only, without a smooth-scroll command to move the full page. Existing destination, consent and GitHub actions remain unchanged.
6. **Motion and accessibility**. Subtle directional motion, snap-back on incomplete swipes, Escape/close button/backdrop dismissals, focus restoration and `prefers-reduced-motion` respected. Interactive controls remain at or above the established 44px size targets.

## Not changed

- Upload ZIP profiles: 120/200 MiB; validation and source-security logic.
- GitHub authentication, repository discovery and branch permission rules.
- Pull request, direct push, Sync Delete, Project Mismatch and warning confirmations.
- Single gated Commit/Push action, Activity journal, Recovery and PWA offline-assets-only service worker.

## QA summary

- Automated Node tests: 427 / 427 successful (including ten new v3.9.4 tests).
- JS/JSX/MJS syntax validation: 148 files; no syntax diagnostics from the TypeScript parser.
- CSS parsing: 28 stylesheets; no top-level syntax errors from tinycss2.
- Chromium **static CSS fixture** verified that mobile bottom sheets and desktop side panels fit 375×667, 390×844, 761×900, 1100×768, 1366×768, and 1600×900 viewports; this is **not** full app E2E verification.
- GitHub server API routes: source-identical to v3.9.3 (see final release comparison).

## Production readiness

This source ZIP is a **Release Candidate**. CI/build dependencies are not prebundled. A successful Vercel Preview production build, real authentication and iPhone Safari/PWA QA are required before marking the release Stable. Run `npm install`, `npm test` and `npm run build` in a properly provisioned environment.

## How to deploy

Push the **contents of `Zipverra-v3.9.4/`** into the root of the existing GitHub repository, and deploy to a Vercel Preview deployment before promoting to production. Follow `QA_CHECKLIST_V394.md`.
