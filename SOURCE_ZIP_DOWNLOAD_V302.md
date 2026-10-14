# Zipverra Pro v3.0.2 — iPhone Source ZIP Download Fix

## Defect

In v3.0.1 the HTML download link opened a new browsing context, while the Next.js endpoint redirected (`302`) to an ephemeral GitHub `codeload.github.com` URL. On iPhone PWA this could present a blank browser sheet instead of saving a file, and browsers had no requested filename.

## Corrected data flow

1. The user selects a repository, then taps **Tải ZIP**. A normal same-origin anchor with the `download` attribute requests `/api/github/source-zip?owner=...&repo=...` in the existing browsing context.
2. The server validates the encrypted GitHub App session and installation/user repository authorization.
3. It resolves `refs/heads/main`, captures SHA, reads `/git/commits/{sha}` to derive the **HEAD commit subject** and a safe filename. If metadata is unavailable, the fallback name is `repo-shortSHA.zip`.
4. The server asks GitHub for `/zipball/{sha}`, validates GitHub's signed `codeload.github.com` location, and **follows that signed URL server-side** without forwarding the GitHub App token.
5. Only a `200` response with a valid ZIP signature is accepted. The ZIP is streamed via `Response` with `Content-Type: application/zip` and `Content-Disposition: attachment; filename=...`. The client never receives the token or codeload URL.
6. The size guard is 512 MiB of ZIP bytes. No temporary database, object storage or browser JS Blob buffering is required. Large downloads still depend on Vercel timeouts and iOS Safari behavior.

## Filename example

Commit title `Zipverra Pro v3.0.2 — Download Fix` → `Zipverra_Pro_v3.0.2_Download_Fix.zip`. The archive content and filename are always derived from the *same immutable commit SHA*.

## Notes

- Download operates only on `main`, regardless of the branch selected for Push.
- No history, `.git` directory or untracked files appear in GitHub ZIP archive.
- No write API has been changed, and no GitHub mutation is performed on download.
- On iPhone, find downloaded ZIP in Safari Downloads or Files → Downloads.
- Production build and actual iPhone PWA download must be verified after deployment.
