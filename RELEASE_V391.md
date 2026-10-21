# Zipverra Pro v3.9.1 — Smart Compact Layout

Maintenance/UI release based on v3.9.0, with **no Vercel Workspace or Vercel Access Token integration**. Continues the v3.9.0 baseline.

## Delivered

- **Desktop 761px+**: compact sticky GitHub workspace topbar and one actionable context row. Repository, branch, choose ZIP and Review are one-click actions. Removes duplicated five-step strip, second destination card and redundant heading *on desktop only*; sidebar navigation remains intact.
- **Mobile ≤760px**: tighter header, screen title, five-stage stepper, repository destination and ZIP pick area. The stepper live summary stays screen-reader accessible; the actual five stage buttons remain on screen.
- **Viewport-height adjustment** for short laptops (≤740px tall) and short phone screens (≤720px tall). Scrolling is kept for long file lists, security diagnostics, settings and Review when necessary.
- 44px or larger critical mobile touch targets; keyboard focus, reduced-motion support, light/dark color tokens, safe-area handling and existing user confirmation logic preserved.
- Dynamic labels and safe handling of busy/pending sessions in desktop context. Repositories restart/refresh and Help stay accessible on desktop even though their original mobile header is not shown.
- Removed no GitHub functions. Existing read and write API route contents are unchanged.

## Not in scope

- No One-Screen Review or permanent Push action bar; those are planned for v3.9.2.
- No change to ZIP 120/200 MiB policy, malware/secrets checks, server-side blob attestation, sync deletion, PR creation, merge, or recovery.
- No blanket promise of zero scrolling: a 375×667 phone, long review, Dynamic Type, opened details and keyboard must continue to scroll rather than clip content.

## Deployment

Push the **contents** of this ZIP's `Zipverra-v3.9.1` directory to your application's repository root, not the outer folder. Deploy to Vercel Preview first, verify `/api/version` returns `3.9.1`, test native browser refresh / installed PWA cache activation, then verify workflows before production.

## Validation

Run `npm test` and `npm run build` where Node/Next dependencies are available. Follow [`QA_CHECKLIST_V391.md`](QA_CHECKLIST_V391.md). Static CSS fixtures are **not** a replacement for real React/Vercel Safari QA. Build and functional UI validation remain pending if dependencies cannot be installed in this environment.
