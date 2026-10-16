import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { workflowPosition, activityPresentation, reviewDisclosureDefaultOpen } from '../lib/premium-workflow.js';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const page = read('app/page.jsx'), ui = read('app/components/ProfessionalUI.jsx');
const styles = read('app/styles/premium-workflow-v350.css');

test('v3.8.4 loads Premium Workflow last, preserving preceding visual layers',()=>{
  assert.equal(JSON.parse(read('package.json')).version,'3.8.4');
  const layout=read('app/layout.jsx');
  assert.match(layout,/premium-workflow-v350\.css/);
  assert.ok(layout.indexOf('mobile-layout-v340.css')<layout.indexOf('premium-workflow-v350.css'));
});
test('connected stepper rail runs from first milestone to fifth without fake progress',()=>{
  assert.deepEqual(workflowPosition(0),{active:0,complete:false,railPercent:0});
  assert.deepEqual(workflowPosition(1),{active:1,complete:false,railPercent:25});
  assert.deepEqual(workflowPosition(2),{active:2,complete:false,railPercent:50});
  assert.deepEqual(workflowPosition(3),{active:3,complete:false,railPercent:75});
  assert.deepEqual(workflowPosition(4),{active:4,complete:false,railPercent:100});
  assert.deepEqual(workflowPosition(5),{active:4,complete:true,railPercent:100});
  assert.deepEqual(workflowPosition(-15),workflowPosition(0));
  assert.equal(workflowPosition(Number.NaN).railPercent,0);
  assert.match(ui,/workflowPosition\(currentStep\)/);
  assert.match(ui,/aria-current=/);
});
test('activity shows actual stage, never claims success for uncertain writes or PR',()=>{
  assert.equal(activityPresentation({phase:'IDLE',busy:false,progress:0}),null);
  const busy=activityPresentation({phase:'UPLOADING',busy:true,progress:42.61});
  assert.equal(busy.percent,43);
  assert.equal(busy.tone,'processing');
  assert.equal(activityPresentation({phase:'COMMITTING',busy:true,progress:999}).percent,100);
  assert.equal(activityPresentation({phase:'FAILED',busy:false,progress:88}).percent,null);
  assert.equal(activityPresentation({phase:'UNCONFIRMED',busy:false,progress:100}).tone,'warning');
  assert.equal(activityPresentation({phase:'SUCCEEDED',busy:false,progress:100}).tone,'success');
  const pending=activityPresentation({phase:'SUCCEEDED',busy:false,pendingPR:{sourceBranch:'zipverra/test'},result:{sha:'a'.repeat(40)}});
  assert.equal(pending.tone,'warning');
  assert.match(pending.title,/Pull Request/);
  const unresolved=activityPresentation({phase:'UNCONFIRMED',busy:false,pendingCommit:{},progress:100});
  assert.equal(unresolved.tone,'warning');
});
test('large Review starts summarized, small Review opens files; security stays outside the fold',()=>{
  assert.equal(reviewDisclosureDefaultOpen(0),true);
  assert.equal(reviewDisclosureDefaultOpen(10),true);
  assert.equal(reviewDisclosureDefaultOpen(11),false);
  assert.equal(reviewDisclosureDefaultOpen(5000),false);
  assert.equal(reviewDisclosureDefaultOpen(-1),false);
  assert.match(page,/premium-review-files/);
  assert.match(page,/open=\{fileDetailsOpen\}/);
  assert.match(page,/setFileDetailsOpen\(reviewDisclosureDefaultOpen\(changes\.length\)\)/);
  const riskAt=page.indexOf('<ReviewRiskSnapshot');
  const warningAt=page.indexOf('className="warning-banner"');
  const confirmAt=page.indexOf('className="premium-review-confirm"');
  const filesAt=page.indexOf('className="premium-review-files"');
  const securityAt=page.indexOf('className={`security-review');
  assert.ok(riskAt>0 && warningAt>riskAt && confirmAt>warningAt && filesAt>confirmAt && securityAt>filesAt);
  assert.match(page,/\(requiresConsent && !sensitiveConsent\)/);
  assert.match(page,/syncConfirmed/);
  assert.match(page,/disabled=\{!canSubmitPush\}/);
});
test('only user action sends Push and Review auto-scroll does not automatically commit',()=>{
  assert.match(page,/onClick=\{push\}/);
  assert.match(page,/requestOnce\('commit', commitPayload\)/);
  assert.match(page,/if \(!preview \|\| activeTab !== 'home'\) return/);
  assert.match(page,/window\.requestAnimationFrame/);
  assert.match(page,/window\.cancelAnimationFrame/);
  assert.match(page,/onClick=\{goToReview\}/);
});
test('Mobile confirmation is reachable, scroll area stable, animation respects reduced motion',()=>{
  for(const token of ['premium-review-overview','premium-review-confirm','premium-activity-focus','premium-review-files-trigger','@media(max-width:760px)','env(safe-area-inset-bottom,0px)','prefers-reduced-motion:reduce'])
    assert.ok(styles.includes(token),token);
  assert.match(read('app/components/PremiumWorkflow.jsx'),/aria-live="polite"/);
  assert.match(read('app/components/PremiumWorkflow.jsx'),/presentation\.percent !== null/);
});
