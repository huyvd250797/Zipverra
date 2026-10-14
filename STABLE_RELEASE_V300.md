# Zipverra Pro v3.0.0 — Stable Release

## Summary

v3.0.0 marks the first **Stable Release** baseline for Zipverra Pro. This release does not change the Git mutation model; instead, it refines mobile presentation and stabilizes the user-facing workflow.

## Included changes

- Compact repository connectivity controls in the Repositories view header.
- Removed the large mobile Connected / Refresh status row inside repository selection.
- Fixed the visible skip-link banner issue on iPhone while preserving accessibility behavior.
- Updated product metadata, offline shell and PWA versioning to `3.0.0`.
- Verified local regression suite: **222 / 222 tests passing**.

## Safety guarantees preserved

- GitHub App authentication and installation-limited repository access.
- Smart source validation and security scanning.
- History / rollback / recovery flow.
- No force-push or automatic retry of ambiguous mutations.

## Release validation still recommended after deployment

1. `npm install` / `npm run build` on CI or Vercel.
2. Real GitHub App E2E: repo load, Direct Push, Pull Request flow, Quick Edit, History, Rollback.
3. Real iPhone PWA check in 320/375/390/430 widths.
4. Light / Dark / System theme and reduced-motion verification.
