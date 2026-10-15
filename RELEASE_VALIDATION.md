# Zipverra Pro v3.3.0 — Release Validation

**Source baseline:** user-provided v3.2.0. Changes affect UI components and local non-sensitive repository suggestions only; no GitHub mutation endpoint changes.

## Local verification

- Unit tests: `npm test`. Includes repository suggestion ranking, account scope, revoked permissions, modal scroll locking and security/Push/PR/rollback regressions.
- Syntax checks: parse all JS/JSX/MJS modules, verify relative imports, parse all CSS files, compare API routes with baseline.
- Browser fixture: verify Dark/Light colors and horizontal overflow at 320, 375, 390, 430, 768 and 1280 px, and ensure quick picks appear at top of a freshly opened sheet.

## Production acceptance — still required

1. `npm install && npm test && npm run build` in a networked Vercel/CI environment. Do not claim production build success without logs.
2. iPhone standalone PWA: open Repo bottom sheet from deep scroll. The background must stay fixed; quick sections visible at the top. Scroll inside and close; background returns to its former position.
3. Verify Frequent, Recent and Pinned suggestions correctly reflect existing use, never list revoked/private unauthorized repos, and do not leak between signed-in accounts.
4. Search for a repository: quick sections disappear, full filtered list appears. Close and reopen: search is cleared, modal starts at top.
5. Switch repo with a pending ZIP/Review: the existing explicit confirmation must still appear.
6. Verify Dark/Light/System appearance, reduced motion, keyboard focus, VoiceOver and 44 px touch targets.
7. Run GitHub App E2E in a disposable authorized repo: Direct Push, PR, ZIP Download, Quick Edit, History and Rollback.
8. No new Vercel env vars or GitHub App permissions are needed. PWA cache/version must read v3.3.0.

For implementation details see [`UNIFIED_COMPONENTS_V330.md`](./UNIFIED_COMPONENTS_V330.md).

---

# Zipverra Pro v3.2.0 — Release Validation

**Baseline:** User-supplied v3.1.0 full source. Scope: color system, visual polish, reduced-motion UI, and oversized landmark focus outline fix.

**Local validation:** 265/265 automated tests passed. Static checks: 119 JS/JSX/MJS modules, 202 relative imports and 11 stylesheets. Chromium standalone fixture: Dark/Light at 320, 375, 390, 430, 768, 1280px; no horizontal overflow, the landmark outline stays hidden and real keyboard controls remain visibly focusable. `npm install` fails with `EAI_AGAIN`, therefore local production build remains unverified.

## Required preproduction checks

1. Confirm `npm install && npm test && npm run build` succeeds in networked CI/Vercel. Do not mark a build successful based only on syntax/tests.
2. From a long Upload/Review page on iPhone PWA, navigate tabs, return and focus the main content. **No full-width green rectangle** should appear around the entire workflow.
3. Keyboard/VoiceOver: ensure actual buttons/inputs still show focus and the skip navigation shortcut remains functional.
4. Confirm dark/light/system theme backgrounds, button text contrast, card hierarchy and contrast of warnings at 320, 375, 390, 430, 768 and 1280px.
5. Open/close long Repo/Branch/Help sheets: freeze background, scroll only inside, close to exact original scroll position.
6. Test progress, Activity scroll-to-top, ZIP Download → Save to Files, Direct Push, PR, Quick Edit and History/Rollback on a disposable authorized repository.
7. Verify existing five GitHub App variables; v3.2.0 requires no new provider or environment variables.
8. Confirm PWA version is 3.2.0 and public Service Worker namespace updated; do not cache private GitHub data.

See [PREMIUM_VISUAL_V320.md](./PREMIUM_VISUAL_V320.md) for exact color and motion design specifications.

---

# Zipverra Pro v3.1.0 — Release Validation

**Baseline:** User-supplied full v3.0.5 source.

- Local regression: **260/260 tests passed**.
- Source syntax: **118 JS/JSX/MJS modules**, **211 relative imports**, **10 CSS files** checked.
- Existing GitHub mutation routes are unchanged. Added only one read-only branch listing endpoint.
- Native iPhone PWA and real GitHub end-to-end validation **not yet completed**.

## Manual release gates

