# Zipverra Pro v3.9.3 — Quick Action & Smart Defaults

## Baseline / scope

Built directly from v3.9.2 One-Screen Upload & Review. This is a UI/preferences update; it does **not** reintroduce Vercel Workspace, change the ZIP capacity limits (120/200 MiB), mutate GitHub API routes, add auto-commit, or bypass Security/Project Mismatch/Sync/PR Recovery.

## What's new

1. **Upload Quick Access:** Up to four account-scoped, permission-checked repository shortcuts, ordered Pinned → Recent → Frequent, with one-tap selection. Full repository picker remains available.
2. **Pin from Upload:** Star/unstar currently selected authorized repository in one click, persisted under the signed-in GitHub account.
3. **Save / Apply Push Profile:** Save the current repo, branch, Merge/Sync and Direct/PR preferences without navigating to Settings. An existing profile is shown transparently with a button to apply it *explicitly*. A pending ZIP review asks for confirmation before disposal. Switching to Sync requires a separate risk acknowledgment during profile application, and Review and pre-Push confirmation still apply.
4. **Optional smart repo restore:** Explicit opt-in control. At future openings Zipverra may select the latest account-scoped *currently authorized* repo; it uses safe `main` + `Merge` + `Direct` defaults and never restores a ZIP, Review state or consent. Not enabled by default.
5. **Compact visual treatment:** Shortcuts disappear once Review is ready, so the One-Screen Review isn't pushed down. Four chips per row on standard mobile widths; short touch-friendly controls, Dark/Light and reduced-motion support.
6. **Settings confirmation fix:** Applying a Push Profile only reports success when it actually applies; cancels leave the current context untouched.

## Notes and boundaries

- A saved Profile or recent repo is not proof that the GitHub App still grants access. The current API-provided repository list is authoritative for shortcuts and auto-restore.
- Branch validity/access is ultimately checked by the normal Analyze/Preflight flow; old saved branch names may no longer exist.
- The automatic restore is only a destination-selection convenience. Users should verify repository/branch shown prominently before choosing ZIP, and the Commit/PR action still requires the existing explicit confirmations.
- All preference metadata is local to the current browser/device and scoped to the GitHub user. No GitHub token or ZIP/source content is saved in Quick Actions.
- Repo pin, last-repo auto-restore and Profiles are optional. The app works normally without any saved preference.

## Deployment

Deploy the **contents inside `Zipverra-v3.9.3/`** to the repository root, then build in a Vercel Preview environment before replacing production. Review `QA_CHECKLIST_V393.md`.

## Validation

Automated unit/regression tests: **417/417 passed**. JavaScript and JSX syntax parsing completed without errors; **27 stylesheets** parsed. All **31 GitHub API files** are byte-for-byte unchanged from v3.9.2. A production `next build` was **not verified** because npm dependency installation failed with `EAI_AGAIN` (npmjs.org DNS). Real Vercel Preview and iPhone Safari/PWA visual/interaction QA remain required. This release is **not** certified production-stable until these checks pass. Do not interpret source-only test results as proof of production readiness.
