# Zipverra Roadmap — After v1.12.0

**Current baseline:** Zipverra v1.12.0 — Security & Smart Source Validation.

## v1.13.0 — Adaptive Performance & Reliable Large Upload

- Adaptive batch/concurrency based on network performance and device memory.
- More robust encrypted/expiring upload session metadata, progress resumption and diagnostics.
- Explore direct-to-object-storage upload for individual files larger than Vercel request limits.
- Stream file hashing and progressive ZIP extraction to reduce iPhone memory pressure.
- Recovery/reconciliation tests across backgrounding, flaky network, auth refresh and retry.

## v1.14.0 — Advanced Pull Request Review

- Mobile file-level diff for Pull Requests, CI checks, reviewer status and merge readiness.
- Create PR directly from Quick Edit without manual branch setup.
- Review-required policies and guardrails for merge (no bypass of GitHub protections).

## v1.15.0 — Security 2.0

- Optional GitHub secret-scanning / push-protection status integration where available.
- Improved security rules and dedicated exception handling with audit trail (without saving secrets).
- Repo-specific scanning policy and protected files with team approval.

## v2.0.0 — Zipverra Mobile Git Workspace

- Unified Repos → Upload/Workspace → Review → Activity workflow.
- Branch/PR manager, Git history, safe rollback, reliable source validation.
- No Vercel Deployment Tracking unless explicitly requested.
