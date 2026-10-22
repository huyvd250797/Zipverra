# Zipverra Pro v3.9.9 — Upload Hub & Source ZIP

## Delivered

- Removed the **Repos** tab from mobile bottom navigation and desktop sidebar. The remaining destinations are **Upload, Activity, History, Settings**.
- Repository and branch selection remain at the top of **Upload**, with recent/favorite repositories displayed before source selection.
- Moved the existing GitHub source ZIP workflow into Upload, **directly below the repository/branch selectors**. It appears **only when a repository is selected** and disappears during Review to minimize clutter.
- Changed the ZIP preparation action label to **Tải ZIP**. Source ZIP continues to target **branch `main`** as in v3.9.8, even if the selected Push branch differs; the interface explicitly labels this.
- iPhone/Safari ZIP save still uses two deliberate taps for browser activation: **Tải ZIP** (prepare) → **Lưu vào Tệp** (Web Share, if available). A browser-download fallback remains. Do not claim saving succeeded merely because the share sheet opened.
- Moved **Branches & Pull Requests** to a collapsed section in History, loaded only when opened. Kept **Quick Edit, manual repo input, and multi-repo dashboard** in an optional Settings > Công cụ GitHub section to avoid losing those tools while removing the Repos tab.
- Kept selection authorization, ZIP size policies, the full security warning/consent workflow, GitHub API contracts, and Push/PR/Recovery behavior.
- Hid the redundant non-action footer on mobile; four bottom tabs distribute evenly.

## Quality checks

- Node regression tests: 472/472 passing (8 new v3.9.9 tests).
- GitHub server API route sources unchanged from v3.9.8 (check separate validation result).
- Production build requires installing Next.js dependencies. Browser/PWA device integration and real GitHub operations must be verified on a Vercel Preview deployment before production.

## Deploy

Push the **contents** of the `Zipverra-v3.9.9/` directory to the application's GitHub repository root. Deploy Vercel Preview with existing environment variables; run `npm install`, `npm test`, `npm run build`, then complete `QA_CHECKLIST_V399.md`.
