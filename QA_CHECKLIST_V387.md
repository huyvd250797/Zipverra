# Zipverra v3.8.7 — Final Accessibility / Visual QA checklist

Status legend: ✅ automated/static evidence; ⬜ manual verification required before production.

| QA area | Status | Acceptance steps |
|---|---|---|
| Node regression | ✅ | `npm test`: 364 passing; 0 failing. |
| CSS/JS syntax | ✅ | TypeScript JS/JSX parser 100 files, PostCSS 21 files. |
| Server regression | ✅ | All 31 GitHub route files unchanged from v3.8.6 ZIP. |
| Responsive CSS | ✅ partial | Static Chromium sample at 320/360/375/390/430/768/1280, Dark/Light; no document overflow. Not full React app. |
| Zoom | ✅ code / ⬜ device | On iPhone Safari pinch-zoom to 200%, verify no JS gesture cancellation and that forms/nav remain operable. |
| Mobile focus zoom | ✅ static / ⬜ device | Tap search, branch input, repo input, modal search at 320–430px; avoid unrequested Safari zoom. |
| Risk Center | ✅ static / ⬜ device | At 320px badge is on its own line; path and notice wrap; no horizontal scrolling; warnings and consent are unchanged. |
| Keyboard | ✅ code / ⬜ actual | Tab through five views on desktop, focus rings visible; changing view focuses named main landmark; keyboard Escape closes modal and restores opener focus. |
| Screen reader | ⬜ | Test VoiceOver and TalkBack: navigation landmarks, visible dialog title, nonduplicate toast announcements and labeled controls. |
| PWA | ⬜ | Fresh/upgrade install iOS standalone, screen safe areas, keyboard, and update caching; no light flash when dark selected. |
| Motion | ✅ CSS / ⬜ device | Enable Reduce Motion; no essential movement. Check sheet, toast, screen enter/exit against real iOS Safari. |
| Contrast | ✅ spot check / ⬜ visual | Dark body `#F3F7FA/#172432` 14.61:1, muted `#A9BBC9/#172432` 7.97:1; Light body `#172735/#FFFFFF` 15.24:1, muted `#526B7D/#FFFFFF` 5.59:1. Other complex layered backgrounds need visual/automated runtime audit. |
| Build/deploy | ⬜ | `npm install && npm test && npm run build` on Node 22/Vercel Preview (local registry DNS inaccessible). |
| GitHub E2E | ⬜ | Disposable repo: Upload ZIP → Analyze → Review → Push; PR + merge; Sync Delete; Critical secret No/Yes; project-mismatch acknowledgement; interrupted operation Recovery. |

**Release gate:** Do not mark fully production-validated until all ⬜ items essential to the deployment are complete. Maintain Feature Freeze after sign-off.
