# Zipverra Pro — UX/UI roadmap after v3.6.0

**Baseline:** v3.6.0 — Modal, Bottom Sheet & Motion Refinement; directly upgraded from user-supplied v3.5.0.

## v3.7.0 — Performance & Accessibility Polish (next)

- Measure actual mobile performance (LCP, INP, CLS, ZIP analysis duration and tab transition latency).
- Reduce render work when analyzing thousands of files and updating upload progress.
- Accessibility review: VoiceOver screen-reader names, keyboard navigation, touch targets and focus management on iPhone Safari/PWA.
- Review large list rendering, activity UI redraw frequency and lazy loading of advanced panels.
- Preserve quick confirmation and all GitHub mutation safety checks.

## v3.8.0 — Visual QA & Stable UI Release

- Complete live iPhone Safari / standalone PWA UI regression for all five tabs, ZIP Upload/Download, modal keyboard scroll lock, dark/light/system themes and focus behavior.
- Validate a production `next build` on CI/Vercel and real GitHub App authenticated E2E: Direct Push, PR, Quick Edit, History, Rollback and recovery.
- Freeze visual system after resolving blocking bugs, package the final stable UI release with documentation and rollback instructions.

**Explicitly out of scope:** automatic GitHub writes, force-push, blind retries of uncertain commits, background iOS uploads, and Vercel deployment tracking.