1. Confirm production Next.js/Vercel build succeeds and v3.1.0 is displayed in header/Settings/footer.
2. From middle of long Repos page, open Repo picker: page behind must not scroll; sheet contents must scroll.
3. Close via ×, Escape and backdrop; check exact previous page position and no stuck scroll lock.
4. Repeat with Branch picker and Help (?) in all five tabs; test very long lists and iPhone keyboard.
5. Verify authorized branch listing without requiring PR write permission; unauthorized repo must fail.
6. Test source ZIP Download (`main`, commit title), normal Direct Push, PR, Workspace Quick Edit, History and Rollback on a disposable repository.
7. Check Dark/Light/System theme, Reduced Motion and 320/375/390/430 px viewport sizes.

See [REPOSITORY_WORKFLOW_V310.md](./REPOSITORY_WORKFLOW_V310.md).

---

# Zipverra Pro v3.0.5 — Header Icon Alignment Release Validation

**Baseline:** user-supplied v3.0.4 source ZIP.

- Header: connected check is a bare icon directly before the version badge, without a redundant version status dot.
- Repository header: one unframed Refresh icon; no duplicated connected check.
- Contextual Help: one `?` per screen, with a 32px visible ring and a 40px button hit target. Matching icon/glyph size: 17px.
- Regressions: **252/252 unit tests passed**.
- Static: **112 JS/JSX modules, 187 relative imports, and 9 CSS stylesheets verified**.
- **30/30 GitHub API routes byte-for-byte identical** to v3.0.4.
- Chromium fixture: Dark/Light modes at 320, 375, 390, 430, 768, and 1280px; no horizontal overflow; connected check comes before version and Refresh is unframed.
- **Production build is not verified** locally because Next.js dependencies are absent (`next: not found`). Validate `npm install && npm run build` in CI/Vercel, then check actual PWA behavior on iPhone.

## Rollout checklist

1. Push the *contents* of `Zipverra-v3.0.5/` to the GitHub repository root on `main`.
2. Confirm Vercel build passes and installed PWA updates to `v3.0.5`.
3. Confirm compact icons and Help dialog in Repos on iPhone 320/375/390/430 px; test dark and light modes.
4. Smoke-test Refresh, ZIP upload/download, Quick Edit, PR, History and Safe Rollback on a disposable repository.

---

# Zipverra Pro v3.0.4 — Release Validation

**Baseline:** user-provided v3.0.3 source archive.

**Local verification on v3.0.4:** 249/249 Node tests passed; 110 JS/JSX/MJS modules parsed; 196 relative imports resolved; 9 CSS stylesheets parsed. All 30 GitHub API route files matched the uploaded v3.0.3 source byte-for-byte. Chromium layout fixture was checked without horizontal overflow at widths 320, 375, 390, 430, 768 and 1280px; native dialog opened and closed with Escape in the fixture.

**Production build not verified:** `npm run build` cannot run here because Next.js dependencies are not installed (`next: not found`). Install dependencies and confirm the build on Vercel/CI. A fixture does not establish live iPhone PWA behavior.

## New UX checklist

- Each tab (Repos, Upload, Activity, History, Settings) must show exactly **one** contextual help `?` button near its header, with the matching tab-specific explanation.
- The help dialog must be dismissible via Close, Escape and backdrop; keyboard focus must remain visible.
- Repos launchpad, stepper and ZIP download must be compact on 320/375/390/430 px iPhone screens.
- CRITICAL / Sync deletion / uncertain commit / PR non-merged messages must remain visible without opening the dialog.
- No GitHub mutations or permissions changes were introduced in the UX components.

## Production release gates

- Run `npm install`, `npm test`, and `npm run build` in connected CI/Vercel; inspect build logs.
- Verify GitHub App login, repo list, ZIP Push, PR, Download ZIP / Save to Files, Activity auto-scroll, History and Rollback on an isolated repo.
- Verify installed PWA update version 3.0.4, Dark/Light/System themes, reduced-motion and VoiceOver.

## Previous release-validation notes

# Zipverra Pro v3.0.3 — Release Validation

**Source baseline:** the user-supplied `Zipverra-main.zip`, containing Zipverra Pro v3.0.1.

## Local verification for v3.0.3

