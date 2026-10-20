# Zipverra Pro v3.9.0 — Desktop Workspace UX

## Scope
Mobile remains the primary product. This release organizes desktop views into a compact, task-focused GitHub workspace and avoids unnecessary page scrolling. It does not modify GitHub API routes, consent decisions, security scanning, ZIP capacity or archive extraction.

## Visual and interaction changes
1. **Desktop ≥1100 px:** persistent 238 px navigation rail (206 px on narrow laptops), full five-tab navigation, current GitHub account and pending-operation indication. Clicking the sidebar brand invokes the existing safe workspace-reset flow.
2. **Tablet/narrow desktop 761–1099 px:** compact fixed icon navigation rail so every screen remains reachable without a mobile bottom bar.
3. **Mobile ≤760 px:** retains original bottom navigation and layouts; no desktop sidebar.
4. **Only active views show:** desktop no longer displays unrelated repository, upload, activity, history and settings panels simultaneously. Hidden panels retain React state.
5. **Upload & Review:** 2-column workbench; ZIP chooser, modes and preparation left, Review/Risk Center/Commit/PR right. Main review area scrolls independently when long; file list remains collapsed and bounded by default.
6. **Activity:** live process and recent activity side by side on desktop. One global progress bar only.
7. **Visual system:** current graphite/emerald/light-theme variables, consistent card spacing, sidebar hover/active states, focus visibility, reduced-motion handling and low-shift transitions.
8. **Navigation:** desktop tabs return to the top of the workspace, rather than scrolling the Activity card into view and hiding the screen title.

## Version and preservation
- Runtime, PWA service-worker cache and package version: `3.9.0`.
- 120 / 200 MiB ZIP profile, security consent, Risk Center, Commit/PR confirmation, GitHub recovery and Merge PR remain unchanged.
- All 31 GitHub API route files are byte-identical to v3.8.9.

## Verification boundaries
- `npm test` and syntax/CSS parser checks run locally; representative Chromium HTML/CSS viewport checks are not full application E2E tests.
- A production Next.js build and authenticated GitHub workflows require deployment preview and configured credentials. Do not claim production sign-off before completing those checks.

## Deploy
Extract `Zipverra-v3.9.0/` to your GitHub repository root, push to a feature branch, deploy a Vercel Preview, execute the checklist, then merge to production.
