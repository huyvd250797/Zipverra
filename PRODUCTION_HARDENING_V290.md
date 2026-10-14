# Zipverra Pro v2.9.0 — Production Hardening

## Summary

Built directly from the user-supplied v2.8.0 full ZIP. This release is **source-ready for CI validation**, not certified production-safe until all release gates below pass.

### Mobile Activity scroll fix (primary reported bug)

**Before:** `goToTab()` ran `window.scrollTo({top:0,behavior:'auto'})` synchronously before React committed the new tab, while `html` was configured with smooth scrolling. When transitioning from a long Upload/Review pane to the shorter Activity view, iOS Safari could preserve/clamp a stale low scroll position. The Activity's *Recent Actions* appeared instead of the live flow at the top.

**After:** `goToTab` updates the tab state. A React post-render effect schedules scroll correction over two animation frames. On mobile (`max-width:760px`) the window/document/body scroll to zero using `instant` and a temporary inline `scroll-behavior:auto` override. Desktop retains `scrollIntoView` for Activity. Repeated taps on Activity also position the viewport, and teardown cancels stale scheduled frames. In Activity, `Live Operations` and the actual GitHub progress timeline now appear before Recovery Center and the separate Recent Actions panel.

**Verify on iPhone:** Open Upload, scroll to bottom, choose/Review ZIP, tick confirmation and tap Push. Activity must appear at the top (header → Live Operations → live timeline/status). Do not scroll down to Recent Actions to understand active processing. Repeat after success, with interrupted connection and with Reduced Motion. Test an already-active Activity tab tap as well.

### API boundary hardening

- `lib/request-body.js` implements a 4 MiB bounded JSON parser for GitHub JSON endpoints. It checks declared Content-Length and actual streamed bytes, rejecting over-limit uploads with HTTP 413, and malformed bodies with HTTP 400.
- `lib/http.js` handles safe body errors without echoing parser internals and preserves token rotation, CSRF and GitHub App session checks.
- The per-file Git blob upload limit remains **2.5 MB decoded** in the existing codebase. Zip files can be larger because the browser uploads blobs in small batches; this hardening does not add support for large individual files.
- `next.config.mjs` disables the framework signature and sets `nosniff`, DENY framing, referrer and permissions policy headers while retaining SW `no-store` policy. No CSP is enforced without a production compatibility test (Next.js inline scripts/hydration need evaluation).

### Safe error handling

- `app/error.jsx` and `app/not-found.jsx` provide minimal, actionable fallback views without printing `error.message`, stack traces or tokens.
- Reset/reopen actions require a user click and never rerun a GitHub mutation automatically.

### What remains unverified

- `npm install` failed with `EAI_AGAIN` in the artifact environment; dependencies were unavailable, so `npm run build` has **not** run successfully here.
- No authenticated GitHub App E2E, PR merge, rollback, iPhone Safari standalone PWA, or production Vercel runtime test was possible from this environment.
- Mobile Activity scroll is covered by deterministic fake viewport/animation-frame unit tests, not yet by live iOS device automation.
- No production Web Vitals measurement has been performed; the release is not a measured speed optimization.

## Verification checklist

1. Deploy source root on the original GitHub repository using the existing five GitHub App environment variables; keep credentials out of files.
2. Require green GitHub Actions unit/build and check Vercel build logs. Verify version in header, Settings, footer and `/api/version` all say v2.9.0.
3. Perform the mobile Activity scroll reproduction above on real iPhone Safari and installed PWA, including poor network and very long Recent Actions history.
4. Test 403 branch protection, 413 excessive JSON payload, expired session, offline PWA fallback, manual PWA update and cache privacy.
5. Run a disposable GitHub repository test of Direct Push, PR, Quick Edit, History and rollback. Do not perform rollback on important source before validating authorization and recovery.
6. Perform dependency advisory review; audit protected CI secrets and least privilege of GitHub App installation.
7. Do not claim Stable status until the real production/build/E2E gates pass; refer to ROADMAP_NEXT.md for v3.0.0.
