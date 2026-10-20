# Zipverra Pro v3.8.9 — Large Archive Support & Memory Optimization

**Release details:** [RELEASE_V389.md](RELEASE_V389.md) · **Acceptance checklist:** [QA_CHECKLIST_V389.md](QA_CHECKLIST_V389.md).

**Standard:** 120 MiB ZIP / 240 MiB uncompressed. **Extended:** 200 MiB / 400 MiB, one-time consent per ZIP. The 2.5 MB/file, 2,500 source-file and GitHub branch safety constraints are unchanged. Browser Web Worker retains the compressed archive and returns only SHA/path/size/scan metadata. Bytes are read on demand and checksum validated before upload or Diff. Proof refresh is mandatory before Commit if evidence is expiring. Avoid backgrounding iPhone while working with large archives.

---

## Historical notes — v3.8.8 Smooth Motion & Interaction Hotfix

**Hotfix · Project Mismatch Severity:** Cảnh báo “Có thể upload nhầm dự án” có nhãn **Nghiêm trọng**, tiêu đề đỏ và nền đỏ nhẹ ở cả Dark/Light. Nhãn mức độ luôn hiển thị kể cả khi đã chấp nhận; trạng thái xác nhận và thao tác Push giữ nguyên.

**Maintenance release from v3.8.6.** This update improves browser zoom, keyboard/screen-reader focus and small-screen resilience. It does not add GitHub features or modify authorization, security warnings, Sync consent, PR or Commit routes.

**Release notes:** [`RELEASE_V388.md`](RELEASE_V388.md). Earlier release: [`RELEASE_V387.md`](RELEASE_V387.md). **Manual acceptance:** [`QA_CHECKLIST_V387.md`](QA_CHECKLIST_V387.md).

### v3.8.8 — Smooth Motion & Interaction Hotfix

- Native sheet/dialog keeps the last content visible while reversing with slide/fade or scale/fade; confirmation dismissal and repository/branch choice also animate fully.
- Fade-out before navigation, then fade-in on the next view; stable header/tabbar and smoother disclosures where browsers support size interpolation.
- Reduced Motion fully supported; no changes to GitHub APIs or security consent.

## v3.8.7 — Accessibility & Visual QA

- Removed the restrictive `maximumScale`/`userScalable` viewport flags and the global gesture interception, allowing Safari and accessibility magnification to use native pinch gestures.
- Allowed native browser touch actions; increased form-control font size to 16px on narrow screens to avoid involuntary iOS focus zoom.
- Added controlled focus to the named main landmark after **user-initiated tab navigation**, without stealing focus on startup or automated GitHub phase changes.
- Linked modal accessible names to their visible header, made splash announcements Vietnamese, and improved small-screen wrapping, minimum touch areas and reduced-motion/high-contrast presentation.
- Added `accessibility-visual-qa-v387.css` last; prior UI and API layers are preserved. Dark/Light pre-paint initialization remains unchanged.
- Updated app, PWA and public cache versions to 3.8.7. Run `npm test`, `npm run build`, and the manual QA checklist on Vercel Preview before production release.

## v3.8.3 — Motion / Clean Restart / Wrong-Project Warning / Instant Theme

- ZIP mới được phân tích và so với cây file trên branch, tên `package.json` và SHA file (khi có). Cảnh báo đỏ khi nghi ngờ chọn nhầm source dự án, vẫn cho phép Push/PR sau khi xác nhận thêm.
- Chạm logo/tên Zipverra hoặc icon làm mới tại tab Repos sẽ tải lại ứng dụng về trạng thái **chưa chọn repository/file/Review**. Không tự reset khi thao tác GitHub đang chạy hoặc cần xác minh.
- Bottom sheet trượt lên + fade-in khi mở; trượt xuống + fade-out khi đóng. Tab có fade-out/fade-in. Tôn trọng `prefers-reduced-motion`.
- Dark/Light/System được xác định trước khi hiển thị app; không đổi theme giữa lúc khởi động.
- `npm test`: 320 tests. Sau khi push GitHub, Vercel cần chạy `npm install` + `npm run build` để xác nhận production build.

## Maintenance hotfix v3.8.3

- **Không còn tự chặn source ở Review chỉ vì Security Scan phát hiện Critical:** app mở hộp thoại Có/Không; chọn Có và tick xác nhận Review thì Direct Push hoặc PR được phép tiếp tục, backend vẫn quét lại và xác minh cờ đồng ý. Không tự Push khi chỉ chọn Có.
- **Rà soát giao diện:** trạng thái đã đồng ý được thể hiện là cảnh báo cần lưu ý (không còn viền đỏ kiểu “bị chặn”); tiêu đề, hướng dẫn và Smart ZIP Analyzer thống nhất với quy trình xác nhận.
- **Bootstrap từ v3.8.0:** chuỗi mô phỏng PRIVATE KEY trong file test được ghép tại runtime, không còn bị scanner cũ nhận nhầm khi upload source Zipverra để tự cập nhật. Không bỏ bài test phát hiện private key.
- **Giữ giới hạn:** Không có quyền vượt GitHub Push Protection, branch protection, quyền GitHub App, cấu trúc ZIP nguy hiểm, file vượt hạn mức hoặc lỗi cấu trúc. Quick Edit và Rollback vẫn có chính sách độc lập.
- **Maintenance only:** không nâng cấp module mới, không thay đổi database, thông tin bí mật, GitHub App OAuth hoặc API commit.

## Previous v3.8.1 security consent implementation

- ZIP import now **analyzes** `.npmrc`, `.env*`, private-key filenames and detected embedded credentials rather than aborting immediately at the path check. Unsafe ZIP paths, traversal, `.git`, size limits, malformed input and unsupported Git modes remain blocked.
- If the selected changes include high-confidence secrets or likely hard-coded credentials, the app opens a redacted Yes/No warning dialog. **No** keeps the Push gate closed; **Yes** allows the normal manual Review, checkbox, Commit & Push / Create PR workflow. Consent is **not** an automatic GitHub mutation.
- Server re-scans every upload and refuses sensitive blobs without `allowSensitiveUpload`. Signed, short-lived HMAC attestation is scoped to user, repository, path, SHA and the sensitive risk flag. Commit requires corresponding `allowSensitiveCommit` and valid proof. Deletion-only Sync does not expose a secret and needs no override.
- Consent is in memory only. Changing ZIP, repository, branch, settings or selected files invalidates it. The built-in diff hides contents for flagged files.
- **Security caveat:** a real secret sent to GitHub may be permanently accessible from Git history even if later deleted. Prefer removing it from ZIP, moving it to secure environment settings and rotating affected credentials. GitHub's own Push Protection may still refuse secret uploads regardless of app consent.

## New in v3.8.0

- **Review without long-page scrolling:** After ZIP analysis, the existing Review summary, security findings, deletion acknowledgement and manual Commit & Push confirmation appear *before* the optional file listing. The list is now capped to a scrollable viewport (`max-height`) when expanded, avoiding a page several screens long.
- **Jump directly back to confirmation:** An action at the top and bottom of expanded file details collapses the list and focuses the original manual confirmation area. It does not create an extra commit control, auto-check consent or bypass any backend gate.
- **Safety state refresh:** Reanalysis resets both standard confirmation and Sync-delete acknowledgement. Changes to the selected files still invalidate both. Memoized Push readiness now explicitly includes the security-block state.
- **Visual QA polish:** New final CSS layer tightens small-phone layout, long paths, focus states, 44px touch targets, nested scroll, desktop review spacing, reduced-motion and bottom-sheet safe-area behavior.
- **PWA release metadata:** 3.8.0 in page, Settings, footer, version API, public Service Worker cache namespace and offline fallback. No new database, permissions, secrets or environment variables.

## Deployment to GitHub + Vercel

