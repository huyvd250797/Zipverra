# Zipverra Pro v3.9.15 — Acceptance Checklist

## Environment
- [ ] GitHub App configuration and session validated.
- [ ] Private Vercel Blob is connected, `BLOB_READ_WRITE_TOKEN` exists server-side only.
- [ ] `CRON_SECRET` exists for the scheduled private Blob cleanup.
- [ ] `npm install`, `npm test`, and `npm run build` pass in Vercel Preview / GitHub Actions.
- [ ] `/api/version` returns `3.9.15` and PWA service-worker updates safely.

## Files and security
- [ ] Small file 2.5 MB and 3MB direct upload still succeed, with matching Git SHA.
- [ ] File 3MB+1 through 20 MiB uses private client upload and server-side scan; original ZIP is never POSTed to a Vercel Function.
- [ ] File 20MiB+1, corrupt ZIP, path traversal, oversized archive, and 2,501st source file are rejected.
- [ ] A changed ZIP containing a file >3MB displays an actionable warning during analysis if Blob storage is not configured.
- [ ] Wrong SHA, wrong user/repository/path, expired ticket and oversized temporary Blob cannot lead to a GitHub write.
- [ ] Sensitive names/credentials still require separate server-enforced confirmation, including large files.
- [ ] Successful/failed finalized uploads delete private temp; abandoned objects >24h cleaned by cron.

## Desktop
- [ ] On 900×700, 1366×768, 1440×900 and 1920×1080, analyze ZIP: progress panel displays stage, percent and status without switching to Activity.
- [ ] During Push, Activity progress has percent and file count; long large-file uploads show current per-file percentage.
- [ ] Failed preflight/network/security conditions show readable error message instead of a fake success state.
- [ ] Dark/Light modes, keyboard navigation, responsive layout and no horizontal overflow.

## Existing workflows
- [ ] Mobile 375×667, 390×844, 430×932 flows are unchanged.
- [ ] Commit & Push, Pull Request, branch protection, Sync deletion, Risk Center, Recovery and PR Merge unchanged.
- [ ] Multiple blobs and recovered/expired attestations remain valid, no double commit on uncertain network result.
- [ ] Repo ranking updates only after GitHub verifies a successful Commit, not on selecting a repo.
