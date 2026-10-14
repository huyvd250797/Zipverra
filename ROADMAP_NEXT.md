# Zipverra Pro — Roadmap after v2.8.0

**Current baseline:** v2.8.0 — Advanced UX Polish, upgraded directly from the user-supplied v2.6.0 source. **v2.7.0 — Performance & Code Architecture was intentionally skipped and is not claimed as implemented.**

## v2.9.0 — Production Hardening (next)

- Reproduce and eliminate all Next.js 16 production build errors in an environment with npm registry access.
- Run an authenticated GitHub App integration test against a disposable repository: Direct Push, PR creation, PR merge, Quick Edit, History, Rollback, scan blocking and recovery.
- Run browser E2E smoke checks for light/dark/system themes, VoiceOver landmarks, tab navigation, narrow iPhone viewports, file upload/review, keyboard and safe areas.
- Measure p75 LCP/INP/CLS and perceived startup via field RUM or device testing, not just static CSS tests.
- Audit webhook-independent PWA updates, CSP, dependency vulnerabilities, race conditions and scoped cache permissions.
- Record pass/fail evidence in release validation before calling it verified production-ready.

## v3.0.0 — Stable Release (after successful hardening)

- Freeze features, stabilize UX, publish deployment and rollback/incident playbook.
- Require green production build and functional E2E safety gate before release.

## Deferred architectural work from v2.7.0

Large page.jsx decomposition, state isolation, render profiling, API deduplication and deep bundle optimization were **not** implemented by this UX-focused release. They remain candidates for v2.9.0 if profiling justifies the change.
