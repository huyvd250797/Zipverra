import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPushProfile,upsertProfile,normalizeProfiles,removeProfile,addActivity,normalizeActivity,accountStorageKey,proSnapshot,dashboardRepos,validBranchName} from '../lib/pro-workspace.js';
import {dashboardRequest,loadProDashboard} from '../lib/pro-dashboard.js';
const R='octocat/pro-demo',R2='octocat/other-repo';
const profile={repo:R,branch:'main',mode:'merge',strategy:'direct'};

test('push profile only allows bounded repository, branch, mode and release strategy',()=>{
 const saved=createPushProfile(profile,12345);
 assert.deepEqual(saved,{...profile,updatedAt:12345});
 assert.equal(validBranchName('feature/security-fix'),true);
 for(const branch of ['../main','main//broken','main@{','main lock','.bad','test.lock'])assert.equal(validBranchName(branch),false);
 for(const p of [{...profile,repo:'../private'},{...profile,branch:'../main'},{...profile,mode:'force'},{...profile,strategy:'auto-merge'}])assert.throws(()=>createPushProfile(p));
});
test('upsert profile is repo-keyed and explicit; normalize strips unknown/private fields',()=>{
 const first=upsertProfile([],profile);
 const second=upsertProfile(first,{...profile,branch:'release/v2',mode:'sync',strategy:'pr',access_token:'secret'});
 assert.equal(second.length,1);assert.equal(second[0].branch,'release/v2');
 assert.equal(second[0].mode,'sync');assert.equal(second[0].strategy,'pr');
 assert.equal(JSON.stringify(second).includes('secret'),false);
 assert.equal(removeProfile(second,R).length,0);
});
test('bad or revoked profiles are discarded on load, bounded to 30',()=>{
 const profiles=[{...profile,privateKey:'SUPER-SECRET'},profile,{...profile,repo:R2,branch:'not valid'}];
 assert.deepEqual(normalizeProfiles(profiles,[R]),[{...profile,updatedAt:0}]);
 const many=Array.from({length:50},(_,i)=>({...profile,repo:`team/repo${i}`}));
 assert.equal(normalizeProfiles(many).length,30);
});
test('profiles and activity cache use different accounts and reject invalid identities',()=>{
 assert.notEqual(accountStorageKey('p',{login:'alice'}),accountStorageKey('p',{login:'bob'}));
 assert.equal(accountStorageKey('p',{login:'../../alice'}),null);
 assert.equal(accountStorageKey('p',{login:''}),null);
 assert.equal(accountStorageKey('p',{login:'Alice'}),'p:alice');
});
test('activity only accepts safe metadata; filters corrupt/expired entries, bounded to 50',()=>{
 let events=[];
 for(let i=0;i<70;i++)events=addActivity(events,{kind:'push',state:'success',repo:R,sha:'a'.repeat(40),message:'ok'},1_000_000+i);
 assert.equal(events.length,50);
 assert.equal(events[0].sha,'a'.repeat(40));
 const invalid=addActivity(events,{kind:'ssh_key',state:'success',repo:R});assert.deepEqual(invalid,events);
 assert.equal(normalizeActivity([{id:'x',at:Date.now()+1_000_000,kind:'push',state:'success',repo:R,sha:'',message:'x'}]).length,0);
 assert.equal(normalizeActivity(events,1_000_100).length,50);
});
test('dashboard chooses only installed repos, deduplicated in preferred order',()=>{
 const repos=[{full_name:R},{full_name:R2},{full_name:'x/third'}];
 assert.deepEqual(dashboardRepos(repos,[R2],['x/third',R],'OTHER/SECRET'),[R2,'x/third',R]);
 assert.deepEqual(dashboardRepos(repos,[R2],[],R),[R,R2]);
});
test('cached dashboard only preserves server-shaped allowed fields',()=>{
 const now=Date.now();
 const a=proSnapshot({fetchedAt:now,items:[{repo:R,branch:'main',sha:'b'.repeat(40),status:'ok',message:'Test',date:'2026',token:'PRIVATE_TOKEN'}]});
 assert.equal(a.items.length,1);assert.equal(JSON.stringify(a).includes('PRIVATE_TOKEN'),false);
 assert.equal(proSnapshot({fetchedAt:-1,items:[]}),null);
});
test('dashboard rejects invalid or excessive repositories before GitHub calls',async()=>{
 for(const value of [['../../etc'],Array(6).fill(R),'x', ['octocat/private repo']])assert.throws(()=>dashboardRequest(value));
 let calls=0;
 await assert.rejects(()=>loadProDashboard('token',['other/private'],{
  list:async()=>({repos:[{full_name:R,default_branch:'main'}]}),fetchGithub:async()=>{calls++;return[];}
 }),e=>e.code==='DASHBOARD_REPOSITORY_DENIED');
 assert.equal(calls,0);
});
test('dashboard fetches read-only HEAD for authorized repos, including failure isolation',async()=>{
 const calls=[];
 const mock={list:async()=>({repos:[{full_name:R,default_branch:'main'},{full_name:R2,default_branch:'release/2'}]}),
 fetchGithub:async(_,path)=>{calls.push(path);if(path.includes('other-repo'))throw Error('Forbidden');return [{sha:'a'.repeat(40),commit:{message:'Pro release\nbody',committer:{date:'2026-10-14T09:00:00Z'}}}];}};
 const out=await loadProDashboard('test',[R,R2],mock);
 assert.equal(out.items.length,2);assert.equal(out.items[0].status,'ok');assert.equal(out.items[0].message,'Pro release');
 assert.equal(out.items[1].status,'error');
 assert.equal(calls.length,2);assert.ok(calls.every(x=>x.includes('/commits?sha=') && x.includes('per_page=1')));
 assert.equal(JSON.stringify(out).includes('token'),false);
});
test('Pro dashboard is authenticated through handle and has no direct GitHub credentials in client',()=>{
 const root=new URL('../',import.meta.url);
 const route=readFileSync(new URL('app/api/github/dashboard/route.js',root),'utf8');
 assert.match(route,/handle\(request/);assert.match(route,/loadProDashboard\(token, repositories\)/);
 const main=readFileSync(new URL('app/page.jsx',root),'utf8');
 for(const label of ['ProDashboard','PushProfiles','ActivityJournal','refreshDashboard','accountStorageKey','v3.8.4'])assert.ok(main.includes(label),label);
 assert.doesNotMatch(main,/GITHUB_APP_CLIENT_SECRET\s*=/);
});

test('Pro UI suppresses cached private repos when no longer in current grant list',()=>{
 const src=readFileSync(new URL('../app/components/ProDashboard.jsx',import.meta.url),'utf8');
 assert.match(src,/snapshot\?\.items/);
 assert.match(src,/filter\(item => repos\.some/);
 assert.match(src,/visibleItems\.map/);
});
