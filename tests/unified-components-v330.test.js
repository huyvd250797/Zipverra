import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { accountStorageKey } from '../lib/pro-workspace.js';
import { normalizeRepositoryUsage, recordRepositorySelection, repositoryQuickPicks, usageFromActivity, REPO_USAGE_KEY } from '../lib/repository-suggestions.js';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const repos = ['owner/alpha','owner/beta','owner/gamma','owner/delta','owner/zeta'].map(full_name => ({full_name,private:false}));

test('frequent repository selection is counted per authorized repo only', () => {
  let usage = [];
  usage = recordRepositorySelection(usage,'owner/alpha',repos,10);
  usage = recordRepositorySelection(usage,'owner/alpha',repos,20);
  usage = recordRepositorySelection(usage,'owner/gamma',repos,30);
  assert.deepEqual(usage.map(x=>[x.repo,x.count]),[['owner/gamma',1],['owner/alpha',2]]);
  assert.deepEqual(recordRepositorySelection(usage,'owner/private',repos,40),usage);
  assert.deepEqual(recordRepositorySelection(usage,'../bad',repos,40),usage);
});

test('quick picks put the most-used first and recent choices directly beneath, without duplicates',()=>{
  let usage = [];
  for (let i=0;i<4;i++) usage=recordRepositorySelection(usage,'owner/alpha',repos,100+i);
  for (let i=0;i<3;i++) usage=recordRepositorySelection(usage,'owner/beta',repos,200+i);
  let picks=repositoryQuickPicks(repos,usage,['owner/gamma','owner/alpha','owner/delta'],[],3);
  assert.deepEqual(picks.frequent.map(r=>r.full_name), ['owner/alpha','owner/beta']);
  assert.deepEqual(picks.recent.map(r=>r.full_name), ['owner/gamma','owner/delta']);
  picks=repositoryQuickPicks(repos,usage,['owner/gamma'],['owner/zeta'],3);
  assert.deepEqual(picks.pinned.map(r=>r.full_name), ['owner/zeta']);
  const dedup=repositoryQuickPicks(repos,usage,['owner/gamma'],['owner/alpha','owner/zeta'],3);
  assert.deepEqual(dedup.pinned.map(r=>r.full_name),['owner/zeta']);
});

test('revoked repositories never appear in quick picks even if they are frequent, recent or pinned',()=>{
  const usage=[{repo:'owner/private',count:300,lastUsed:55},{repo:'owner/alpha',count:2,lastUsed:50}];
  const picks=repositoryQuickPicks(repos,usage,['owner/private','owner/beta'],['owner/private','owner/gamma']);
  for(const list of Object.values(picks)) assert.equal(list.some(x=>x.full_name==='owner/private'),false);
});

test('usage metadata ignores duplicates, invalid shape and implausible counters, bounded to 50 entries',()=>{
  const names=Array.from({length:75},(_,i)=>({repo:`owner/test${i}`,count:1,lastUsed:50}));
  assert.equal(normalizeRepositoryUsage(names,100).length,50);
  assert.deepEqual(normalizeRepositoryUsage([{repo:'owner/a',count:2,lastUsed:20},{repo:'OWNER/A',count:999,lastUsed:22},
    {repo:'owner/b',count:-1,lastUsed:30},{repo:'owner/c',count:2,lastUsed:999999}],100),[{repo:'owner/a',count:2,lastUsed:20}]);
});

test('repo usage is account-scoped and contains no credentials',()=>{
  assert.equal(accountStorageKey(REPO_USAGE_KEY,{login:'Alice'}), 'zipverra.repositoryUsage.v1:alice');
  assert.notEqual(accountStorageKey(REPO_USAGE_KEY,{login:'Alice'}),accountStorageKey(REPO_USAGE_KEY,{login:'Bob'}));
  assert.equal(accountStorageKey(REPO_USAGE_KEY,{login:'bad/name'}),null);
  const page=read('app/page.jsx');
  assert.match(page,/accountStorageKey\(REPO_USAGE_KEY, auth\.user\)/);
  assert.match(page,/recordRepositorySelection\(current, value, repos\)/);
  assert.match(page,/usage=\{repositoryUsage\}/);
});

test('repo modal shows top-of-sheet quick sections and filters to authorized list while searching',()=>{
  const sheet=read('app/components/RepositoryWorkflowSheets.jsx');
  assert.match(sheet,/repositoryQuickPicks\(repos, usage, recents, favorites/);
  assert.match(sheet,/Dùng nhiều/);
  assert.match(sheet,/Gần đây/);
  assert.match(sheet,/Đã ghim/);
  assert.match(sheet,/!searching &&/);
  assert.match(sheet,/sortedRepositories\(repos, favorites, recents\)/);
  assert.match(sheet,/onClose\(\)/);
  assert.match(sheet,/window\.requestAnimationFrame\(\(\) => onChoose\(name\)\)/);
});

test('unified primitives cover button, input, card, badge, icon and progress, with safe presentation only',()=>{
  const comp=read('app/components/UnifiedUI.jsx');
  for(const label of ['UiButton','UiIconButton','UiCard','UiInput','UiBadge','UiProgress']) assert.ok(comp.includes(`function ${label}`),label);
  assert.doesNotMatch(comp,/fetch\(|localStorage|sessionStorage|dangerouslySetInnerHTML/);
  const style=read('app/styles/unified-components-v330.css');
  const layout=read('app/layout.jsx');
  assert.ok(layout.indexOf('unified-components-v330.css')>layout.indexOf('premium-visual-v320.css'));
  for(const marker of ['.zip-ui-button','.zip-ui-input','.zip-ui-card','.zip-ui-badge','.zip-ui-progress','.zip-modal','.pro-shell .mobile-bottom-nav','.zip-quick-chip']) assert.ok(style.includes(marker),marker);
  assert.match(style,/prefers-reduced-motion:reduce/);
});

test('modal scroll lock, security warnings and explicit push consent remain intact',()=>{
  const modal=read('app/components/ModalSheet.jsx');
  const page=read('app/page.jsx');
  assert.match(modal,/lockModalScroll\(document, window/);
  assert.match(modal,/data-modal-scroll-region/);
  assert.match(page,/Sync có thể xóa file hiện có trên GitHub/);
  assert.match(page,/\(requiresConsent && !sensitiveConsent\)/);
  assert.match(page,/requestOnce\('commit', commitPayload\)/);
});

test('existing account activity seeds frequent repo suggestions on first upgrade without secrets',()=>{
  const old=[
    {kind:'push',repo:'owner/alpha',at:100},
    {kind:'quick-edit',repo:'owner/alpha',at:110},
    {kind:'pr',repo:'owner/beta',at:130},
    {kind:'system',repo:'owner/private',at:140},
    {kind:'push',repo:'../bad',at:150},
  ];
  const seeded=usageFromActivity(old,200);
  assert.deepEqual(seeded.map(x=>[x.repo,x.count]),[['owner/alpha',2],['owner/beta',1]]);
  assert.deepEqual(repositoryQuickPicks(repos,seeded,[],[]).frequent.map(x=>x.full_name),['owner/alpha']);
});
