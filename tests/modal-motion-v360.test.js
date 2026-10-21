import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { modalViewportGeometry } from '../lib/modal-viewport.js';
import { reviewReadiness } from '../lib/ux-polish.js';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url),'utf8');
const page = read('app/page.jsx');
const modal = read('app/components/ModalSheet.jsx');
const css = read('app/styles/modal-motion-v360.css');
const layout = read('app/layout.jsx');
const safe = { hasPreview:true, selectedCount:20, critical:0, authenticated:true,
  online:true, busy:false, pending:false, confirmed:false, syncDeleteCount:0, syncConfirmed:false };

test('v3.9.6 includes modal-motion override after all prior UI layers',()=>{
  assert.equal(JSON.parse(read('package.json')).version,'3.9.6');
  assert.match(layout,/import '\.\/styles\/modal-motion-v360\.css'/);
  assert.ok(layout.indexOf('premium-workflow-v350.css') < layout.indexOf('modal-motion-v360.css'));
});
test('quick confirmation precedes file listing and diagnostic detail',()=>{
  const overview=page.indexOf('<ReviewSummary selected=');
  const risk=page.indexOf('<ReviewRiskCenter');
  const confirm=page.indexOf('className="premium-review-confirm"');
  const files=page.indexOf('className="premium-review-files"');
  const diagnostics=page.indexOf('className="premium-review-diagnostics"');
  const dock=page.indexOf('className="zip392-action-dock zip396-action-dock"');
  assert.ok(overview > 0 && overview < risk && risk < confirm && confirm < files && files < diagnostics && diagnostics < dock);
  assert.equal((page.match(/onClick=\{push\}/g)||[]).length,1, 'One Push handler only');
  assert.match(page, /\['SECURITY', 'SYNC', 'CONFIRM', 'READY'\]/);
  assert.match(page, /\{fileDetailsOpen && <>/);
});
test('all selected changes can be confirmed without opening file list, but never automatically pushed',()=>{
  assert.equal(reviewReadiness(safe).code,'CONFIRM');
  assert.equal(reviewReadiness({...safe,confirmed:true}).ready,true);
  assert.match(page,/onClick=\{push\}/);
  assert.match(page,/disabled=\{!canSubmitPush\}/);
  assert.doesNotMatch(read('app/components/PremiumWorkflow.jsx'), /fetch\(|requestOnce\('commit'/);
});
test('Critical risk blocks quick commit even after consent and highlights file path',()=>{
  assert.equal(reviewReadiness({...safe,critical:1,confirmed:true}).code,'SECURITY');
  assert.equal(reviewReadiness({...safe,critical:1,confirmed:true,sensitiveConsent:true}).ready,true);
  const component=read('app/components/PremiumWorkflow.jsx');
  assert.match(component,/premium-risk-\$\{tone\}/);
  assert.match(component,/criticalPaths\.join/);
  assert.match(page,/disabled=\{busy \|\| !selectedChanges\.length \|\| \(requiresConsent && !sensitiveConsent\)/);
});
test('Sync deletion requires its own checkbox before quick push',()=>{
  assert.equal(reviewReadiness({...safe,confirmed:true,syncDeleteCount:3}).code,'SYNC');
  assert.equal(reviewReadiness({...safe,confirmed:true,syncDeleteCount:3,syncConfirmed:true}).ready,true);
  assert.match(page,/onSyncConsent=\{\(value\) => \{ setSyncConfirmed\(value\); setConfirmed\(false\); \}\}/);
  assert.match(read('app/components/ReviewRiskCenter.jsx'), /checked=\{item.approved\}/);
});
test('pending / offline / busy actions never enable quick commit',()=>{
  for(const input of [{pending:true},{online:false},{busy:true},{authenticated:false}]) {
    assert.equal(reviewReadiness({...safe,...input,confirmed:true}).ready,false);
  }
});
test('mobile confirmation no longer covers file list as sticky overlay',()=>{
  assert.match(css, /\.premium-review-confirm \{position:relative;bottom:auto;/);
  assert.match(css, /\.premium-review-skip-note/);
  assert.match(css, /\.premium-review-diagnostics/);
});
test('iOS viewport calculation adapts to keyboard and safe bounds',()=>{
  assert.deepEqual(modalViewportGeometry(800,800,0),{visibleHeight:800,keyboardInset:0});
  assert.deepEqual(modalViewportGeometry(800,500,0),{visibleHeight:500,keyboardInset:300});
  assert.deepEqual(modalViewportGeometry(800,490,30),{visibleHeight:490,keyboardInset:280});
  assert.deepEqual(modalViewportGeometry(800,999,0),{visibleHeight:999,keyboardInset:0});
  assert.deepEqual(modalViewportGeometry(800,Number.NaN,0),{visibleHeight:800,keyboardInset:0});
});
test('native dialog traps focus, Escape closes, background locked and focus returns',()=>{
  assert.match(modal,/lockModalScroll\(document, window, scrollRegion\)/);
  assert.match(modal,/dialog\.showModal\(\)/);
  assert.match(modal,/event\.preventDefault\(\); requestClose\(\)/);
  assert.match(modal,/opener\.focus\?\.\(\{ preventScroll: true \}\)/);
  assert.match(modal,/dialog\.querySelector\('\.zip-modal-close'\)\?\.focus/);
  assert.match(modal,/viewport\?\.addEventListener\('resize'/);
  assert.match(modal,/viewport\?\.removeEventListener\('resize'/);
  assert.match(css,/--zip-keyboard-inset/);
  assert.match(css,/--zip-visible-height/);
});
test('animation respects reduced motion and never alters document scroll logic',()=>{
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css,/overscroll-behavior:contain/);
  assert.doesNotMatch(css,/body\s*\{\s*overflow:/);
});
