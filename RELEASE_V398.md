# Zipverra Pro v3.9.8 — Minimal Interface & Manual Repo Selection

## Changes

- Removed the **Automatically select most recent repository** checkbox and **all auto-restore runtime behavior**, including the stored-preference read/write path. Repository and branch start unselected until the user chooses a destination. Favorites, Recents, Frequent and saved Profiles remain as **manual shortcuts only**.
- Removed the duplicate explanatory line under Quick Access about changing repo/Profiles. Kept safety confirmation dialogs **when changing destination with an uncommitted review**.
- Removed nonessential UI prose across Upload, Repo, History, Settings, Dashboard, Activity and optional workspace panels. Informative security, destructive Sync, rollback and pending-write warnings remain readable.
- Moved archive capacity details into Advanced Options, removed the redundant disabled pre-ZIP analysis button, and hid the disabled ZIP drop zone until a repository is selected.
- On mobile Upload, the redundant five-step illustration is hidden; the current screen title and actions remain. Quick Access uses readable two-column repo chips with preserved repository-owner labels to avoid identical repo names.
- Left all GitHub API mutation endpoints and security/readiness gating unchanged, including consent to secrets, likely project mismatch, Sync deletions and final Push.

## Validation

- Node tests: run `npm test`. Additional tests verify no auto-repository selection, safe manual shortcuts, reduced default-screen text and unchanged safety gates.
- Source syntax: TypeScript JSX parser and PostCSS parser.
- Production build and iPhone Safari/PWA E2E must still be completed after installing Next.js dependencies; no production-build verification is claimed by this release.

## Deploy

Extract the ZIP and push the **contents** of `Zipverra-v3.9.8/` to the repository root. Preview on Vercel before production. No new environment variables or database changes.
