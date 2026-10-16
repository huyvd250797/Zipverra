import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compareProjectIdentity, packageNameFromArchive, packageNameFromText } from '../lib/project-identity.js';
const source = path => readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const page=source('app/page.jsx');
const modal=source('app/components/ModalSheet.jsx');
const css=source('app/styles/stable-experience-v383.css');
const root=source('app/layout.jsx');
const makeFiles=(prefix,count=25) => Array.from({length:count},(_,i)=>({path:`${prefix}/module-${i}.tsx`,type:'blob',sha:String(i)}));
test('normal same-project paths do not trigger severe warning',()=>{
 const files=makeFiles('src');
 assert.equal(compareProjectIdentity({archiveFiles:files,remoteFiles:files,localName:'same',remoteName:'same'}).severity,'matched');
});
test('large unrelated projects must be flagged red, including same-name repos',()=>{
 const result=compareProjectIdentity({archiveFiles:makeFiles('frontend'),remoteFiles:makeFiles('api'),localName:'project-b',remoteName:'project-c'});
 assert.equal(result.severity,'critical');
 assert.equal(result.common,0);
 const result2=compareProjectIdentity({archiveFiles:makeFiles('frontend'),remoteFiles:makeFiles('api'),localName:'project-a',remoteName:'project-a'});
 assert.equal(result2.severity,'critical');
});
test('different projects with same folder layout are detected by manifest plus file hashes',()=>{
 const local=makeFiles('src');
 const remote=local.map(x=>({...x,sha:'remote-'+x.sha}));
 const report=compareProjectIdentity({archiveFiles:local,remoteFiles:remote,localName:'frontend-b',remoteName:'frontend-c'});
 assert.equal(report.severity,'critical');
 assert.equal(report.identicalContent,0);
 const renameOnly=compareProjectIdentity({archiveFiles:local,remoteFiles:local,localName:'new-name',remoteName:'old-name'});
 assert.equal(renameOnly.severity,'matched');
});
test('empty/small project must never be falsely labeled unrelated',()=>{
 assert.equal(compareProjectIdentity({archiveFiles:makeFiles('frontend'),remoteFiles:[]}).severity,'unknown');
 assert.equal(compareProjectIdentity({archiveFiles:makeFiles('frontend',2),remoteFiles:makeFiles('api')}).severity,'unknown');
});
test('moderate overlap is uncertainty only, not a hard block',()=>{
 const common=makeFiles('src',5);
 const result=compareProjectIdentity({archiveFiles:[...common,...makeFiles('frontend',15)],remoteFiles:[...common,...makeFiles('server',15)]});
 assert.equal(result.severity,'matched');
});
test('parse bounded package name; invalid manifests yield no identity',()=>{
 const data=new TextEncoder().encode('{"name":"@scope/demo", "version":"1"}');
 assert.equal(packageNameFromArchive([{path:'package.json',data,bytes:data.byteLength}]),'@scope/demo');
 assert.equal(packageNameFromText('{"name":"OTHER"}'),'other');
 assert.equal(packageNameFromText('not json'),'');
 assert.equal(packageNameFromArchive([{path:'package.json',data:new Uint8Array([0]),bytes:1}]),'');
});
test('advisory mismatch warning requires explicit checkbox, never alters GitHub API',()=>{
 assert.match(page,/<ReviewRiskCenter summary={riskSummary}/);
 assert.match(source('app/components/ReviewRiskCenter.jsx'), /Tôi đã kiểm tra/);
 assert.match(page,/setProjectMismatchConfirmed\(false\)/);
 assert.match(page,/pushReadiness.ready && \(preview\?\.identity\?\.severity !== 'critical' \|\| projectMismatchConfirmed\)/);
 assert.match(page,/disabled=\{!canSubmitPush\}/);
 assert.match(source('app/components/ReviewRiskCenter.jsx'), /nguy cơ nhầm dự án/);
 assert.doesNotMatch(source('app/api/github/commit/route.js'),/projectMismatch/);
});
test('app logo and repo reload return to initial selections but do not erase uncertain journal',()=>{
 assert.match(page, /function restartWorkspace\(\)/);
 assert.match(page, /onClick=\{restartWorkspace\}/);
 assert.match(page,/clearUploadCheckpoint\(\);[\s\S]{0,180}window\.location\.assign\(window\.location\.pathname\)/);
 assert.match(page,/busy \|\| loadingRepos \|\| pendingCommit \|\| pendingPR/);
});
test('sheet animations have enter and exit with opacity+translation and reduced motion',()=>{
 assert.match(modal,/setExiting\(true\)/);
 assert.match(modal,/closeTimerRef\.current = window\.setTimeout/);
 assert.match(css,/@keyframes zip383-sheet-enter\{from\{opacity:0;transform:translate3d/);
 assert.match(css,/@keyframes zip383-sheet-exit\{from\{opacity:1;transform:translate3d/);
 assert.match(css,/@keyframes zip383-view-exit/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
test('prepaint theme is resolved before body displays and avoids overwriting old stored choice',()=>{
 assert.ok(root.indexOf('<head><script')<root.indexOf('<body>'));
 assert.match(root,/localStorage\.getItem\('zipverra\.theme\.v1'\)/);
 assert.match(page,/if \(!themeReady\) return/);
 assert.match(page,/document\.documentElement\.style\.colorScheme/);
 assert.match(root,/stable-experience-v383\.css/);
});