1. Extract the archive and push the **contents of `Zipverra-v3.8.9/`** into the root of the existing application repository; do not push the outer folder as a nested app.
2. Keep your existing Vercel variables: `APP_URL`, `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `GITHUB_APP_SLUG`, `SESSION_SECRET`. Update `APP_URL` only if the deployed domain has changed.
3. Build on Vercel or another networked CI with `npm install --no-audit --no-fund`, `npm test`, `npm run build` using Node 22. Existing GitHub Actions workflow runs tests/build on push and PR.
4. Verify `/api/version` displays `3.8.9`, and refresh the app to apply the public PWA service-worker cache version. Old public cache entries are removed after activation; private API/auth responses are never cached.
5. Test on an authorized throwaway repository: select ZIP with hundreds of files, check the quick confirmation flow without opening details, expand and scroll the file list, return to confirmation, then separately verify Sync delete acknowledgement, Critical consent dialog (No/Yes) and PR behavior. Test rollback/Recovery after interrupted operations before using production repositories.
6. Test actual iPhone Safari and installed standalone PWA keyboard, modal focus and scroll, dynamic safe area, dark/light, reduced motion, and Wi-Fi interruption before labeling production validated.

## Validation boundaries

**Local validation** is recorded in `RELEASE_V387.md` and `QA_CHECKLIST_V387.md`. Legacy validation remains in `VISUAL_QA_V380.md`. The environment could not finish fetching npm dependencies, so a production `next build`, authenticated GitHub E2E and real iPhone Safari/PWA verification have **not** been completed locally. A successful ZIP package by itself does not certify a Vercel deployment.

Read `VISUAL_QA_V380.md`, `RELEASE_VALIDATION.md` and `ROADMAP_NEXT.md` before production rollout.

---

## Previous release notes

## Previous v3.4.0 release information

# Zipverra Pro v3.4.0 — Mobile Layout & Navigation Redesign

**Baseline:** Zipverra Pro v3.3.0 supplied full source. This v3.4.0 focuses on one-handed mobile navigation, a unified repository destination hub, shorter Upload/Review, and a more prominent live Activity view. It does not change GitHub commit/PR/rollback APIs, credentials or security rules.

## What changed in v3.4.0

- **Repos:** one unified destination hub for repository + branch selection and Push ZIP, Workspace and History actions. Removed duplicate hero, picker controls and redundant navigation CTAs. Frequent/Recent/Pinned picks are preserved in the modal.
- **Download:** one Source ZIP Download surface on Repos, not duplicated on Upload. Download preparation survives switching tabs (component remains mounted in the existing tab shell).
- **Upload:** existing connected stepper preserved, destination summarized once, ZIP picker moved up, large blank Review placeholder hidden on mobile until needed.
- **Activity:** simplified heading and spacing while keeping live stages, verified SHA, warnings, Recovery Center and Recent Actions.
- **Navigation:** all five tabs preserved, safe-area and bottom navigation improved at 320–430px.
- **PWA assets:** added raster icon files referenced by existing manifest (missing from incoming archive).
- **Accessibility:** keyboard focus for controls retained, modal scroll lock and explicit security/Sync/Push confirmations preserved.

**Note:** There is no new database, GitHub App permission, environment variable or automatic GitHub mutation.

## Deploying v3.4.0

1. Unzip the archive and push **contents of `Zipverra-v3.4.0/`** to the root of the Zipverra GitHub repository (`main`).
2. Keep the same Vercel environment variables: `APP_URL`, `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `GITHUB_APP_SLUG`, `SESSION_SECRET`.
3. Confirm the Vercel build succeeds and the PWA displays v3.4.0. Open the Repo picker: use existing Recent/Pinned chips immediately; Frequent will be populated from selection/activity history as applicable.
4. Test sheet background scroll isolation, themes, quick picks, search, Push/PR/Download on an authorized disposable repository. See [`RELEASE_VALIDATION.md`](./RELEASE_VALIDATION.md) and [`MOBILE_LAYOUT_V340.md`](./MOBILE_LAYOUT_V340.md).

**Validation note:** Passing local regression/static checks does **not** substitute for a production `next build`, real GitHub E2E, or a physical iPhone PWA test.

---

## Historical release notes

# Zipverra Pro v3.1.0 — Repository Workflow Clarity

**Source baseline:** Full Zipverra Pro v3.0.5 supplied by the user.

This release consolidates repository selection into one searchable sheet, introduces a branch chooser backed by GitHub App authorization, and fixes scrolling isolation when modal/bottom sheets open on iPhone.

### Highlights

- **Repository:** one compact selector → searchable list of authorized repositories, with favorites and recent repos prioritized.
- **Branch:** pick an existing branch from the GitHub API (or enter one manually), independently of Pull Request permissions.
- **Modals/Bottom sheets:** background stays locked; scroll only the sheet, restore original page position when closed. Applies to contextual Help as well.
- **Source ZIP download:** unchanged, continues to download `main`, with commit-title ZIP naming and the iPhone Save to Files flow.
- **Safe Git workflows:** Direct Push, PR, Quick Edit, History, Security Scan and Safe Rollback retained without new mutation behavior.
- **PWA version:** v3.1.0.

### Deploy

Extract the full source ZIP and push the **contents of `Zipverra-v3.1.0/`** into the repository root (`main`). Keep existing GitHub App variables: `APP_URL`, `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `GITHUB_APP_SLUG`, `SESSION_SECRET`.

Run `npm install`, `npm test`, `npm run build` in a connected CI/Vercel environment. Local unit tests pass, but production build / live GitHub E2E / physical iPhone tests are **not independently verified** here. See [REPOSITORY_WORKFLOW_V310.md](./REPOSITORY_WORKFLOW_V310.md) for details and a focused scroll-lock QA checklist.

---

## Historical release notes

# Zipverra Pro v3.0.5 — Compact Header Icon Hotfix

This full-source release upgrades v3.0.4 with a minimal UI adjustment on iPhone: GitHub connected check is positioned before the version in the main header (without a circular frame), Refresh is an unframed icon in Repositories, and the shared `?` help retains a smaller circular outline. Icons have consistent visual glyph sizing; interactive controls preserve accessible touch targets.

**No change** to GitHub auth, repository listing, ZIP upload/download, PR, Quick Edit, History, Rollback, Security Scan or the PWA recovery model.

## Deploy

Unzip and copy the **contents** of `Zipverra-v3.0.5/` to the repository root on `main` (not the enclosing folder). Keep the existing five GitHub App environment variables. After Vercel deploy, verify header icons, Refresh, Help and all five tabs on iPhone PWA.

## Validation

Run `npm install`, `npm test` and `npm run build` in a networked environment. The local test runner checks logic/regression and does not replace production build or real-iPhone QA.

---

## Historical release notes

# Zipverra Pro v3.0.2 — Source ZIP Download iPhone Fix

> Previous v3.0.2 changed the old client-visible codeload redirect to authenticated same-origin streaming with a commit-title ZIP filename. It did not prevent the native iOS Quick Look preview that is now handled through the explicit share-to-Files flow in v3.0.3.

 — Source ZIP Download

> Upgraded directly from **Zipverra Pro v3.0.0 Stable Release**. This maintenance release adds an authenticated, browser-native **download of the selected repository's `main` branch as ZIP**. The ZIP Push flow, Pull Requests, History, Quick Edit, Security Scan, and Safe Rollback are unchanged.

## Download ZIP from an iPhone

1. Sign in with the existing GitHub App and choose your repository from **Repos**.
2. Zipverra automatically opens **Upload** after choosing a repo. Tap **Download Source ZIP → Tải ZIP** near the repository destination card. The same control is available inside **Repos**.
3. GitHub prepares the ZIP for **`main`**, regardless of the Push branch currently selected. On iPhone, the browser may open a new tab and show the Downloads manager; use Safari/Files to keep the ZIP.
4. This is the current source snapshot, not the `.git` history, pull requests or old commits. GitHub may include an enclosing repository folder in the archive.

The download is authenticated by the current **GitHub App user session**. Private repos require the existing installation/Contents grant. The backend checks the user's repository access and `main` HEAD, then makes a **302 redirect** to GitHub's time-limited archive link; it does **not** proxy or buffer archive bytes through Vercel. GitHub says private archive URLs expire after approximately five minutes; choose **Tải ZIP** again if a previous download expires. No source bytes or GitHub credentials are written to browser storage.

**Deliberate scope:** download only `main` (not arbitrary branches or commits); no background download in a suspended iPhone PWA; no guarantee that submodules or Git LFS objects appear as expanded source in GitHub's archive.

## Deployment

1. Extract **`Zipverra-v3.0.1/`** and push its **contents** to the root of the existing GitHub repo on `main`.
2. Keep the existing five Vercel variables: `APP_URL`, `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `GITHUB_APP_SLUG`, `SESSION_SECRET`.
3. No additional GitHub App permissions or database needed for repos already selectable in Zipverra.
4. Local `npm test` passed **233/233** and static checks passed. **Production `npm run build` could not be verified here** because the npm registry was unreachable (`EAI_AGAIN`); verify the Vercel build and a real iPhone download from a disposable repository.

See [SOURCE_ZIP_DOWNLOAD_V301.md](./SOURCE_ZIP_DOWNLOAD_V301.md) for technical safeguards, tests and limitations. See [RELEASE_VALIDATION.md](./RELEASE_VALIDATION.md) for the full QA checklist.

---

## Historical release notes

# Zipverra Pro v3.0.0 — Stable Release

> Upgraded from the user-supplied **Zipverra Pro v2.9.0** source. Focus: stable mobile UX, compact repository status controls, safer accessibility presentation on iPhone, and preserved GitHub App / security / rollback workflow.

## v3.0.0 — What's new

