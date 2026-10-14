# Zipverra Pro v2.4.0 — Premium Interaction & Motion

## Purpose
The user should feel immediate, calm feedback. The motion layer is strictly presentational: no GitHub API code, no progress synthesis, no implicit Push or Merge. It does not request new permissions or dependencies.

## Shared UI primitives
- `app/styles/pro-motion.css`: 135ms tap feedback, 210ms entry, 320ms progress movement; independent dark/light tokens; no JavaScript animation scheduler.
- `app/components/InteractionFeedback.jsx`: accessible single dismissible toast (auto-close), `LoadingSkeleton` for read-only placeholders.
- `lib/interaction-feedback.js`: fixed message catalog; no untrusted GitHub response, repository path or credentials interpolated into toast.
- `app/page.jsx`: emits toasts for validated repo selection, ZIP failure, Review ready, known network events and **verified** GitHub Push/PR only. Source errors remain in Activity/recovery, never dismissed by a toast.

## State safety invariants
1. Source ZIP and Review live in the existing workflow state; tab changes do not destroy or reinitialize it.
2. On Push/PR, the component never announces GitHub success before `finishVerified` / confirmed PR creation, and it never triggers mutation from an animation.
3. A stale timer can dismiss only the notification ID that scheduled it.
4. Errors are kept on the original screen even after transient toasts disappear.
5. Offline events do not cause automatic retries.
6. Skeletons carry loading descriptions, stable height and aria-busy. They do not imply real-time transfer percentages.
7. `prefers-reduced-motion:reduce` disables new entrance animations and shimmer; safe-area insets keep toast clear of the iPhone Home bar.

## Manual QA required before claiming production ready
- iPhone Safari and standalone PWA: 320/375/390/430 px and at least one notched phone.
- Dark and Light; visual check toast over bottom navigation and on error; keyboard/VoiceOver focus and Reduce Motion.
- Slow 3G simulation for lazy modules and GitHub session; confirm no CLS from skeleton.
- GitHub E2E: upload valid ZIP, safe security check, direct push SHA verify, PR create, PR recovery, branch protection refusal.
- Vercel `npm install && npm test && npm run build`: build **not** verified here because of registry DNS errors.
