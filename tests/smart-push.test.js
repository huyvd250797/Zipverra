import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyzeSource, detectProjectType, selectChanges, toggleExcluded, filterReview,
 sortedRepositories, updateFavorites, decodePreview, makeLineDiff, transferEstimate, isTextPreviewable } from '../lib/smart-push.js';
import { uploadBlobsInBatches, manifestFingerprint } from '../lib/upload-batches.js';
import { readReviewedText } from '../lib/github.js';

const SHA = 'a'.repeat(40),COMMIT='b'.repeat(40), TREE='c'.repeat(40);
const f=(path, content='') => ({ path, data: new TextEncoder().encode(content), bytes:new TextEncoder().encode(content).length, sha:SHA });
const changes=[{path:'README.md',kind:'modify',bytes:10,mode:'100644'},
 {path:'src/app.js',kind:'add',bytes:12,mode:'100644'},
 {path:'old.json',kind:'delete',bytes:0,mode:'100644'},
 {path:'.github/workflows/ci.yml',kind:'modify',bytes:30,mode:'100644'}];

test('exclusions protect every kind of change (including Sync deletions)',()=>{
 const excluded=['src/app.js','old.json'];
 assert.deepEqual(selectChanges(changes,excluded).map(c=>c.path),['README.md','.github/workflows/ci.yml']);
 assert.deepEqual(selectChanges(changes,changes.map(c=>c.path)),[]);
 assert.deepEqual(selectChanges(changes,[]),changes);
 assert.deepEqual(toggleExcluded(changes,[],'old.json'),['old.json']);
 assert.deepEqual(toggleExcluded(changes,['old.json'],'old.json'),[]);
 assert.deepEqual(toggleExcluded(changes,[],'nonexistent'),[]);
});

test('review filter combines type and case-insensitive file search',()=>{
 assert.deepEqual(filterReview(changes,'add','APP').map(c=>c.path),['src/app.js']);
 assert.deepEqual(filterReview(changes,'delete','').map(c=>c.path),['old.json']);
 assert.equal(filterReview(changes,'modify','readme').length,1);
});

test('detect source framework by manifests and files; warn on config and sync',()=>{
 const nextFiles=[f('package.json',JSON.stringify({dependencies:{next:'16',react:'19'}})),f('README.md','a'),f('public/logo.png','file')];
 assert.equal(detectProjectType(nextFiles).type,'Next.js');
 assert.equal(detectProjectType([f('index.html','<html/>')]).type,'Static website');
 assert.equal(detectProjectType([f('requirements.txt','pytest')]).type,'Python');
 assert.equal(detectProjectType([f('package.json','{ invalid }')]).packageValid,false);
 const result=analyzeSource({files:nextFiles,changes,ignored:2,ignoredPaths:['node_modules/x','dist/index.js'],wrapper:'wrapped'});
 assert.equal(result.framework.type,'Next.js');
 assert.deepEqual(result.warnings.map(x=>x.code),['WRAPPER','IGNORED','WORKFLOWS','CONFIG','DELETIONS']);
 assert.equal(result.binaryCount,1);
 assert.equal(result.hasBlockingWarning,false);
});

test('heuristic known sensitive credentials blocks the preview before push',()=>{
 const check=analyzeSource({files:[f('src/private.pem','PRIVATE DATA')],changes:[]});
 assert.equal(check.hasBlockingWarning,true);
 assert.equal(check.warnings.some(x=>x.code==='SECRET_FILE'),true);
});

test('favorites are validated, sorted first and can be removed',()=>{
 const favorites=updateFavorites([],'one/a');
 assert.deepEqual(favorites,['one/a']);
 assert.deepEqual(updateFavorites(favorites,'one/a'),[]);
 assert.deepEqual(updateFavorites(favorites,'../../etc'),favorites);
 const data=[{full_name:'zero/z'},{full_name:'one/a'},{full_name:'two/x'}];
 assert.deepEqual(sortedRepositories(data,['two/x'],['one/a']).map(r=>r.full_name),['two/x','one/a','zero/z']);
 assert.deepEqual(data.map(r=>r.full_name),['zero/z','one/a','two/x']);
});

test('text preview rejects binary, control bytes and oversized files',()=>{
 assert.equal(decodePreview(new Uint8Array([0,3])),null);
 assert.equal(decodePreview(new TextEncoder().encode('a\n🧪')), 'a\n🧪');
 assert.equal(decodePreview(new Uint8Array(65*1024)),null);
 assert.equal(isTextPreviewable({path:'src/ui.jsx',bytes:10}),true);
 assert.equal(isTextPreviewable({path:'private.p8',bytes:10}),false);
 assert.equal(isTextPreviewable({path:'icon.woff2',bytes:10}),false);
});

