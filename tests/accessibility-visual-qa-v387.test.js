import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const root = read('app/layout.jsx');
const page = read('app/page.jsx');
const css = read('app/styles/accessibility-visual-qa-v387.css');
const modal = read('app/components/ModalSheet.jsx');
const ui = read('app/components/ProfessionalUI.jsx');

test('v3.9.0 app, public cache and manifest version align', () => {
  assert.equal(JSON.parse(read('package.json')).version, '3.9.0');
  assert.match(read('lib/pwa-reliability.js'), /APP_VERSION = '3\.9\.0'/);
  assert.match(read('public/sw.js'), /zipverra-public-v3\.9\.0/);
  assert.match(page, /Zipverra · v3\.9\.0/);
});
test('new accessibility CSS loads after existing premium polish', () => {
  assert.ok(root.indexOf('premium-interactions-v386.css') < root.indexOf('accessibility-visual-qa-v387.css'));
});
test('viewport no longer restricts user zoom while iPhone safe area remains', () => {
  assert.match(root, /viewportFit: 'cover'/);
  assert.doesNotMatch(root, /maximumScale:\s*1/);
  assert.doesNotMatch(root, /userScalable:\s*false/);
  assert.match(read('app/globals.css'), /touch-action:auto/);
});
test('mobile guard never cancels native pinch or accessibility gestures', () => {
  const guard = read('app/components/MobileViewportGuard.jsx');
  assert.doesNotMatch(guard, /preventDefault\(|addEventListener\(/);
  assert.match(guard, /return null/);
});
test('text inputs inside modal and main use 16px at mobile breakpoints', () => {
  for (const token of ['max-width:760px','font-size:16px','input[type="search"]','textarea','.zip-modal']) assert.ok(css.includes(token),token);
  assert.doesNotMatch(css, /user-scalable=no/);
});
test('user-driven tab navigation moves to a labelled main landmark', () => {
  assert.match(page, /navigationFocusRef\.current = tab/);
  assert.match(page, /navigationFocusRef\.current !== activeTab/);
  assert.match(page, /getElementById\('zipverra-main'\)\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(page, /aria-labelledby="zipverra-current-view"/);
  assert.match(ui, /h2 id="zipverra-current-view"/);
});
test('focus is not stolen on initial render or background GitHub phase changes', () => {
  assert.match(page, /const navigationFocusRef = useRef\(null\)/);
  assert.match(page, /if \(navigationFocusRef\.current !== activeTab\) return/);
  assert.match(page, /navigationFocusRef\.current = null/);
  assert.doesNotMatch(page, /autofocus=.*zipverra-main/);
});
test('native modal accessible name corresponds to rendered visible heading', () => {
  assert.match(modal, /useId\(\)/);
  assert.match(modal, /aria-labelledby=\{titleId\}/);
  assert.match(modal, /<strong id=\{titleId\}>\{rendered\.title\}<\/strong>/);
  assert.match(modal, /lockModalScroll/);
});
test('screen reader loading labels follow app language', () => {
  const splash = read('app/components/SplashScreen.jsx');
  assert.match(splash, /Zipverra đang khởi động/);
  assert.match(splash, /Đang chuẩn bị không gian làm việc/);
});
test('high contrast, keyboard focus and reduced motion are supported', () => {
  assert.match(css, /prefers-contrast:more/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /--pro-focus/);
});
test('long paths wrap rather than expanding narrow viewport', () => {
  assert.match(css, /\.zip-repo-name/);
  assert.match(css, /\.change-path/);
  assert.match(css, /overflow-wrap:anywhere/);
});
test('risk acknowledgements and GitHub confirmation are still independent', () => {
  assert.match(page, /disabled=\{!canSubmitPush\}/);
  assert.match(page, /requiresConsent && !sensitiveConsent/);
  assert.match(page, /setSyncConfirmed\(false\)/);
  const risk = read('app/components/ReviewRiskCenter.jsx');
  assert.match(risk, /onMismatchConsent\(event\.target\.checked\)/);
  assert.match(risk, /onSyncConsent\(event\.target\.checked\)/);
  assert.doesNotMatch(css, /pointer-events\s*:\s*auto\s*!important/);
});
test('320px Risk Center wraps status pills rather than squeezing text into single-word lines', () => {
  assert.match(css, /@media \(max-width:360px\)/);
  assert.match(css, /\.review-risk-heading \{flex:1 1 calc\(100% - 48px\)/);
  assert.match(css, /\.review-risk-item-content \{flex:1 1 calc\(100% - 36px\)/);
});
