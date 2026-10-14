# Zipverra Pro v2.8.0 — Advanced UX Polish

## Scope

Direct upgrade from **v2.6.0** (the uploaded baseline); this release **does not implement v2.7.0** performance/code-architecture roadmap. No GitHub API routes, GitHub App permissions, database or Vercel environment variables were added.

## UI changes

1. **Workspace Launchpad (Repos):** a compact two-column desktop / one-column mobile heading, selected-repo destination and one primary `Push new version` action; Workspace and Activity as secondary shortcuts. Removes redundant top-of-screen selected-repo card.
2. **Review Readiness:** checks preview, busy state, pending verification, GitHub auth, connectivity, Critical secret findings, selection count, explicit Sync-delete acknowledgement and required user confirmation. Displays why Push is blocked, and gates the actual button. Server preflight, Security Scan and final commit verification remain authoritative.
3. **Activity Empty:** clear next action when no Push is underway. The verified result surface shows SHA, copy action and GitHub commit/PR links without implying PR was merged.
4. **Theme System:** Dark, Light or System in Settings; System reacts to device preference changes using `matchMedia`, keeps preference locally without sensitive data.
5. **Accessibility:** skip-to-main link, status announcements, 44px touch targets, explicit Activity pending accessibility label, reduced-motion fallback, focus outlines, long path handling and responsive text.
6. **Visual cleanup:** normalized spacing and concise title hierarchies, softer borders, clear empty/warning/success contrast; optimizes the screen density at 320px–430px.

## Safety invariants

- Push **never starts without the existing explicit checkbox + button**; Sync deletions still have an independent checkbox.
- Client readiness is just a UI explanation. GitHub permissions, HMAC scan proofs, expected HEAD, branch protections and verification remain enforced by the unchanged backend.
- Does not cache tokens, GitHub API data, ZIP contents or unsaved editor drafts.
- No optimistic GitHub success state; the result component only renders after the existing outcome is verified by server logic.
- PWA public Service Worker cache namespace bumped to v2.8.0. Update remains user-initiated and blocked during unsafe states.

## Manual acceptance on a deployed test repository

- 320, 375, 390, 430px iPhone-like + 768/1280px layouts in both themes.
- Switch device appearance with System theme selected; verify immediate color change.
- Select repo, upload valid ZIP, review with and without Critical findings; observe correct disabled reasons.
- Test empty selection, Sync deletes with and without acknowledgement, PR and Direct Push confirmation.
- Successful Push: verify sha/URL and Copy SHA; failed and uncertain commits: verify Recovery Center, never double-commit.
- Switch tabs with an unsaved Quick Edit draft, verify guard, History and Rollback retain behavior.
- Screen-reader landmark and keyboard tab sequence; reduced motion and iPhone safe area.

## Important limitations

Node unit/source tests alone do not verify Next.js production compilation, true iPhone UX or live GitHub API integration. Mark each separately in RELEASE_VALIDATION.md.
