import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { signJobReceipt,verifyJobReceipt,pushJobToken } from '../lib/background-job.js';
import { validSavedJob, BACKGROUND_JOB_KEY } from '../lib/background-job-client.js';
const read = name => readFileSync(new URL(`../${name}`, import.meta.url),'utf8');
const env={SESSION_SECRET:'test-secret-with-much-more-than-32-characters-aaaaaaaaaaa'};
const session={user:{id:101,login:'qa-account'}};
const data={owner:'example',repo:'test-repository',branch:'main',expectedHead:'a'.repeat(40),message:'Update ZIP',
  entries:[{path:'src/app.js',sha:'b'.repeat(40),mode:'100644'}]};
const runId='run_1234567890abcdef';
test('server receipt verifies same account and cannot be forged by another GitHub user',()=>{
 const receipt=signJobReceipt(runId,data,session,env,1000);
 assert.deepEqual(verifyJobReceipt(runId,receipt,session,env,2000),{owner:data.owner,repo:data.repo,branch:data.branch});
 assert.equal(verifyJobReceipt(runId,receipt,{user:{id:202}},env,2000),null);
 assert.equal(verifyJobReceipt('run_different123456',receipt,session,env,2000),null);
 assert.equal(verifyJobReceipt(runId,`${receipt.slice(0,-1)}x`,session,env,2000),null);
 assert.equal(verifyJobReceipt(runId,receipt,session,env,1000+8*86400000),null);
});
test('server job idempotency binds user, target HEAD, changes, mode, and PR request',()=>{
 const a=pushJobToken(data,session);
 assert.equal(pushJobToken({...data},session),a);
 assert.notEqual(pushJobToken(data,{user:{id:202}}),a);
 assert.notEqual(pushJobToken({...data,expectedHead:'c'.repeat(40)},session),a);
 assert.notEqual(pushJobToken({...data,entries:[{path:'src/app.js',sha:'d'.repeat(40),mode:'100644'}]},session),a);
 assert.notEqual(pushJobToken({...data,allowSensitiveCommit:true},session),a);
 assert.notEqual(pushJobToken({...data,prRequest:{owner:data.owner,repo:data.repo,sourceBranch:'zipverra/test-12345678',baseBranch:'main',title:'Release'}},session),a);
});
test('client stores job references, never GitHub credentials or ZIP contents',()=>{
 const receipt=signJobReceipt(runId,data,session,env,1000);
 assert.equal(validSavedJob({runId,receipt,repo:'example/test-repository',branch:'main'}),true);
 assert.equal(validSavedJob({runId:'',receipt,repo:'example/test-repository',branch:'main'}),false);
 assert.equal(validSavedJob({runId,receipt:'bad',repo:'example/test-repository',branch:'main'}),false);
 assert.equal(BACKGROUND_JOB_KEY,'zipverra.background.push.v1');
});
test('Next.js integrates Workflow SDK and server start uses atomic idempotent hook',()=>{
 assert.match(read('next.config.mjs'),/withWorkflow\(nextConfig\)/);
 assert.match(read('package.json'),/"workflow": "\^5\.4\.0"/);
 const api=read('app/api/github/background-push/start/route.js');
 assert.match(api,/assertSecureCommitEntries\(data,session\)/);
 assert.match(api,/experimental_hook:\{token:jobToken/);
 assert.match(api,/HookConflictError\.is\(error\)/);
 assert.match(api,/encodeSession\(session\)/);
 assert.doesNotMatch(api,/const\s+token\s*=\s*data\.token/);
});
test('background workflow keeps server-side scan, performs one GitHub mutation, resolves ambiguous outcomes read-only',()=>{
 const workflow=read('workflows/background-push.js');
 assert.match(workflow,/'use workflow'/);
 assert.match(workflow,/'use step'/);
 assert.match(workflow,/assertSecureCommitEntries\(data,session\)/);
 assert.match(workflow,/await createCommit\(token,data\)/);
 assert.match(workflow,/await verifyPush\(token,data\)/);
 assert.match(workflow,/await ensurePullRequest\(token,prData\)/);
 assert.doesNotMatch(workflow,/return\s+\{state:'succeeded',outcome\};\s*catch/);
});
test('status endpoint requires signed account-bound receipt before reading workflow run',()=>{
 const api=read('app/api/github/background-push/status/route.js');
 assert.ok(api.indexOf('verifyJobReceipt(') < api.indexOf('getRun(data.runId)'));
 assert.match(api,/await run\.status/);
 assert.match(api,/status==='completed'/);
});
test('UI only claims background execution after staging upload and server acknowledgment',()=>{
 const ui=read('app/page.jsx');
 const upload=ui.indexOf('const { blobShas, attestations, reused } = await uploadBlobsInBatches');
 const proof=ui.indexOf('await refreshExpiringAttestations');
 const start=ui.indexOf("requestOnce('background-push/start', commitPayload)");
 const persist=ui.lastIndexOf('saveBackgroundJob(job)');
 assert.ok(upload>0 && proof>upload && start>proof && persist>start);
 assert.match(ui,/setBackgroundJob\(job\)/);
 assert.match(ui,/requestOnce\('background-push\/status'/);
 assert.match(ui,/document\.addEventListener\('visibilitychange',onVisible\)/);
 assert.match(ui,/Không Push lại khi job đang chạy/);
 assert.match(ui,/Cần giữ ứng dụng mở khi tải file lên GitHub/);
 assert.match(ui,/validJournal\(stored\.journal\)/);
 assert.match(ui,/if \(backgroundJob \|\| \(!busy && !workspaceDirty\)\) return/);
});
