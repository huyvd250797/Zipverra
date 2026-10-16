# Zipverra Pro v3.8.4 — Unified Notification System

**Maintenance UX release on top of v3.8.3.** No GitHub server mutation endpoint, authentication, security-consent or rollback logic was changed.

## Implemented

1. **Unified toast queue** (`lib/notification-center.js`): one toast at a time; up to three waiting messages; duplicate events suppressed while pending; verified push/PR results prioritized; stale dismissal IDs ignored. Raw API errors and secrets are never interpolated into toast messages.
2. **Context-first feedback**: repo selection, ZIP validation failures, review readiness, no-change states, GitHub errors and offline state already have on-screen status, so duplicate floating toasts are suppressed. Only informational clipboard/reconnection and verified GitHub successes remain floating. Critical security warnings still require explicit opt-in; never vanish on a timer.
3. **Persistent shared banner** (`FeedbackBanner`): reused by offline/server-reachability and PWA update notices with consistent severity tokens.
4. **Unified confirmation dialog** (`ConfirmationDialog`, `useConfirmationDialog`): applied to restart application, delete locally stored activity log, change repo/branch with an unpushed review, and discard/reset unsaved Workspace edits. Destructive actions use red buttons and default to cancellation on dismissal. Some legacy `window.confirm` guards remain in the synchronous main Workspace navigation, intentionally unchanged to avoid changing the established navigation/dirty-draft workflow.
5. **Motion and accessibility**: toast fade/slide exit; hover/focus/visibility pauses automatic dismissal; reduced-motion support; accessible labels, roles and 44px dismiss target; mobile safe-area positioning inherited from the existing pro-motion stylesheet.
6. **Version**: `package.json`, UI header/settings/footer, `APP_VERSION`, service worker cache name and public version API now indicate v3.8.4.

## Verification

- `node --test tests/*.test.js`: **329 tests passed** (320 original + 9 new in `unified-notifications-v384.test.js`).
- All 23 JSX modules checked with TypeScript JSX parser: no parse diagnostics.
- Non-JSX JavaScript checked with `node --check`: passed.
- Production `next build` **not executed** because npm dependencies are unavailable and registry DNS resolution returned `EAI_AGAIN`. Vercel must build and validate after deploying.

## Manual production smoke test

1. Select repository and ZIP. Confirm that repo selected/review complete appears in the workflow, without duplicate toast cards.
2. Copy a commit SHA; expect a small toast that dismisses automatically. Trigger a different event during it; messages must be sequential, not overwrite each other.
3. Disconnect network; expect persistent offline banner. Reconnect; expect a brief informational toast.
4. Switch repository/branch while a ZIP review exists; choose **Hủy**, verify the review is intact; then approve and verify it resets.
5. Edit a Workspace file; navigate or reset; verify the custom destructive confirmation defaults to cancellation.
6. Trigger a security warning; ensure the existing consent dialog and explicit Commit/Push confirmation are still required.
7. Verify PR/commit success is only announced after GitHub result verification. Inspect Activity/Recovery after ambiguous network failure.
8. Check iPhone Safari/PWA, Android Chrome, and desktop; light/dark appearance; modal focus and button accessibility.

## Next roadmap

v3.8.5 — Smart Warning & Review UX (separate release; not included here). Remains feature-frozen except targeted UX maintenance.
