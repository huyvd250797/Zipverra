# Zipverra Pro — Roadmap after v3.1.0

**Current baseline:** v3.1.0 — Repository Workflow Clarity.

## Next: v3.2.0 — Measured Performance Architecture

- Isolate state and rendering in heavy Activity, Review, Workspace and History screens.
- Profile and reduce unnecessary re-renders during ZIP processing and file upload.
- Lazy-load advanced panels and audit actual initial JavaScript bundle size.
- Measure cold/warm startup, page responsiveness, list render time and memory on iPhone.
- Apply safe caching only to non-sensitive, account-isolated metadata. Never cache tokens/private GitHub responses in the service worker.
- Preserve all direct Push, PR, Quick Edit, History, Rollback and Security Scan safeguards.

## Following: v3.3.0 — Large Source Delivery Reliability+

- Strengthen resume diagnostics, upload checkpoints and source validation for large repositories.
- Improve memory bounds and error handling on unstable cellular networks.
- Assess a dedicated large-binary transport beyond Vercel Function payload constraints rather than claiming unlimited upload support.

## Later: v3.4.0 — Mobile Quality & Accessibility Audit

- End-to-end iPhone PWA testing, Safari modal/bottom-sheet behavior, VoiceOver, keyboard, safe areas and Reduced Motion.
- Verify deployed Next.js build, update lifecycle and GitHub App E2E on disposable repositories.

Avoid force-push, automatic retries of ambiguous Git mutations and iOS background upload claims.
