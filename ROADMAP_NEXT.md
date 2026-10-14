# Zipverra Pro — UX/UI & Performance Roadmap after v2.2.0

**Current baseline:** Zipverra Pro v2.2.0 — Performance Engine & Fast Startup, upgraded directly from v2.1.0.

## v2.3.0 — Smart Workflow UX 4.0 (next)

- Extract large `app/page.jsx` presentation fragments into memoized, well-scoped view components while preserving a single safe source of truth for GitHub mutations and recovery.
- Profile cold/warm startup and minimize splash delays; avoid blocking UI waiting for GitHub API. Introduce skeleton and stale-but-labeled non-sensitive cached metadata where authorized.
- Lazy-load optional Repository Explorer, History and PR manager.
- Coalesce upload/render progress updates; virtualize long file/commit lists where measured necessary.
- Deduplicate GitHub reads with bounded cache, authorization-aware invalidation and abort stale fetches.
- Establish performance regression benchmarks: mobile LCP <=2.5s, INP <=200ms, CLS <=0.1 (p75 on specified test device/network), local tab switch <=150ms. These are **targets**, not current measurements.
- Unit tests, responsive/e2e on iPhone Safari, Next production build and smoke tests for GitHub App/PR/Rollback are required.

## v2.3.0 — Smart Workflow UX 4.0

- Unify Repo→ZIP→Analyze/Review→Confirm→Activity in guided stepper, preserve state, one-tap next actions and explicit recovery.
- Keep GitHub push verification and Pull Request safety invariants.

## v2.4.0 — Premium Interaction & Motion

- Lightweight consistent skeletons, toasts, motion/tactile patterns and `prefers-reduced-motion`, without slowing UI or masking errors.

## v2.5.0 — Workspace UX & Navigation

- Improve Repository Explorer, File History, Quick Edit and PR navigation on iPhone; maintain a discoverable workflow in five tabs.

## v2.6.0 — PWA Optimization & Reliability

- Safe-area and cache/update reliability, offline state, iOS lifecycle resilience and crash/refresh recovery.

## v3.0.0 — Polished Release

- Accessibility, performance budgets, visual regression, real-device UX acceptance, release gating, no unnecessary external integrations.

**Explicit exclusions:** Vercel Deployment Tracking, billing, unscheduled background uploads, unimplemented streaming of arbitrarily large Git blobs.
