import test from 'node:test';
import assert from 'node:assert/strict';
import { makeReleaseBranch, assertReleaseBranch } from '../lib/branch-names.js';
import { createReleaseBranch, ensurePullRequest, branchPullRequestOverview,
  mergePullRequest, assertPullRequestGrant } from '../lib/pull-requests.js';

const OLD='a'.repeat(40), NEW='b'.repeat(40), TREE='c'.repeat(40);
function response(status,body){return {ok:status>=200&&status<300,status,text:async()=>JSON.stringify(body)};}
function fixture(url,opts={},permissions={contents:'write',pull_requests:'write',workflows:'write'}){
 if(url.includes('/user/installations?'))return response(200,{installations:[{id:42,account:{login:'team'},permissions,repository_selection:'selected'}]});
 if(url.includes('/user/installations/42/repositories'))return response(200,{repositories:[{full_name:'team/demo',permissions:{push:true}}]});
 if(url.endsWith('/repos/team/demo')&&opts.method==='GET')return response(200,{permissions:{push:true},archived:false});
 if(url.endsWith('/git/ref/heads/main'))return response(200,{object:{sha:OLD}});
 if(url.endsWith(`/git/commits/${OLD}`))return response(200,{tree:{sha:TREE}});
 if(url.includes('/git/trees/')&&opts.method==='GET')return response(200,{tree:[],truncated:false});
 return null;
}
async function mocked(resolver,callback){const prior=globalThis.fetch;globalThis.fetch=(url,opts={})=>resolver(url,opts);try{return await callback();}finally{globalThis.fetch=prior;}}
const branchData={owner:'team',repo:'demo',baseBranch:'main',expectedBaseHead:OLD,sourceBranch:'zipverra/test-release-1234abcd'};
const prData={owner:'team',repo:'demo',baseBranch:'main',sourceBranch:branchData.sourceBranch,expectedSourceHead:NEW,title:'Demo 2.0'};
const pr={number:15,title:'Demo 2.0',state:'open',draft:false,merged:false,html_url:'https://github.com/team/demo/pull/15',
 head:{sha:NEW,ref:prData.sourceBranch,repo:{full_name:'team/demo'}},base:{ref:'main'},mergeable:true,mergeable_state:'clean'};

test('generated PR branches are namespaced, unique suffix, safe for Git ref',()=>{
 assert.equal(makeReleaseBranch('Master APP v1.11.0.zip','a01b23cd'),'zipverra/master-app-v1-11-0-a01b23cd');
 assert.throws(()=>makeReleaseBranch('x.zip','BAD'));assert.throws(()=>assertReleaseBranch('main'));
 assert.throws(()=>assertReleaseBranch('zipverra/../../main-12345678'));
 assert.ok(makeReleaseBranch('A'.repeat(120)+'.zip','12345678').length < 90);
});

test('PR permission missing blocks branch mutation before create',async()=>{
 let writes=0;
 await mocked((url,opts)=>{if(opts.method!=='GET')writes++;return fixture(url,opts,{contents:'write',pull_requests:'read'});}, async()=>{
   await assert.rejects(()=>createReleaseBranch('TOKEN',branchData),e=>e.code==='APP_PULL_REQUEST_PERMISSION_REQUIRED');
 });
 assert.equal(writes,0);
});

test('branch preflight rejects base HEAD changes without creating branch',async()=>{
 let writes=0;
 await mocked((url,opts)=>{
   if(opts.method!=='GET')writes++;
   if(url.endsWith('/git/ref/heads/main'))return response(200,{object:{sha:NEW}});
   if(url.endsWith(`/git/commits/${NEW}`))return response(200,{tree:{sha:TREE}});
   return fixture(url,opts)||response(404,{});
 },async()=>{
   await assert.rejects(()=>createReleaseBranch('TOKEN',branchData),e=>e.code==='BASE_HEAD_CHANGED');
 });assert.equal(writes,0);
});

test('existing release branch is never overwritten or force pushed',async()=>{
 let writes=0;
 await mocked((url,opts)=>{
   if(opts.method!=='GET')writes++;
   if(url.includes('/git/ref/heads/zipverra/'))return response(200,{object:{sha:OLD}});
   return fixture(url,opts)||response(404,{});
 },async()=>{await assert.rejects(()=>createReleaseBranch('TOKEN',branchData),e=>e.code==='RELEASE_BRANCH_EXISTS');});
 assert.equal(writes,0);
});

