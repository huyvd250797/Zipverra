# Zipverra Pro v3.8.5 — Smart Warning & Review UX

## Scope / safety

A focused UX maintenance release built from v3.8.4. This release **does not** change GitHub authorization, API mutation endpoints, secret-detection policy, upload logic, branch protection checks, or PR/merge mechanics. No new persistence of secrets or acknowledgment data is introduced.

### What changed

1. **One Risk Center in Review:** Security Scan, project mismatch, and Sync deletion now share a single section directly before the final Commit/PR decision area. Acknowledgment state is shown once per category.
2. **Independent approvals:** sensitive files still use the existing **Có / Không** confirmation sheet; a severe project mismatch requires its existing explicit checkbox; Sync deletes require their own explicit checkbox. Completing one does not approve the others.
3. **No duplicate warning cards:** removed the former standalone security, identity, and Sync Review banners. The existing read-only diagnostic findings are accessible through an explicit link, and the diagnostic section is collapsed initially to keep primary decisions in view.
4. **Readiness hierarchy:** progress/authorization/offline/recovery problems appear near the final decision; consent messages from the Risk Center are not repeated as standalone readiness cards.
5. **Selection-safe state:** changing the ZIP/repo/branch or file selections resets earlier approvals via existing handlers; changing Sync or mismatch consent also invalidates the final Commit checkbox.
6. **Responsive clarity:** consistent text, badges, focus visibility, and light/dark theme; prefers-reduced-motion supported.
7. **Version:** version labels, PWA version and service worker cache updated to v3.8.5.

### Invariants and limitations

- The Risk Center is advisory. Approval only unlocks the preexisting client-side gates; the server independently verifies credentials and mutation permissions, while GitHub can still reject a push.
- A severe identity mismatch is heuristic and may be wrong; it is never claimed as certain, and the user may explicitly accept it.
- A real credential remains dangerous even after acknowledgment. GitHub Push Protection and branch protections are not bypassed.
- Offline/pending GitHub operations still block Commit/PR regardless of risk acknowledgment.
- Final Commit/PR always requires a distinct user checkbox and button press.

### Verification performed

- Before upgrade: 329/329 existing tests passed.
- After upgrade: 341/341 tests passed (12 new Risk Center tests; older UI-layout tests updated to the new structure).
- JavaScript syntax: `node --check` passed for JS/MJS modules.
- JSX syntax: all 24 JSX modules parsed using TypeScript JSX parser, with zero parsing diagnostics.
- Production `next build`: not verified in this environment (Next.js/React dependencies not installed). Verify the Vercel build and iPhone Safari/PWA interactions before promoting to production.

### Recommended smoke tests (GitHub/Vercel)

1. Clean ZIP: one calm Risk Center and separate final Commit checkbox.
2. ZIP with sensitive content: one Security row, Có/Không sheet, confirm state updated, Push still needs final confirmation.
3. Unrelated source: severe mismatch row, explicit checkbox, but no unconditional block after acceptance.
4. Sync with deletes: independent delete count and checkbox, only selected deletes counted.
5. Multiple risks simultaneously: confirm each separately; changing selection clears all consents and final checkbox.
6. Preview long file list: Review primary confirmation is visible before the file list; diagnostic link opens the secondary details.
7. Pending/unverified PR or Push: still prevents another mutation, even if all risk boxes were accepted.
8. Check mobile, desktop, dark, light, reduced-motion and GitHub App permissions.

### Next roadmap

v3.8.6 — Premium Visual & Interaction Polish (separate release, not part of v3.8.5).
