import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {APP_VERSION} from '../lib/pwa-reliability.js';
const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
const page = read('app/page.jsx');
const css = read('app/styles/smart-compact-v391.css');
const layout = read('app/layout.jsx');

test('v3.9.14 package, runtime and PWA cache are aligned', () => {
  assert.equal(APP_VERSION, '3.9.14');
  assert.equal(JSON.parse(read('package.json')).version,'3.9.14');
  assert.match(read('public/sw.js'), /zipverra-public-v3\.9\.14/);
  assert.match(page,/Zipverra · v3\.9\.14/);
});
test('Smart Compact CSS loads after desktop, archive, modal and mobile layers', () => {
  for(const previous of ['mobile-layout-v340.css','modal-motion-v360.css','large-archive-v389.css','desktop-workspace-v390.css']){
    assert.ok(layout.indexOf(previous)>0 && layout.indexOf(previous)<layout.indexOf('smart-compact-v391.css'),previous);
  }
});
test('desktop context target can change repo and branch without hidden mobile controls', () => {
  assert.match(page,/className="desktop-target-repo"[^>]+onClick=\{\(\) => setRepoSheetOpen\(true\)\}/);
  assert.match(page,/className="desktop-target-branch"[^>]+onClick=\{\(\) => setBranchSheetOpen\(true\)\}/);
  assert.match(page,/aria-label=\{`Đổi branch \$\{branch\}`\}/);
  assert.match(css,/\.pro-shell main\[data-active-view="home"\]>\.mobile-quick-card \{display:none!important\}/);
});
test('desktop stages trigger existing navigation and file picker, respecting guards', () => {
  assert.match(page, /desktop-session-step[^\n]*onClick=\{\(\) => fileInput\.current\?\.click\(\)\}/);
  assert.match(page, /disabled=\{!chosenRepo \|\| busy \|\| Boolean\(pendingCommit \|\| pendingPR\)\}/);
  assert.match(page, /desktop-session-step[^\n]*disabled=\{!preview \|\| busy\} onClick=\{goToReview\}/);
  assert.match(page, /onClick=\{\(\) => setRepoSheetOpen\(true\)\}/);
});
test('desktop preserves a single contextual Help per breakpoint', () => {
  assert.doesNotMatch(page,/repo-refresh-icon desktop-context-refresh/);
  assert.equal((page.match(/<ContextualHelp tab=/g) || []).length,1);
  assert.match(css,/\.desktop-header-help \{display:none\}/);
  assert.match(css,/@media \(min-width:761px\)[\s\S]*\.desktop-header-help \{display:flex/);
  assert.match(css,/\.pro-shell \.pro-view-intro\.mobile-context,[\s\S]*display:none!important/);
  assert.match(read('app/components/ProfessionalUI.jsx'), /<ContextualHelp tab=\{activeTab\}\/>/);
});
test('desktop density reserves vertical space for scrollable review and isolated file list', () => {
  assert.match(css,/--zip391-topbar:52px;--zip391-context:55px/);
  assert.match(css,/max-height:calc\(100dvh - var\(--zip391-topbar\) - var\(--zip391-context\) - 35px\)/);
  assert.match(css,/overflow-y:auto;overscroll-behavior:contain/);
  assert.match(css,/min-width:1100px/);
  assert.match(css,/max-height:740px/);
});
test('mobile keeps native five-stage workflow and comfortable touch targets', () => {
  assert.match(css,/@media \(max-width:760px\)/);
  assert.match(css,/\.pro-workflow-step \{min-height:44px\}/);
  assert.match(css,/\.zip-current-actions \.button \{min-height:44px/);
  assert.match(css,/\.mobile-nav-item \{min-height:54px\}/);
  assert.match(page, /<WorkflowStrip currentStep=\{flowStep\}/);
  assert.match(page, /<CurrentRepository owner=\{owner\}/);
  assert.match(css,/\.pro-stepper-summary \{[\s\S]*?clip:rect\(0,0,0,0\)!important/);
});
test('critical review, deletion confirmation and GitHub push gates are not collapsed by compact CSS', () => {
  assert.doesNotMatch(css, /(?:security-review|review-risk-center|risk-center|sync-confirm|premium-review-confirm|push-button)\s*\{[^}]*display:\s*none/);
  for(const identity of ['<ReviewRiskCenter','<ReviewReadiness','<ReviewSummary','confirmed','syncConfirmed','projectMismatchConfirmed']){
    assert.ok(page.includes(identity),identity);
  }
});
test('tablet has a real sidebar; short screens use density not overflow clipping', () => {
  assert.match(css, /@media \(min-width:761px\) and \(max-width:1099px\)/);
  assert.match(css, /\.pro-shell main\[data-active-view="home"\] \.content-grid \{grid-template-columns:minmax\(0,1fr\)\}/);
  assert.match(css, /\.pro-shell main\[data-active-view="home"\] \.preview-panel \{max-height:none;overflow:visible\}/);
  assert.doesNotMatch(css, /body\s*\{[^}]*overflow:\s*hidden/);
});
test('desktop controls remain keyboard accessible and motion is optional', () => {
  assert.match(css,/\.desktop-target-repo:focus-visible/);
  assert.match(css,/\.desktop-session-step:focus-visible/);
  assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
  assert.match(page,/className="desktop-session-bar" data-has-repo/);
});
