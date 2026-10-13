# Zipverra v1.9.0 — Release Validation

Release: 2026-10-14 · Based on v1.8.0 Smart Push & Workflow 3.0

## Verified locally

- `npm test`: **113/113 passed**, including 17 new workspace tests. All previous GitHub App, ZIP Push, History/Rollback, PWA and Worker tests retained.
- JavaScript and JSX syntax/parser checks, workspace endpoints/routes and relative imports checked.
- Workspace mobile/desktop layout fixture checked using Chromium at 320, 375, 390, 430, 768 and 1280 px, no horizontal overflow. This is layout-fixture QA, not a real-device end-to-end test.
- README, QA notes, changelog and release ZIP integrity validated before handoff.

## Not verified locally

- npm registry DNS `EAI_AGAIN` prevented installing project dependencies and running `next build`.
- GitHub App live authorization, GitHub Contents API real mutation, Vercel production build and iPhone PWA E2E need validation after deploy. Do not assume production-ready without these checks.

## Acceptance tests after deployment

1. Check GitHub App login and existing ZIP Push/History/Rollback still work.
2. Open Repos → pick a disposable GitHub repository → Repository Explorer.
3. Browse folders, search filenames, open small UTF-8 file, view syntax/color and file history.
4. Edit a test `.md` file → Review Changes → confirm → Commit & Save File → compare resulting commit SHA/content on GitHub.
5. Change branch HEAD/file SHA between Preview and Save. Expect HTTP 409 and no edit/commit.
6. Reuse an expired/tampered preview proof; expect reject.
7. Try binary, secret path and >64 KiB file; expect blocked.
8. On protected main, expect GitHub rule rejection; use GitHub PR flow until v1.11 branch support arrives.
9. Simulate failed Save response/network loss; verify GitHub before any manual retry.
10. Confirm no secrets in repo, HTML, browser localStorage or API error messages.
