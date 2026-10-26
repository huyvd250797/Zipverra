# Zipverra Pro v3.9.16 — Build Import Resolution Hotfix

## Root cause and correction

The `v3.9.15` release includes `lib/large-blob-ticket.js`, but the API route at `app/api/large-upload/route.js` imported it using `../../lib/large-blob-ticket.js`. Relative to this file that points inside `app/lib/`, which does not exist. The same route had three additional incorrect imports for the GitHub session, authentication helper and file-size constants.

All four imports now resolve through `../../../lib/`. No functionality was deleted. A new automated test verifies **all relative static imports under app/ and lib/** before a release is packaged.

## Scope

- Maintain the 20 MiB per-file ceiling and Private Vercel Blob transport for files over 3 MB.
- Preserve desktop upload progress and existing mobile layout.
- Preserve Github auth, session checks, security tickets, Security Scan, risk consent, Commit, PR, Recovery and server routes.
- Synchronize package/runtime/PWA version to `3.9.16`.

## Deployment

1. Extract `Zipverra-v3.9.16/` and push its contents to the repository root (do not nest the folder).
2. Deploy a Vercel Preview and execute `npm install`, `npm test`, `npm run build` in a network-enabled environment.
3. Confirm `/api/version` reports `3.9.16` and the PWA reloads the public cache after approval.
4. If using uploads over 3 MB, configure Private Vercel Blob's `BLOB_READ_WRITE_TOKEN`; `CRON_SECRET` is optional for stale-object cleanup.

This is a build-resolution hotfix. End-to-end Vercel Build, GitHub Push and physical iPhone testing must be completed before calling it production stable.
