import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { deriveWorkflowStep, checkZipCandidate, shouldPublishProgress } from '../lib/workflow-ux.js';
const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

const base={phase:'IDLE',chosenRepo:true,hasFile:true,hasPreview:true};
test('workflow stages are derived only from actual progress, not a checked confirmation',()=>{
  assert.equal(deriveWorkflowStep({...base,chosenRepo:false}),0);
  assert.equal(deriveWorkflowStep({...base,hasFile:false}),1);
  assert.equal(deriveWorkflowStep({...base,hasPreview:false}),2);
  assert.equal(deriveWorkflowStep(base),3);
  for(const phase of ['UPLOADING','COMMITTING','VERIFYING','UNCONFIRMED'])
    assert.equal(deriveWorkflowStep({...base,phase}),4);
  assert.equal(deriveWorkflowStep({...base,phase:'SUCCEEDED'}),5);
  assert.equal(deriveWorkflowStep({...base,phase:'FAILED'}),3);
});
test('ZIP candidate validation rejects non ZIP, empty and oversized files before invoking Worker',()=>{
  const limit=80*1024*1024;
  assert.equal(checkZipCandidate({name:'code.zip',size:125},limit),null);
  assert.equal(checkZipCandidate({name:'code.ZIP',size:limit},limit),null);
  assert.match(checkZipCandidate({name:'code.txt',size:125},limit),/\.zip/);
  assert.match(checkZipCandidate({name:'code.zip',size:0},limit),/rỗng/);
  assert.match(checkZipCandidate({name:'code.zip',size:limit+1},limit),/80 MiB/);
  assert.match(checkZipCandidate(null,limit),/\.zip/);
});
test('progress updates are coalesced but final upload/archive completion always renders',()=>{
  assert.equal(shouldPublishProgress(0,1),true);
  assert.equal(shouldPublishProgress(1000,1050),false);
  assert.equal(shouldPublishProgress(1000,1150),true);
  assert.equal(shouldPublishProgress(1000,1001,true),true);
  assert.equal(shouldPublishProgress(2000,1900),true);
});
test('file selection triggers analysis but never a GitHub commit',()=>{
  const page=read('app/page.jsx');
  assert.match(page,/useEffect\(\(\) => \{\s*if \(!file \|\| !chosenRepo/);
  assert.match(page,/void analyze\(\)/);
  assert.match(page,/checkZipCandidate\(next, LIMITS\.zipBytes\)/);
  assert.match(page,/if \(!preview \|\| !selectedChanges\.length \|\| securityReport\?\.blocked \|\| !confirmed/);
  assert.match(page,/onClick=\{push\}/);
  assert.match(page,/requestOnce\('commit', commitPayload\)/);
});
test('tab navigation keeps review state, activity verification and safe next ZIP CTA',()=>{
  const page=read('app/page.jsx');
  assert.match(page,/function goToTab\(tab\)/);
  assert.match(page,/setActiveTab\(tab\)/);
  assert.match(page,/function startNextVersion\(\)/);
  assert.match(page,/busy \|\| pendingCommit \|\| pendingPR \|\| phase !== PUSH_STAGES\.SUCCEEDED/);
  assert.match(page,/clearUploadCheckpoint\(\)/);
  assert.match(page,/goToTab\('activity'\)/);
  assert.match(page,/onClick=\{startNextVersion\}/);
});
test('advanced options and optional panels do not load on every view',()=>{
  const page=read('app/page.jsx');
  const ui=read('app/components/ProfessionalUI.jsx');
  const css=read('app/styles/pro-design-system.css');
  assert.match(page,/<details className="workflow-options">/);
  assert.match(page,/dashboardOpen && <ProDashboard/);
  assert.match(page,/activeTab === 'history' && <HistoryPanel/);
  assert.match(page,/activeTab === 'settings' && <article/);
  assert.match(page,/dynamic\(\(\) => import\('\.\/components\/HistoryPanel\.jsx'\)/);
  assert.match(ui,/disabled=\{unavailable\}/);
  assert.match(css,/main\[data-active-view="home"\] \.hero/);
  assert.match(css,/\.workflow-complete/);
});
