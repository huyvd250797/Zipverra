# Zipverra Pro v2.6.0 — PWA Optimization & Reliability

## Architecture

- `public/sw.js`: scope `/`, public cache `zipverra-public-v2.6.0`. Precache only `/offline.html`, `/icon.svg`, `/icon-192.png`, `/icon-512.png`, `/apple-touch-icon.png`. Delete only old `zipverra-public-...` versions on activation.
- `GET /api/version`: public no-store response containing just `{ "version": "2.6.0" }`. Used for health/version checks; never provides auth or session data.
- `app/components/PwaReliability.jsx`: SW registration, update prompt, offline check, resume events; fetch no more than once per minute on typical foreground transitions and timeout after 8 seconds. SW activation requires explicit user click, and update is locked while a mutation/draft/recovery journal exists.
- `app/components/RecoveryCenter.jsx`: displays authorized-repository pending Push/PR/Rollback in Activity. Push Verify is read-only; PR check/create may create the missing PR only after a user click; Rollback must be verified from History (read-only verification), never retried blindly.
- `app/styles/pwa-reliability.css`: mobile-safe, accessible banners and recovery rows.
- `app/components/SplashScreen.jsx`: overlay minimum 180ms, failsafe 1.8s; app can continue loading authenticated status in ordinary UI rather than blocking the screen.

## Strict cache and auth rules

1. GitHub REST API, `/api/auth`, all `/api/` routes, Next.js RSC/`/_next` responses, protected app HTML, token/refresh token, source ZIP and Quick Edit drafts are **never cached by this service worker**.
2. Navigation uses network-first and responds with **generic public** `/offline.html` only on network failure; it does not cache authenticated app shells.
3. GitHub App user access token and refresh token remain in the original encrypted HttpOnly cookie. No new client-side token storage or database.
4. Recovery Center filters local journal metadata by the currently authorized repositories, as returned by GitHub App, before displaying it.
5. Update activation is manual and blocked while busy/unsaved/pending. iOS may interrupt apps regardless; no background upload or reliable offline editing is claimed.
6. A PR recovery button checks/creates PR on explicit action, but does not push source ZIP or rewrite commit history.

## Known limits

- `sessionStorage` journals may be lost when iOS evicts the PWA. The app cannot guarantee recovery after total storage loss; manually check GitHub branch/commit when uncertain.
- ZIP and Quick Edit source bytes are intentionally kept in memory, not persisted; reselect ZIP on reopening.
- Safari private mode/service-worker restrictions may disable offline fallback; GitHub-backed features still require network.
- `navigator.onLine` is only a hint; `/api/version` also checks reachability. A failed version check may reflect transient server issues, not internet disconnection.
- No production performance improvement is claimed without LCP/INP/CLS or iPhone device measurements.

## Next version

**v2.7.0 — Performance & Code Architecture**: component/state refactor, measurable startup and render improvements, API call optimization, bounded large-list rendering and production performance benchmarks.
