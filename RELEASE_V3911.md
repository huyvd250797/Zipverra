# Zipverra Pro v3.9.11 — Verified Repo Ranking & Smooth Tab Motion

## Changes

**Repo thường dùng**
- Selecting a Quick Access repository no longer moves it to the first slot. The same applies to repository chooser, saved Push Profiles, and ZIP analysis.
- Only after the GitHub API has **verified the resulting Push/commit SHA** does that repository move to the top. A successful Push to a PR branch also qualifies once the commit has been verified (the later PR creation may still require recovery).
- `recordVerifiedPushRepo` checks the currently authorized repo list, verified SHA and existing successful Activity entries to avoid promoting the same commit twice. Data is stored per GitHub user. No credentials are stored.
- The Quick Access order is now **most recent verified Push → pinned → frequently used**, with duplicates removed. Existing local preferences can remain visible; new selection events no longer change them.

**Smooth directional tab navigation**
- Tab order remains **Upload → Activity → History → Settings**. Going right slides left; going left slides right. The `Commit & Push → Activity` route uses the same direction.
- Browser snapshots are restricted to `.content-grid` instead of the entire main document plus the introduction, avoiding redundant large renders.
- The browser's implicit root-group animation and independent panel/intro entrances are disabled while sliding. Native snapshots run together with a 195 ms transform-only timeline.
- The state swap still happens without a preliminary fade delay; navigation chrome remains fixed. Duplicate `scheduleTabViewport` scroll frames no longer fight native transitions.
- Older browsers receive a lightweight entrance fallback and Reduced Motion avoids animation altogether.

## Safety / unchanged modules

No new backend APIs, secrets, database, or Vercel connection. GitHub Blob, Commit, Verify, PR, Merge, ZIP limits, Critical Security Scan, Project Mismatch, Sync consent, Recovery and 4-tab PWA navigation are unchanged.

## Validation

- Run `npm test` and `npm run build` after installing Next.js dependencies.
- Validate directions and rapid tab taps on iPhone Safari/PWA. Chromium native animation tests are useful but do not replace iOS QA.
- Check Quick Access ordering before and after successful/failed Push using a **test repository**.
- Verify `/api/version` returns `3.9.11` after deployment and accept the PWA update outside a pending GitHub write.

**Release candidate** until Vercel build and real-device GitHub/iPhone testing are confirmed.
