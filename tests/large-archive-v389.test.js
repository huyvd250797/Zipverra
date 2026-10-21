import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LIMITS,archiveCapacity} from '../lib/constants.js';
import {checkZipCandidate} from '../lib/workflow-ux.js';
import {openArchiveOffThread} from '../lib/archive-worker-client.js';
import {attestationExpiry,refreshExpiringAttestations} from '../lib/upload-batches.js';

const source=(p)=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const MiB=1024*1024;
const SH='a'.repeat(40);
const encodeProof=(exp)=>Buffer.from(JSON.stringify({v:1,exp})).toString('base64url')+'.signature';

test('v3.9.2 capacity profiles are explicit, bounded, and non-persistent',()=>{
  assert.deepEqual(archiveCapacity('standard'),{zipBytes:120*MiB,unpackedBytes:240*MiB});
  assert.deepEqual(archiveCapacity('extended'),{zipBytes:200*MiB,unpackedBytes:400*MiB});
  assert.equal(LIMITS.zipBytes,120*MiB);
  assert.equal(LIMITS.fileBytes,2_500_000);
  assert.equal(LIMITS.fileCount,2500);
  assert.equal(LIMITS.commitEntries,2500);
  assert.throws(()=>archiveCapacity('enterprise'),/không hợp lệ/);
  assert.ok(!source('app/page.jsx').includes('localStorage.setItem(\'archiveMode'));
});

test('120/121/199/200/201 MiB ZIP candidate boundaries are enforced',()=>{
  const zip=(n)=>({name:'source.zip',size:n*MiB});
  for(const n of [80,120])assert.equal(checkZipCandidate(zip(n),archiveCapacity('standard').zipBytes),null);
  assert.match(checkZipCandidate(zip(121),archiveCapacity('standard').zipBytes),/120 MiB/);
  for(const n of [121,199,200])assert.equal(checkZipCandidate(zip(n),archiveCapacity('extended').zipBytes),null);
  assert.match(checkZipCandidate(zip(201),archiveCapacity('extended').zipBytes),/200 MiB/);
});

test('archive reader preflights declared sizes and scans before transferring only metadata',()=>{
  const archive=source('lib/archive.js');
  assert.match(archive,/declaredTotal > capacity\.unpackedBytes/);
  assert.match(archive,/bytes > LIMITS\.fileBytes/);
  assert.match(archive,/scanSourceFile\(item\.path, data\)/);
  assert.match(archive,/await gitBlobSha\(data\)/);
  assert.match(archive,/metadataOnly\) metadata\.data = data/);
  assert.match(archive,/metadata\.packageDependencies/);
  assert.doesNotMatch(archive,/metadata\.manifestText/);
  assert.match(source('app/workers/archive.worker.js'),/metadataOnly:true/);
});

function fakeWorker({archive, bytesByPath={},errorOnRead=false}={}) {
  return {closed:false,messages:[],terminate(){this.closed=true},postMessage(msg){
    this.messages.push(msg);
    if(msg.type==='open')queueMicrotask(()=>{
      this.onmessage({data:{type:'progress',value:45}});
      this.onmessage({data:{type:'complete',archive}});
    });
    if(msg.type==='read')queueMicrotask(()=>this.onmessage({data:errorOnRead?
      {type:'fileError',id:msg.id,message:'checksum mismatch'}:
      {type:'file',id:msg.id,path:msg.path,bytes:bytesByPath[msg.path]}}));
  }};
}

test('open session reads file content on demand and releases Worker on close',async()=>{
  const archive={files:[{path:'a.js',sha:SH,bytes:2,mode:'100644'}],security:{findings:[]}};
  const worker=fakeWorker({archive,bytesByPath:{'a.js':new Uint8Array([1,2])}});
  const received=[];
  const session=await openArchiveOffThread({name:'x.zip',size:20},p=>received.push(p),()=>worker);
  assert.deepEqual(session.archive,archive);
  assert.deepEqual(received,[45]);
  assert.deepEqual(await session.getFile('a.js'),new Uint8Array([1,2]));
  assert.deepEqual(worker.messages.map(m=>m.type),['open','read']);
  session.close();
  assert.equal(worker.closed,true);
  await assert.rejects(session.getFile('a.js'),/đã đóng/);
});

