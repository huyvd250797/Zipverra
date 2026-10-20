# Zipverra Pro v3.8.9 — Large Archive Support & Memory Optimization

## What's changed

- **Standard ZIP:** up to **120 MiB** compressed / **240 MiB** declared and actual uncompressed content.
- **Extended ZIP:** up to **200 MiB** compressed / **400 MiB** uncompressed, enabled **per ZIP** after an explicit warning and confirmation. The extended decision is not persisted.
- **Other limits unchanged:** 2,500 source files, 10,000 ZIP members, 2,500 changes/commit, 12,000 tracked repository files, 2,500,000 bytes per file, default concurrency 2, batch 12.
- **Metadata-first Web Worker:** decode and scan each file in the Worker, transfer only path/size/Git SHA/file mode and redacted findings to React. A small **parsed** package manifest subset is returned for framework/mismatch detection; raw package contents are not transferred. The compressed archive stays in the Worker, and file bytes are requested individually for a permitted Diff or an upload. Each on-demand read verifies size and SHA again.
- **Safety:** GitHub API and server-side content scans remain unchanged. Keep signed blob attestations for 60 minutes; before Commit, inspect proof expiries and re-upload/re-scan only those close to expiry. If proofs cannot be renewed or are too old after the refresh sequence, **fail closed before Commit**. No automatic retry of an ambiguous GitHub write.
- **Worker lifecycle:** release compressed archive and temporary state on source/repository change, invalid candidate, analysis error, unmount, or reset; preserve the Worker during Review and upload.
- **UX:** preserve the single Live Activity progress bar; show clear Standard/Extended capacity information and a one-time large-archive warning.
- **PWA:** synchronized app, server-reported, and service-worker cache version `3.8.9`.

## Technical boundaries / caveats

- JSZip still loads the **compressed** ZIP in the Worker and decompresses one entry at a time. This is memory reduction, **not** a fully streaming ZIP decoder. 200 MiB may still exceed Safari's memory budget on some iPhones.
- Browsers without a working Web Worker support a legacy 80 MiB fallback. Larger archives fail with a clear message rather than risking main-thread decompression.
- Only a correctly selected source ZIP with all file/count/expanded limits respected is supported. Git LFS, symlinks, ZIP traversal, file size >2.5 MB and GitHub branch protection remain unchanged.
- Signed proofs are validated at the server at commit time. Client-side expiry inspection is advisory; if network/upload takes too long, users may need to retry before any Git write is attempted.
- No permanent archive blobs or secrets are written to a new database/storage backend.

## Automated verification

- Existing tests: **370/370 passed** after migration to v3.8.9.
- v3.8.9 additions: **12** tests covering capacity thresholds, persistent Worker protocol, on-demand read errors, attestation refresh and fail-closed conditions.
- Combined: **382/382 tests passed** in the packaging environment.
- Full production Next.js build **NOT VERIFIED**: npm dependencies could not be installed (`EAI_AGAIN` accessing registry.npmjs.org).
- Real 120–200 MiB device stress tests, authenticated GitHub commits, actual iOS PWA memory testing and Vercel Preview must still be performed before production signoff.

## Release steps

1. Extract `Zipverra-v3.8.9/` and push its **contents** into your repo root, not the outer directory.
2. Deploy to Vercel **Preview**; run `npm ci` (if lockfile exists, otherwise `npm install`), `npm test` and `npm run build` in a networked environment.
3. Check `/api/version` returns `3.8.9`. Refresh the PWA if an old cached version remains.
4. Run `QA_CHECKLIST_V389.md` with test repositories and then iPhone/desktop at 120 MiB and 200 MiB boundaries.
5. Promote to production only after build + real GitHub workflow checks succeed.