- **Stable Release baseline:** promotes Zipverra Pro to a stable branch without changing the safe Git mutation model.
- **Cleaner Repositories UX:** removed the large Connected / Refresh row from the repository section on mobile.
- **Compact top-right controls:** repository connection status is now a simple check icon, with a refresh icon beside the Online indicator.
- **Skip-link iPhone fix:** the accessibility skip link stays visually hidden until true keyboard/accessibility focus, avoiding the top-screen UI glitch.
- **Versioning updated:** app header, Settings, footer, offline shell, version API and Service Worker cache namespace now use `3.0.0`.
- **Regression tests:** local packaging validation completed with **222 / 222 passing tests**.

## Deploying v3.0.0

1. Put the **contents of `Zipverra-v3.0.0/`** at the repository root on branch `main` (not the containing folder).
2. Keep existing Vercel variables: `APP_URL`, `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `GITHUB_APP_SLUG`, `SESSION_SECRET`.
3. Confirm CI/Vercel build succeeds, then test repository selection, ZIP upload, Push, Activity, History and Settings on a real mobile device.
4. Review [STABLE_RELEASE_V300.md](./STABLE_RELEASE_V300.md) and [RELEASE_VALIDATION.md](./RELEASE_VALIDATION.md). **Production build and live GitHub/iPhone E2E are not verified from this environment.**

---

## Historical release notes



# Zipverra Pro v2.8.0 — Advanced UX Polish

> Direct upgrade from the user-supplied v2.6.0 full source. Version 2.7.0 was intentionally skipped; its architecture refactor is **not** part of this release. No Vercel Deployment Tracking.

## What's new in v2.8.0

- Premium compact Repos Launchpad with primary ZIP Push button and contextual shortcuts.
- Clear, accessible Review Readiness explaining why a commit is disabled or ready; explicit confirmations remain mandatory.
- Actionable Activity empty state and GitHub-verified outcome card (commit SHA, Copy, commit/PR links).
- System theme, mobile touch/focus improvements, skip navigation and responsive polish.
- PWA cache/version updated, keeping privacy-first offline behavior.

Read `ADVANCED_UX_V280.md` for UI acceptance and `ROADMAP_NEXT.md` for v3.0.0 Production Hardening.



**Next.js 16 · React 19 · GitHub App · Mobile-first PWA · Vercel-targeted**  
**Tagline:** Push to GitHub. From Your Phone.

> **Historical v2.6.0 notes:** Zipverra Pro v2.5.0 (user-provided full source). This release improves **PWA lifecycle, startup, safe update, offline fallback and recovery visibility**. GitHub mutation endpoints, ZIP/PR/Quick Edit/Rollback semantics and GitHub App authentication remain unchanged.

## What's new in v2.6.0 — PWA Optimization & Reliability

- **Safe PWA updates:** version-check API (`/api/version`, public and `no-store`) and service-worker update detection. Shows a manual **Cập nhật** action, disabled during active operations, unsaved Workspace edits or unresolved Push/PR/Rollback. No forced refresh during a GitHub mutation.
- **Strict offline cache scope:** `public/sw.js` caches only the public `offline.html` page and app icon assets. It explicitly does **not** cache authenticated GitHub API calls, auth/session responses, Next.js RSC payloads, HTML containing private workspace data, ZIP, code, or tokens. Offline navigation shows a generic non-authenticated fallback, not stale private data.
- **Foreground/resume session checks:** when iPhone returns to the app, checks version/connectivity; the existing GitHub session is revalidated when idle and at most about once per minute. A changed/expired session resets account-specific UI state rather than exposing another user's data. Transient connectivity failure is not silently treated as sign-out.
- **Recovery Center in Activity:** read-only verification shortcut for pending GitHub Push; user-initiated **Kiểm tra / Tạo PR** action where PR outcome is ambiguous; History shortcut for Safe Rollback verification. Only operations belonging to repositories currently authorized to the user are shown. Never automatically retry a commit or rollback.
- **Faster perceived startup:** splash minimum reduced from 650ms to 180ms, and maximum from 5.5s to 1.8s; the real UI/skeleton can appear while session status remains unresolved. This is a UI wait-time change, not a measured LCP improvement.
- **No extra environment variables, databases or dependencies.** Existing GitHub App flow, five tabs, ZIP Web Worker, Security Scan, PR and Safe Rollback preserved.

**Important limitation:** ZIP/Quick Edit drafts are intentionally *not* persisted across browser/PWA restarts; iOS may discard in-memory state and sessionStorage. Recovery is only as complete as the GitHub read-only verification journal still available. You may need to reselect the ZIP and verify GitHub manually. Updates are not background jobs, and the PWA cannot guarantee continued upload while iPhone suspends or closes it.

See [PWA_RELIABILITY_V260.md](./PWA_RELIABILITY_V260.md) for implementation details, security boundaries and iPhone QA cases.

## Previously added in v2.5.0 — Workspace UX & Navigation

- **Repository Explorer:** compact, horizontally scrollable breadcrumbs; directories listed before files; per-session pinned folder shortcuts and improved back/refresh/search controls.
- **Four file modes inside Repos:** Code (read-only line-numbered viewer), Edit (mobile-friendly indentation/reset toolbar), Review (separate diff and explicit save confirmation), History (file-specific commits with GitHub links). The global navigation remains five tabs.
- **Unsaved changes protection:** a warning before abandoning an edited file, switching away from Workspace, changing repository/branch, applying another Push Profile, or logging out. Switching to a different app tab after acknowledgement **keeps the in-memory draft**; switching repository/branch discards it only after explicit confirmation.
- **PR and History navigation:** optional PR Manager now separates Branches and Pull Requests; History supports filtering locally loaded commits by SHA, author or message, without additional API calls.
- **Responsiveness and accessibility:** one additional scoped `workspace-ux.css` using existing light/dark tokens, 44 px touch targets, reduced-motion support and iPhone-width layouts. ZIP Push / Security Scan / signed Quick Edit Preview / HEAD-SHA safety / PR / Rollback backend behavior is unchanged.
- **No persistent source editing drafts:** code/text remains only in React memory and must be reloaded from GitHub after a hard reload or PWA shutdown. No credentials/source bytes are stored in localStorage.

See [WORKSPACE_UX_V250.md](./WORKSPACE_UX_V250.md) for the user flow, safety rules, and QA checklist.

## Previously added in v2.4.0 — Premium Interaction & Motion

- **Motion design tokens** (`app/styles/pro-motion.css`), imported after the existing design system: short, GPU-friendly transform/opacity entry animations, touch feedback and deliberate progress-step transitions.
- **Accessible toast feedback:** one dismissible notice at a time above iPhone bottom navigation; repo selection, ZIP validation, Review ready, verified GitHub Push/PR and connectivity changes. GitHub success is announced **only after SHA/PR verification**; raw server errors, credentials and repository names are never echoed in toast messages.
- **Reusable skeleton states** for optional dynamic Workspace/History/PR/Dashboard components, loading repositories, session check and ZIP analysis.
- **Reduced Motion:** respects system preference for navigation, stepper, toast and shimmer animations. Desktop Activity scrolling also honors reduced motion.
- **Safe state handling:** no new authentication storage or backend mutations; toast timers are cleaned up on update and unmount; stale dismissals never remove a newer notification.
- **Preserved 5-tab mobile layout** and all core v2.3.0 workflows. No third-party animation library or new environment variables.

See [MOTION_SYSTEM.md](./MOTION_SYSTEM.md) for interaction behavior, reduced-motion coverage and acceptance checks.

## Previously added in v2.3.0 — Smart Workflow UX 4.0

- **One-tap ZIP selection → automatic analysis.** Uploading a ZIP runs Web Worker parsing and the preflight/snapshot comparison automatically; the Push action remains an explicit checkbox + button.
- **Less scrolling.** The marketing hero appears only on Repos; Upload opens near the connected workflow stepper and selected repository. Advanced Merge/Sync and Direct Push/PR options are collapsed by default.
- **Faster Review.** Mobile automatically scrolls to Review when results arrive; structural warnings expand if noteworthy. Security warnings remain visible, with Critical blocking Push/PR.
- **Next version shortcut.** After verified success in Activity, start another ZIP with the same repository and branch; no commit is created by this shortcut.
- **Rendering efficiency.** History/Workspace/PR/Profiles/Dashboard/Journal load as separate client chunks; History/Settings/Journal render only on the active tab. Dashboard is lazy until its section is expanded.
- **Progress UI coalescing.** ZIP parsing and blob upload progress updates are throttled without changing network operations, saved checkpoints or final status.
- **Reliable navigation.** Tab changes retain in-memory ZIP and review state. Reloading still requires reselecting ZIP, while the existing pending commit/PR journal supports safe verification.
- **Core GitHub safeguards untouched.** GitHub App auth, blob security proofs, selection gates, SHA verify, PR branch safety, Quick Edit, History and non-force Rollback remain in place.

See [WORKFLOW_UX.md](./WORKFLOW_UX.md) for flow details, QA and safety invariants.

## Deployment

- Push the **contents of `Zipverra-v2.8.0/`** to the **repository root** on `main`, not the containing folder or ZIP itself.
- Preserve these five Vercel Production environment variables: `APP_URL`, `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `GITHUB_APP_SLUG`, `SESSION_SECRET`.
- No additional database, API token, GitHub permission or package dependency is needed.
- In CI: `npm install`, `npm test`, `npm run build`. Test Direct Push and PR on a disposable repository before production use.
- Current local packaging environment could not install npm dependencies due to registry DNS `EAI_AGAIN`. Unit tests and static syntax checks passed; Next production build and live GitHub E2E are **not** verified here.