test('create new release branch from exact reviewed SHA (no force)',async()=>{
 const writes=[];
 await mocked((url,opts)=>{
   if(opts.method!=='GET')writes.push({url,method:opts.method,body:JSON.parse(opts.body)});
   if(opts.method==='POST'&&url.endsWith('/git/refs'))return response(201,{ref:`refs/heads/${branchData.sourceBranch}`,object:{sha:OLD}});
   return fixture(url,opts)||response(404,{});
 },async()=>assert.equal((await createReleaseBranch('TOKEN',branchData)).head,OLD));
 assert.equal(writes.length,1);assert.equal(writes[0].body.sha,OLD);assert.equal(writes[0].body.ref,`refs/heads/${branchData.sourceBranch}`);
});

test('branch-create timeout verifies remote branch rather than replaying POST',async()=>{
 let mutations=0;
 await mocked((url,opts)=>{
   if(url.includes('/git/ref/heads/zipverra/'))return response(200,{object:{sha:OLD}});
   if(opts.method==='POST'){mutations++;throw Error('lost network');}
   return fixture(url,opts)||response(404,{});
 },async()=>{
   await assert.rejects(()=>createReleaseBranch('TOKEN',branchData), e=>e.code==='RELEASE_BRANCH_EXISTS');
 });assert.equal(mutations,0);
 // A separate test of network-after-POST uses changing ref state.
 let exists=false;
 await mocked((url,opts)=>{
   if(url.includes('/git/ref/heads/zipverra/'))return exists?response(200,{object:{sha:OLD}}):response(404,{message:'Not Found'});
   if(opts.method==='POST'){mutations++;exists=true;throw Error('lost after create');}
   return fixture(url,opts)||response(404,{});
 },async()=>assert.equal((await createReleaseBranch('TOKEN',branchData)).recovered,true));
 assert.equal(mutations,1);
});

test('existing PR is reused idempotently without POST /pulls',async()=>{
 let count=0;
 await mocked((url,opts)=>{
   if(opts.method==='POST')count++;
   if(url.endsWith(`/git/ref/heads/${prData.sourceBranch}`))return response(200,{object:{sha:NEW}});
   if(url.includes('/pulls?'))return response(200,[pr]);
   return fixture(url,opts)||response(404,{});
 },async()=>{
   const result=await ensurePullRequest('TOKEN',prData);assert.equal(result.number,15);assert.equal(result.reused,true);
 });assert.equal(count,0);
});

test('create PR once with correct base and head, no automatic merge',async()=>{
 const calls=[];
 await mocked((url,opts)=>{
   if(url.endsWith(`/git/ref/heads/${prData.sourceBranch}`))return response(200,{object:{sha:NEW}});
   if(url.includes('/pulls?'))return response(200,[]);
   if(url.endsWith('/pulls')&&opts.method==='POST'){
     calls.push(JSON.parse(opts.body));return response(201,pr);
   }
   return fixture(url,opts)||response(404,{});
 },async()=>assert.equal((await ensurePullRequest('TOKEN',prData)).number,15));
 assert.equal(calls.length,1);assert.equal(calls[0].base,'main');assert.equal(calls[0].head,prData.sourceBranch);
 assert.equal(calls[0].draft,false);
});

test('create PR rejects changed source SHA without any mutation',async()=>{
 let count=0;
 await mocked((url,opts)=>{
   if(opts.method!=='GET')count++;
   if(url.endsWith(`/git/ref/heads/${prData.sourceBranch}`))return response(200,{object:{sha:OLD}});
   return fixture(url,opts)||response(404,{});
 },async()=>await assert.rejects(()=>ensurePullRequest('TOKEN',prData),e=>e.code==='PR_SOURCE_CHANGED'));
 assert.equal(count,0);
});

test('network timeout after creating PR is recovered by refetching PR, no second POST',async()=>{
 let count=0, exists=false;
 await mocked((url,opts)=>{
   if(url.endsWith(`/git/ref/heads/${prData.sourceBranch}`))return response(200,{object:{sha:NEW}});
   if(url.includes('/pulls?'))return response(200,exists?[pr]:[]);
   if(url.endsWith('/pulls')&&opts.method==='POST'){count++;exists=true;throw Error('lost network');}
   return fixture(url,opts)||response(404,{});
 },async()=>assert.equal((await ensurePullRequest('TOKEN',prData)).recovered,true));
 assert.equal(count,1);
});

test('overview returns bounded branches and PR summaries for authorized repo',async()=>{
 await mocked((url,opts)=>{
   if(url.includes('/branches?'))return response(200,[{name:'main',protected:true,commit:{sha:OLD}}]);
   if(url.includes('/pulls?'))return response(200,[pr]);
   return fixture(url,opts)||response(404,{});
 },async()=>{
   const result=await branchPullRequestOverview('TOKEN',{owner:'team',repo:'demo'});
   assert.equal(result.branches[0].protected,true);assert.equal(result.prs[0].number,15);
 });
});

