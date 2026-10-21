import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { summarizeReviewRisks } from '../lib/review-risk-center.js';
import { reviewReadiness } from '../lib/ux-polish.js';
const source = path => readFileSync(new URL(`../${path}`, import.meta.url),'utf8');
const page=source('app/page.jsx');
const ui=source('app/components/ReviewRiskCenter.jsx');

const critical={report:{critical:1,warning:2,info:1},requiresConsent:true,
  identity:{severity:'critical',common:1,differentNames:true},mode:'sync',deleteCount:15};

test('v3.9.4 registers one unified Review risk surface ahead of Commit and diagnostics',()=>{
  assert.equal(JSON.parse(source('package.json')).version,'3.9.4');
  assert.match(source('app/layout.jsx'),/review-risk-v385\.css/);
  const risk=page.indexOf('<ReviewRiskCenter'),decision=page.indexOf('className="premium-review-confirm"'),files=page.indexOf('className="premium-review-files"');
  assert.ok(risk>0&&risk<decision&&decision<files);
  for(const old of ['<ReviewRiskSnapshot','className="project-mismatch-alert"','className="security-consent-card"','className="warning-banner"'])assert.equal(page.includes(old),false,old);
});
test('simultaneous Critical, mismatch and Sync each require independent approval',()=>{
 const risk=summarizeReviewRisks(critical);
 assert.equal(risk.status,'pending');assert.equal(risk.pendingCount,3);assert.equal(risk.requiredCount,3);
 assert.deepEqual(risk.items.map(x=>x.id),['security','identity','sync']);
 assert.ok(risk.items.every(x=>x.approved===false));
});
test('partial acknowledgement cannot make the unified risk center ready',()=>{
 const risk=summarizeReviewRisks({...critical,sensitiveConsent:true,mismatchConsent:true});
 assert.equal(risk.pendingCount,1);assert.equal(risk.items[0].approved,true);
 assert.equal(risk.items[1].approved,true);assert.equal(risk.items[2].approved,false);
});
test('all approvals change presentation only; Push still requires explicit commit checkbox',()=>{
 const risk=summarizeReviewRisks({...critical,sensitiveConsent:true,mismatchConsent:true,syncConfirmed:true});
 assert.equal(risk.status,'acknowledged');assert.equal(risk.pendingCount,0);
 const ready=reviewReadiness({hasPreview:true,selectedCount:4,critical:1,sensitiveFindings:1,sensitiveConsent:true,authenticated:true,online:true,confirmed:false,syncDeleteCount:15,syncConfirmed:true});
 assert.equal(ready.code,'CONFIRM'); assert.equal(ready.ready,false);
 assert.match(page,/disabled=\{!canSubmitPush\}/);
 assert.match(page,/onClick=\{push\}/);
});
test('security advice without selected high-risk findings never asks for security consent',()=>{
 const risk=summarizeReviewRisks({report:{critical:0,warning:2},requiresConsent:false});
 assert.equal(risk.status,'advisory');assert.equal(risk.requiredCount,0);
 assert.equal(risk.items[0].tone,'warning');
});
test('unrelated project warning is severe but still user-overridable',()=>{
 const risk=summarizeReviewRisks({identity:{severity:'critical',common:0},mismatchConsent:true});
 assert.equal(risk.items[0].tone,'critical');assert.equal(risk.pendingCount,0);
 assert.match(ui,/onMismatchConsent\(event\.target\.checked\)/);
 assert.match(page,/projectMismatchConfirmed\)/);
 assert.doesNotMatch(source('app/api/github/commit/route.js'),/projectMismatch/);
});
test('unknown/uncertain project identity is informational, not mandatory',()=>{
 assert.equal(summarizeReviewRisks({identity:{severity:'uncertain'}}).pendingCount,0);
 assert.equal(summarizeReviewRisks({identity:{severity:'unknown'}}).items.length,0);
 assert.equal(summarizeReviewRisks({identity:{severity:'matched'}}).status,'clear');
});
test('Sync confirmation applies only to selected deletes, not Merge or zero deletes',()=>{
 assert.equal(summarizeReviewRisks({mode:'merge',deleteCount:500}).pendingCount,0);
 assert.equal(summarizeReviewRisks({mode:'sync',deleteCount:0}).pendingCount,0);
 assert.equal(summarizeReviewRisks({mode:'sync',deleteCount:2}).pendingCount,1);
 assert.equal(summarizeReviewRisks({mode:'sync',deleteCount:2,syncConfirmed:true}).pendingCount,0);
});
test('selected file change resets all previous approvals and confirmation',()=>{
 for(const functionName of ['updateSelection','bulkSelection']){
  const start=page.indexOf(`function ${functionName}(`);
  const end=page.indexOf('\n  }',start);
  const body=page.slice(start,end);
  for(const setter of ['setConfirmed(false)','setSyncConfirmed(false)','setSensitiveConsent(false)','setProjectMismatchConfirmed(false)'])assert.ok(body.includes(setter),`${functionName}: ${setter}`);
 }
 assert.match(page,/onMismatchConsent=\{\(value\) => \{ setProjectMismatchConfirmed\(value\); setConfirmed\(false\); \}\}/);
 assert.match(page,/onSyncConsent=\{\(value\) => \{ setSyncConfirmed\(value\); setConfirmed\(false\); \}\}/);
});
test('diagnostics start collapsed but remain accessible by button; secrets are not shown in Risk Center',()=>{
 assert.match(page,/defaultOpen=\{false\} key=\{`\$\{preview\.remote\.head\}-diagnostics`\}/);
 assert.match(page,/onShowDetails=\{showReviewDiagnostics\}/);
 assert.match(ui,/onShowDetails/);
 assert.doesNotMatch(ui,/finding\.value|finding\.content|f\.secret|data\.content/);
});
test('existing technical gates and server acknowledgement are untouched',()=>{
 assert.match(page,/requestOnce\('commit', commitPayload\)/);
 assert.match(page,/allowSensitiveCommit: requiresConsent && sensitiveConsent/);
 assert.match(page,/allowSensitiveUpload: requiresConsent && sensitiveConsent/);
 assert.match(page,/!confirmed \|\| \(mode === 'sync' && stats\?\.delete > 0 && !syncConfirmed\)/);
});
test('mobile Risk Center uses readable text, focus, light theme and reduced-motion support',()=>{
 const css=source('app/styles/review-risk-v385.css');
 for(const token of ['@media(max-width:420px)','@media(prefers-reduced-motion:reduce)','[data-theme="light"]',':focus-visible','overflow-wrap:anywhere','min-height:36px'])assert.ok(css.includes(token),token);
 assert.match(ui,/aria-live="polite"/);
 assert.match(ui,/aria-label="Đánh giá rủi ro trước khi Push"/);
});
