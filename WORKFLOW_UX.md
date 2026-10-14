# Zipverra Pro v2.3.0 — Smart Workflow UX 4.0

## Flow

1. **Repos:** choose an installed/writable GitHub repository. App opens the Upload tab.
2. **Upload:** choose `.zip` (<=80 MiB); candidate is validated immediately and analyzed automatically with the existing Web Worker and GitHub preflight/snapshot. Config options (Merge/Sync, Direct Push/PR) are under an expandable section. Re-analyze manually after changing configuration.
3. **Review:** on successful analysis, mobile view scrolls to file changes. Framework/source warnings open by default if relevant; Critical Security findings stay visible and block mutations. The selection list retains file exclusions; unselected files never mutate GitHub even in Sync.
4. **Confirm:** check the per-push review acknowledgment; Sync deletions also require their own checkbox. **Selecting ZIP and automatic analysis do not authorize a GitHub write.**
5. **Activity:** after Push is pressed, the app switches to Activity immediately, tracks progress and verifies commit/PR. Ambiguous commits remain in the existing recovery journal, never silently replayed.
6. **Next ZIP:** after confirmed success and no unresolved mutation, the Activity button clears the old ZIP/review and opens Upload while retaining the current repository/branch.

## Rendering and client safety

- `lib/workflow-ux.js`: pure step derivation, ZIP candidate validation and progress-update throttling.
- `next/dynamic`: optional GitHub workspace views are code-split. History/Settings/Activity Journal only mount when their tab is visited; Dashboard content only mounts after its expander opens.
- Upload progress UI is throttled (~140ms) but always flushes the final event. Network requests and checksums remain unchanged.
- Lists and totals use memoization where frequent progress changes previously caused recomputations.
- The tall marketing hero is shown only on the Repos screen. Upload begins with connected stepper and repository context.
- Changing tabs does not reset the selected file or preview. Reloading the web page still requires reselecting the original ZIP: bytes are **not** persisted.
- `prefers-reduced-motion` and existing iOS safe areas remain supported.

## Testing

- Run `npm test` and `npm run build` in network-enabled CI.
- Manual smoke test: choose repo, choose valid ZIP, confirm **automatic** review, exclude files, inspect diff, test Critical blocker, Direct Push and PR on a disposable repository.
- After preview, change Merge/Sync or strategy and confirm preview is invalidated; re-analyze and verify no implicit push.
- While upload is running, switch tabs and return to Activity; ensure no source state is lost or commit duplicated.
- After success, tap “Push bản tiếp theo”; current repo remains selected, while ZIP/review is reset.
- Reload mid-upload: use the existing uncertain-result journal and Verify before doing another commit.
- Test viewports 320/375/390/430/768/1280, both themes, iOS installed PWA and accessibility checks.

## Known constraints

- No new API routes, permission requirements, environment variables or database.
- GitHub mutation, backend security attestation, PR and Rollback logic remains as v2.2.0.
- File-level transfer limits and Vercel function payload limits unchanged.
- A production build and real GitHub E2E check must pass after deployment; unit tests/static parsing do not imply production success.