- `node --test tests/*.test.js`: **235/235 passed**, including **13 Source ZIP Download tests** for a simulated private GitHub App session, signed archive retrieval, streaming download, commit-derived filename and safe errors.
- Static checks: **106 JS/JSX/MJS modules parsed**, **176 relative imports resolved**, **8 CSS files parsed**.
- **24 existing GitHub API routes** compared with the user-provided archive: only `app/api/github/source-zip/route.js` changed; Push, PR, Quick Edit, History and Rollback routes remain unchanged.
- ZIP download is now a **same-origin streaming Response with attachment headers**. Temporary GitHub codeload links are resolved server-side; browser receives neither signed codeload URL nor GitHub App token.
- Archive content and ZIP filename refer to the same immutable main HEAD commit SHA, avoiding ambiguity from branch updates.
- **Production build NOT VERIFIED:** `npm install` failed with `EAI_AGAIN` against npm registry in this environment.
- **Authenticated live GitHub E2E / iPhone PWA NOT VERIFIED:** test on a disposable repo and a real device after deployment.

## Source ZIP download acceptance checklist

1. Select an authorized repository; tap **Tải ZIP** in Repos or Upload.
2. On real Safari/iPhone PWA, ensure no blank `codeload.github.com` page is opened and the download is served from Zipverra’s domain.
3. ZIP filename should match the sanitized latest `main` commit **subject** with `.zip` extension; content should represent the same commit SHA.
4. Open ZIP from Safari Downloads / iOS Files and verify source contents.
5. Test private repositories with Contents access, revoked installation (403), missing main (404), logged out (401), and GitHub failure responses.
6. Inspect response headers: `Content-Type: application/zip`, `Content-Disposition: attachment; filename=...`, `Cache-Control: no-store`, without a client redirect.
7. Verify download works when another branch is selected for Push; it must still use `main`.

## Deployment and QA gate

1. Push contents of `Zipverra-v3.0.3/` into the root of the existing GitHub repository branch `main`; do not commit the ZIP itself.
2. Keep existing Vercel GitHub App env vars; no new variables.
3. Run `npm install`, `npm test`, and `npm run build` in a networked environment; check Vercel Build Logs.
4. Confirm `v3.0.3` in header, Settings, footer, `/api/version` and PWA updates; no ZIP or tokens cached by the Service Worker.
5. Recheck Repos, ZIP Push, Direct Push, PR, Quick Edit, History, Rollback and Activity auto-scroll on disposable repo and real iPhone.
6. Note that downloads above the **512 MiB compressed ZIP** limit are rejected, and large downloads may still hit host duration and mobile browser constraints.

Details: [SOURCE_ZIP_DOWNLOAD_V302.md](./SOURCE_ZIP_DOWNLOAD_V302.md) and [STABLE_RELEASE_V300.md](./STABLE_RELEASE_V300.md).

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
## v3.0.3 iPhone Save to Files regression checklist

- [ ] Open `v3.0.3` in installed iPhone PWA, choose a private authorized repository, tap **Chuẩn bị ZIP**.
- [ ] PWA stays visible during ZIP download, showing real byte progress; Cancel stops network transfer.
- [ ] On **ZIP đã sẵn sàng**, compare displayed filename with `main` HEAD commit subject.
- [ ] Tap **Lưu vào Tệp**, then choose **Save to Files** in iOS share sheet, choose a folder, and confirm ZIP appears in Files.
- [ ] The share sheet dismissal returns to Zipverra and does not navigate to native Quick Look.
- [ ] If file sharing is unavailable, test **Tải ZIP** browser fallback and document the possible Quick Look preview.
- [ ] Verify error cases: offline, revoked GitHub App authorization, missing `main`, truncated/HTML/oversized archive, cancel and retry.
- [ ] ZIP over **48 MiB** uses explicit browser fallback; server maximum **512 MiB** streamed. No ZIP data in browser persistent storage or Service Worker Cache Storage.
- [ ] Confirm Direct Push, PR, Quick Edit, History, Security Scan and Rollback are unaffected.
- [ ] `npm run build` passes on Vercel/CI; actual iPhone Safari/PWA checks completed before declaring production verified.

## Historical v3.0.2 iPhone download checklist

- [ ] Tap **Tải ZIP** on a selected private GitHub App repository from installed iPhone PWA.
- [ ] No blank `codeload.github.com` page appears. ZIP is delivered as an attachment from the Zipverra domain.
- [ ] Download filename matches the latest `main` HEAD commit subject (safe characters, `.zip` extension).
- [ ] ZIP can be opened in Files and contains the tracked repository source.
- [ ] GitHub App grant revoked → safe error, no archive bytes streamed.
- [ ] Missing `main` → safe 404, no redirect to another branch.
- [ ] Confirm old Push, PR, Security Scan, History and Rollback still work.
- [ ] Confirm Next.js production build on Vercel; local build could be blocked by npm registry access.
