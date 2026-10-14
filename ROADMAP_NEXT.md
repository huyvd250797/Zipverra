# Zipverra Pro — UX/UI & Performance Roadmap after v2.5.0

**Current baseline:** Zipverra Pro v2.5.0 — Workspace UX & Navigation (upgraded from v2.4.0 supplied source).

## v2.6.0 — PWA Optimization & Reliability (next)

**Goal:** improve app lifecycle reliability and continuity on iPhone, without unsafe automatic GitHub writes.

- Recover metadata-only pending operations after the PWA is interrupted. Explicitly reselect ZIP to recover source bytes; never store ZIP content or credentials locally.
- Safe PWA version update prompts, network-state feedback, stale-cache protection and resilient GitHub session revalidation.
- Optimize loading of heavy panels, offline read-only metadata, and app start behavior on poor mobile networks.
- Ensure upload/PR/rollback uncertainty always triggers read-only verification before any repeated mutation.
- iOS Safari/standalone PWA smoke tests (safe areas, foreground/background, keyboard, reduced motion).
- Production requirement: real `npm run build`, CI regression, GitHub App E2E against a disposable repo.

## v2.7.0 — Performance & Code Architecture

- Split monolithic app orchestration into stable components and hooks without losing ZIP, review or recovery state.
- Audit API deduplication, safe caching, Web Worker main-thread effects and list rendering for large repositories.
- Collect measured LCP/INP/CLS and page-level response metrics; do not claim gains without measurements.

## v2.8.0 — Advanced UX Polish

- Accessibility pass for VoiceOver, keyboard navigation, large text, light/dark contrast and motion preferences.
- Consistent empty/error/loading states, responsive layouts and touch targets across Repository Explorer, Push, PR and History.

## v2.9.0 — Production Hardening

- GitHub auth/permissions, ZIP upload/scan, PR, Quick Edit and Safe Rollback end-to-end QA.
- Address build/runtime errors, network ambiguity, conflict workflows and operational diagnostics.

## v3.0.0 — Zipverra Pro Stable Release

- Stable release only after automated tests, production build, live GitHub E2E and iPhone Safari/PWA release gates pass.

**Out of scope unless separately requested:** Vercel Deployment Tracking, billing, automatic PR merge/force push, unattended background commits and unlimited single-file upload.
