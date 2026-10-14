import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { workspaceBreadcrumbs, workspaceEntries, workspaceInsert, shouldWarnWorkspaceExit, WORKSPACE_VIEWS } from '../lib/workspace-ux.js';
const text = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('workspace breadcrumbs support nested GitHub paths and root without destructive mutation', () => {
  assert.deepEqual(workspaceBreadcrumbs('src/components/forms'),[
    {label:'root',path:''},{label:'src',path:'src'},
    {label:'components',path:'src/components'},{label:'forms',path:'src/components/forms'},
  ]);
  assert.deepEqual(workspaceBreadcrumbs(''),[{label:'root',path:''}]);
});
test('workspace sorts directories first, then files by natural name without mutating fetched list', () => {
  const items=[{name:'test10.js',kind:'file'},{name:'zeta',kind:'directory'},{name:'test2.js',kind:'file'},{name:'assets',kind:'directory'}];
  assert.deepEqual(workspaceEntries(items).map(x=>x.name),['assets','zeta','test2.js','test10.js']);
  assert.equal(items[0].name,'test10.js');
});
test('workspace search filters safely and tolerates empty listings', () => {
  assert.deepEqual(workspaceEntries(null),[]);
  assert.deepEqual(workspaceEntries([{name:'README.md',kind:'file'},{name:'src',kind:'directory'}],' read ').map(x=>x.name),['README.md']);
});
test('editor indentation preserves selection and returns predictable caret', () => {
  assert.deepEqual(workspaceInsert('abc',1,2,'  '),{value:'a  c',caret:3});
  assert.deepEqual(workspaceInsert('abc',-40,50,'x'),{value:'x',caret:1});
  assert.deepEqual(workspaceInsert('abc',3,3,'  '),{value:'abc  ',caret:5});
});
test('workspace unsaved guard protects identity changes and tab exit but not internal navigation', () => {
  const state={workspaceOpen:true,dirty:true,current:'repositories'};
  assert.equal(shouldWarnWorkspaceExit({...state,target:'history'}),true);
  assert.equal(shouldWarnWorkspaceExit({...state,target:'repositories'}),false);
  assert.equal(shouldWarnWorkspaceExit({...state,identityChanged:true}),true);
  assert.equal(shouldWarnWorkspaceExit({...state,dirty:false,identityChanged:true}),false);
  assert.equal(shouldWarnWorkspaceExit({...state,current:'history',target:'activity'}),false);
  assert.equal(shouldWarnWorkspaceExit({...state,workspaceOpen:false,target:'history'}),false);
});
test('workspaces have four internal modes, preserving five global tabs',()=>{
  assert.deepEqual(WORKSPACE_VIEWS,['code','edit','review','history']);
  const panel=text('app/components/WorkspacePanel.jsx');
  for(const pattern of ['workspace-view-tabs','workspace-crumbs','workspace-mobile-tools','workspace-line-number','workspace-favorites','onDirtyChange','workspaceInsert','onBack'])assert.ok(panel.includes(pattern),pattern);
  assert.match(text('app/page.jsx'),/const workspaceDirtyRef = useRef\(false\)/);
  assert.match(text('app/page.jsx'),/onDirtyChange=\{onWorkspaceDirtyChange\}/);
  assert.match(text('app/page.jsx'),/canLeaveWorkspace\('', true\)/);
});
test('Quick Edit still requires signed server preview and explicit commit consent',()=>{
  const panel=text('app/components/WorkspacePanel.jsx');
  assert.match(panel,/api\('workspace\/preview'/);
  assert.match(panel,/api\('workspace\/save'/);
  assert.match(panel,/confirmed:true/);
  assert.match(panel,/!confirmed\|\|!review/);
  assert.match(panel,/!dirty\|\|\(!draft&&!allowEmpty\)/);
  assert.match(panel,/role="status"/);
  assert.doesNotMatch(panel,/localStorage|sessionStorage/);
});
test('Workspace UX stylesheet loaded after motion and supports small iPhones, light theme and reduced motion',()=>{
  const layout=text('app/layout.jsx');const stylesheet=text('app/styles/workspace-ux.css');
  assert.ok(layout.indexOf('pro-motion.css')<layout.indexOf('workspace-ux.css'));
  assert.match(stylesheet, /max-width:360px/);
  assert.match(stylesheet,/prefers-reduced-motion:reduce/);
  assert.match(stylesheet,/--pro-accent/);
});
test('PR manager tabs and History filter do not change backend mutation policy',()=>{
  const pr=text('app/components/BranchPrPanel.jsx'),history=text('app/components/HistoryPanel.jsx');
  assert.match(pr,/branch-pr-tabs/);
  assert.match(pr,/section==='branches'/);
  assert.match(pr,/section==='prs'/);
  assert.match(pr,/mergeConfirm !== 'MERGE'/);
  assert.match(history,/historyFilter/);
  assert.match(history,/aria-label="Lịch sử commits"/);
  assert.match(history,/phrase !== 'ROLLBACK'/);
});
