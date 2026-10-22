# Zipverra Pro v3.9.10 — Directional Tab Transitions

## What's new
- Four-tab horizontal switching, including jumps across two or three tabs, follows taskbar direction exactly.
- Outgoing content leaves while incoming content enters **simultaneously** via browser View Transitions (`document.startViewTransition`) on supporting browsers (notably recent Chrome and Safari).
- Mobile taskbar and PC sidebar remain fixed and do not darken. Content transition lasts 240 ms using transform-only animations, without dimming/fading.
- `Commit & Push → Activity` follows the same transition. The Push still uses all existing risk/consent and verified recovery workflows.
- A confirmed Push waits for the native mobile confirmation sheet exit before switching tabs, preventing its dim backdrop from covering Activity.
- Repeated taps stop the previous transition and switch to the latest selected tab; completion callbacks cannot clear a newer transition.
- With Reduce Motion, the view changes immediately. With older engines lacking native View Transitions, a short directional entrance replaces the legacy black fade without postponing navigation.

## Implementation
- `lib/tab-transitions.js` contains pure tab ordering/direction and native capability/reduced-motion predicates.
- `app/page.jsx` commits tab state during the native View Transition update callback using React `flushSync`, and aligns Safari document scroll before capturing the new view.
- `app/styles/directional-tabs-v3910.css` supplies transform-only old/new animations and overrides older route fade rules during navigation. Root/tabbar chrome is not animated.
- `public/sw.js`, `lib/pwa-reliability.js`, visible version and package version are `3.9.10`.

## Safety and release gates
- No GitHub API routes, secret scans, ZIP files, PR/Merge, consent rules or Recovery flows were modified.
- Automated Node tests cover directions, fallback, Reduce Motion, and Push navigation; all regression tests must pass.
- Browser CSS/animation QA can be executed in Chromium at phone/PC viewports. A static fixture does not replace real Next.js/Safari E2E.
- Run `npm install`, `npm test`, `npm run build`, and test Vercel Preview + Safari/PWA before promoting to Stable.
