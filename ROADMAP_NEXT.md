# Zipverra Pro — UX/UI Roadmap after v3.3.0

**Current baseline:** v3.3.0 — Unified Component Design System (Graphite Navy + Emerald).

## Next: v3.4.0 — Mobile Layout & Navigation Redesign

- Reduce nested cards and duplicate information on Repos and Upload/Review.
- Improve the iPhone one-handed flow, header spacing, fixed bottom navigation and safe-area handling.
- Make the repository current selection and Upload/Download actions easier to find without scrolling.
- Keep the five-tab navigation, compact contextual Help and the new frequent/recent repository suggestions.
- Preserve keyboard accessibility and iOS background scroll lock when a modal or bottom sheet is visible.

## Following: v3.5.0 — Premium Workflow Experience

- Refine Review summaries, action hierarchy, meaningful loading states and verified Activity outcomes.
- Keep actual progress measurements and explicit security/Sync/commit confirmations.

## v3.6.0 — Modal, Bottom Sheet & Motion Refinement

- Test real iOS Safari/PWA keyboard avoidance, focus management and nested overlay handling.
- Complete reduced-motion coverage and touch responsiveness.

## v3.7.0 — Performance & Accessibility Polish

- Profile startup/render/API latency with real field measurements.
- Audit contrast, touch targets, VoiceOver and responsive typography.

## v3.8.0 — Visual QA & Stable UI Release

- Verify Vercel production build, GitHub App E2E (Push/PR/Quick Edit/History/Rollback), UI regressions and PWA lifecycle.

**Deferred:** large-file transfer backend migration, auto-merge, force-push and automatic retries of ambiguous Git writes.
