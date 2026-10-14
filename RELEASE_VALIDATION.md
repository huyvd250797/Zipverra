# Zipverra Pro v3.0.1 — Release Validation

**Source baseline:** user-supplied Zipverra Pro v3.0.0 full source.

## Local verification for v3.0.1

- `node --test tests/*.test.js`: **233/233 passed**, including 11 tests covering source ZIP download authorization, archive redirects and error handling.
- Static checks: 106 JS/JSX/MJS modules parsed, 190 relative imports resolved, 8 CSS files parsed.
- The 23 pre-existing GitHub API route files were compared byte-for-byte to v3.0.0; **all unchanged**, with one new read-only download route added.
- Chromium static mobile layout test: **not verified**, browser timed out in this packaging environment.
- New Activity tab positioning tests verify post-render scheduling, iPhone zero-scroll, second Safari animation frame, desktop Activity anchor and cleanup.
- New API tests verify normal JSON, declared/streamed oversized JSON, malformed JSON and controlled HTTP 413/400.
- New checks cover next.config security headers and the error/404 views.
- **Production build: NOT VERIFIED.** `npm install --no-audit --no-fund` encountered DNS `EAI_AGAIN` against npm registry.
- **Authenticated GitHub E2E / real iPhone PWA: NOT VERIFIED.** Test on disposable repo and real device before any production-safe claim.

## Download ZIP acceptance checklist

1. Repos: download appears after selecting a repo; Upload: download remains visible after the auto-switch.
2. Clicking Download requests `/api/github/source-zip?owner=...&repo=...` as a browser navigation, without a token in the query.
3. Selected Push branch can differ; archive still uses `main` exclusively.
4. Verify a private repo using the current GitHub App session, then a repo without permission (403), a repo with no `main` (404), and a logged-out session (401).
5. Open the link on a real iPhone PWA and save ZIP using browser Downloads / Files.
6. Confirm no archive bytes pass through a Vercel Function and `no-store` response headers are present.

## Deployment and acceptance checklist

1. Extract `Zipverra-v3.0.1` contents into the root of the GitHub repository; do not commit the ZIP itself.
2. Keep the five existing GitHub App Vercel env vars unchanged. No new variables.
3. Run `npm install`, `npm test`, `npm run build` in a networked environment. Inspect Vercel and GitHub Actions build logs.
4. Open the installed iPhone PWA, scroll to bottom of a long ZIP Review and Push. Activity must open at **page top** with Live Push status visible before Recent Actions.
5. Switch away and back to Activity, verify it returns to top. Check Reduced Motion and iOS Safari standalone behavior.
6. Check Push/PR/Quick Edit/History/Rollback safely on disposable repo; verify no automatic retry of uncertain mutations.
7. Validate /api/version v3.0.1 and public PWA update; no private responses or tokens appear in Cache Storage.

Detailed implementation and safety notes: [SOURCE_ZIP_DOWNLOAD_V301.md](./SOURCE_ZIP_DOWNLOAD_V301.md) and [STABLE_RELEASE_V300.md](./STABLE_RELEASE_V300.md).

---

## Historical validation archive

# Zipverra Pro v2.8.0 — Release Validation

Baseline: user-supplied v2.6.0. Direct version jump; v2.7.0 architectural work is not included.

## Automated validation

- **213/213 unit tests passed** (`node --test tests/*.test.js`), including 13 new UX Polish test cases.
- **97 JS/JSX/MJS modules parsed, 166 relative imports resolved**, zero errors.
- **6 CSS files parsed** without errors; ZIP CRC to be validated after packing.
- `npm run build` (Next.js 16) **not verified** unless dependency installation succeeds.
- Chromium static fixture (not Next.js) checked at **320/375/390/430/768/1280px**, Dark + Light, without horizontal overflow. Actual device and live GitHub E2E **not verified**.

## Deployment checklist

1. Push the **contents** of `Zipverra-v2.8.0/` to the existing GitHub repo root, branch `main`.
2. Keep APP_URL, GITHUB_APP_CLIENT_ID, GITHUB_APP_CLIENT_SECRET, GITHUB_APP_SLUG, SESSION_SECRET.
3. Inspect Vercel Build Logs. Do not infer success from ZIP/source tests.
4. Check v2.8.0 in header, Settings, footer and `/api/version`. Reopen installed iPhone PWA and accept update only when no operation is pending.
5. Test Launchpad, upload, Review gating, Push/PR, Recovery Center, Quick Edit, History and Rollback on a disposable repo.
6. Test Dark, Light, System appearance, safe area and reduced motion on iPhone.


## Archive: validation notes inherited from v2.6.0 (historical; not instructions for deploying v2.8.0)


Baseline: user-supplied Zipverra Pro v2.5.0 full-source ZIP. Full source ZIP, not a patch.

## Automated checks

- Unit tests: **200/200 passed** (186 inherited + 14 v2.6 PWA/reliability tests); includes Service Worker runtime cache boundaries, safe update, recovery authorization, and inherited GitHub safety regressions.
- Static code checks: **94 JS/JSX/MJS files**, **159 relative imports** and **5 CSS files** parsed / resolved with zero errors (before packaging).
- `npm install` failed with `EAI_AGAIN` due npm registry DNS resolution in this environment. **Next.js production `npm run build` is not verified** until run in a networked CI/Vercel build environment.
- Chromium static PWA banner/Recovery Center fixture checked at 320, 375, 390, 430, 768, 1280 px without horizontal overflow. This was a **static fixture only**, not the Next.js production app. No live GitHub App authenticated E2E or real iPhone Safari/PWA lifecycle test was run.

## Release gate — must pass before calling production verified

1. Push **contents** of `Zipverra-v2.6.0/` into the root of GitHub repository; keep existing Vercel GitHub App env variables.
2. Run `npm ci` or `npm install`, `npm test`, and `npm run build` on networked CI/Vercel. Check build logs, dynamic `/api/version`, `/sw.js` and `/offline.html` GET all return expected responses.
3. On iPhone Safari and home-screen PWA, test cold/warm starts, foreground/background return, switching apps and re-login after session expiry. Use actual iOS hardware for certification.
4. Install v2.6.0 over older PWA: prompt appears, never force reloads while Push/PR/Rollback uncertain or Workspace has unsaved edits; manual update works when safe.
5. Inspect browser service-worker Cache Storage: public `/offline.html` and icons only. No `/api/`, GitHub data, RSC, authenticated HTML, tokens, ZIP/code content.
6. Offline tests: with already-open app, correct visible warning; reload/navigation offline shows generic fallback; no automatic GitHub mutation. Reconnect and manually verify ambiguous operation.
7. Run a disposable-repo ZIP Push and PR; interrupt network after mutation response and verify from Activity without duplicate commits. Test Rollback interruption separately in History.
8. Confirm no draft persists after refresh, proper warning when leaving with unsaved Quick Edit content, and no update/reload while editor is dirty.
9. Re-test dark/light, 320/375/390/430 mobile widths, safe areas, iPhone keyboard and VoiceOver.
10. Confirm `v2.6.0` in header, Settings, footer and `/api/version`.