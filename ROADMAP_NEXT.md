# Zipverra Pro — Roadmap after v2.9.0

**Baseline:** v2.9.0 — Production Hardening. Upgraded directly from the supplied v2.8.0 full source. No Vercel Deployment Tracking and no unimplemented v2.7.0 architecture migration.

## Next: v3.0.0 — Zipverra Pro Stable Release

v3.0.0 is a *release gate*, not an automatic version bump. The following must be demonstrated and documented before the Stable label can be used:

1. A successful `npm ci`/`npm install` and Next.js 16 `npm run build` on CI/Vercel. Record the build SHA and any warnings.
2. Automated unit and security regression tests green, and a **real** GitHub App authenticated E2E run on an isolated disposable repository: Direct Push, verified SHA, PR create/review/merge, Quick Edit, History, Rollback and recovery after a timeout.
3. Safari on an actual iPhone **standalone PWA**: start Push after scrolling the Upload Review to the bottom; immediately land on Activity at the top with live stage/timeline visible. Repeat with normal-speed animation and reduced-motion enabled, plus a second navigation to Activity.
4. Production diagnostics: validate `GET /api/version` no-store response, new public SW namespace, no private Cache Storage entries, 403/413/429 error presentation and expired GitHub App sessions.
5. Light/Dark/System theme and 320px/375px/390px/430px viewport checks, safe-area keyboard, touch targets, VoiceOver focus and tab switching.
6. Measure real-device LCP, INP, CLS, initial load, and API round-trips; compare against v2.8.0 instead of claiming unmeasured speedups.
7. Review dependency advisories and configuration. Ship tagged GitHub release only after all critical checks pass.

## Post-stable candidates (not part of v2.9.0)

- v3.1.0 — measured component/state isolation and performance architecture (the deferred v2.7.0 work).
- v3.2.0 — reliable upload improvements for larger single-file assets (requires backend design beyond Vercel function body limits).

**Explicitly excluded:** auto-merge, force-push, automatic retries of ambiguous Git mutations, background iOS uploads, Vercel API tracking.