---

## What was new in v2.0.0 (retained)

Zipverra Pro extends the existing five tabs, **Repos · Upload · Activity · History · Settings**, without adding a sixth tab or changing the default ZIP-to-GitHub flow.

1. **Pro Repository Dashboard (Repos, expandable section below repo selector):** shows total authorized writable repositories, pinned repos, saved profiles, and the latest commit SHA/message for up to five authorized favorite/recent repositories after pressing **Refresh status**. It queries the **GitHub App user session on the server** and rejects all uninstalled/unauthorized repo names. Offline, the most recent non-secret metadata cached on the device can still be viewed, but cannot be refreshed.
2. **Push Profiles (Settings):** save each repository's preferred branch, Merge/Sync mode and Direct Push/PR strategy. Profiles are **not applied automatically**; choose a repository, open Settings, and select **Apply**. This clears any old ZIP/review to prevent pushing with a stale preview.
3. **Local Activity (Activity):** records confirmed ZIP pushes, opened PRs, merges, verified rollbacks, and Quick Edit saves, plus push failures/ambiguous results. It supports filtering and clearing records. This is **device-local metadata**, not a GitHub audit log and not push notifications while the PWA is closed.
4. **Multi-repo workspace:** dashboard and profiles reduce switching overhead. GitHub App permissions remain the source of truth; source content and auth tokens are not stored in profile/activity data.
5. **UI polish:** responsive dark/light surfaces, compact badges and cards that respect mobile safe areas; splash and zoom settings remain.

### Primary workflow (unchanged)

**Repos → Upload ZIP → Review/Security Scan → Confirm Direct Push or Pull Request → Activity (SHA verified)**.

- **Direct Push** remains default. Pull Request remains optional and never auto-merges.
- Repository Explorer/Quick Edit, History/Safe Rollback, GitHub App Authentication and Secret Scan from v1.12.0 remain included.
- Zipverra Pro is a **product name**, not a paid subscription system. No billing/account tier feature is implemented.

### GitHub App / Vercel setup

