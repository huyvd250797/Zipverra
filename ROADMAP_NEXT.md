# Zipverra Pro — UX/UI Roadmap after v3.2.0

**Current baseline:** v3.2.0 — Premium Visual Identity & Color System.

## Next: v3.3.0 — Unified Component Design System

- Consolidate buttons, cards, inputs, badges, progress, skeleton, toast and dialogs into shared reusable component primitives.
- Remove competing legacy CSS selectors gradually with actual before/after visual QA.
- Establish consistent border/radius/spacing/font/icon specifications on five mobile tabs.
- Preserve one contextual Help (?) icon per screen and all critical warnings outside Help.
- Keep GitHub mutations and modal body-scroll isolation unchanged.

## Following: v3.4.0 — Mobile Layout & Navigation Redesign

- Reduce nested cards and scroll length on Repos/Upload/Review without hiding important controls.
- Improve responsive iPhone, iPad, desktop layouts and modal keyboard interaction.
- Retain 5-tab navigation and all Push/PR/Download workflows.

## v3.5.0 — Premium Workflow Experience

- Refine Review information hierarchy and prominent confirmed Push actions.
- Clarify in-progress, verified, failed and uncertain Activity states.
- Keep measured progress and explicit security/delete confirmations.

## v3.6.0 — Modal, Bottom Sheet & Motion Refinement

- Complete iOS sheet interactions, keyboard avoidance, internal scrolling and accessibility.
- Verify Reduced Motion and no page position drift on close.

## v3.7.0 — Performance & Accessibility Polish

- Profile actual rendering and startup on mobile, improve legacy component boundaries.
- Run VoiceOver, contrast, larger text, tap-target and Web Vitals QA.

## v3.8.0 — Visual QA & Stable UI Release

- CI/Vercel build, regression/e2e, iPhone Safari/PWA and responsive theme sign-off.
- Preserve existing GitHub App authorization, Safe Rollback, Security Scan and PR flows.

**Deferred:** very-large-file transfer improvements; no force-push, auto-retry of ambiguous Git writes, or unsupported iOS background-upload claims.
