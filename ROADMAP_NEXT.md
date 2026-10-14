# Zipverra Pro — UX/UI & Performance Roadmap after v2.6.0

**Current baseline:** Zipverra Pro v2.6.0 — PWA Optimization & Reliability, upgraded from v2.5.0.

## v2.7.0 — Performance & Code Architecture (next)

**Goal:** measure and remove real UI bottlenecks while keeping GitHub mutation safety.

- Break large `app/page.jsx` orchestration into focused hooks and memoized feature components while preserving one source of truth for ZIP/Review/Activity state.
- Audit effects, redundant fetches, cache deduplication and renders caused by high-frequency Web Worker/upload progress events.
- Virtualize very large repository/file lists and optimize mobile code viewer only where profiling demonstrates benefit.
- Instrument key user journeys (cold/warm startup, tab navigation, ZIP analyze, Review render, verify), collect LCP/INP/CLS, compare before/after at p75.
- Review Next.js bundle sizes and dynamically import heavy optional UI, without introducing stale/auth-mixed data.
- Confirm dependency-install, `npm test`, `npm run build` and iPhone PWA smoke tests in a networked CI/production environment.

## v2.8.0 — Advanced UX Polish

- Accessibility pass: VoiceOver, keyboard, large text, motion preferences, light/dark contrast.
- Consistent empty/error/loading/recovery states across Repos, Upload, Workspace, Activity, PR and History.
- Safe-area/mobile gesture and responsive audit on real iPhones.

## v2.9.0 — Production Hardening

- Full GitHub App E2E across ZIP Push, PR, Quick Edit and Safe Rollback in a disposable repository.
- Restore from interrupted sessions, stale HEAD/permission, server timeouts and iPhone backgrounding.
- Security review of cookies, API cache headers, service worker lifecycle, ZIP secret scanning and recovery journals.

## v3.0.0 — Zipverra Pro Stable Release

- Stable release only after tests, production build, live GitHub E2E, iPhone PWA verification and rollback readiness pass.

**Out of scope unless requested:** Vercel Deployment Tracking, paid tiers, unbounded files, automatic PR merge/force-push, unattended background GitHub commits.