The following Production environment variables are still required: `APP_URL`, `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `GITHUB_APP_SLUG`, `SESSION_SECRET`. **No additional Vercel environment variables, database or external tokens are required.**

- GitHub App **Contents: Read and write**, **Metadata: Read-only**; **Pull requests: Read and write** to use PR workflows; **Workflows: Read and write** if ZIP modifies GitHub Actions.
- Upload the **contents of `Zipverra-v2.6.0/`** into the repository root; do not upload the ZIP as a source file. Import the GitHub repository on Vercel, or let the existing Vercel project deploy the new commit.
- Run `npm install`, `npm test` and `npm run build` in CI. Production build and live GitHub operations must be verified before critical use.
- On iPhone use Safari → Share → Add to Home Screen. Continue to respect iOS safe areas and accessibility zoom controls.

### Data, security and constraints

- **Dashboard:** at most five GitHub-authorized repositories per refresh. Only latest commit metadata is read; **no Vercel API**. A read failure is shown independently for that repository.
- **Push Profiles:** up to 30 entries, device-scoped per GitHub login. Only repo/branch/mode/strategy and update timestamp are persisted. Applying a profile does not create a GitHub commit.
- **Local Activity:** up to 50 metadata-only entries, also separated per GitHub login. Clearing the list does not delete GitHub history.
- Existing ZIP upload limits, Web Worker behavior and checkpoint/security attestation rules from v1.12.0 still apply.
- Offline mode supports **viewing a previously cached dashboard**, not pushing files or automatically retrying commits in the background.
- GitHub credentials stay in encrypted HttpOnly sessions. Local storage must never include GitHub/Vercel tokens or source code.
- Secret detection is heuristic; no guarantees for undiscovered secrets or unscanned binary files.

### Smoke tests after Vercel deployment

1. Confirm footer and Settings show **v2.5.0** / Pro branding and account login works.
2. Repos → Refresh status; confirm SHA/message against GitHub and no unauthorized repo is returned.
3. Save a Push Profile, select a different repo, return and **Apply**. Verify chosen branch/strategy and that old ZIP preview is cleared.
4. Push a test ZIP, verify SHA, check Activity local record; create a PR (not auto-merged) and check PR record.
5. Quick Edit one text file, verify SHA on GitHub, and optionally test Safe Rollback on a disposable repository.
6. Switch GitHub accounts / log out: ensure Pro metadata from the previous account is not displayed.
7. On iPhone, test 320–430 px viewport, notches, bottom navigation, offline cached dashboard and light/dark modes.

---

## Previous features & architecture (retained from v1.12.0)


**Next.js 16 · React 19 · Vercel-targeted · Installable mobile PWA**  
**Slogan:** Push to GitHub. From Your Phone.

Zipverra nhận ZIP do ChatGPT xuất, đọc và đối chiếu file với một repository GitHub, dùng **tên ZIP bỏ `.zip` làm commit message**, cho chọn branch (mặc định `main`), xem preview Merge/Sync, commit rồi xác minh thay đổi trên GitHub. App chạy trên Vercel; không cần chạy Node server lâu dài hoặc Python để giải nén.


## Security & Smart Source Validation v1.12.0

### Phạm vi và cơ chế

- **ZIP Push / Pull Request:** File ZIP được giải nén bằng Web Worker và kiểm tra nội dung các file source. Màn hình Review lọc các phát hiện theo **những file đang được chọn**. File bỏ chọn sẽ không được upload/commit; trong Sync, file bỏ chọn không biến thành lệnh xóa.
- **Critical:** Phát hiện định dạng credential có độ tin cậy cao (GitHub token, AWS access key, Stripe live secret, OpenAI project key, GitLab token, Google API key, Slack token, PEM private key) hoặc tên file credential nguy hiểm. Chặn Push và PR. **Server kiểm tra lại trước khi upload lên GitHub**, kể cả khi người dùng bỏ qua giao diện bằng API call.
- **Warning:** Gán trực tiếp mật khẩu/API secret có dấu hiệu đáng ngờ, thay đổi package/lockfile/workflow/Vercel config, xóa cấu hình; cần người dùng xem xét và đánh dấu xác nhận trước Push.
- **Information:** File binary không được scan nội dung. Ứng dụng chỉ phát hiện rủi ro bằng các quy tắc cố định, **không bảo đảm source hoàn toàn an toàn**.
- **Security report:** Chỉ hiển thị path, số dòng, mã loại rủi ro và cách xử lý; không hiển thị giá trị credential hay đoạn code chứa secret.
- **Backend GitHub blob:** `/api/github/blob` giải mã, kiểm tra và chỉ upload file nếu không có Critical. Server trả về chứng nhận HMAC ràng buộc với user ID, repo, path và Git blob SHA; thời hạn **1 giờ**.
- **Backend commit:** `/api/github/commit` bắt buộc có chứng nhận còn hạn cho **mọi file thêm/sửa**. Client không được tự tạo SHA hoặc bỏ qua scan. File xóa không cần chứng nhận nội dung.
- **Upload resume:** Checkpoint chỉ dùng lại blob kèm chứng nhận quét **còn hạn và phù hợp manifest**. Các checkpoint SHA-only của phiên bản cũ sẽ phải upload lại. Không lưu credential thô trong checkpoint.
- **Quick Edit:** `/workspace/preview` và `/workspace/save` đều quét server-side; Critical bị chặn. Warning hiển thị trong Review. Preview vẫn có chữ ký 5 phút và kiểm tra HEAD/SHA như bản cũ.
- **ZIP safety:** Giữ kiểm tra ZIP traversal, symlink, file trùng, số entry, kích thước khai báo và kích thước giải nén từ v1.11.0; không tăng giới hạn để tránh ZIP bomb.

### Giới hạn và an toàn triển khai

- Detection dựa trên pattern và heuristic, có thể bỏ sót secret không thuộc mẫu, chuỗi bị mã hóa, binary hay dữ liệu rất khó nhận diện. Một số cảnh báo Warning có thể là ví dụ hoặc placeholder. **Không thay thế security scanner chuyên dụng, code review hay GitHub Secret Scanning.**
- Các file **đã tồn tại và không thay đổi** không được quét lại. Rollback tới commit lịch sử và merge PR tạo từ bên ngoài Zipverra **không được bảo đảm** đã qua lớp quét mới. Repo production nên bật thêm GitHub secret scanning/push protection nếu khả dụng.
- Việc tạo Git blob đã bị từ chối Critical không có nghĩa credentials chưa từng bị lộ ở nơi khác. Nếu secret thật từng bị chia sẻ, hãy revoke/rotate tại nhà cung cấp.
- Nếu upload mất quá 1 giờ hoặc người dùng đăng nhập sang tài khoản khác, chứng nhận quét có thể hết hạn: mở lại ZIP, phân tích và push lại; không tắt scanner.
- Không cần biến môi trường mới; vẫn cần `SESSION_SECRET` đủ mạnh đã cấu hình ở v1.11.0.
- Test thực tế với ZIP có secret giả trước khi sử dụng production; **không bao giờ đưa secret thật vào file test**.

### Checklist kiểm tra trên Vercel

1. `npm install && npm test && npm run build` (CI GitHub Actions được giữ nguyên).
2. Kiểm thử ZIP bình thường: Direct Push và PR đều thành công sau khi xác minh SHA.
3. ZIP chứa token giả đúng pattern: Review báo Critical và nút Push bị khóa; gọi trực tiếp API blob cũng trả `SECURITY_CRITICAL_BLOCKED` trước khi gửi GitHub.
4. Bỏ chọn file Critical rồi kiểm tra: chỉ file còn được chọn được push. Kiểm tra chế độ Sync giữ nguyên file bỏ chọn.
5. Test Quick Edit với token giả: preview hoặc save bị chặn. Test warning trong source không bị chặn nhưng được hiển thị.
6. Kiểm tra History, Safe Rollback, PWA safe area, branch protection và yêu cầu PR vẫn hoạt động.

---

## Các chức năng v1.11.0 tiếp tục được giữ nguyên

- **Direct Push vẫn mặc định**. Trong Upload, chọn Pull Request nếu muốn tạo branch riêng và mở PR trước khi merge vào `main`.
- Repos có bảng **Branch & Pull Requests** thu gọn, xem branch/PR và merge có xác nhận `MERGE`.
- **Activity** hiển thị riêng `branch pushed`, `PR opened`, `PR pending` và hỗ trợ khôi phục PR khi mạng gián đoạn.
- **Bắt buộc cấp thêm Pull requests: Read and write** trên GitHub App và phê duyệt lại quyền installation để dùng tính năng PR.
- v1.12.0 không thay đổi cơ chế xác thực hoặc quyền GitHub App của các chức năng này.

---

### Thông tin lịch sử v1.9.0 (đã được v1.12.0 mở rộng)

## 1. Điểm mới v1.9.0 — Repository Explorer & Quick Edit

**Source nâng cấp từ v1.8.0 Smart Push & Workflow 3.0**, không tích hợp Vercel Deployment Tracking. Giữ nguyên 5 tab mobile **Repos · Upload · Activity · History · Settings**, GitHub App Authentication, ZIP upload/Sync/Review, Push Recovery và History/Safe Rollback.

### Thao tác nhanh trên điện thoại

1. Vào **Repos**, đăng nhập GitHub App và chọn repo + branch (mặc định `main`).
2. Chạm **Repository Explorer · Quick Edit** ngay dưới lựa chọn repository. Không thêm tab thứ 6.
3. Duyệt thư mục bằng breadcrumb, lọc tên trong thư mục hoặc **Tìm toàn repo** (tối đa 60 kết quả/truy vấn).
4. Chạm file UTF-8 nhỏ để mở **read-only Code Viewer** có syntax highlighting cơ bản. Có thể **File history** và mở file trực tiếp trên GitHub.
5. Chạm **Edit file**, thay đổi source, nhập commit message (mặc định `Quick edit: <path>`), nhấn **Review Changes**.
6. Xem diff text, tick xác nhận và nhấn **Commit & Save File**. Xem commit SHA/link GitHub nếu thành công.
7. Nếu GitHub trả lỗi hoặc mạng gián đoạn trong lúc ghi, kiểm tra file/History trên GitHub trước khi thử lại. Zipverra không tự lặp yêu cầu PUT.

### Giới hạn và bảo vệ dữ liệu Quick Edit

- **Chỉ cập nhật một file text UTF-8 hiện có**, tối đa 64 KiB; không tạo mới, xóa file, sửa file nhị phân, symlink/submodule hoặc credentials `.env.local`, `.pem`, v.v. trong Workspace.
- Backend chỉ đọc file trong branch do người dùng chọn sau khi xác minh GitHub App installation và quyền `Contents: write`; workflow YAML cần `Workflows: write`.
- Preview có chữ ký HMAC `SESSION_SECRET`, gắn GitHub user ID, repo, branch, file path, `HEAD`, file SHA và digest nội dung mới; **hết hạn sau 5 phút**.
- Khi commit, kiểm tra lại HEAD và SHA file. GitHub Contents API yêu cầu SHA file cũ, giúp tránh ghi đè bản sửa của người khác; không force-push, không vượt qua branch ruleset.
- Lưu file rỗng yêu cầu xác nhận riêng. Khi rời file có nội dung chưa commit, app hỏi xác nhận trước khi bỏ bản nháp. **Draft không được lưu vào localStorage**.
- Code Viewer chỉ hiện tối đa 900 dòng đầu để giới hạn DOM; editor cho phép sửa toàn bộ file trong giới hạn 64 KiB. Diff tối đa 320 dòng mỗi phía; khi vượt ngưỡng, giao diện cảnh báo thay vì hiện diff không đầy đủ như một diff hoàn chỉnh.
- Chỉ trả token/credential trong cookie `HttpOnly` mã hóa; không đưa GitHub token tới JavaScript client. Nếu Save timeout và kết quả chưa rõ, app chỉ đọc lại GitHub để xác minh nội dung mới trước khi cho phép tiếp tục.
- **Trong v1.9.0**, Quick Edit chưa hỗ trợ tạo branch/PR. **v1.11.0 đã bổ sung Pull Request cho ZIP Push** và cho phép chọn branch có sẵn trước khi Quick Edit; PR riêng cho Quick Edit vẫn là tính năng dự kiến.

### Backend/API Workspace

`POST /api/github/workspace/list`, `/search`, `/file`, `/history`, `/preview`, `/save` — các API đều thông qua phiên GitHub App server-side, Origin check và các kiểm tra path/HEAD/permission. Không cần thêm environment variables hoặc database.

## 1. Điểm mới v1.8.0 — Smart Push & Workflow 3.0

**Phiên bản cơ sở: v1.7.0.** Không có chức năng Vercel Deployment Tracking, không cần Vercel API Token hay biến môi trường mới. Vercel chỉ là nơi chạy Zipverra.

Quy trình mobile giữ nguyên: **Repos → Upload ZIP → Phân tích/Review → Xác nhận & Push → Activity**. Tab Repos mặc định, sau khi chọn repo tự chuyển Upload. GitHub App Access vẫn trong Settings.

### Smart repositories

- Tìm kiếm repository, ưu tiên **ghim yêu thích** (favorite) và repository gần đây. Ghim được lưu cục bộ trên thiết bị, không chứa token.
- Đổi repository sẽ xóa ZIP/preview cũ để tránh push sang nhầm repo; branch mặc định `main`.

### Smart ZIP analyzer

- Giải nén ở Web Worker từ v1.7.0; hiển thị framework phát hiện từ manifest (`Next.js`, `Vite`, `React`, `Node.js`, `Python`, `Flutter`, v.v.) và số file binary.
- Cảnh báo thay đổi lockfile, `package.json`, `next.config`, workflows và dự kiến xóa file bằng Sync; mô tả những file hoặc thư mục build/cache đã bỏ qua.
- Đường dẫn nguy hiểm (`.env.local`, credentials, private keys, symlink, path traversal) tiếp tục bị **chặn bởi ZIP parser hiện tại**; analyzer là kiểm tra bổ trợ, không thay thế audit bảo mật.

### Review & selective staging

- Bộ lọc Thêm / Sửa / Xóa, tìm theo tên file, checkbox chọn/bỏ từng file, chọn/bỏ toàn bộ; danh sách hiển thị 100 mục mỗi lần để tránh render hàng nghìn hàng trên iPhone.
- Bỏ chọn nghĩa là **không tạo thay đổi cho path đó**, kể cả khi mode Sync đang dự định xóa file trên GitHub.
- `Xác nhận & Push` chỉ cho phép khi còn file được chọn. Mọi thay đổi lựa chọn đều đặt lại checkbox đồng ý; xóa trong Sync cần xác nhận riêng.
- Chỉ kiểm tra quyền Workflows: write cho file `.github/workflows` **đang được chọn**. HEAD vẫn được kiểm tra lại trong backend trước commit.
- **Text diff** cho file UTF-8 nhỏ (tối đa 64 KiB mỗi bản, 320 dòng/phía); backend đọc blob từ đúng SHA ở HEAD đã phân tích, xác minh repo + installation; không chấp nhận SHA tùy ý từ trình duyệt. Không hỗ trợ nhị phân hoặc file quá lớn, không làm thay đổi file trên GitHub.

### Live Push Activity

- Tự chuyển Activity ngay lúc nhấn Push; hiển thị số file/batch và lượng dữ liệu đã upload, tốc độ/ETA **ước tính**. Batch 12 file, tối đa 2 request song song.
- Fingerprint/checkpoint dùng **chỉ các file được chọn**, ngăn tái dùng blob của danh sách thay đổi khác. Giữ xác minh HEAD/commit SHA, trạng thái unconfirmed, nút Verify Push, retry an toàn từ v1.7.0.
- Không có background upload nếu đóng PWA. Không tự retry commit có kết quả chưa xác nhận.

## 1. Điểm mới v1.7.0

- **GitHub App web authentication** thay cho OAuth App scopes rộng `repo workflow`. Đăng nhập bằng nút **Continue with GitHub** và OAuth authorization code + state chống CSRF.
- **Select repositories:** app được cài và cấp phép trên tài khoản GitHub hoặc Organization, tùy chọn **Only select repositories**; UI chỉ liệt kê repository có quyền `push`, đã được GitHub App cấp `Contents: write`.
- **GitHub App permission preflight:** kiểm tra installation, chủ repo, quyền ghi của người dùng, Contents: write và Workflows: write (nếu ZIP có `.github/workflows/*.yml` hoặc `.yaml`); kiểm tra lại tại bước Commit.
- **Expiring user access token:** mặc định 8 giờ, refresh token do GitHub cung cấp. Server làm mới khi sắp hết hạn và xoay vòng session cookie HttpOnly AES-256-GCM. Session web tối đa 7 ngày.
- **Manage GitHub App:** đường dẫn cài đặt/cấp thêm repository cùng nút Refresh danh sách repo. Hỗ trợ Organization nếu admin phê duyệt.
- **Không cần GitHub App private key:** Vì Zipverra **chỉ thực hiện yêu cầu theo tương tác người dùng**, API dùng user-to-server access token, bị giới hạn bởi **cả quyền người dùng và quyền đã cấp cho App**. Không dùng installation access token để push thay người dùng (đề phòng nâng quyền trái ý).
- Giữ 5 tab `Repos · Upload · Activity · History · Settings`, PWA safe area, splash, zoom lock, Light/Dark, diff preview, Merge/Sync, upload binary, SHA verification, retry có kiểm soát, journal và Verify Push.


### Repo-first workflow & Mobile UX 3.0 — v1.7.0

Quy trình trên điện thoại được **thiết kế lại theo thứ tự bắt buộc**:

1. **Repos (màn hình mặc định)** → đăng nhập GitHub nếu cần, tìm/chọn repository, nhập branch (mặc định `main`). Chọn repo sẽ tự chuyển sang Upload.
2. **Upload ZIP** → chỉ cho chọn file khi repo đã được cấp quyền. Thay repo sẽ **xóa ZIP cũ**, đưa mode về Merge và hủy preview để không push nhầm source sang repo mới.
3. **Phân tích & kiểm tra** → giải nén ở Web Worker, bảo vệ đường dẫn, hash Git Blob SHA-1, kiểm tra quyền GitHub, đọc HEAD và tạo preview thêm/sửa/xóa. Chưa thực hiện commit.
4. **Xác nhận & Push** → tick xác nhận; Sync xóa file cần tick riêng. Commit message mặc định là tên ZIP không có `.zip`.
5. **Activity** → **tự động mở ngay khi nhấn Push**, hiển thị Validate → Upload → Commit → Verify, tiến độ batch, lỗi và nút Xác minh push nếu kết quả chưa rõ.

Tab **Repos** chỉ chứa repo, branch, tìm kiếm và repo gần đây (đã lọc theo quyền hiện tại). **GitHub Account & App Access** (Install / Manage, Refresh, Logout) chuyển sang **Settings** nhằm giảm rối.

**Đã xóa** đoạn mô tả dài mà người dùng yêu cầu bỏ khỏi giao diện. Hero vẫn giữ slogan `Push to GitHub. From Your Phone.`.

### Advanced ZIP & Large Source — v1.7.0

- **Web Worker:** JSZip giải nén, bảo vệ ZIP traversal, phát hiện file nguy hiểm và tính Git SHA-1 ngoài luồng giao diện; `Uint8Array` được transfer về main thread, giảm copy bộ nhớ. Nếu trình duyệt không hỗ trợ Worker, tải module parser theo nhu cầu và chạy fallback trên UI thread.
- **ZIP lớn hơn:** tối đa **120 MiB ZIP/240 MiB giải nén Standard; 200 MiB ZIP/400 MiB giải nén Extended (có xác nhận)**, **2.500 file source (tối đa 10.000 phần tử trong ZIP tính cả file bỏ qua)**, **2.500 file thay đổi mỗi commit**, tối đa 12.000 file được đọc ở repository đích. Cần thiết bị đủ RAM; ZIP lớn không bảo đảm mọi iPhone đủ RAM để phân tích được.
- **Giới hạn file đơn:** **2,5 MB/file** (định dạng nhị phân lẫn text). Các yêu cầu gửi Base64 qua Vercel dưới ngưỡng body 4,5 MB; chưa hỗ trợ split một file lớn thành nhiều phần để tạo **một Git blob** vì GitHub Git Data REST API không có giao diện multipart blob. File lớn hơn cần Git/Git LFS hoặc cơ chế object-storage/worker riêng trong tương lai.
- **Batch upload:** nhóm tối đa 12 file, 2 upload blob đồng thời. Chỉ gửi **file thay đổi**, không gửi nguyên ZIP lên server; không tự retry commit/branch mutation.
- **Resume trước commit:** mỗi blob được xác minh SHA và checkpoint ở `localStorage` trên thiết bị (metadata tên file/SHA, không phải nội dung ZIP/token). Khi mất mạng, mở lại PWA → **chọn lại cùng repo/branch và file ZIP** → phân tích lại → Push; file đã upload với SHA phù hợp sẽ được bỏ qua. Checkpoint chỉ hợp lệ trong 24 giờ và ràng buộc bởi fingerprint SHA-256 của repo, HEAD, mode, path và blob SHA.
- **Trạng thái commit không chắc chắn:** ưu tiên nút **Xác minh push** ở Activity; không tự tạo commit thứ hai. Recovery Journal cũ dùng `sessionStorage` vẫn hoạt động.
- **Thận trọng:** Không có tiến trình background khi đóng PWA. Resume là **tiếp tục theo file** sau khi người dùng mở lại/chọn lại ZIP, không phải tiếp tục từng byte bên trong một file đang upload.


### History & Safe Rollback — v1.6.0

- **History:** mở tab **History** ở thanh điều hướng mobile; repo/branch đang chọn từ Repos được dùng lại. Nhấn **Refresh History** để lấy 20 commit/trang từ GitHub (tối đa 25 trang). Nhấn từng commit để xem SHA, tác giả, ngày, commit message; nhấn biểu tượng ↗ để mở GitHub.
- **Compare Versions:** chọn 2 commit trong lịch sử, nhấn **So sánh thay đổi**. Zipverra so sánh **toàn bộ Git tree**, phân loại file thêm/sửa/xóa; chỉ hiển thị file-level diff (không hiển thị line-by-line patch).
- **Rollback:** chọn commit cũ trong lịch sử, nhấn **Preview rollback**, kiểm tra danh sách file + số file bị xóa/sửa/thêm, tick xác nhận rồi nhập chính xác `ROLLBACK`.
- **Cách khôi phục:** backend tạo **một commit mới** với *tree của commit đích* và *parent là HEAD tại thời điểm preview*. Sau đó update ref với `force:false`. Lịch sử Git cũ không bị xóa hay reset; rollback này khôi phục **toàn bộ snapshot** của commit đích, không chỉ đảo một commit đơn lẻ.
- **Trạng thái không rõ:** lưu metadata (owner/repo/branch/HEAD trước đó/target SHA) trong `sessionStorage` trước mutation. Nếu mất mạng hoặc đóng PWA giữa chừng, quay lại tab History và bấm **Xác minh rollback**, tuyệt đối không rollback lần nữa cho đến khi kiểm tra xong.
- **Giới hạn an toàn:** commit đích phải là tổ tiên của branch hiện tại; HEAD không được đổi sau preview; proof HMAC trong 10 phút; chặn thay đổi `.env`/khóa riêng, symlink/submodule, rollback vượt 2.500 file, Git tree bị cắt ngắn; kiểm tra Contents/Workflows write ngay trước tạo commit. Branch protection/ruleset vẫn có thể chặn thao tác, Zipverra không bypass.
- **Không yêu cầu database hay biến môi trường mới**. Dùng `SESSION_SECRET` hiện có để ký preview rollback, không trả GitHub token xuống client.
- **Chú ý:** Rollback có thể vô hiệu hóa các thay đổi vừa deploy, vì vậy nên xem kỹ `package.json`, CI workflow, database migration và mọi file bị xóa trước khi xác nhận. Không hỗ trợ tự tạo Pull Request khi branch được bảo vệ trong v1.6.0.

## 2. Đưa source lên GitHub và Vercel

1. Giải nén bản ZIP; upload **các file bên trong `Zipverra-v1.8.0/`** vào **gốc repository** của Zipverra (chứa ngay `package.json`, `app/`, `lib/`, `public/`). Không upload nguyên file ZIP lên GitHub với kỳ vọng Vercel tự giải nén.
2. Vercel → **Add New Project** → import repository → Next.js / Root Directory `./`.
3. Trước khi triển khai hoạt động đăng nhập, tạo GitHub App theo Mục 3 và cấu hình environment variables Mục 4.
4. Deploy → Vercel Logs phải chạy `npm run build` thành công. Các phiên bản trước không thể sử dụng lại Client ID/Secret OAuth App cũ.
5. Truy cập URL production trên iPhone; Safari → Share → Add to Home Screen để cài PWA.

> `APP_URL` phải là URL domain production ổn định, ví dụ `https://zipverra.example.com` hoặc `https://zipverra.vercel.app`. Nếu dùng alias/custom domain, callback GitHub App phải khớp **chính xác**. Vercel preview URLs khác domain production sẽ không xác thực được nếu vẫn dùng cùng APP_URL.

## 3. Tạo GitHub App (bắt buộc)

1. GitHub → [Settings / Developer Settings / GitHub Apps](https://github.com/settings/apps) → **New GitHub App**.
2. **GitHub App name:** chọn tên còn trống, ví dụ `zipverra-personal`; app URL: `https://YOUR_ZIPVERRA_DOMAIN`.
3. **Callback URL:** `https://YOUR_ZIPVERRA_DOMAIN/api/auth/callback`. Đây là URL cho nút Continue with GitHub.
4. **Request user authorization (OAuth) during installation:** **tắt**. Zipverra đã có nút login riêng với `state` chống CSRF. Nếu bật chế độ tự bắt đầu OAuth trong khi cài App, GitHub có thể redirect vào callback không có state của phiên hiện tại và Zipverra sẽ từ chối.
5. **Expire user authorization tokens:** bật (GitHub mặc định bật). Zipverra yêu cầu refresh token và token có hạn, không nhận token không hết hạn.
6. **Repository permissions:** `Contents` → **Read and write**, `Metadata` → **Read-only** (mặc định); `Workflows` → **Read and write** để có thể cập nhật `.github/workflows/*.yml/.yaml` (nếu không cần cập nhật workflows có thể bỏ quyền này). Không cần quyền `Administration`, `Actions` hoặc `Organization` để push source cơ bản.
7. **Where can this GitHub App be installed:** chọn Only on this account cho sử dụng cá nhân, hoặc Any account cho organization/đa người dùng tùy nhu cầu. Admin tổ chức có thể phải phê duyệt.
8. Save → lấy **Client ID** (thường có dạng `Iv23xxxxx` (hoặc kiểu cũ `Iv1.xxxxx`)) và tạo **Client secret** tại GitHub App settings. Lấy **slug** từ đường dẫn `https://github.com/apps/SLUG` (ví dụ `zipverra-personal`). App ID và private key **không** được dùng trong kiến trúc user-to-server của phiên bản này.
9. Trên Zipverra: **Continue with GitHub** để đăng nhập, sau đó **Install / Manage GitHub App** → chọn account/organization → **Only select repositories** → chọn repo muốn push. Về Zipverra nhấn **Refresh** để tải danh sách repo. Có thể cài App trước rồi login cũng được.
10. Nếu nâng quyền Workflows cho App đã cài: GitHub có thể yêu cầu chủ installation chấp nhận lại quyền mới. Làm mới trang sau khi chấp thuận.

**Giải thích quyền:** GitHub App user token không dùng OAuth `repo workflow` scopes. Token này chỉ cho phép thao tác trên phần giao nhau giữa repository/quyền của tài khoản và repository/quyền được cấp cho GitHub App. Đây là token phát hành cho thao tác nhân danh người dùng, không phải installation token.

## 4. Cấu hình môi trường Vercel

Vercel → Project → Settings → Environment Variables → Add (Production), rồi **Redeploy**:

| Biến | Giá trị |
|---|---|
| `APP_URL` | `https://YOUR_ZIPVERRA_DOMAIN` (không có path, không có dấu `/` ở cuối) |
| `GITHUB_APP_CLIENT_ID` | GitHub App Client ID (`Iv23...` or `Iv1...`), **không phải** App ID |
| `GITHUB_APP_CLIENT_SECRET` | GitHub App Client Secret (chỉ server biết) |
| `GITHUB_APP_SLUG` | Slug trong `github.com/apps/SLUG` |
| `SESSION_SECRET` | Chuỗi ngẫu nhiên tối thiểu 32 ký tự, khuyến cáo 64 ký tự hex, ví dụ `openssl rand -hex 32` |

Không cần `DATABASE_URL`, `GITHUB_APP_PRIVATE_KEY` hoặc `GITHUB_APP_ID`. Các biến `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` cũ **không được sử dụng** trong v1.7.0; có thể xóa sau khi đảm bảo migration thành công. Tuyệt đối không đưa `.env.local` chứa secret vào GitHub.

## 5. Quy trình Push từ iPhone

1. Trong **Repos**, đăng nhập GitHub App nếu cần; chọn repo đã cài quyền, `main` mặc định. Chọn xong → tự mở **Upload**.
2. Trong **Upload**, chọn ZIP từ Files → chọn `Merge` hoặc `Sync` → nhấn **Phân tích ZIP và xem thay đổi**.
3. Chờ Web Worker giải nén, preflight và tải HEAD → kiểm tra số file thêm/sửa/xóa → tick **Tôi đồng ý** (và tick xác nhận xóa riêng nếu Sync).
4. Nhấn **Commit & Push** → Zipverra tự chuyển sang **Activity**, theo dõi trạng thái và tiến độ batch.
5. Sau thành công, GitHub commit URL xuất hiện. Nếu mất mạng/timeout tại commit, chỉ nhấn **Xác minh push**, không retry commit mù quáng.
6. Nếu lỗi xảy ra **trước commit**, chọn lại **cùng repo + ZIP** và phân tích lại; checkpoint 24 giờ giúp bỏ qua blob SHA đã upload, miễn là HEAD chưa đổi.

**Settings:** GitHub Account & App Access, quản lý installation/quyền repo, đăng xuất và đổi Dark/Light.

## 6. Security và giới hạn

- Session lưu token truy cập + refresh token trong cookie `HttpOnly`, `SameSite=Lax`, `Secure` trên HTTPS, nội dung AES-256-GCM. Mã cookie v1.4.0 không hợp lệ trên v1.7.0, nên người dùng phải đăng nhập lại **một lần**.
- GitHub App user access tokens có hạn 8 giờ; refresh token được xoay vòng server-side khi gần hết hạn. Refresh đồng thời trong **cùng một Function isolate** được hợp nhất. **Giới hạn MVP:** nếu nhiều Vercel instances cùng refresh một cookie cũ đúng lúc, vẫn có thể xảy ra tranh chấp refresh token; khi đó đăng nhập lại. Giải pháp lâu dài: phiên tập trung/atomic refresh trong database/KV.
- Session trong cookie 7 ngày (ngắn hơn refresh token GitHub). Đăng xuất xóa cookie của Zipverra; không thu hồi ngay token ở phía GitHub. Người dùng có thể thu hồi quyền ứng dụng từ GitHub Settings → Applications.
- Mutation API yêu cầu origin chính xác với `APP_URL`, `Content-Type: application/json`; frontend không đọc hoặc truyền token GitHub. Tránh cài Zipverra trên domain không đáng tin.
- Không thể vượt qua GitHub branch protection, ruleset, yêu cầu status checks hoặc organization policy; các repo đó phải dùng PR (tính năng tương lai).
- ZIP mặc định 120 MiB/240 MiB, nâng cao 200 MiB/400 MiB sau xác nhận; tối đa 2,5 MB/file; tối đa 2.500 file; không hỗ trợ tạo branch mới, Git LFS, symlink Git hoặc submodule phức tạp. Xử lý ZIP trực tiếp trong trình duyệt để hạn chế giới hạn request 4,5 MB của Vercel Functions.
- Không ghi token ra logs, không lưu source ZIP trên server. PWA recovery journal giữ **metadata commit** cục bộ trong sessionStorage, không lưu access token.

## 7. Migration từ v1.4.0

1. **Đảm bảo có cách rollback**: lưu commit/ZIP v1.4.0. Chưa xóa GitHub OAuth App cũ ngay.
2. Tạo GitHub App mới, thiết lập callback, permission, client secret, slug; cấu hình 5 biến env mới.
3. Deploy v1.7.0; mọi người dùng sẽ phải đăng nhập lại vì session mới không chấp nhận cookie OAuth cũ.
4. Install GitHub App trên đúng repository và organization; login/Refresh; push thử vào **repo/branch thử nghiệm**, xác minh commit.
5. Khi mọi thao tác đã ổn định, mới xóa biến env OAuth cũ và cân nhắc thu hồi OAuth App cũ.

## 8. Kiểm thử

```bash
npm install
npm test
npm run build
```

GitHub Actions `ci.yml` cũng chạy test và build mỗi commit/pull request. `tests/` chứa session encryption, GitHub App OAuth URL, refresh rotation, kiểm tra installation và permission, commit verification, retry, mobile UI, PWA. Một số kiểm thử cần cấp quyền và repository thật **không thể thay thế bằng unit tests**; chạy checklist trong `QA_NOTES.md` sau deploy.

## 9. Tài liệu bổ sung

- `CHANGELOG.md` — lịch sử thay đổi
- `QA_NOTES.md` — checklist triển khai và bảo mật
- `ROADMAP_NEXT.md` — v1.7.0 Advanced ZIP & Large Source
- [GitHub Docs: Generating a user access token](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app)
- [GitHub Docs: Refreshing user access tokens](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/refreshing-user-access-tokens)
- [GitHub Docs: Installation repositories accessible to user](https://docs.github.com/en/rest/apps/installations)


## v1.5.1 — Sửa lỗi nhầm GitHub App Client ID là cấu hình không hợp lệ

GitHub App Client ID có thể có dạng mới `Iv23...` **không có dấu chấm**. v1.5.0 kiểm tra quá chặt nên từ chối giá trị hợp lệ. v1.5.1 hỗ trợ cả định dạng mới và cũ.

Nếu sau khi deploy vẫn báo chưa cấu hình, đọc chính xác tên biến trong lỗi:
- `GITHUB_APP_CLIENT_ID`: xem **GitHub App → General → About → Client ID** (không phải App ID).
- `GITHUB_APP_CLIENT_SECRET`: xem **GitHub App → Credentials → Client secrets → Generate a new client secret**.
- `GITHUB_APP_SLUG`: lấy phần sau `/apps/` ở **Public page**.
- `APP_URL`: URL HTTPS production, phải khớp domain đang mở và callback `/api/auth/callback`.
- Cả 4 biến phải áp dụng **Production**, sau đó tạo deployment mới/Redeploy.

Không gửi secret qua tin nhắn, ảnh chụp hoặc commit source lên GitHub.


## v1.6.0 — History, compare & rollback endpoints

| API Route (POST, authenticated) | Nhiệm vụ |
|---|---|
| `/api/github/history` | List commit theo branch, 20/trang |
| `/api/github/compare` | So sánh hai tree theo commit SHA |
| `/api/github/rollback/preview` | Tạo diff + signed 10-minute preview |
| `/api/github/rollback/execute` | HEAD guard → create commit → non-force update → verify |
| `/api/github/rollback/verify` | Chỉ đọc/đối chiếu SHA khi kết quả chưa rõ |

Tất cả API sử dụng GitHub App user token trong cookie HttpOnly, xác nhận Origin/JSON và trả `Cache-Control: no-store`. Không chấp nhận token GitHub trực tiếp từ trình duyệt.


## 9. Kiểm thử đặc thù v1.7.0

- Unit tests cho manifest fingerprint, giới hạn ZIP, batch concurrency/resume, bỏ qua blob theo SHA, lỗi mạng, SHA sai và vòng đời Web Worker.
- Kiểm tra repo-first UX và việc chuyển GitHub App Access sang Settings; kiểm thử Repos/Upload/Activity/History/Settings trên thiết bị thực khi triển khai.
- Trước khi dùng ZIP lớn với source quan trọng, thử ở repository sandbox với ZIP lớn nhưng **mỗi file <= 2,5 MB**, kiểm tra Vercel Runtime Logs, GitHub commit SHA và memory Safari/PWA.
- `npm run build` phải được kiểm tra qua Vercel hoặc GitHub Actions. Môi trường đóng gói có thể không truy cập được npm registry; không coi source là đã production-verified khi chưa chạy build/E2E thật.

**Next:** Zipverra v1.8.0 — Vercel Deployment Tracking.


## Zipverra v1.11.0 — Branch & Pull Request Manager

> **Source baseline:** v1.9.0. This direct version jump does **not** claim to include the planned v1.10.0 Security & Smart Source Validation features.

### Two ways to publish source ZIP

1. **Direct Push (default):** Repos → choose repo & branch (`main`) → Upload → ZIP → Review → Confirm & Push → Activity. Existing behavior is preserved.
2. **Pull Request (optional):** Same workflow, but in **Upload → Cách cập nhật source**, select **Pull Request** before Analyze. Zipverra calculates a unique `zipverra/<zip-name>-<8-hex>` branch and displays it in Review. After confirmation:
   - Verify the base HEAD has not changed since Review.
   - Ensure GitHub App has `Contents: write` and `Pull requests: write` permissions.
   - Create branch at the reviewed base commit, **without force**.
   - Upload only the selected changes and commit to the new branch.
   - Verify the branch commit SHA on GitHub; create PR into the chosen target branch.
   - Show PR link in **Activity**. **This does NOT merge the PR automatically.**

### Branch & PR Manager

Repos → Select repository → expand **Branch & Pull Requests**. Select existing branches, load open PRs and open them on GitHub. If merging inside Zipverra, read the PR, verify CI/review first, select Merge and type **MERGE**. Server checks expected PR HEAD SHA, current GitHub mergeable state, installation permissions, and GitHub enforces branch protection, required reviews and CI. Merge is never forced.

### IMPORTANT: new GitHub App repository permission

For PR features, open GitHub App Settings → **Permissions & events** → **Repository permissions** → **Pull requests: Read and write**, then save and **approve the new permission in Install/Manage GitHub App** for each installation. Keep Contents: Read and write; Workflows: Read and write for ZIP changes touching `.github/workflows/*.yml`/`.yaml`. Refresh repositories after reapproval. Direct Push does not require the new Pull requests permission.

**No new Vercel environment variables.** Existing `APP_URL`, `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `GITHUB_APP_SLUG`, `SESSION_SECRET` are retained. This version does **not** integrate Vercel Deployment Tracking or any Vercel API token.

### Recovery and conflict handling

- Existing branch names are never overwritten during PR creation.
- A changed target branch HEAD before creating the release branch rejects the workflow with HTTP 409. Re-analyze to get a new branch name.
- If commit was pushed but PR creation failed or timed out, **Activity → Kiểm tra / Tạo PR** recovers using the verified SHA and looks for an existing PR first. It does not re-upload ZIP or create another commit.
- If push commit is ambiguous, **Activity → Xác minh push** must run before attempting another commit or PR.
- An existing closed/merged PR is not silently reused as an open one. Use GitHub to review its state.
- Branch protection cannot be bypassed. If Direct Push is rejected, first verify the previous attempt, then switch to Pull Request and review ZIP again.
- After review, merging a PR changes the target branch and could trigger a deployment configured elsewhere. Zipverra itself does not track Vercel deployments.

### Constraints / release QA

- Quick Edit remains single-file direct commit as in v1.9.0; the PR workflow applies to **ZIP Push**. Branch manager allows selecting a different branch for Quick Edit.
- No v1.10.0 deep secrets scanning has been implemented. Continue checking ZIP for secrets before publishing.
- GitHub Git API and Vercel production build are not validated by unit tests alone. Run `npm install`, `npm test`, `npm run build` and a live disposable-repo PR/merge smoke test before relying on production.

## v3.8.4 — Unified Notification System
See [RELEASE_V384.md](RELEASE_V384.md) for changes, test results and release validation.
