# Zipverra Pro — Roadmap after v3.8.0

**Baseline:** v3.8.0 — Visual QA & Stable UI Release from the complete user-supplied v3.6.0 source.

## v3.8.0 release gates (before production certification)

- [x] Preserve GitHub App authentication, server-side security scan, explicit confirmation and mutation recovery contracts.
- [x] Add bounded file-list scrolling and one-tap return to the original gated Push decision.
- [x] Regression checks and consistent 3.8.0 UI / PWA version metadata.
- [ ] `npm install`, `npm test` and `npm run build` on networked GitHub Actions / Vercel.
- [ ] Authenticated disposable-repository E2E: ZIP Direct Push, PR, Quick Edit, Download, History, Rollback, interrupted commit verification.
- [ ] Real Safari and standalone PWA on physical iPhone (keyboard/modal/VoiceOver, background/resume, light/dark, reduced motion, offline).

## v3.9.0 — Performance & Accessibility Certification (proposed)

- Profile large ZIP parsing and source compare with real archive samples to reduce memory and rerenders.
- Add browser automation against a safe authenticated staging environment for mobile and desktop paths.
- Complete VoiceOver / keyboard usability audit, focus order and tab labels.
- Track Core Web Vitals (LCP, INP, CLS) through a privacy-preserving, opt-in strategy.

**Out of scope:** automatic GitHub writes, forced pushes, blind retries of uncertain commits, background iOS uploads, or silent PR merges.
