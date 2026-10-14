# Zipverra Pro v3.1.0 — Repository Workflow Clarity

## Scope

This version was built directly from the user-supplied v3.0.5 archive. It improves the repository/branch picking workflow and introduces shared, iOS-aware modal scroll isolation. No existing GitHub mutation endpoint was modified.

### 1. Repository picker
- One compact repository trigger replaces three separate controls (search field, recent chips, native dropdown) in the Repos panel.
- Opening the trigger launches a searchable bottom sheet on iPhone.
- The results are limited to repositories already authorized by the GitHub App; pinned repositories and recent projects appear first.
- Selecting a repository continues to Upload as before. The default branch remains `main`.
- The existing Settings screen continues to manage GitHub App installation/permissions.

### 2. Branch picker
- Choosing Branch opens a sheet with the authorized repository's real branch list.
- **New read-only endpoint:** POST `/api/github/branches` requires the signed-in GitHub App user session, strict origin, installed repository with Contents: write and the user's write permission.
- Branch listing is independent of Pull Requests permission and is capped at the first 100 GitHub branches.
- For an unlisted branch, the user may enter a valid branch name manually. A new branch is **not** created by selecting it; GitHub Push preflight remains authoritative.
- The same branch chooser can be opened from Upload.
- Source ZIP Download remains pinned to `main` even if the Push branch differs.

### 3. Modal and bottom-sheet scroll isolation
- Both the single shared `?` Help dialog and Repo/Branch bottom sheets use one scroll-lock utility.
- While open, the document body is fixed at the previous scroll offset, HTML overflow is locked, and touchmove outside the scroll region is suppressed.
- The dialog's inner panel is independently scrollable and prevents scroll chaining when the user reaches either end.
- On closing with Escape, the close button, backdrop or unmount, styles are restored and the original scroll position is restored instantly.
- Multiple active locks are reference-counted to prevent an early unlock.
- iPhone safe area, dark/light modes, keyboard focus and reduced-motion CSS are preserved.

## Regression guarantees

- Direct Push / PR / Quick Edit / Security Scan / History / Safe Rollback do not acquire new mutation behavior.
- Commit and rollback still require explicit user confirmation.
- The new branch endpoint is read-only. No new environment variables or database are required.

## Verification

- `node --test tests/*.test.js`: **260/260 passed**.
- TypeScript JavaScript/JSX parser: **118 modules** validated, **211 imports** resolved, **10 CSS files** parsed with PostCSS.
- All **30 pre-existing GitHub API route files** are unchanged from the supplied source, and one new read-only branch listing route was added.
- Chromium fixture tested via inline HTML at 320/375/390/430/768/1280 px. In every viewport, the page froze during the open sheet, only the sheet content scrolled, and the page restored the previous scroll position after closing. Real Safari iPhone/PWA verification remains required.
- `next build` was not confirmed in this environment because Next.js dependencies are unavailable.

## Manual iPhone acceptance test

1. Scroll Repos to the middle/bottom. Open the Repository sheet. The page behind it must remain still even if the user swipes the backdrop.
2. Scroll a long repository list inside the sheet. Only the list should move; swiping beyond the top/bottom must not scroll the page behind it.
3. Close with `×`, Escape (external keyboard), and tapping the backdrop. The underlying page must return to the same vertical position.
4. Repeat with Branch selection and the `?` Help dialog in all five tabs.
5. Verify a repo without PR write permission can still list branches, provided Contents: write is granted.
6. Confirm selecting a different branch invalidates an existing ZIP Review instead of preserving stale changes.
7. Run an isolated Direct Push / PR / Quick Edit / Safe Rollback smoke test, and confirm Download Source ZIP still fetches `main`.
