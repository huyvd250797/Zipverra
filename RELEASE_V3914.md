# Zipverra Pro v3.9.14 — Desktop Studio Redesign

**Base:** v3.9.13, developed from the previously approved v3.9.9 baseline. No reverted v3.9.10–v3.9.12 tab motion is reintroduced.

## Scope

This release redesigns the **desktop/tablet presentation only** (width >= 761px). Mobile retains the existing Upload, Activity, History, Settings four-tab workflow and confirmation sheets.

### Desktop Upload workspace

- Navigation rail and project/branch strip remain available.
- The empty Review panel is suppressed until analysis completes.
- A cohesive Upload board places the current GitHub source ZIP, incoming ZIP selection and advanced settings in the primary column, with recent/pinned repositories and saved Profiles in a distinct secondary area.
- At intermediate widths (761–1099px), the ZIP chooser precedes the favorites list to minimize scrolling to the primary task.
- The repository selector is user-controlled; no automatic selection was reintroduced.

### Desktop Review workspace

- On successful analysis, Upload is replaced by Review without a modal containing the entire page.
- Review summary, changes, file list, Diff and the full Risk Center live in a bounded, independently scrollable panel.
- A separate, non-overlaying confirmation panel shows destination, risk state, mandatory consent and gated Commit/Push.
- Source can be replaced with the existing **Đổi ZIP** action.
- Desktop-only tab navigation no longer waits for the old opacity fade-out; mobile navigation logic is unchanged.

### Preserved contracts

- GitHub App authorization and server mutation routes unchanged.
- Security Scan, project mismatch, Sync delete, PR, uncertain-commit recovery and explicit confirmation gates unchanged.
- Standard/Extended archive limits: 120 MiB / 200 MiB.
- Frequently used repository order only updates after **verified successful GitHub Push**, not when selecting a repository or Profile.
- Existing PWA update and safe reload mechanisms retained.

## Validation and limitations

- Node automated tests: **491/491 passed** (480 baseline + 11 desktop regression tests).
- Syntactic parsing: 160 JS/JSX/MJS files and 35 CSS stylesheets (test environment counts).
- Chromium HTML/CSS layout fixtures checked at 900×768, 1366×768 and 1920×1080 without horizontal overflow; the fixtures are **not** app E2E tests.
- `next build` could not run in the current environment because Next.js dependencies are not installed (`next: not found`). This is a **Release Candidate**, not certified production stable.
- Deploy to Vercel Preview and execute the checklist in `QA_CHECKLIST_V3914.md` prior to production.
