import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APP_VERSION } from '../lib/pwa-reliability.js';
import { reviewReadiness } from '../lib/ux-polish.js';
import { summarizeReviewRisks } from '../lib/review-risk-center.js';
const read = file => readFileSync(new URL(`../${file}`, import.meta.url),'utf8');
const page = read('app/page.jsx');
const css = read('app/styles/review-gate-hotfix-v396.css');

test('v3.9.7 version and latest styles are synchronized', () => {
  assert.equal(APP_VERSION,'3.9.7');
  assert.equal(JSON.parse(read('package.json')).version,'3.9.7');
  assert.match(read('public/sw.js'),/zipverra-public-v3\.9\.7/);
  const layout=read('app/layout.jsx');
  assert.ok(layout.indexOf('zero-scroll-v395.css') < layout.indexOf('review-gate-hotfix-v396.css'));
});
test('sticky middle navigation is deleted rather than repositioned', () => {
  assert.doesNotMatch(page, /className="review-return-bar"/);
  assert.match(css,/\.review-return-bar\{position:static!important/);
  assert.match(page,/className="review-return-bottom"/);
});
test('mobile never renders direct Push inside the always-visible dock', () => {
  assert.match(page,/className="zip396-mobile-only"/);
  assert.match(page,/className="zip396-desktop-only"/);
  assert.match(css,/\.zip396-desktop-only\{display:none!important\}/);
  assert.match(css,/\.zip396-mobile-only\{display:grid/);
  assert.match(page,/onClick=\{openDecisionSheet\}/);
  assert.equal((page.match(/onClick=\{push\}/g)||[]).length,1,'only desktop dock uses direct Push');
  assert.equal((page.match(/onClick=\{\(\) => push\(\)\}/g)||[]).length,1,'only final sheet has mobile Push');
});
test('confirmation sheet never offers Push for unacknowledged risk', () => {
  assert.match(page,/riskSummary\.pendingCount > 0 \|\| !\['CONFIRM','READY'\]\.includes\(pushReadiness\.code\)/);
  assert.match(page,/className="zip396-sheet-push"|className="button primary full zip396-sheet-push"/);
  assert.match(page,/disabled=\{!canSubmitPush\}/);
  assert.match(page,/const canSubmitPush = pushReadiness\.ready/);
  const risky=summarizeReviewRisks({identity:{severity:'critical',common:4,differentNames:true}});
  assert.equal(risky.pendingCount,1);
  const readiness=reviewReadiness({hasPreview:true,selectedCount:161,authenticated:true,online:true,confirmed:true});
  assert.equal(readiness.ready,true,'normal readiness is insufficient alone');
  assert.equal(readiness.ready && risky.pendingCount===0,false,'risk gate must still block');
});
test('all risk approvals stay independent and ephemeral', () => {
  assert.match(page,/setProjectMismatchConfirmed\(value\); setConfirmed\(false\)/);
  assert.match(page,/setSyncConfirmed\(value\); setConfirmed\(false\)/);
  assert.match(page,/setSensitiveConsent\(false\)/);
  assert.match(page,/setRiskSheetOpen\(false\)/);
  assert.match(page,/identity\.severity === 'critical' && !sensitiveWarning && isMobileViewport\(\)/);
  assert.match(page,/onSecurityDecision=\{\(\) => \{ setRiskSheetOpen\(false\); setSecurityDialogOpen\(true\); \}\}/);
});
test('mobile Review exposes a legible risk summary and full-height sheet', () => {
  assert.match(page,/className=\{`zip396-review-risk-banner/);
  assert.match(page,/className="zip396-risk-sheet"/);
  assert.match(page,/title="Đánh giá rủi ro"/);
  assert.match(css,/\.preview-panel>\.review-risk-center\{display:none!important\}/);
  assert.match(css,/\.zip396-risk-sheet \.review-risk-item-top\{display:grid;grid-template-columns:27px minmax\(0,1fr\)/);
  assert.match(css,/\.zip396-risk-sheet \.review-risk-state\{grid-column:2/);
});
test('changing project/file and verified writes clear the sheet state', () => {
  assert.match(page,/const reset = \(\) => \{[\s\S]*?setDecisionSheetOpen\(false\); setRiskSheetOpen\(false\)/);
  assert.match(page,/function finishVerified\(outcome\) \{[\s\S]*?setDecisionSheetOpen\(false\); setRiskSheetOpen\(false\)/);
  assert.match(page,/function goToDecision\(\) \{[\s\S]*?if \(isMobileViewport\(\)\) \{ setDecisionSheetOpen\(true\); return; \}/);
});
test('desktop Push and GitHub security APIs remain the same', () => {
  assert.match(page,/className="zip396-desktop-only"/);
  assert.match(page,/onClick=\{push\}/);
  assert.match(page,/requestOnce\('commit', commitPayload\)/);
  assert.match(page,/api\('preflight'/);
  assert.match(page,/api\('blob'/);
  assert.match(page,/setConfirmed\(false\); setSyncConfirmed\(false\); setSensitiveConsent\(false\)/);
});
