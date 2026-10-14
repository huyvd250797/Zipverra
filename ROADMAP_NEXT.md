# Zipverra Pro — Roadmap after v3.0.1 Source ZIP Download

**Current baseline:** v3.0.1 — Source ZIP Download (stable maintenance release).

The v3.0.1 update adds an authorized main-branch ZIP download while preserving GitHub App authorization, mobile Push workflow, Pull Requests, History, and Safe Rollback.

## Next recommended versions

### v3.1.0 — Repository Workflow Clarity
Focus:
- Better empty/loading/error states for repository list, branch list and Quick Edit.
- Stronger contextual guidance before Upload / Review / Push.
- Smarter repo/branch memory with clearer “current destination” summaries.
- Cleaner desktop/tablet adaptive layouts while preserving mobile-first flow.

### v3.2.0 — Measured Performance Architecture
Focus:
- Reduce unnecessary re-renders in large workspace screens.
- Deeper component splitting and memoization around Activity / History / Workspace.
- Performance telemetry for startup, repo refresh and ZIP analysis.
- More predictable loading budget on older mobile devices.

### v3.3.0 — Large Source Delivery Reliability+
Focus:
- Better resumable upload recovery for larger source packages.
- Stronger preflight estimation before blob upload begins.
- More transparent progress, ETA and retry guidance for unstable networks.
- Optional batching refinements while keeping mutation safety strict.

## Product direction kept unchanged
- No force-push.
- No automatic retry of ambiguous Git mutations.
- No background iOS upload claims beyond platform limits.
- No broad OAuth repo scope fallback; GitHub App remains the primary authorization model.
