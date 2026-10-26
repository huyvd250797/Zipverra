import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { LIMITS } from '../lib/constants.js';
import { scanSourceFile } from '../lib/source-security.js';
import { createLargeBlobTicket, verifyLargeBlobTicket } from '../lib/large-blob-ticket.js';
import { secureLargeBlobFinalize, readBoundedPrivateBlob } from '../lib/large-blob-finalize.js';
import { cleanupOrphanedLargeBlobs, LARGE_BLOB_RETENTION_MS } from '../lib/large-blob-cleanup.js';
const read=file=>readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const env={SESSION_SECRET:'a'.repeat(64)};
const user={user:{id:103}};
const other={user:{id:104}};
const data=Buffer.from('hello world');
const largeData=Buffer.concat([data,Buffer.alloc(LIMITS.directFileBytes+1)]);
const sha=buffer=>createHash('sha1').update(`blob ${buffer.length}\0`).update(buffer).digest('hex');
function ticket(bytes=largeData,now=Date.now()) {return createLargeBlobTicket({owner:'boss',repo:'project',branch:'main',path:'src/large.bin',sha:sha(bytes),bytes:bytes.length},user,env,now);}
const stream=bytes=>new ReadableStream({start(controller){controller.enqueue(bytes);controller.close();}});

test('large file policy is 20 MiB with a Vercel-compatible 3 MB direct threshold',()=>{
  assert.equal(LIMITS.fileBytes,20*1024*1024);
  assert.equal(LIMITS.directFileBytes,3_000_000);
  assert.equal(4*Math.ceil(LIMITS.directFileBytes/3)<4_500_000,true);
  assert.equal(scanSourceFile('src/large.bin',new Uint8Array(LIMITS.fileBytes)).length>0,true);
});
test('tickets are bound to authenticated GitHub ID, exact repo/path/SHA/size and pathname',()=>{
  const input=ticket(largeData,1_000_000);
  assert.equal(verifyLargeBlobTicket(input.ticket,user,input.pathname,env,1_000_001).bytes,largeData.length);
  assert.throws(()=>verifyLargeBlobTicket(input.ticket,other,input.pathname,env,1_000_001));
  assert.throws(()=>verifyLargeBlobTicket(input.ticket,user,input.pathname+'-wrong',env,1_000_001));
  assert.throws(()=>verifyLargeBlobTicket(input.ticket,user,input.pathname,env,1_900_001));
  assert.throws(()=>verifyLargeBlobTicket(input.ticket+'x',user,input.pathname,env,1_000_001));
});
test('ticket never allows small files, files over 20 MiB or unsafe source path',()=>{
  const input={owner:'boss',repo:'project',branch:'main',path:'src/a.bin',sha:sha(largeData),bytes:0};
  for(const size of [0,1,LIMITS.directFileBytes,LIMITS.fileBytes+1]){
    assert.throws(()=>createLargeBlobTicket({...input,bytes:size},user,env));
  }
  assert.throws(()=>createLargeBlobTicket({...input,bytes:largeData.length,path:'../.env'},user,env));
});
test('private blob reader uses bounded streaming, rejecting more than max bytes',async()=>{
  assert.deepEqual(await readBoundedPrivateBlob('abc',{getBlob:async()=>({statusCode:200,stream:stream(data),blob:{size:data.length}}),maxBytes:200}),data);
  await assert.rejects(readBoundedPrivateBlob('abc',{getBlob:async()=>({statusCode:200,stream:stream(data)}),maxBytes:2}),/giới hạn/);
});
test('finalization validates SHA, scans server-side, signs proof and deletes private temp',async()=>{
  const now=Date.now();const t=ticket();let created=0,deleted=0;
  const res=await secureLargeBlobFinalize('mock',{...t,allowSensitiveUpload:true},user,{
    getBlob:async()=>({statusCode:200,stream:stream(largeData),blob:{size:largeData.length}}),
    deleteBlob:async()=>{deleted++},env,uploadBlob:async(token,owner,repo,base64)=>{created++;assert.equal(Buffer.from(base64,'base64').length,largeData.length);return sha(largeData)}
  });
  assert.equal(res.sha,sha(largeData));assert.ok(res.proof.includes('.'));assert.equal(created,1);assert.equal(deleted,1);
});
test('finalization rejects tampered blob BEFORE any GitHub write, still cleans temporary blob',async()=>{
  const t=ticket();let created=0,deleted=0;
  await assert.rejects(secureLargeBlobFinalize('mock',{...t},user,{
    getBlob:async()=>({statusCode:200,stream:stream(Buffer.from('hacked'))}),
    deleteBlob:async()=>{deleted++},env,uploadBlob:async()=>{created++;return sha(largeData)}
  }),/khớp/);
  assert.equal(created,0);assert.equal(deleted,1);
});
test('private blob transport is the only path for >3 MB; no unauthenticated token endpoints',()=>{
  const page=read('app/page.jsx');
  const route=read('app/api/large-upload/route.js');
  const finalize=read('app/api/github/large-blob/finalize/route.js');
  const ticketRoute=read('app/api/github/large-blob/ticket/route.js');
  assert.match(page,/LIMITS\.directFileBytes/);
  assert.match(page,/uploadLargeSourceFile/);
  assert.match(route,/resolveAppSession\(request\)/);
  assert.match(route,/checkOrigin\(request\)/);
  assert.match(ticketRoute,/handle\(request/);
  assert.match(finalize,/handle\(request/);
  assert.doesNotMatch(page,/NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN/);
});
test('desktop has a persistent phase progress surface without changing mobile design',()=>{
  const page=read('app/page.jsx'),css=read('app/styles/large-upload-progress-v3915.css');
  assert.match(page,/<DesktopOperationProgress/);
  assert.match(css,/@media \(min-width:761px\)/);
  assert.match(css,/display:none/);
  assert.match(read('app/components/DesktopOperationProgress.jsx'),/role="progressbar"/);
});

test('cleanup only deletes the expired Zipverra private uploads, never other stores or active files',async()=>{
  const now=Date.now(),removed=[];
  const input=[
    {pathname:'zipverra-large/103/abc',uploadedAt:new Date(now-LARGE_BLOB_RETENTION_MS-2)},
    {pathname:'zipverra-large/103/fresh',uploadedAt:new Date(now-1000)},
    {pathname:'unrelated/private',uploadedAt:new Date(now-LARGE_BLOB_RETENTION_MS*10)},
  ];
  const report=await cleanupOrphanedLargeBlobs({list:async()=>({blobs:input,hasMore:false}),del:async path=>removed.push(path),now});
  assert.deepEqual(removed,['zipverra-large/103/abc']);
  assert.equal(report.deleted,1);
});

test('maximum 20 MiB blob remains SHA-bound and finalizes safely',async()=>{
  const bytes=Buffer.alloc(LIMITS.fileBytes,0); const t=ticket(bytes);let writes=0;
  const outcome=await secureLargeBlobFinalize('mock',{...t},user,{env,
    getBlob:async()=>({statusCode:200,stream:stream(bytes),blob:{size:bytes.length}}),
    deleteBlob:async()=>{},uploadBlob:async(_,__,___,base64)=>{writes++;return sha(Buffer.from(base64,'base64'))}
  });
  assert.equal(writes,1);assert.equal(outcome.sha,sha(bytes));
});
