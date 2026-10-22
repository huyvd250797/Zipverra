import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {APP_VERSION} from '../lib/pwa-reliability.js';
import {adaptiveSheetPresentation, shouldDismissSheetDrag, focusedFieldScrollDelta} from '../lib/adaptive-sheet.js';
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('v3.9.13 release, cache and stylesheet cascade are aligned',()=>{
 assert.equal(APP_VERSION,'3.9.13');
 assert.equal(JSON.parse(read('package.json')).version,'3.9.13');
 assert.match(read('public/sw.js'),/zipverra-public-v3\.9\.13/);
 const layout=read('app/layout.jsx');
 assert.ok(layout.indexOf('quick-actions-v393.css') < layout.indexOf('adaptive-sheets-v394.css'));
 assert.match(read('app/page.jsx'),/Zipverra · v3\.9\.13/);
});

test('mobile bottom sheet / desktop panel / centered security decision are separated',()=>{
 assert.equal(adaptiveSheetPresentation('picker',390),'bottom');
 assert.equal(adaptiveSheetPresentation('diff',760),'bottom');
 assert.equal(adaptiveSheetPresentation('picker',761),'side');
 assert.equal(adaptiveSheetPresentation('diff',1440),'side');
 assert.equal(adaptiveSheetPresentation('sheet',1440),'dialog');
 assert.equal(adaptiveSheetPresentation('confirm',390),'dialog');
});

test('swipe dismissal requires intentional downward gesture on handle',()=>{
 const gesture={distanceX:3,distanceY:140,elapsedMs:800,fromHandle:true,keyboardOpen:false};
 assert.equal(shouldDismissSheetDrag(gesture),true);
 assert.equal(shouldDismissSheetDrag({...gesture,fromHandle:false}),false);
 assert.equal(shouldDismissSheetDrag({...gesture,keyboardOpen:true}),false);
 assert.equal(shouldDismissSheetDrag({...gesture,distanceY:-140}),false);
 assert.equal(shouldDismissSheetDrag({...gesture,distanceX:180}),false);
});

test('quick vertical flick dismisses, small slow swipe returns to initial position',()=>{
 assert.equal(shouldDismissSheetDrag({distanceY:62,distanceX:4,elapsedMs:66,fromHandle:true}),true);
 assert.equal(shouldDismissSheetDrag({distanceY:60,distanceX:2,elapsedMs:600,fromHandle:true}),false);
 assert.equal(shouldDismissSheetDrag({distanceY:0,elapsedMs:1,fromHandle:true}),false);
});

test('keyboard focus correction is limited to the sheet scroll region',()=>{
 const region={top:80,bottom:520};
 assert.equal(focusedFieldScrollDelta({top:480,bottom:540},region),36);
 assert.equal(focusedFieldScrollDelta({top:65,bottom:105},region),-31);
 assert.equal(focusedFieldScrollDelta({top:150,bottom:185},region),0);
 assert.equal(focusedFieldScrollDelta(null,region),0);
});

test('Diff opens separately without moving Review content or exposing sensitive files',()=>{
 const page=read('app/page.jsx');
 assert.match(page,/variant="diff"/);
 assert.match(page,/zip394-diff-viewer/);
 assert.doesNotMatch(page,/\{diffViewer && <div className="inline-diff"/);
 assert.match(page,/sensitiveFindings\.some\(f => f\.path === change\.path\)/);
 assert.match(page,/diffRequestRef\.current \+= 1; setDiffViewer\(null\)/);
});

test('repository and branch picker share adaptive presentation but keep existing permissions',()=>{
 const picker=read('app/components/RepositoryWorkflowSheets.jsx');
 assert.match(picker,/title="Chọn repository" variant="picker"/);
 assert.match(picker,/title="Chọn branch" variant="picker"/);
 assert.match(picker,/sortedRepositories\(repos, favorites, recents\)/);
 assert.match(picker,/validBranchName\(manual\.trim\(\)\)/);
});

test('sheet scroll locks the background, preserves focus, and restores without document scrolling',()=>{
 const component=read('app/components/ModalSheet.jsx');
 assert.match(component,/lockModalScroll\(document, window, scrollRegion\)/);
 assert.match(component,/focusedFieldScrollDelta/);
 assert.match(component,/scrollRegion\.scrollTop \+= delta/);
 assert.match(component,/opener\.focus\?\.\(\{ preventScroll: true \}\)/);
 assert.match(component,/onPointerDown=\{onGripPointerDown\}/);
 assert.match(component,/onPointerCancel=\{onGripPointerEnd\}/);
 assert.doesNotMatch(component,/\.scrollIntoView\(/);
});

test('mobile keyboard and desktop drawer styles avoid obscuring input and action docks',()=>{
 const css=read('app/styles/adaptive-sheets-v394.css');
 assert.match(css,/@media\(min-width:761px\)/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/var\(--zip-keyboard-inset\)/);
 assert.match(css,/var\(--zip-visible-height\)/);
 assert.match(css,/touch-action:none/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/\.zip394-diff-lines \.diff-line code\{white-space:pre-wrap/);
});

test('existing server routes and final confirmation stay untouched by adaptive UI',()=>{
 const page=read('app/page.jsx');
 assert.match(page,/disabled=\{!canSubmitPush\}/);
 assert.match(page,/onClick=\{push\}/);
 assert.match(page,/<ReviewRiskCenter/);
 assert.match(page,/securityDialogOpen && requiresConsent/);
 assert.match(read('lib/source-security-server.js'),/assertSecureCommitEntries/);
});
