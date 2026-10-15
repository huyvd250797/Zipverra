# Zipverra Pro v3.6.0 — Quick Review and iPhone Sheets

## Review-first flow

1. Choose an authorized repository and branch, then select ZIP; ZIP analysis and GitHub comparison start using the pre-existing Web Worker and read-only APIs.
2. After analysis, the page scrolls to **Review & Push**. In one short area it shows selected file count, target branch, added/modified/deleted counts, and a compact security headline.
3. If Sync will delete files, **a separate delete acknowledgement appears before the Push button**. Critical secret findings display a blocking headline and path; the backend security gate remains mandatory.
4. The user explicitly ticks the review acknowledgement, then deliberately taps Commit & Push / Push & Create PR. A missing change, security block, offline state, pending mutation or invalid permissions prevents the action.
5. Only if desired, expand **Danh sách file thay đổi** to inspect, exclude, filter or diff individual files, and/or expand **Security Scan & ZIP Analyzer** for complete findings. Changing selection resets confirmation.
6. After Push begins, existing Activity navigation, real status, verified SHA and recovery logic are preserved. There is **no automatic mutation** after analysis.

## iPhone Modal / Bottom Sheet lifecycle

- Native `dialog.showModal()` supplies a top-layer focus-trapped overlay.
- `lockModalScroll` fixes document scroll at its saved coordinates; only the modal scroll region scrolls (including nested modal support).
- `visualViewport` resize/scroll recalculates keyboard inset and visible height without modifying document scroll position.
- Focus initially lands on the close button rather than automatically opening the iOS keyboard.
- Escape, close button and backdrop close the dialog; focus is restored to the launching control when it is still mounted and no other modal remains open.
- The reduced-motion setting disables nonessential transitions and animation; safe area and overscroll protections remain active.

## Verification boundaries

The local Node suite and static Chromium fixture cover render ordering, gating, viewport sizing and desktop/mobile scroll restoration. They do **not** replace a live Next.js build or actual Safari standalone PWA testing. A physical iPhone keyboard and VoiceOver pass is recommended after Vercel deployment.
