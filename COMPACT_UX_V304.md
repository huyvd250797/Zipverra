# Compact UI & Contextual Help — v3.0.4

## Design contract

1. Exactly one `?` Help entry at the top of each active mobile screen; instructions are grouped by screen.
2. Routine descriptions should not occupy the viewport by default. The main CTA, repository identity, selected branch, file sizes/progress and validation statuses remain visible.
3. Never hide actionable critical conditions behind Help: Critical secrets, Sync deletion, uncertain Git writes, PR not merged, offline or auth failure and explicit Push confirmations.
4. The dialog uses the browser's native modal semantics; supports Escape, backdrop click and a visible Close button.
5. Help content is static read-only metadata and never calls GitHub, stores tokens or performs side effects.
6. Keep existing Download ZIP naming from GitHub HEAD and Save to Files unchanged.

## Suggested device acceptance

Test width 320, 375, 390 and 430; both light and dark modes; narrow iPhone landscape; keyboard and VoiceOver.
Test the Repos Help, Upload Help, Activity Help, History Help and Settings Help plus the Save to Files UX.
