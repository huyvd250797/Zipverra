## v3.8.0 validation status (2026-10-15)

- Node test suite: **301/301 passed**.
- New review navigation: capped file-list scroll, return-to-consent focus, no duplicate Commit & Push, confirmation gating and PWA version test coverage.
- Production Next.js build: **not executed locally** — npm dependency installation blocked by environment limits. Run the unchanged CI workflow on GitHub/Vercel.
- GitHub authenticated end-to-end: **not executed**; use a disposable repository on deployment.
- Physical iPhone Safari and installed PWA: **not executed**; run the matrix in `VISUAL_QA_V380.md`.

---

# Zipverra Pro v3.6.0 — Release Validation

**Baseline:** Full v3.5.0 source from the user; UI-only upgrade.

## Completed in packaging environment

- 296/296 Node regression tests pass, including 10 v3.6.0 tests for quick Review, Critical/Sync/pending checks and modal viewport/scroll behavior.
- Chromium independent layout fixture passed 320, 375, 390, 430, 768 and 1280 px in Dark and Light modes; no horizontal overflow, and Commit & Push is above the optional file list.
- Chromium native dialog scroll fixture passed 320, 390 and 768 px; scroll is isolated inside the modal and previous page position restored.
- 31/31 GitHub API routes verified unchanged byte-for-byte against the supplied v3.5.0 source ZIP.
- **Not verified:** local `next build` (npm DNS `EAI_AGAIN`); live iPhone Safari/PWA keyboard and real authenticated GitHub E2E.

## Required release gate after deploying

1. Confirm Vercel Production Build succeeds and UI displays version `v3.6.0`.
2. With a >100 file ZIP, confirm summary / security headline / checkbox / Commit & Push appear first. Do not open file list; verify commit only on explicit user action.
3. Open file list, exclude a file, confirm previous acknowledgement resets. No excluded file may be committed, even in Sync mode.
4. Test Critical credential blocking and Sync file deletion acknowledgement; ensure these cannot be hidden by collapsed details.
5. Test Direct Push and PR mode against a disposable repo and validate Activity SHA / PR state before claiming success.
6. On iPhone Safari and standalone PWA: open Repo, Branch and Help sheet after scrolling; test keyboard, in-sheet scrolling, Escape/outside/X close, and preserved scroll and focus.
7. Test Dark / Light / System themes, Reduced Motion, VoiceOver and safe-area keyboard overlap.

See [MODAL_WORKFLOW_V360.md](./MODAL_WORKFLOW_V360.md).

---

## Historical release validation

## v3.5.0 (historical)
# Zipverra Pro v3.5.0 — Release Validation

**Source baseline:** User-supplied Zipverra Pro v3.4.0 source ZIP. Scope: premium workflow UX, not GitHub mutation changes.

## Local verification (2026-10-15)

- **286/286 unit tests pass**, including new stepper, Review disclosure, explicit consent and Activity-state checks.
- Chromium independent layout fixture: Dark/Light on 320/375/390/430/768/1280px; all twelve configurations without horizontal overflow. Mobile confirm region `position:sticky`; desktop static. This fixture is not live Next.js.
- New pure `lib/premium-workflow.js` and presentation-only `app/components/PremiumWorkflow.jsx`; original GitHub API routes unmodified.
- CSS design layer `app/styles/premium-workflow-v350.css` added after mobile v3.4.0 stylesheet; reduced-motion support.
- `npm install` failed because npm registry DNS returned `EAI_AGAIN`; **production `next build` remains unverified**. Real GitHub App and Safari PWA end-to-end operations remain unverified.

## Required release gate on Vercel and iPhone

1. Confirm production `next build` and verify version `v3.5.0` in header, Settings, footer and `/api/version`.
2. On an authorized test repo, select a ZIP with more than 10 changes; Review should summarize changes first, with file list collapsed. Open list, exclude a file and review diff.
3. For 10 or fewer changes, the file list should start expanded; file inclusion remains controllable.
4. Confirm Critical secret blocks Commit/PR, Sync deletion requires a separate checkbox, and user must still check the final commit acknowledgement.
5. With a long Review page, Confirm & Push must remain accessible without obscuring security notices; verify position above mobile bottom navigation.
6. Start Push, confirm automatic Activity navigation and accurate Validate → Upload → Commit → Verify/PR stages. Induced failures must remain failed/unconfirmed, not green success.
7. Verify modal/bottom sheet scroll lock, repo quick picks, Download ZIP Save to Files, Quick Edit, History and Rollback are unaffected.
8. Check reduced-motion, Dark/Light/System, iPhone safe area/keyboard and 320/375/390/430px layouts on real devices.

Detailed design: [PREMIUM_WORKFLOW_V350.md](./PREMIUM_WORKFLOW_V350.md).



# Zipverra Pro v3.4.0 — Release Validation

**Source baseline:** User-supplied full v3.3.0 ZIP. This release changes mobile layouts and navigation only; no GitHub mutation endpoint changed.

## Local verification results (2026-10-15)

- **280/280 unit tests pass**, including six new v3.4.0 layout/navigation tests.
- **123 JS/JSX/MJS modules** parsed without syntax errors, **222 relative imports** resolved, **13 CSS files** parsed successfully.
- **31/31 API route files unchanged byte-for-byte** from v3.3.0, including authenticated Push/PR/Quick Edit/History/Rollback and ZIP download.
- **Chromium independent layout fixture:** Dark/Light at 320/375/390/430/768/1280px. All 12 viewport/theme combinations had no horizontal overflow. This is a static layout fixture, not the live Next.js application.
- **PWA raster assets restored:** `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` are present and referenced by the existing manifest.
- `npm install` **failed** with `EAI_AGAIN` reaching registry.npmjs.org; a production `next build` could not be executed here. Do not consider Vercel production deploy verified until CI/Vercel logs confirm success.

## Required production acceptance

1. Confirm Vercel build succeeds, then open iPhone Safari / standalone PWA and verify repo/branch chooser, Push, Workspace, History and ZIP Download appear near the top of Repos.
2. Switch to Upload with a selected repository. The destination must appear once; ZIP file selection must be obvious; empty Review should not occupy another large mobile card.
3. Select ZIP, complete Analyze / Review, confirm Push and ensure Activity opens at top with live flow above Recovery Center / Recent Actions.
4. Switch tabs during a source ZIP preparation. It should not be cancelled just by hiding Repos (same component stays mounted in tab shell).
5. Modal / bottom sheet remains scroll-isolated from background; closes back to original scroll position; frequent/recent/pinned quick picks remain authorized and visible.
6. Test Sync deletion confirmation, critical-secret blocking, PR preparation/merge, Quick Edit, History and Rollback on a disposable repository.
7. Confirm Dark/Light/System theme, VoiceOver, 44px touch targets and Reduced Motion on physical iOS devices.
8. Confirm all five existing GitHub App Vercel variables. No new permissions or backend services required.

See [`MOBILE_LAYOUT_V340.md`](./MOBILE_LAYOUT_V340.md) for the v3.4.0 design scope.

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
