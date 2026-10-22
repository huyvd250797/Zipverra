import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const css = read('app/styles/premium-interactions-v386.css');
const root = read('app/layout.jsx');
const toast = read('app/components/InteractionFeedback.jsx');
const risk = read('app/components/ReviewRiskCenter.jsx');
const modal = read('app/components/ModalSheet.jsx');

test('v3.9.9 runtime, PWA cache and branded version are consistent', () => {
  assert.equal(JSON.parse(read('package.json')).version, '3.9.9');
  assert.match(read('lib/pwa-reliability.js'), /APP_VERSION = '3\.9\.9'/);
  assert.match(read('public/sw.js'), /zipverra-public-v3\.9\.9/);
  assert.match(read('app/page.jsx'), /v3\.9\.9/);
});
test('polish CSS is loaded last without removing dedicated risk and notification layers', () => {
  const deps = ['notifications-v384.css','review-risk-v385.css','premium-interactions-v386.css'];
  const offsets = deps.map(path => root.indexOf(path));
  assert.ok(offsets.every(offset => offset > 0));
  assert.deepEqual([...offsets].sort((a,b) => a-b), offsets);
});
test('presentation-only icon family is reused for toast, banner and Risk Center', () => {
  const glyph = read('app/components/StatusGlyph.jsx');
  for (const status of ['success','info','warning','error','critical','identity','sync']) {
    assert.match(glyph, new RegExp(`'${status}'`));
  }
  assert.match(toast, /StatusGlyph kind=\{notice\.tone\}/);
  assert.match(toast, /StatusGlyph kind=\{severity\}/);
  assert.match(risk, /StatusGlyph kind=\{item\.kind/);
  assert.doesNotMatch(glyph, /fetch\(|localStorage|requestOnce|onClick/);
});
test('no GitHub decisions have moved into presentation components', () => {
  assert.match(risk, /onMismatchConsent\(event\.target\.checked\)/);
  assert.match(risk, /onSyncConsent\(event\.target\.checked\)/);
  assert.match(risk, /onSecurityDecision/);
  assert.match(toast, /onAnswer\(false\)/);
  assert.match(toast, /resolve\(value === true\)/);
  assert.doesNotMatch(css, /display\s*:\s*none\s*!important|pointer-events\s*:\s*auto\s*!important/);
});
test('touch targets remain accessible and feedback text is legible', () => {
  for (const rule of ['min-height:44px','font-size:13px','font-size:14px','min-height:48px','--v386-radius-control','--v386-radius-card']) {
    assert.ok(css.includes(rule), rule);
  }
  assert.match(css, /\.review-risk-link,\.review-risk-diagnostics-link\s*\{min-height:44px/);
});
test('theme-specific surfaces inherit app design tokens', () => {
  assert.match(css, /html\[data-theme="light"\]/);
  assert.match(css, /var\(--pro-surface\)/);
  assert.match(css, /var\(--pro-text\)/); // status text comes from parent palette
  assert.match(css, /var\(--pro-accent\)/);
});
test('sheet, dialog and notification animations include both directions', () => {
  for (const name of ['v386-sheet-in','v386-sheet-out','v386-dialog-in','v386-dialog-out','v386-toast-in','v386-toast-out']) {
    assert.match(css, new RegExp(`@keyframes ${name}`));
  }
  assert.match(css, /zip-modal--exiting/);
  assert.match(toast, /pro-toast--exiting/);
});
test('close controls are labelled and icons hide from assistive tech', () => {
  assert.match(modal, /aria-label=\{`Đóng \$\{rendered\.title\}`\}/);
  assert.match(toast, /aria-label="Đóng thông báo"/);
  assert.match(modal, /aria-hidden="true"/);
  assert.match(read('app/components/StatusGlyph.jsx'), /'aria-hidden': true/);
});
test('mobile safe sheet geometry and native scroll lock remain delegated to legacy implementation', () => {
  assert.match(modal, /lockModalScroll\(document, window, scrollRegion\)/);
  assert.match(modal, /modalViewportGeometry/);
  assert.match(css, /\.zip-modal--sheet \.zip-modal-header::before/);
  assert.match(css, /@media\(max-width:760px\)/);
  assert.doesNotMatch(css, /\.zip-modal\s*\{[^}]*position:/);
});
test('animations honour operating-system reduced-motion preference', () => {
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css, /animation:none!important/);
  assert.match(css, /transition:none!important/);
});
