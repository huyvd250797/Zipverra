# Zipverra Pro v2.2.0 — Performance Engine & Fast Startup

## Source of truth

- `app/styles/pro-design-system.css`: semantic UI tokens, shared component styling, responsive rules, focus/low-motion support; imported **after** legacy `app/globals.css` from `app/layout.jsx`.
- `app/components/ProfessionalUI.jsx`: small reusable presentation-only components; no API requests, no local/session storage, no mutations. Do not move authorization or data-safety operations here.
- `app/page.jsx`: retains all workflow state and GitHub API orchestration. UI modernization must never reset ZIP/preview/PR recovery on an unrelated tab change.

## Token families

- Surfaces: `--pro-bg`, `--pro-surface`, `--pro-surface-2`, `--pro-surface-raised`, `--pro-input`.
- Text: `--pro-text`, `--pro-muted`, `--pro-subtle`.
- Actions: `--pro-accent`, `--pro-accent-hover`, `--pro-accent-ink`, `--pro-accent-surface`, `--pro-focus`.
- Borders/shadow: `--pro-border`, `--pro-border-strong`, `--pro-shadow`.
- Sizing: `--pro-radius-sm/md/lg/xl`, `--pro-space-1..8`; motion: `--pro-fast`, `--pro-normal`, `--pro-ease`.
- Light theme overrides semantic values through `html[data-theme="light"]`; never hardcode an assumed dark surface for new components.

## UX rules

1. Choose repository **before** ZIP upload. Never auto-push on file selection.
2. Security Review and Sync deletion acknowledgement remain explicit. Only actually chosen changes reach commit.
3. Direct Push is the default; PR is optional and not auto-merged.
4. Navigate to Activity immediately after Push starts. State names distinguish success from unknown/ambiguous result.
5. Keep five-tab mobile navigation: Repos / Upload / Activity / History / Settings.
6. GitHub App access configuration belongs to Settings; Repository selection should not become an auth-permission dashboard.
7. Be responsive at 320–1280 px and keep safe-area insets for standalone PWA.
8. Focus indicators are visible to external keyboards and `prefers-reduced-motion` removes nonessential animations.
9. Do not present estimated upload time as guaranteed. `aria-valuenow` uses real progress from the current workflow.

## Performance follow-up for v2.2.0

- Split monolithic page orchestration into view-level memoized components **without remounting** active upload/commit and recovery state.
- Lazy-load heavy Explorer/History on demand; measure `LCP`, `INP`, `CLS` and tab-switch response before/after.
- Coalesce file-progress updates; use virtualization when review list or file explorer contains thousands of items.
- Audit and reduce legacy CSS once visual regressions are measured; do not blindly delete the original CSS with dependencies across older views.
