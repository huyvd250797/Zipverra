# Zipverra Pro — UX/UI & Performance Roadmap after v2.3.0

**Current baseline:** Zipverra Pro v2.3.0 — Smart Workflow UX 4.0, upgraded directly from v2.2.0.

## v2.4.0 — Premium Interaction & Motion (next)

- Consistent, short micro-interactions for tab navigation, upload selection, progress and completion using transform/opacity.
- Clear error/success feedback without overusing toast overlays, especially near iPhone's safe area and bottom navigation.
- Reduced-motion support, accessible live status and keyboard/VoiceOver navigation; never animate actual transfer progress artificially.
- Skeleton loading for expensive optional views and smoother perceived transitions between Repository, Upload, Review and Activity.
- Responsive device testing, Core Web Vitals measured on real network/device, and production build gating before release.

## v2.5.0 — Workspace UX & Navigation

- Rework Repository Explorer, File History, Quick Edit and PR navigation for thumb-friendly iPhone usage.
- Search-first file picker, compact breadcrumbs, stronger unsaved-edit guard and clearer return paths.
- Maintain the five tabs; no arbitrary new sections in the core ZIP Push flow.

## v2.6.0 — PWA Optimization & Reliability

- More robust iOS lifecycle recovery, safe service-worker updates and offline status.
- Securely resume **metadata-only** work across reloads, requiring the user to reselect ZIP source bytes; no tokens or source content in localStorage.
- Target real-world cold start and upload diagnostics; no unsupported background push promise.

## v3.0.0 — Polished Release

- Comprehensive accessibility pass, E2E regression (GitHub App, ZIP Push, PR, History/Rollback), iPhone Safari and Vercel CI.
- Performance budgets: LCP <= 2.5s, INP <= 200ms, CLS <= 0.1 at p75 measured, not assumed.
- Stabilize component architecture, audited interactions and release checklist.

**Explicit exclusions:** Vercel Deployment Tracking, billing, automatic merge or force-push, background upload after PWA is terminated, arbitrarily large single-file uploads.
