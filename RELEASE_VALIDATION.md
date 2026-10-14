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