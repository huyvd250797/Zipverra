# Zipverra Pro — Roadmap after v2.0.0

**Current baseline: Zipverra Pro v2.0.0 — Mobile Git Workspace**, upgraded directly from the supplied v1.12.0 source.

## v2.1.0 — Adaptive ZIP Transfer & Recovery
- Adaptive upload concurrency and batch sizing based on actual network/device signals.
- File-size handling architecture beyond per-function request limits (evaluate object storage with opt-in setup).
- Reduce mobile memory pressure with progressive parsing and safer cancellation, checksum diagnostics.
- Explicit recovery workflow for expired scan attestations and ambiguous branch updates.

## v2.2.0 — Mobile PR Review 2.0
- File-level PR diff, CI checks, reviewer status and merge readiness.
- Quick Edit → optional feature branch + PR instead of direct commit.
- Clear branch-protection, merge conflict and approval messages without bypassing GitHub rulesets.

## v2.3.0 — Security Policies & Release Guardrails
- Per-repository protected-path policy, explicit confirmations for sensitive changes.
- Optional integration with GitHub's secret protection signals where permitted.
- Local metadata export/import with schema validation and explicit user consent; no credential export.

## Later — Team Workspace (requires separate architecture/security review)
- Shared multi-user activity and role-based permissions, durable synchronization and notifications.
- Introduce a database and webhook processing only after scope, billing, access control and deployment constraints are specified.

**Out of scope unless requested:** Vercel Deployment Tracking, autonomous background pushes, or forced merge/deployment.
