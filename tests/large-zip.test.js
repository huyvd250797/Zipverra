import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LIMITS } from '../lib/constants.js';
import { manifestFingerprint, validatedCheckpoint, makeCheckpoint, uploadBlobsInBatches } from '../lib/upload-batches.js';
import { readArchiveOffThread } from '../lib/archive-worker-client.js';

const SHA1 = 'a'.repeat(40), SHA2 = 'b'.repeat(40), SHA3 = 'c'.repeat(40);
const file = (path, sha) => ({ path, sha, data: new Uint8Array([1]), bytes: 1 });
const files = [file('a.txt', SHA1), file('b.txt', SHA2), file('c.txt', SHA3)];
const changes = files.map(f => ({ path:f.path,kind:'add',mode:'100644' }));

const base = { owner: 'test', repo:'repo', branch:'main', head:SHA1, mode:'merge', changes, files };

test('v1.7 ZIP total expanded while each Git blob remains under Vercel request limit', () => {
  assert.equal(LIMITS.zipBytes, 120 * 1024 * 1024);
  assert.equal(LIMITS.unpackedBytes, 240 * 1024 * 1024);
  assert.equal(LIMITS.fileCount, 2500);
  assert.equal(LIMITS.archiveMembers, 10000);
  assert.equal(LIMITS.fileBytes, 2_500_000);
  assert.equal(LIMITS.commitEntries, 2500);
});

test('manifest fingerprint includes branch, HEAD, mode and actual content SHAs', async () => {
  const fp = await manifestFingerprint(base);
  assert.match(fp, /^[a-f0-9]{64}$/);
  for(const difference of [{ head:SHA2 }, { branch:'dev' },{mode:'sync'}, {files:[file('a.txt',SHA2),...files.slice(1)]}]) {
    assert.notEqual(await manifestFingerprint({...base, ...difference}),fp);
  }
});

test('checkpoint is scoped, time-limited and SHA-validated', async () => {
  const fp = await manifestFingerprint(base);
  const now = Date.now();
  const stored = makeCheckpoint(fp, {'a.txt':SHA1, 'b.txt':'invalid', 'not-in-source':SHA2},now);
  assert.deepEqual(validatedCheckpoint(stored,fp,changes,now),{'a.txt':SHA1});
  assert.deepEqual(validatedCheckpoint(stored,fp+'x',changes,now),{});
  assert.deepEqual(validatedCheckpoint(stored,fp,changes,now+25*60*60*1000),{});
  assert.deepEqual(validatedCheckpoint({...stored, timestamp:now+999999999},fp,changes,now),{});
});

test('bounded batch upload resumes verified blobs without re-upload and checkpoints progress', async () => {
  let calls = [], checkpoints = [], progresses = [];
  const outcome = await uploadBlobsInBatches({changes,files,existing:{'a.txt':SHA1},concurrency:2,batchSize:2,
    upload:async source => {calls.push(source.path);return source.sha},
    onCheckpoint: v=>checkpoints.push(v),onProgress:p=>progresses.push(p)});
  assert.deepEqual(calls.sort(),['b.txt','c.txt']);
  assert.equal(outcome.reused,1);
  assert.equal(outcome.completed,3);
  assert.equal(outcome.blobShas.get('a.txt'),SHA1);
  assert.equal(checkpoints.length,2);
  assert.equal(progresses.at(-1).completed,3);
  assert.equal(progresses[0].reused,1);
});

test('file paths matching Object prototype keys do not bypass upload', async () => {
  const tricky = [file('constructor', SHA1),file('__proto__',SHA2),file('toString',SHA3)];
  const tracked = [];
  const outcome = await uploadBlobsInBatches({changes:tricky.map(f=>({path:f.path,kind:'add'})),files:tricky,
    upload:async f=>{tracked.push(f.path);return f.sha}});
  assert.deepEqual(tracked.sort(),['__proto__','constructor','toString'].sort());
  assert.equal(outcome.blobShas.get('__proto__'),SHA2);
});

test('failed batch will not create a commit; progress can be resumed safely', async () => {
  const saved = {};
  let called = [];
  await assert.rejects(uploadBlobsInBatches({changes,files,concurrency:1,batchSize:2,
    upload:async src=> {called.push(src.path); if(src.path==='b.txt')throw Error('network');return src.sha},
    onCheckpoint:done=>Object.assign(saved,done)}), /network/);
  assert.deepEqual(saved,{'a.txt':SHA1});
  called=[];
  const result = await uploadBlobsInBatches({changes,files,existing:saved,concurrency:1,batchSize:2,
    upload:async src=> {called.push(src.path);return src.sha}});
  assert.deepEqual(called,['b.txt','c.txt']);
  assert.equal(result.completed,3);
});

test('wrong SHA is rejected and cannot be checkpointed', async () => {
  let saved = null;
  await assert.rejects(uploadBlobsInBatches({changes:[changes[0]],files,upload:async()=>SHA2,
    onCheckpoint:v=>saved=v}), /SHA không khớp/);
  assert.equal(saved,null);
});

test('Web Worker client streams progress and terminates when complete', async () => {
  let worker, progress=[];
  const archive = {files:[file('a.txt',SHA1)],unpackedSize:1};
  const promise = readArchiveOffThread({name:'demo.zip'},n=>progress.push(n),()=>{
    worker={terminated:false,terminate(){this.terminated=true},postMessage(){queueMicrotask(()=>{
      this.onmessage({data:{type:'progress',value:55}});
      this.onmessage({data:{type:'complete',archive}});
    })}};
    return worker;
  },async()=>{throw Error('fallback unexpectedly called')});
  assert.deepEqual(await promise,archive);
  assert.deepEqual(progress,[55]);
  assert.equal(worker.terminated,true);
});

test('Web Worker error does not silently fall back and mask a corrupt archive', async () => {
  const p=readArchiveOffThread({name:'x.zip'},()=>{},()=>({postMessage(){queueMicrotask(()=>this.onmessage({data:{type:'error',message:'malformed ZIP'}}))},terminate(){}}),async()=>({}));
  await assert.rejects(p,/malformed ZIP/);
});

test('workflow is repo → ZIP → analysis → confirmation → auto Activity; App Access in Settings', () => {
  const page=readFileSync(new URL('../app/page.jsx',import.meta.url),'utf8');
  const css=readFileSync(new URL('../app/globals.css',import.meta.url),'utf8');
  assert.match(page,/useState\('home'\)/); // v3.9.4 opens directly in Upload; GitHub login is still explicit
  assert.match(page,/goToTab\('home'\)/);
  assert.match(page,/goToTab\('activity'\)/);
  assert.match(page,/openArchiveOffThread/);
  assert.match(page,/uploadBlobsInBatches/);
  assert.match(page,/data-mobile-view="settings"/);
  assert.equal((page.match(/GitHub Account & App Access/g)||[]).length,1);
  assert.doesNotMatch(page,/Upload ZIP do ChatGPT tạo, chọn repo và branch/);
  assert.match(page,/disabled=\{busy \|\| !chosenRepo\}/);
  assert.match(css,/\.workflow-strip/);
  assert.match(css,/safe-area-inset-bottom/);
});
