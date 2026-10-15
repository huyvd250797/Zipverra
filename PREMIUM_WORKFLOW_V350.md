# Zipverra Pro v3.5.0 — Premium Workflow Experience

## Design principles

1. **One source-delivery path:** Repository → Upload → Analyze → Review → Confirm → Activity.
2. **Summary before detail:** show file counts and branch before optional diff/file lists; do not hide security/deletion consent.
3. **Actual state:** no fake progress; UI only reflects measured upload and GitHub verification.
4. **Safe mutation:** user checkbox and server-side validation still required; no automatic retry/commit/merge/rollback.
5. **One-handed mobile:** keep final consent and main action reachable above safe-area navigation.
6. **Accessible motion:** subtle transition on stage indicators; reduced-motion turns nonessential animation off.

## Implementation

- `lib/premium-workflow.js`: pure step geometry, Activity presentation, file disclosure default rules.
- `app/components/PremiumWorkflow.jsx`: ReviewSummary and LiveActivityFocus presentation-only components.
- `app/components/ProfessionalUI.jsx`: stepper now uses milestone-center progress geometry.
- `app/page.jsx`: updated Review layout and Activity reading; no GitHub API or authorization changes. Long file list is controlled disclosure; security and Sync confirmations remain outside.
- `app/styles/premium-workflow-v350.css`: last-loaded scoped style layer, no global mutation.

## Quality gates

- 286/286 Node unit tests passed locally.
- Chromium standalone fixture: 12 mobile/tablet/desktop × theme cases with no horizontal overflow.
- `npm install` blocked by npm registry DNS; Vercel production build not verified locally.
- Native iOS PWA and GitHub E2E should be checked before production reliance.
