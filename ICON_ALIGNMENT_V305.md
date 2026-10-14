# v3.0.5 — Compact icon alignment

- Global topbar: a bare GitHub-authenticated check mark before the version pill. Show it only when the GitHub App session is authenticated and network reachability is available; offline/guest use existing status semantics.
- Repositories: no duplicate connected check. Refresh remains in the top-right group, with no visible border/background. The 40px touch target remains.
- Help: a single `?` per screen. The visual circular ring is 32px wide, with a 40px hit target for mobile.
- Check, Refresh and Help glyphs are visually aligned at 17px while preserving screen-reader labels.
- No GitHub API route changes, no environment-variable changes and no breaking state migrations.
