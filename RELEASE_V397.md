# Zipverra Pro v3.9.7 — Professional UI & Concise Copy

## Scope

Presentation-only polish built on v3.9.6. The goal is to eliminate repeated instructions, improve visual hierarchy and keep risk decisions clear on iPhone and PC.

- **Upload:** compact ZIP filename/size/change count, simplified advanced-option descriptions and better spacing between repo, source and options.
- **Review:** fewer repeated explanatory paragraphs; clearer file totals, filters and concise diagnostics labels.
- **Risk Center:** each finding displays its title, severity, a brief explanation and its required decision. The critical project-mismatch marker and explicit acknowledgment remain.
- **Mobile decision:** the persistent CTA still directs users to risk inspection or opens the final confirmation sheet; no direct Push in the fixed dock. The final sheet shows destination, totals, a compact readiness indicator, an explicit approval checkbox and the original gated Push button.
- **Desktop:** compact copy and typography are applied without changing the two-column workspace or direct Push gate.
- **Visual design:** standardized text weights and 12–16px supporting typography, increased breathing room between groups, responsive component spacing and visible focus treatment.

## Unchanged security and behavior

- No GitHub server routes, GitHub permissions, Commit/PR/Sync/Recovery flows, ZIP capacity limits or server attestations are modified.
- Critical security scan, suspected cross-project uploads and Sync deletion still require their independent acknowledgments.
- Review/Pull Request final consent remains explicitly user initiated. No automatic commits or merge.
- Long technical findings remain accessible under Risk Center, diagnostics and Diff; shortening text is not a security bypass.

## Verification

- **456/456** Node automated tests passed, including 8 new v3.9.7 regression tests.
- **31/31** server API route files identical to v3.9.6.
- **31** stylesheets parsed successfully with PostCSS.
- Static visual fixture rendered using the actual CSS cascade at 320×568, 375×667, 390×844, 430×932, 1366×768, 1920×1080 without horizontal document overflow. Fixture is not full Next.js E2E.
- `npm run build` is **not verified** in the current runtime (`next: not found`; npm dependencies unavailable). Confirm in Vercel Preview and on a real iPhone before Production.

## Deployment

Extract the ZIP and push the **contents of `Zipverra-v3.9.7/`** into the repository root. Keep existing environment variables. Deploy Vercel Preview, confirm `/api/version` returns `3.9.7`, and work through `QA_CHECKLIST_V397.md`.

**Release status:** Release Candidate until actual build, iPhone Safari/PWA and GitHub E2E checks pass.
