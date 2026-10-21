# Zipverra v3.9.1 — Acceptance Checklist

## Visual & interaction

- [ ] iPhone Safari / standalone PWA: 320×568, 375×667, 390×844, 430×932 in Dark and Light.
- [ ] Tablet 768×1024, narrow laptop 1024×768: icon sidebar navigates all five areas; context repo/branch controls remain available.
- [ ] Desktop 1100×700, 1366×768, 1440×900, 1920×1080: sidebar, compact topbar, one context row, Upload left and Review right.
- [ ] At 200% zoom and large text: no clipped safety warnings; legitimate overflow may scroll, tab focus visible.
- [ ] On mobile: five-step workflow remains interactive, step labels visible, branch/repo change buttons ≥44px, safe-area bottom navigation does not cover controls.
- [ ] In desktop Repositories: refresh, contextual Help, Project Workspace and Source ZIP download still work.
- [ ] In desktop Upload: click context repo, branch, ZIP picker, Review stages. Disabled states prevent conflicts during busy/uncertain writes.
- [ ] With 200 MiB Extended ZIP, mobile stays usable; memory performance tested on real phones.
- [ ] Long file lists / open Diff / security diagnostics can scroll inside their intended region; no horizontal page overflow.
- [ ] Tab switching and sheet open/close remain smooth; Reduce Motion removes unnecessary animation.

## GitHub safety

- [ ] Review diff, include/exclude selection, Sync deletion acknowledgement and critical-secret confirmation still require the exact prior user decisions.
- [ ] Direct Push and PR pass on test repository; protected branch failure is surfaced.
- [ ] Uncertain commit/PR responses route through Recovery, never silently repeated.
- [ ] Repeated Upload/reset/restart clears unsafe pending UI appropriately.
- [ ] Successful GitHub outcome and Activity progress are accurate.

## Release gates

- [ ] `npm test` is green; `npm run build` passes with normal dependencies.
- [ ] `/api/version` returns `3.9.1`, service worker public cache becomes `zipverra-public-v3.9.1`.
- [ ] Manual QA performed on actual Safari, Chromium/Edge and deployed Vercel Preview (not just a CSS fixture).
