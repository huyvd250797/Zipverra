# v3.9.11 — Acceptance Checklist

## Quick Access
- [ ] Select repo B from Quick Access while A is first: **order does not change**; B is only highlighted.
- [ ] Change branch or apply saved Profile: **order does not change**.
- [ ] Select/analyze ZIP or cancel Review: **order does not change**.
- [ ] Failed Push or preflight validation failure: **order does not change**.
- [ ] Successful **verified Direct Push** to B: B becomes first after returning to Upload.
- [ ] Successful **verified PR branch Push** to B: B becomes first even if PR creation must be verified separately.
- [ ] Re-verify an already recorded SHA: usage is not incremented a second time.
- [ ] Refresh the PWA: new order persists for the signed-in GitHub account; no other account inherits it.
- [ ] Repository removed from installation: it disappears from Quick Access even if previously used.

## Tab navigation
- [ ] Upload → Activity → History → Settings: leftward slide, no dark flash.
- [ ] Settings → History → Activity → Upload: rightward slide.
- [ ] Jump Upload → Settings and back: correct direction.
- [ ] Push → Activity: sheet closes before slide, navigation remains responsive.
- [ ] Rapid repeated taps: no blank page, duplicated navigation or lingering overlay.
- [ ] Bottom nav/sidebar/topbar stay fixed while content slides.
- [ ] Tall Review, Activity logs, History and Settings: no page jump or unrelated scrolling during animation.
- [ ] Safari/PWA iPhone at 375×667, 390×844, 430×932; desktop at 1366×768 and 1920×1080.
- [ ] Both themes, browser zoom and Reduced Motion.

## Safety and production
- [ ] ZIP Standard/Extended, Diff and Security Scan behave as v3.9.10.
- [ ] Critical Project Mismatch, secret detection, Sync deletion and confirmation block Push as expected.
- [ ] All Node tests pass and `npm run build` succeeds after installing dependencies.
- [ ] Preview deployment verified; no API changes; re-enable PWA only after current GitHub operations finish.
