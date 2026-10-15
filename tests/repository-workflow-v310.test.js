import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lockModalScroll } from '../lib/modal-scroll-lock.js';
import { sortedRepositories } from '../lib/smart-push.js';
import { validBranchName } from '../lib/pro-workspace.js';
const read = name => readFileSync(new URL(`../${name}`,import.meta.url), 'utf8');

function fakeScrollEnvironment() {
  const listeners = new Map();
  const html = { style: { overflow:'auto', overscrollBehavior:'', scrollBehavior:'smooth' } };
  const body = { style: { position:'relative', top:'0px', left:'', right:'', width:'', overflow:'visible', overscrollBehavior:'', touchAction:'' } };
  const win = { scrollX:3, scrollY:485, getComputedStyle:node => ({overflowY:node.overflow || 'visible'}), scrollTo: opts => { win.lastScroll=opts; } };
  const doc = {body, documentElement:html, defaultView:win,
    addEventListener:(name,fn,options)=>listeners.set(name,{fn,options}),
    removeEventListener:(name,fn)=>{if(listeners.get(name)?.fn===fn)listeners.delete(name);} };
  const area = {nodeType:1, scrollTop:0, scrollHeight:650,clientHeight:240,overflow:'auto',parentElement:null,contains(node){return node===area || node===child;}};
  const child={nodeType:1,parentElement:area};
  return {doc,win,listeners,area,child};
}
function touchEvent(target, y, kind = 'touchmove') {
  return { target, touches:[{clientY:y}], cancelable:true, defaultPrevented:false,
    preventDefault(){this.defaultPrevented=true;},type:kind };
}

test('body is fixed and the viewport is restored instantly with original inline styles',()=>{
  const {doc,win,listeners,area}=fakeScrollEnvironment();
  const unlock=lockModalScroll(doc,win,area);
  assert.equal(doc.body.style.position,'fixed');
  assert.equal(doc.body.style.top,'-485px');
  assert.equal(doc.documentElement.style.overflow,'hidden');
  assert.equal(listeners.get('touchmove').options.passive,false);
  unlock();
  assert.equal(doc.body.style.position,'relative');
  assert.equal(doc.body.style.top,'0px');
  assert.equal(doc.documentElement.style.overflow,'auto');
  assert.equal(doc.documentElement.style.scrollBehavior,'smooth');
  assert.deepEqual(win.lastScroll,{left:3,top:485,behavior:'instant'});
  assert.equal(listeners.size,0);
  unlock();
  assert.equal(listeners.size,0);
});

test('iOS touchmove prevents backdrop and overscroll but allows content-only scrolling',()=>{
  const {doc,win,listeners,area,child}=fakeScrollEnvironment();
  const release=lockModalScroll(doc,win,area);
  const outside = {nodeType:1,parentElement:null};
  listeners.get('touchstart').fn(touchEvent(outside,180,'touchstart'));
  const outsideSwipe=touchEvent(outside,140);
  listeners.get('touchmove').fn(outsideSwipe);
  assert.equal(outsideSwipe.defaultPrevented,true);
  listeners.get('touchstart').fn(touchEvent(child,190,'touchstart'));
  const within=touchEvent(child,130);
  listeners.get('touchmove').fn(within);
  assert.equal(within.defaultPrevented,false); // scroll down the sheet (finger up)
  area.scrollTop=410;
  const beyond=touchEvent(child,100);
  listeners.get('touchmove').fn(beyond);
  assert.equal(beyond.defaultPrevented,true); // content has reached its bottom
  area.scrollTop=0;
  listeners.get('touchstart').fn(touchEvent(child,100,'touchstart'));
  const bounceTop=touchEvent(child,160);
  listeners.get('touchmove').fn(bounceTop);
  assert.equal(bounceTop.defaultPrevented,true);
  release();
});

test('nested modal locks only restore background when final overlay releases',()=>{
  const {doc,win,area}=fakeScrollEnvironment();
  const outer=lockModalScroll(doc,win,area);
  const inner=lockModalScroll(doc,win,area);
  outer();
  assert.equal(doc.body.style.position,'fixed');
  inner();
  assert.equal(doc.body.style.position,'relative');
  assert.equal(win.lastScroll.top,485);
});