test('bounded LCS text diff reports insertions, deletions and stops on huge inputs',()=>{
 const result=makeLineDiff('old\nkeep','new\nkeep');
 assert.equal(result.truncated,false);
 assert.equal(result.lines.filter(l=>l.kind==='add').map(l=>l.text).join(''),'new');
 assert.equal(result.lines.filter(l=>l.kind==='delete').map(l=>l.text).join(''),'old');
 const huge=makeLineDiff('x\n'.repeat(330),'small');
 assert.equal(huge.truncated,true);
});

test('transfer telemetry estimates rate and ETA safely',()=>{
 const e=transferEstimate(2500,10000,1000);
 assert.equal(e.speedBytesPerSec,2500);
 assert.equal(e.etaSeconds,3);
 assert.equal(transferEstimate(0,1000,0).etaSeconds,null);
});

test('selected changes alone determine fingerprint and uploaded blob list',async()=>{
 const data=[{path:'a.txt',sha:SHA,data:new Uint8Array(1),bytes:1},{path:'b.txt',sha:SHA,data:new Uint8Array(1),bytes:1}];
 const c=[{path:'a.txt',kind:'add',mode:'100644'},{path:'b.txt',kind:'add',mode:'100644'}];
 const only=selectChanges(c,['b.txt']);
 const params={owner:'demo',repo:'source',branch:'main',head:SHA,mode:'merge',files:data};
 assert.notEqual(await manifestFingerprint({...params,changes:c}),await manifestFingerprint({...params,changes:only}));
 const calls=[],updates=[];
 const uploaded=await uploadBlobsInBatches({changes:only,files:data,upload:async f=>{calls.push(f.path);return f.sha},onProgress:p=>updates.push(p)});
 assert.deepEqual(calls,['a.txt']);
 assert.equal(uploaded.blobShas.has('b.txt'),false);
 assert.equal(updates.at(-1).totalBytes,1);
 assert.equal(updates.at(-1).uploadedBytes,1);
});

function mockReply(status,body){return {ok:status>=200&&status<300,status,text:async()=>JSON.stringify(body)};}
function stubGithub(getTree,blobData){return async(url,opts)=>{
 if(url.includes('/git/ref/heads/'))return mockReply(200,{object:{sha:COMMIT}});
 if(url.includes('/git/commits/'))return mockReply(200,{tree:{sha:TREE}});
 if(url.includes('/git/trees/'))return mockReply(200,{truncated:false,tree:getTree});
 if(url.includes('/git/blobs/'))return mockReply(200,blobData);
 return mockReply(404,{message:'not found'});
};}

test('read-only remote diff can fetch text only present at reviewed HEAD',async()=>{
 const old=globalThis.fetch;
 const bytes=Buffer.from('first line\nsecond line');
 const blob={sha:SHA,size:bytes.length,encoding:'base64',content:bytes.toString('base64')};
 const list=[{type:'blob',path:'src/readme.txt',sha:SHA,mode:'100644'}];
 globalThis.fetch=stubGithub(list,blob);
 try{
  assert.deepEqual(await readReviewedText('TOKEN','team','demo','main',COMMIT,'src/readme.txt'),{available:true,content:bytes.toString()});
  assert.equal((await readReviewedText('TOKEN','team','demo','main',COMMIT,'secret.txt')).available,false);
  await assert.rejects(readReviewedText('TOKEN','team','demo','main','d'.repeat(40),'src/readme.txt'),e=>e.status===409);
 } finally {globalThis.fetch=old;}
});

test('remote text preview refuses oversized blobs and invalid encodings',async()=>{
 const old=globalThis.fetch;
 const list=[{type:'blob',path:'README.md',sha:SHA,mode:'100644'}];
 globalThis.fetch=stubGithub(list,{sha:SHA,size:100000,encoding:'base64',content:'c21hbGw='});
 try{assert.equal((await readReviewedText('TOKEN','team','demo','main',COMMIT,'README.md')).available,false);}finally{globalThis.fetch=old;}
});

test('workflow preflight is based on selected changes, not all ZIP changes',()=>{
 const page=readFileSync(new URL('../app/page.jsx',import.meta.url),'utf8');
 assert.match(page,/selectedChanges\.filter\(c => \/\^\\\.github/);
 assert.match(page,/changes: selectedChanges, files: preview\.archive\.files/);
 assert.match(page,/const entries = selectedChanges\.map/);
 assert.match(page,/goToTab\('activity'\)/);
 assert.doesNotMatch(page,/Vercel Deployment Tracking/);
});

test('read-only text endpoint has safe retry while commit stays forbidden', async()=>{
 const { canRetry } = await import('../lib/reliability.js');
 assert.equal(canRetry('text',{network:true}),true);
 assert.equal(canRetry('commit',{network:true}),false);
});
