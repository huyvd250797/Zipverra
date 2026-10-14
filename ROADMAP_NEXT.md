# Zipverra Product Roadmap — After v1.11.0

**Source baseline:** v1.9.0 → v1.11.0 (direct version jump; v1.10.0 Security & Smart Source Validation was not implemented).

## v1.12.0 — Security & Smart Source Validation

- Detect likely API tokens/credentials in ZIP and Quick Edit source content with server-side protection; do not log or persist secrets.
- Dependency/config review, ZIP path traversal and archive bomb hardening, workflow permission verification.
- Severity-based security report with actionable remediation and explicit exclusions.
- Tests for false positives, secrets leakage, GitHub App scope, binary and ZIP edge cases.

## v1.13.0 — Adaptive Performance & Reliable Large Upload

- Adaptive batch sizes/concurrency, safer mobile RAM use, resume checkpoint expiration and diagnostics.
- Architecture for individual files over Vercel Function body limits without embedding credentials in the browser.
- Network interruption, duplicate retry and large binary tests.

## v1.14.0 — Pull Request Review Experience

- PR diff and CI summary with refreshed checks/statuses, reviewers and comments.
- Branch and PR creation for single-file Quick Edit, not only ZIP Push.
- Optional new-release comparison across multiple commits and review-required policy.

## v2.0.0 — Mobile Git Workspace

- Pin multiple repos, manage branches and PRs, version compare and safe rollback under one consistent PWA UX.
- No Vercel Deployment Tracking unless explicitly requested.
