# QA / Deployment Notes — v1.4.0

## Completed checks
- `npm test`: 52/52 PASS.
- App JSX syntax: TypeScript parser/transpiler returned no diagnostics.
- Responsive CSS harness rendered with Chromium at 320, 375, 390, 430, 768, 1280 CSS px. No horizontal overflow in the representative sample; nav visible only for widths ≤760 px.
- A representative mobile tab-state switch was tested using Chromium's computed styles.
- ZIP content and CRC: checked during packaging.

## Still required on Vercel / physical device
1. `npm install` and `npm run build` in a networked CI/Vercel environment.
2. Login through GitHub OAuth using the existing Vercel env variables.
3. On iPhone standalone PWA, test Dynamic Island and bottom home indicator, Safari vs installed PWA, and keyboard interaction for repo search/branch inputs.
4. Push a small test ZIP to a disposable repo; verify resulting SHA against GitHub and ensure no unexpected deletions with Merge.
5. Test Sync with a disposable repository and confirm the extra deletion checkbox blocks commit until selected.
6. Emulate offline during blob upload, then verify recovery controls remain accessible and no duplicate commit is produced.
7. Test accessibility with iOS VoiceOver and system large-text settings; pinch lock can affect accessibility.

## Packaging environment limitation
`npm install` returned `EAI_AGAIN` resolving `registry.npmjs.org`. This is an environmental network limitation; it does **not** prove that the Next.js production build succeeds. Do not describe this release as E2E verified until it builds and pushes in real infrastructure.
