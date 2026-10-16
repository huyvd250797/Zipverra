# Zipverra Pro v3.8.3 — Maintenance Hotfix

Baseline: Zipverra Pro v3.8.2. Feature Freeze remains active; only requested UX and safety advisories changed.

## What changed

1. **Bottom sheet motion** — slide up + fade in on open; slide down + fade out on dismiss, including close button, Escape and backdrop. Exit stays visible briefly before dialog is actually closed. Reduced-motion users get an immediate close.
2. **Tab motion** — previous view fades out for 150ms; next view fades in. This does not reset the selected GitHub repository, ZIP, or Review while navigating ordinary tabs.
3. **Clean restart** — tapping Zipverra's logo/name or the Repos refresh icon reloads the application. Previous transient choices are discarded, and the app starts with no repository or ZIP chosen. It asks before discarding unsaved source, protects in-progress GitHub operations and unresolved recovery tasks, and keeps theme and account-scoped history/favorites.
4. **Wrong project warning** — after ZIP analysis, a local heuristic checks meaningful file path overlap, optional root package.json names, and Git blob SHA matches against the selected branch's repository tree. When confidence is high, a red **NGHIÊM TRỌNG** banner appears, with an extra explicit acknowledgment. Even then, normal confirmed Commit & Push / PR remains available. No GitHub server permission / protection bypass is introduced.
5. **No theme flash** — saved Dark / Light / System preference is applied before first body paint; startup splash now follows the current theme.

## GitHub action invariants

- No GitHub server write endpoint was modified.
- Wrong-project findings are advisory; no automated Push / PR is performed.
- Sensitive file acceptance in v3.8.2 is unchanged, with distinct confirmation.
- Stale HEAD, token permissions, branch protection, malicious ZIP paths, and GitHub Push Protection stay enforced.
- App restart never discards a pending write verification record by silently clearing its session journal.

## Validation

- `npm test`: **320/320 passed**.
- Syntax parse of **96 JS/JSX** files: passed.
- `npm install` failed due DNS resolution `EAI_AGAIN` against `registry.npmjs.org` in build container; therefore production `next build` and live Safari/GitHub E2E are **not verified in this environment**. Vercel production build remains required.

## Manual QA checklist (after deploying preview)

- Safari iPhone: bottom sheet from repository/branch picker opens upward and fades in, closes downward and fades out, Escape / backdrop close correctly, no background scroll.
- Tabs Repos, Upload, Activity, History, Settings: fade out/in and no cross-tab data loss.
- Choose repo and ZIP; tap top-left Zipverra wordmark or Repos refresh icon; cancel preserves data, confirm reloads to unselected initial state; theme, recents/favorites remain.
- Upload a wholly unrelated, nontrivial source ZIP; see **red warning** after analysis. Tick acknowledgment + ordinary confirmation; still permit Push / PR after usual GitHub checks.
- Upload same project or a small patch/empty repo; avoid false critical warning. If mismatch confidence is insufficient, advisory message only.
- Switch Dark/Light/System and reload/PWA cold start; no light-to-dark flash.
- Verify Vercel build, GitHub PR/Push and branch-protection behaviors in a disposable test repository before using this on production.
