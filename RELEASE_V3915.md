# Zipverra Pro v3.9.15 — Large File Upload & Desktop Progress UX

## Changes

- **20 MiB maximum per uncompressed file inside ZIP** (120 MiB standard / 200 MiB extended ZIP limits unchanged).
- **0–3 MB:** existing server-scanned per-file upload to `/api/github/blob`, still below Vercel's 4.5 MB Function payload limit after Base64/JSON encoding.
- **Over 3 MB through 20 MiB:** browser uploads to a **Private Vercel Blob store** with a short-lived, user/repository/path/SHA/size-bound ticket. The server retrieves the bytes privately, verifies exact length and Git SHA, rescans content, requires explicit sensitive-file approval, creates the GitHub blob, and returns the existing signed attestation. A normal GitHub Commit retains exactly the same verification and security workflow.
- A Private Blob upload requires the Blob store to be connected to this Zipverra deployment (`BLOB_READ_WRITE_TOKEN`). If missing, analysis reports this requirement before the user reaches Review/Push for selected changed files over 3 MB.
- Temporary Blob objects are deleted after finalization whether it succeeds or fails. An authenticated discard route handles failed completion. A daily authenticated maintenance route removes remaining temporary blobs older than 24 hours when `CRON_SECRET` is configured.
- Desktop-only progress panel displays stage, progress percentage, file count, speed, and actionable failure messages; mobile presentation is unchanged. The visible percentage is **workflow progress**; it is not a byte-perfect GitHub network percentage for small API requests.
- GitHub blob outbound request timeout raised to 90s for large files; finalization browser request timeout raised to 185s. No blind retry on Commit.
- Direct Push, PR/Merge, Review, sensitive-file acknowledgements, Sync deletion confirmations and existing GitHub API contracts remain intact.

## Vercel setup for large files

1. In the Vercel project hosting **Zipverra**, open **Storage** and create a **Private Blob** store. Connect it to the same project/environment. This provisions `BLOB_READ_WRITE_TOKEN` (keep server-only).
2. Configure `CRON_SECRET` as a strong random secret for Vercel Cron to delete orphaned temporary blobs after 24 hours. Without this variable, the daily job deliberately skips cleanup.
3. Redeploy. For files <=3 MB no Blob setup is required; files >3 MB need the private store.
4. Run `npm install --no-audit --no-fund` to install `@vercel/blob` along with the project's existing dependencies. `npm run build` and `npm test` must pass on Vercel/GitHub Actions.
5. On a **test repository**, verify files of sizes 2.5MB, 3MB, 3MB+1, 10MB, 20MiB, and 20MiB+1; review exact GitHub SHA, source security results, temp deletion and long-running uploads.

**Note:** Vercel Blob uses storage, transfer and request quotas and may incur fees depending on the plan. Uploads interrupted before finalization may leave temporary private objects until the cleanup task runs.

## QA status

- 518 automated Node tests pass, including 10 new coverage cases for ticket integrity, private streaming, SHA mismatch, bounded sizes, server-side security validation, temporary cleanup, and desktop feedback.
- The supplied v3.9.14 archive contained **seven stale tests** referring to experimental v3.9.10–v3.9.11 tab animations that were previously rolled back. These tests were realigned with the v3.9.14/v3.9.15 baseline without changing tab animation behavior.
- Existing GitHub API route files were kept byte-identical; new endpoints added under `/api/github/large-blob`, `/api/large-upload`, and `/api/maintenance`.
- `next build` and real GitHub/Vercel Blob end-to-end uploads could **not** be verified in this environment because npm registry resolution fails. This release is a **Release Candidate**, not certified Production Stable.