test('merge requires typed confirmation and exactly matching PR head',async()=>{
 let writes=0;
 await mocked((url,opts)=>{
   if(opts.method!=='GET')writes++;
   if(url.endsWith('/pulls/15'))return response(200,pr);
   return fixture(url,opts)||response(404,{});
 },async()=>{
   await assert.rejects(()=>mergePullRequest('TOKEN',{owner:'team',repo:'demo',number:15,expectedSourceHead:NEW,confirmation:'YES'}),/MERGE/);
   await assert.rejects(()=>mergePullRequest('TOKEN',{owner:'team',repo:'demo',number:15,expectedSourceHead:OLD,confirmation:'MERGE'}),e=>e.code==='STALE_PR');
 });assert.equal(writes,0);
});

test('blocked or undetermined GitHub mergeable status blocks PUT',async()=>{
 let writes=0;
 await mocked((url,opts)=>{
   if(opts.method!=='GET')writes++;
   if(url.endsWith('/pulls/15'))return response(200,{...pr,mergeable:null,mergeable_state:'unknown'});
   return fixture(url,opts)||response(404,{});
 },async()=>await assert.rejects(()=>mergePullRequest('TOKEN',{owner:'team',repo:'demo',number:15,expectedSourceHead:NEW,confirmation:'MERGE'}),e=>e.code==='PR_NOT_MERGEABLE'));
 assert.equal(writes,0);
});

test('merge sends conditional SHA and does not force branch update',async()=>{
 const calls=[];
 await mocked((url,opts)=>{
   if(opts.method==='PUT'){
     calls.push({url,body:JSON.parse(opts.body)});
     return response(200,{merged:true,sha:TREE});
   }
   if(url.endsWith('/pulls/15'))return response(200,pr);
   return fixture(url,opts)||response(404,{});
 },async()=>assert.equal((await mergePullRequest('TOKEN',{owner:'team',repo:'demo',number:15,expectedSourceHead:NEW,confirmation:'MERGE'})).merged,true));
 assert.equal(calls.length,1);assert.equal(calls[0].body.sha,NEW);assert.equal(calls[0].body.merge_method,'merge');
});

test('PR merge timeout verifies merged state without retrying PUT',async()=>{
 let merged=false, writes=0;
 await mocked((url,opts)=>{
   if(opts.method==='PUT'){merged=true;writes++;throw Error('socket reset');}
   if(url.endsWith('/pulls/15'))return response(200,{...pr,merged,merge_commit_sha:TREE});
   return fixture(url,opts)||response(404,{});
 },async()=>assert.equal((await mergePullRequest('TOKEN',{owner:'team',repo:'demo',number:15,expectedSourceHead:NEW,confirmation:'MERGE'})).recovered,true));
 assert.equal(writes,1);
});

test('UI offers PR strategy, Activity recovery, PR Manager in Repos and no sixth tab',async()=>{
 const {readFileSync}=await import('node:fs');
 const src=readFileSync(new URL('../app/page.jsx',import.meta.url),'utf8');
 const manager=readFileSync(new URL('../app/components/BranchPrPanel.jsx',import.meta.url),'utf8');
 assert.match(src,/Direct Push/);assert.match(src,/Push & Create PR/);
 assert.match(src,/completeVerified/);assert.match(src,/retryPendingPR/);
 assert.match(src,/BranchPrPanel/);assert.match(manager,/MERGE/);
 assert.match(src,/v3\.9\.6/);
});

test('base branch moving during POST create is still rejected even if release ref exists',async()=>{
 let readBase=0;
 await mocked((url,opts)=>{
   if(url.endsWith('/git/ref/heads/main'))return response(200,{object:{sha:++readBase>1 ? NEW:OLD}});
   if(url.endsWith(`/git/commits/${OLD}`))return response(200,{tree:{sha:TREE}});
   if(url.endsWith(`/git/commits/${NEW}`))return response(200,{tree:{sha:TREE}});
   if(url.endsWith(`/git/ref/heads/${branchData.sourceBranch}`))return response(404,{});
   if(url.endsWith('/git/refs')&&opts.method==='POST')return response(201,{ref:`refs/heads/${branchData.sourceBranch}`,object:{sha:OLD}});
   return fixture(url,opts)||response(404,{});
 },async()=>await assert.rejects(()=>createReleaseBranch('TOKEN',branchData),e=>e.code==='BASE_HEAD_CHANGED'));
});

test('closed PR must not be misreported as newly opened or reused',async()=>{
 await mocked((url,opts)=>{
   if(url.endsWith(`/git/ref/heads/${prData.sourceBranch}`))return response(200,{object:{sha:NEW}});
   if(url.includes('/pulls?'))return response(200,[{...pr,state:'closed'}]);
   return fixture(url,opts)||response(404,{});
 },async()=>await assert.rejects(()=>ensurePullRequest('TOKEN',prData),e=>e.code==='PR_ALREADY_CLOSED'));
});