test('repo picker uses only authorized data; favorites and recently used repos appear first',()=>{
  const repos=['org/zeta','org/alpha','org/beta'].map(full_name=>({full_name}));
  assert.deepEqual(sortedRepositories(repos,['org/zeta'],['org/beta']).map(x=>x.full_name),['org/zeta','org/beta','org/alpha']);
  const ui=read('app/components/RepositoryWorkflowSheets.jsx');
  assert.match(ui,/sortedRepositories\(repos, favorites, recents\)/);
  assert.match(ui,/repos\.filter|\.filter\(/);
  assert.match(ui,/aria-label="Repository đã được cấp quyền"/);
  assert.match(ui,/api\('branches', \{ owner, repo \}\)/);
  assert.match(ui,/validBranchName\(manual\.trim\(\)\)/);
  assert.equal(validBranchName('release/fix'),true);
  assert.equal(validBranchName('../invalid'),false);
});

test('modal and help share the same lock without hiding security warnings',()=>{
  const modal=read('app/components/ModalSheet.jsx');
  const help=read('app/components/ContextualHelp.jsx');
  const page=read('app/page.jsx');
  const css=read('app/styles/repository-workflow.css');
  assert.match(modal,/dialog\.showModal\(\)/);
  assert.match(modal,/lockModalScroll\(document, window/);
  assert.match(modal,/unlock\?\.\(\)/);
  assert.match(modal,/data-modal-scroll-region/);
  assert.match(modal,/onClick=\{event => \{ if \(event\.target === event\.currentTarget\)/);
  assert.match(help,/<ModalSheet open=\{open\}/);
  assert.match(page,/<RepositoryPickerSheet open=\{repoSheetOpen\}/);
  assert.match(page,/<BranchPickerSheet open=\{branchSheetOpen\}/);
  assert.match(css,/overscroll-behavior:contain/);
  assert.match(css,/-webkit-overflow-scrolling:touch/);
  assert.match(page,/\(requiresConsent && !sensitiveConsent\)/);
  assert.match(page,/Sync có thể xóa file hiện có trên GitHub/);
});

test('branch list is read-only and authorized by GitHub App Contents write, without PR permission',async()=>{
  const {listAuthorizedBranches}=await import('../lib/branch-list.js');
  const previous=globalThis.fetch; const calls=[];
  const body=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
  try {
    globalThis.fetch=async(uri, opts={})=>{
      calls.push({uri,method:opts.method});
      if (uri.includes('/user/installations?')) return body({installations:[{id:42,account:{login:'owner'},permissions:{contents:'write'}}]});
      if (uri.includes('/user/installations/42/repositories?')) return body({repositories:[{full_name:'owner/project',permissions:{push:true}}]});
      if (uri.includes('/repos/owner/project/branches?')) return body([
        {name:'main',protected:true,commit:{sha:'a'.repeat(40)}},
        {name:'feature/login',protected:false,commit:{sha:'b'.repeat(40)}},
      ]);
      throw Error('unexpected GitHub endpoint: '+uri);
    };
    const out=await listAuthorizedBranches('test-token',{owner:'owner',repo:'project'});
    assert.deepEqual(out.branches.map(item=>item.name),['main','feature/login']);
    assert.equal(out.branches[0].protected,true);
    assert.equal(out.truncated,false);
    assert.ok(calls.every(item=>item.method==='GET'));
    assert.equal(calls.some(item=>item.uri.includes('/pulls?')),false);
  } finally {globalThis.fetch=previous;}
});

test('branch list denies unauthorized repo before contacting branch endpoint',async()=>{
  const {listAuthorizedBranches}=await import('../lib/branch-list.js');
  const previous=globalThis.fetch; const calls=[];
  try {
    globalThis.fetch=async(uri)=>{
      calls.push(uri);
      if (uri.includes('/user/installations?')) return new Response(JSON.stringify({installations:[{id:8,account:{login:'owner'},permissions:{contents:'read'}}]}),{status:200});
      throw Error('unexpected fetch');
    };
    await assert.rejects(()=>listAuthorizedBranches('test-token',{owner:'owner',repo:'private'}),/GitHub App chưa được cài/);
    assert.equal(calls.some(x=>x.includes('/branches?')),false);
  } finally {globalThis.fetch=previous;}
});

test('changing repo or branch warns before discarding unpushed review state',()=>{
  const page=read('app/page.jsx');
  const sheets=read('app/components/RepositoryWorkflowSheets.jsx');
  assert.match(page,/Đổi repository sẽ bỏ ZIP và Review chưa Push/);
  assert.match(page,/Đổi branch sẽ bỏ Review ZIP chưa Push/);
  assert.match(page,/if \(value\.toLowerCase\(\) === `\$\{owner\}\/\$\{repo\}`\.toLowerCase\(\)\)/);
  assert.match(page,/nextBranch === branch/);
  assert.match(sheets,/window\.requestAnimationFrame\(\(\) => onChoose\(name\)\)/);
});
