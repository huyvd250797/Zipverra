# Zipverra Pro v3.9.2 — One-Screen Upload & Review

**Base:** v3.9.1 Smart Compact Layout. **Scope:** browser UX only; no changes to GitHub authorization, write APIs, client archive security, or database.

## Changes

1. **Direct Upload landing:** the app initially opens Upload rather than forcing a visit to Repositories. Users who are not authenticated see a clear `Continue with GitHub` control; no repository or ZIP upload is available before GitHub authentication.
2. **In-context repository and branch:** mobile Upload offers separate, keyboard/touch-accessible selectors that use the existing RepositoryPickerSheet and BranchPickerSheet. Desktop's compact destination bar launches the repository selector directly as well. Changing repo/branch still invalidates an uncommitted Review after explicit confirmation.
3. **Condensed ZIP source:** once analysis is ready, the mobile drop zone becomes a single source summary and a direct `Thay ZIP` action. The existing file input and analysis pipeline are unchanged. Original merge/sync and direct/PR choices remain available in Advanced options.
4. **One-screen Review:** on mobile, repeated introduction/stepper content is removed *only after analysis*. Review content is confined to a height-aware, independently scrollable area. File lists, Diff and diagnostics remain accessible without extending the entire document.
5. **One explicit Push surface:** both desktop and mobile display a dedicated Commit/PR action dock with the **only** `onClick={push}` handler and one manual consent checkbox. Its disabled state uses the existing `canSubmitPush` readiness predicate. Critical security decisions, wrong-project confirmation and Sync deletion acknowledgements must be completed first. App never auto-pushes or auto-merges.
6. **Desktop viewport:** Review gets its own bounded scroll region on desktops >=1100px with the action dock in a separate bottom row. Tablet/narrow PC uses a sticky action dock. Mobile dock stays above the five-tab navigation and safe area.
7. **No unwanted outer scrolling:** when a ZIP finishes analyzing, the mobile screen returns to the compact view. Opening diagnostics or an unresolved risk scrolls the Review *container*, except where the viewport is intentionally unbounded. Returning from a long file list focuses the dock without jumping the entire document.

## Security and resilience

- ZIP caps remain Standard 120 MiB / 240 MiB unpacked and Extended 200 MiB / 400 MiB unpacked with per-file constraints. Worker lazy reads, SHA verification, proof renewal and resumable upload logic are unchanged.
- No new GitHub permissions, cookies, tokens, Vercel connection or database.
- Existing signed blob attestations, human consent, PR flow and uncertain commit recovery remain intact.
- Native keyboard focus, touch targets >=44px and reduced-motion are retained. The mobile dock hides while editing long Review search/advanced input fields to avoid covering a virtual keyboard.

## Local verification

- Automated tests: **407/407 pass** (397 baseline + 10 v3.9.2 checks).
- JS/JSX syntax scan: **100 files checked, 0 diagnostics** (TypeScript transpile parser).
- CSS parser: **26 stylesheets checked, 0 parse errors**.
- GitHub server API source files compared byte-for-byte with incoming ZIP: unchanged.
- Full production `next build`, real GitHub writes, Vercel Preview and iPhone Safari/PWA visual verification **not completed** locally; npm registry inaccessible (`EAI_AGAIN`).

## Deployment

Unzip and push the *contents* of `Zipverra-v3.9.2/` into the existing app repository root; deploy via a Vercel Preview build. Verify `/api/version` returns `3.9.2`, confirm public service-worker cache refresh, then complete `QA_CHECKLIST_V392.md` before promoting to Production.

**Next proposed release:** v3.9.3 — Quick Action & Smart Defaults, focused on less navigation and consistent per-repository preferences without automatic GitHub writes.
