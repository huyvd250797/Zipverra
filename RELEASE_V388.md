# Zipverra Pro v3.8.8 — Smooth Motion & Interaction Hotfix

## Scope
**UI interaction and lifecycle only.** No changes to GitHub API routes, authentication, push, PR, merge, recovery or security consent rules.

- **Bottom Sheets:** native `dialog.showModal()` remains mounted until a full slide-up/fade-in or slide-down/fade-out sequence finishes. Now also works when state closes the sheet after repo/branch selection, not only via X/Escape/backdrop.
- **Modals, popups and confirmation:** centered fade + subtle scale on enter/exit. Last title and children remain visible during exit, preventing disappearing content.
- **Background dimming:** paired backdrop fade-out follows dialog, with no abrupt close.
- **Navigation:** fade-out before changing mobile tab and fade/translate-in for the next screen, including header intro, while the persistent app header and tab bar remain stable.
- **Nested panels:** mount-only, subtle reveals for Workspace editor tabs, PR manager and rollback previews.
- **Expandable details:** progressive enhancement for smooth accordion transitions on browsers with `interpolate-size` and `::details-content`; native instant open/close remains fallback elsewhere.
- **Motion accessibility:** `prefers-reduced-motion: reduce` disables these effects; exit cleanup is immediate. iOS keyboard/safe-area and native scroll lock remain unchanged.
- **PWA cache:** version bumped to 3.8.8 so upgraded assets are loaded by already-installed PWA clients.

## QA and deployment
1. `npm test` and `npm run build` on Vercel Preview (never assume a ZIP validates production build).
2. iPhone Safari/PWA: open repository picker then close via X, backdrop, Escape on keyboard; reopen repeatedly; choose repository and branch; test keyboard display and return focus.
3. Verify Confirmation Dialog Cancel / Continue, modal close animations and no duplicate GitHub operations.
4. Navigate all five mobile tabs rapidly; verify animation reverses and no view or repository selection is lost.
5. Check expanded Review / Activity details and `prefers-reduced-motion`.
6. Test Dark/Light Mode, 320px and 390px layouts, and standard GitHub read-only & push flows on a test repository.

## Local validation result
- Node automated/regression tests: **370/370 passed**.
- JS/JSX/MJS parsed: **139 files, 0 syntax errors**.
- Stylesheets parsed: **22 files, 0 CSS syntax errors**.
- All **31 GitHub API route files byte-for-byte identical** to v3.8.7 hotfix input.
- `npm run build` could not execute here (`next: not found`): dependencies unavailable; production build must be verified on Vercel Preview.
- Browser-based Safari/PWA E2E was not run in this environment.
