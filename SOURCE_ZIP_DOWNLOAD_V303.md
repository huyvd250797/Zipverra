# Zipverra Pro v3.0.3 — iPhone Save to Files Hotfix

## Problem

With `href` + `download` pointing directly at `application/zip`, iPhone Safari and standalone PWAs may open the system ZIP preview (Quick Look), leaving the Zipverra screen and showing a black document viewer with **Open in…**. The ZIP download may have succeeded; this is a native iOS document preview, not a crashed Next.js route. Web apps cannot force-close the native viewer.

## Fix

1. Source ZIP is fetched from same-origin `/api/github/source-zip` into a **bounded ephemeral Blob** (max 48 MiB on the client).
2. Download progress reports actual bytes received and the user can cancel.
3. After validation of ZIP signature and content length, a ready state displays the commit-derived archive filename.
4. On iPhone with supported file sharing, tapping **Lưu vào Tệp** invokes `navigator.share({ files: [File] })` in the direct user gesture. The user selects **Save to Files** in the iOS share sheet. The PWA remains mounted behind it; dismissal returns to the app.
5. If share support is absent or the archive is over the in-app limit, a labeled browser-download fallback remains. That fallback may still show Apple's native ZIP preview; users can select **Open in… / Share → Save to Files**.

## Safety constraints

- No GitHub token reaches browser JS; all authenticated GitHub/codeload fetches remain server-side.
- Both archive content and filename derive from the same immutable `main` HEAD SHA.
- ZIP data stays in browser memory only until the UI is replaced/repo changes/tab closes. No IndexedDB/localStorage/cache persistence.
- No automatic commit, ZIP upload, branch mutation or PR action is triggered by downloading.
- 48 MiB in-app ZIP memory budget; previous 512 MiB server stream maximum remains.

## Verification

- Node test suite includes mocked private-repo ZIP streaming and browser-bounded download/read/share capability cases.
- `npm run build` and actual iPhone Save to Files behavior require networked deployment + device acceptance, not inferred from static checks.