test('Worker returns file failure without fallback to incorrect bytes',async()=>{
  const worker=fakeWorker({archive:{files:[]},errorOnRead:true});
  const session=await openArchiveOffThread({name:'x.zip',size:20},()=>{},()=>worker);
  await assert.rejects(session.getFile('x.js'),/checksum mismatch/);
  session.close();
});

test('large ZIP fails closed when Worker unsupported rather than processing 200 MiB on main thread',async()=>{
  await assert.rejects(openArchiveOffThread({name:'x.zip',size:150*MiB},()=>{},null,'extended'),/yêu cầu.*Web Worker/);
});

test('expiring or malformed attestation is recognized without trusting its signature',()=>{
  assert.equal(attestationExpiry(''),0);
  assert.equal(attestationExpiry('not-valid'),0);
  assert.equal(attestationExpiry(encodeProof(500_000)),500_000);
});

test('refreshes expiring proof by re-upload before Git write, keeps SHA and updates checkpoint',async()=>{
  const now=Date.now();
  const files=[{path:'a.js',sha:SH,bytes:8}];
  const attestations=new Map([['a.js',encodeProof(now+15_000)]]);
  const blobShas=new Map([['a.js',SH]]);
  const saved=[];
  const result=await refreshExpiringAttestations({changes:[{path:'a.js',kind:'add'}],files,attestations,blobShas,
    now:()=>now,upload:async()=>({sha:SH,proof:encodeProof(now+3_600_000)}),
    onCheckpoint:(path,v)=>saved.push([path,v])});
  assert.deepEqual(result,{refreshed:1,checked:1});
  assert.equal(saved.length,1);
  assert.equal(attestationExpiry(attestations.get('a.js')),now+3_600_000);
});

test('valid long-lived proof is reused; no new upload needed',async()=>{
  const now=Date.now();
  const files=[{path:'a.js',sha:SH,bytes:8}];
  let calls=0;
  const result=await refreshExpiringAttestations({changes:[{path:'a.js',kind:'add'}],files,
    attestations:new Map([['a.js',encodeProof(now+3_600_000)]]),blobShas:new Map([['a.js',SH]]),
    now:()=>now,upload:async()=>{calls++;return {}},minRemainingMs:120_000});
  assert.equal(result.refreshed,0);assert.equal(calls,0);
});

test('wrong SHA on renewed proof fails closed before commit',async()=>{
  const now=Date.now();
  const files=[{path:'a.js',sha:SH,bytes:8}];
  await assert.rejects(refreshExpiringAttestations({changes:[{path:'a.js',kind:'add'}],files,
    attestations:new Map(),blobShas:new Map([['a.js',SH]]),now:()=>now,
    upload:async()=>({sha:'b'.repeat(40),proof:encodeProof(now+3_600_000)})}),/Không thể gia hạn/);
});

test('long-running renewal rejects a proof that became short-lived before Commit',async()=>{
  const start=Date.now();let clock=start;
  const files=['a.js','b.js'].map(path=>({path,sha:SH,bytes:8}));
  const changes=files.map(x=>({path:x.path,kind:'add'}));
  await assert.rejects(refreshExpiringAttestations({changes,files,blobShas:new Map(files.map(x=>[x.path,x.sha])),
    attestations:new Map(),now:()=>clock,
    upload:async(src)=>{if(src.path==='b.js')clock+=3_580_000;return {sha:SH,proof:encodeProof(start+3_600_000)}}}),/hết hạn|gia hạn/);
});

test('UI obtains bytes only when necessary; existing GitHub server safety is unchanged',()=>{
  const page=source('app/page.jsx');
  assert.match(page,/await archiveSessionRef\.current\.getFile\(localFile\.path\)/);
  assert.match(page,/await archiveSessionRef\.current\.getFile\(source\.path\)/);
  assert.match(page,/refreshExpiringAttestations/);
  assert.match(page,/Tiếp tục · 200 MiB/);
  assert.match(page,/setArchiveMode\(capacityMode\)/);
  assert.match(page,/setConfirmed\(false\)/);
  assert.match(source('lib/source-security-server.js'),/verifyBlobAttestation/);
  assert.match(source('app/api/github/commit/route.js'),/assertSecureCommitEntries/);
});
