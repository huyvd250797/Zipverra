# Zipverra Pro — UX/UI Roadmap after v3.5.0

**Baseline:** Zipverra Pro v3.5.0 — Premium Workflow Experience (Graphite Navy + Emerald), built on v3.4.0 mobile navigation.

## Next: v3.6.0 — Modal, Bottom Sheet & Motion Refinement

- Refine iOS Safari keyboard avoidance, inert background, nested scroll containment, touch gestures and focus return for Repository/Branch/Help sheets.
- Consolidate motion durations, avoid layout shifts and respect Reduced Motion across all overlays and the main 5-step workflow.
- Add real-device QA for native Safari/PWA, scroll restoration and accessibility focus behavior.

## v3.7.0 — Performance & Accessibility Polish

- Measure LCP, INP, CLS, React render duration and tab latency on actual mobile hardware.
- Reduce redundant re-renders, lazy-load advanced editors/history and optimize large file-list rendering.
- Audit VoiceOver, minimum touch target dimensions, Dynamic Type and contrast.

## v3.8.0 — Visual QA & Stable UI Release

- Confirm full Next.js/Vercel production build, GitHub App E2E and iPhone standalone PWA tests.
- Complete Dark/Light/System responsive screenshots and keyboard/safe-area audits.
- Perform regression passes over ZIP Upload/Download, Direct Push, Pull Request, Security Scan, Quick Edit, History, Rollback and Recovery Center.

**Not planned:** auto-push, force-push, automatic retries of ambiguous GitHub writes, background iOS ZIP uploads, or Vercel API tracking.
