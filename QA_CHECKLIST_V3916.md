# Zipverra v3.9.16 — Build Import Resolution QA

- [ ] `npm test` passes with the module-path resolution check.
- [ ] `npm run build` completes without `Module not found` from `/api/large-upload`.
- [ ] Deploy Vercel Preview and verify `/api/version` is `3.9.16`.
- [ ] Confirm GitHub login, repository/branch select and ZIP analysis still work.
- [ ] Check file upload at 3 MB boundary; test a 20 MiB file with Private Vercel Blob properly configured.
- [ ] Invalid ticket/SHA and oversized file remain blocked before GitHub write.
- [ ] Desktop progress shows stages and percentages and does not report commit success early.
- [ ] Mobile/PWA UI and security confirmation remain unchanged.
- [ ] Recovery correctly handles interrupted or uncertain GitHub mutations.
