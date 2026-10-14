# Zipverra Pro — UX/UI & Performance Roadmap after v2.4.0

**Current baseline:** Zipverra Pro v2.4.0 — Premium Interaction & Motion, upgraded directly from v2.3.0.

## v2.5.0 — Workspace UX & Navigation (next)

**Goal:** Make advanced GitHub source editing and PR review genuinely comfortable on iPhone, without adding a sixth tab.

- Repository Explorer: searchable tree, compact breadcrumbs, favorite folders and clear return-to-Repo navigation.
- Quick Edit: unsaved-changes exit guard, mobile editing toolbar, clear diff before Save, large-file read-only notice.
- Pull Requests: compact, review-first mobile layout, CI/merge status entry points; no automatic merge.
- History: visual grouping, timeline filters and safer rollback confirmation presentation.
- Maintain GitHub App permission checks, exact HEAD/SHA guards, Security Scan and explicit commit consent.
- Acceptance: 320–430 px iPhone QA, reduced motion, keyboard/VoiceOver, no horizontal overflow and real GitHub E2E on disposable repo.

## v2.6.0 — PWA Optimization & Reliability

- More robust iOS lifecycle recovery, safe service-worker updates and offline status.
- Securely resume **metadata-only** work across reloads, requiring the user to reselect ZIP source bytes; no tokens or source content in localStorage.
- Target real-world cold start and upload diagnostics; no unsupported background push promise.

## v3.0.0 — Polished Release

- Comprehensive accessibility pass, E2E regression (GitHub App, ZIP Push, PR, History/Rollback), iPhone Safari and Vercel CI.
- Performance budgets: LCP <= 2.5s, INP <= 200ms, CLS <= 0.1 at p75 measured, not assumed.
- Stabilize component architecture, audited interactions and release checklist.

**Explicit exclusions:** Vercel Deployment Tracking, billing, automatic merge or force-push, background upload after PWA is terminated, arbitrarily large single-file uploads.
