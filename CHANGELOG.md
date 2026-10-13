# Zipverra Changelog

## v1.5.0 — GitHub App Authentication (2026-10-13)

- Thay OAuth App scopes `repo workflow` bằng GitHub App user-to-server flow với OAuth `state` + `offline_access`.
- GitHub App install/manage URL và danh sách repository bị giới hạn theo người dùng + App installation; hỗ trợ owner/organization.
- Preflight Contents: write, Workflows: write, user push rights và revalidate tại commit.
- Phiên cookie AES-256-GCM v2 chứa access + refresh token; token rotation và singleflight best-effort.
- Giữ Mobile UX/UI 2.0, push recovery, Merge/Sync, PWA.
- Cấu hình Vercel mới và tài liệu migrate.

## v1.4.0 — Mobile UX/UI 2.0 (2026-10-13)

### Added
- Mobile-first bottom navigation: Home, Repos, Activity, Settings. Views keep shared GitHub/ZIP state while switching.
- Quick repo target card on Home and return-to-upload CTA on Repos.
- Client-side repository search, loading skeleton, and up to five recent repo names saved locally.
- A four-stage push timeline (Validate, Upload, Commit, Verify), with uncertain state distinguished from success.
- Error/progress shortcut when another mobile tab is active, plus recovery alert.
- Preview filters: All, Added, Modified, Deleted.
- Separate explicit consent for Sync deletions.
- Light/Dark display preference and reduced-motion support.
- Scroll into preview after analyze on mobile, with reduced-motion respected.

### Preserved
- GitHub OAuth (server-side encrypted HttpOnly session).
- ZIP commit message = filename without `.zip`.
- Default branch `main`, Merge/Sync, source guardrails, binary blob upload.
- Commit verification and cautious recovery from v1.3.4. No blind retry of ambiguous commit mutations.
- PWA safe area, splash and zoom lock from v1.3.3.

### Verification
- 52/52 automated unit tests passed.
- JSX checked by TypeScript parser/transpiler.
- Chromium static CSS/layout harness at 320, 375, 390, 430, 768 and 1280 px: no horizontal overflow in fixture.
- Next.js production build and live GitHub E2E push NOT verified in packaging environment: npm registry DNS unavailable.

## v1.3.4 — Push Reliability & Error Recovery
- Safe API retries, verification, recovery journal, and network state handling.
