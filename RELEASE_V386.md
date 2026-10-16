# Zipverra Pro v3.8.6 — Premium Visual & Interaction Polish

**Source:** v3.8.5 Smart Warning & Review UX. **Type:** UI-only maintenance, Feature Freeze. **Date:** 2026-10-17.

## What changed

1. Added `app/styles/premium-interactions-v386.css` **last** in `app/layout.jsx`. This is one narrowly scoped visual layer rather than edits across historical CSS files. It defines motion, control radii, panel hierarchy and spacing from existing dark/light semantic tokens.
2. Standardized button and form-control typography, hit targets, focus visibility, compact cards and upload surface. The mobile bottom navigation remains five tabs, the selected tab state is unchanged, and layouts at <=380/760px have improved legibility.
3. Added a small shared SVG `StatusGlyph` family (success, information, warning, error, critical, project identity, Sync delete) to the Toast, persistent banners and Review Risk Center. Text and ARIA names remain primary; icons are decorative.
4. Polished Risk Center hierarchy: individual risk title, severity, decision state, explanatory copy and explicit consent remain distinct. **No** approval is added, removed or auto-checked.
5. Made Toast/Modal/Bottom Sheet presentation consistent: modest slide/fade on opening and closing, unified close icons, calmer surfaces, more consistent padding and compact iPhone sheet drag-handle decoration. Exit durations retain the existing JS timers (Toast 170ms; modal 225ms).
6. Respected `prefers-reduced-motion: reduce` and preserved physical safe areas, native `<dialog>` focus management, internal scroll lock, keyboard adjustments, offline notices and PWA theme initialization.
7. Synchronized package version, UI version, PWA `APP_VERSION` and public Service Worker cache namespace to **3.8.6**. No changes to environment variables or GitHub permissions.

## Hard safety boundaries

- No changes to the **31 GitHub API route files** (byte-for-byte matched to v3.8.5).
- The Risk Center's security, project-mismatch and Sync consent callbacks remain unchanged; final Commit/PR checkbox remains independent.
- No modifications to ZIP inspection/verification, Direct Push, Pull Requests, Merge, auth, Recovery, rollback, history or GitHub permissions.
- Native modal scroll containment, keyboard adaptation, and exit animations continue to be managed by existing JS; the new layer does not change DOM position or scroll behavior.

## Verification completed locally

- Baseline v3.8.5: **341/341** Node automated tests passed.
- Updated v3.8.6: **351/351** automated tests passed, including 10 v3.8.6 checks.
- TypeScript transpile/parser checks: **100/100 JS/JSX files** in `app/` and `lib/` parsed without syntax diagnostics.
- CSS parser: new stylesheet parsed without structural errors.
- All 31 GitHub API routes match the original ZIP content byte-for-byte.
- Source ZIP archive integrity should be checked again after packaging.

**Not verified locally:** `next build`, real GitHub network writes, actual iPhone Safari/installed PWA. `npm install` could not reach `registry.npmjs.org` (`EAI_AGAIN`). Vercel or CI with network access must perform the production build before considering the release fully validated.

## Acceptance checklist on Vercel Preview

1. Install dependencies, run `npm test` and `npm run build` with Node 22. Verify `/api/version` returns **3.8.6** and that the PWA public assets update after activation.
2. On Dark and Light, review Home / Repositories / Activity / History / Settings at 320px, 375px, 390px and desktop width. Check wrapping, typography, card border contrast and any control collisions.
3. Open and dismiss the repository picker, branch selector and confirmation dialogs via close button, backdrop and Escape; check open/close transitions, tap reach and nested scroll.
4. On an actual iPhone Safari and installed PWA, check keyboard opening, orientation, safe areas, modal scroll lock and physical bottom navigation. Enable Reduce Motion and verify transitions stop.
5. Queue multiple Toast notifications; verify sequence, dismiss button and that no toast hides the mobile tab bar.
6. In Review, trigger Security, project mismatch and Sync delete on a **disposable test repository**. Confirm pending/accepted badges and checkbox state. Ensure changing the ZIP/file selection invalidates prior approvals; try both Cancel and Continue paths.
7. Before deploying to your main repository, complete the manual Direct Push / Create PR / Activity verification path on a nonproduction repo, including GitHub branch protection behavior.

## Deployment

Unzip `Zipverra-v3.8.6/` and push the *contents* of this folder into the **root** of the current GitHub repository. Deploy the connected Vercel project as normal. Preserve its existing environment variables; do not commit actual credentials.

**Next planned milestone (not included):** v3.8.7 Accessibility & Visual QA Release. Feature Freeze continues until an explicit request to proceed.
