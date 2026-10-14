# Zipverra Pro v3.0.1 — Source ZIP Download

## Goal

Download the complete GitHub repository source snapshot from branch `main` to the device via Zipverra. This applies to repositories that the current GitHub App user can already select, including private repos.

## UI

- Repos: selected repository → **Download Source ZIP → Tải ZIP**.
- Upload: same action near the repository destination to accommodate the current automatic transition after repo selection.
- Always `main`, regardless of Push branch selection. Offline/busy states disable the download action.
- Uses a normal HTML anchor with `target="_blank"` to preserve native iOS download handling; does not call `window.open()` after asynchronous work.
- Browser/Safari may place the ZIP in Downloads; open Files to move or share it.

## Security and data path

1. Browser requests same-origin `GET /api/github/source-zip?owner=...&repo=...`.
2. Server validates coordinates, resolves encrypted HttpOnly GitHub App session (refreshing expiring tokens when needed), derives current installation permissions and verifies user `push` grant.
3. Server checks the `main` Git ref exists before requesting `/repos/{owner}/{repo}/zipball/main`.
4. Server requests the GitHub archive endpoint with `redirect: manual`. Only a valid HTTPS `codeload.github.com/{owner}/{repo}/legacy.zip/...` (or `/zip/...`) redirect is accepted.
5. Server replies `302 Location: <GitHub archive>` with `Cache-Control: no-store` and `Referrer-Policy: no-referrer`. No archive stream or GitHub OAuth token is forwarded through the browser-side application.

The codeload URL for private repos is short-lived (GitHub documentation says five minutes) and should not be saved or logged. The browser receives this temporary download URL as part of the native redirect; it does not receive GitHub App session tokens.

## Safety guarantees

- This is a read-only operation (GET only). It never calls GitHub mutations (POST/PATCH/PUT/DELETE).
- No GitHub credentials or source archive contents are saved in localStorage/sessionStorage or service worker caches.
- No private download is offered unless the current user can select that repo.
- Bad authorization, invalid paths, missing `main`, invalid redirect or GitHub transient errors return static, non-sensitive HTML error page.
- No new Vercel environment variables, external package dependencies, or database.

## Limitations

- GitHub ZIP archives capture current tracked content only; no Git history.
- Submodule/LFS contents depend on GitHub archive behavior and repo configuration.
- Some iOS PWA builds open the download in Safari. Saving to Files is controlled by iOS.
- GitHub App must already be installed with at least Contents read; Zipverra's repository picker currently shows writable granted repos, and the download re-checks that grant.
- Manual GitHub App and iPhone E2E remain part of post-deployment release verification.

## Unit tests

`tests/source-zip-download.test.js` contains **11 tests** validating: main-only request, repo validation, protected redirect host/path, grant-before-download, HEAD existence, no archive streaming, timeout/rate-limit states, unauthenticated and malformed requests, and a simulated private GitHub App session.
