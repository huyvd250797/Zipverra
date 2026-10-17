# Zipverra Pro v3.8.7 — Activity Progress Visual Hotfix

## Scope
- Remove the secondary progress bar inside the **Upload Git blobs** card on the Activity screen.
- Keep the primary Live Activity progress bar only.
- Preserve file count, bytes, speed, ETA and batch details.

## Rationale
Two simultaneous animated progress bars in the same Activity section reduced visual clarity and felt redundant.

## Validation
- Existing automated tests should remain green.
- No GitHub API route changes.
- Presentation-only change.
