# Zipverra Pro v3.9.6 — Review Safety & Mobile Visual Hotfix

## Root causes reproduced from iPhone screenshots

1. The "Tới xác nhận & Push" row within expanded file Review was `position:sticky`, covering selected-file contents in the middle of the scrolling panel.
2. v3.9.5 constrained the mobile Review panel to a relatively small portion of the viewport and aggressively reduced Risk Center font sizes to 11–13px, truncating meaningful project mismatch warnings.
3. The full Commit & Push control appeared persistently at the bottom before the user had finished reading the risk analysis; it was gated/disabled but visually competed with the warning.
4. Excessively dense copy, badges and narrow side-by-side status labels made severe warnings difficult to scan.

## Fixes

- Removed the intermediate sticky navigation row (kept the one optional navigation action after the file list).
- Added a prominent, color-coded mobile Risk Summary immediately following Review statistics. Tapping it opens a native Bottom Sheet that gives detailed Security Scan, suspected wrong-project and Sync Delete warnings readable width, spacing and separate approvals.
- When a suspected wrong-project match is critical, the Risk sheet auto-opens after analysis, except when the Security Scan's explicit sensitive-file dialog already takes priority. Users can dismiss/reopen the review, but cannot bypass its required acknowledgment.
- The mobile fixed action is now just one contextual CTA: "Xem cảnh báo cần xử lý" until risk approvals are complete, then "Mở xác nhận & Push". The actual Push action and final review checkbox are exclusively in the dedicated confirmation sheet on mobile.
- Desktop retains the original Push action placement, readiness gating and Review layout.
- Improved Review/Risk Center title sizes, line wrapping, spacing and layout on narrow devices. Kept all UI accessible to keyboard and screen readers, preserved reduced motion and safe-area support.
- Kept GitHub App endpoints and authorization, blob proofs, project-identity check, Sync delete consent, Security Scan and recovery behavior unchanged.

## Security notes

The Risk Center is a **heuristic**: package names and structure cannot prove project identity. Critical risk requires independent manual approval, but cannot be automatically treated as an exact mismatch. Server enforcement still applies to file scanning, GitHub permissions and branch HEAD/commit.

## Verification

- `npm test` includes legacy and v3.9.6 regression tests.
- CSS syntax and JS/JSX syntax inspected; viewport fixture checked in headless Chromium for representative iPhone and PC sizes.
- This environment lacks Next.js dependencies, so a complete `next build` and a production GitHub/Vercel/physical iOS PWA E2E must be checked in Vercel Preview. No write operation to user's GitHub performed.

Deploy by uploading the **contents** of `Zipverra-v3.9.6/` to repository root. Ensure `/api/version` reports `3.9.6` after deployment and accept the PWA update when safe.
