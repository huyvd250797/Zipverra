import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { listDirectoryFromTree, signEditProof, verifyEditProof, listWorkspace, readWorkspaceFile,
  previewWorkspaceEdit, commitWorkspaceEdit, workspaceFileHistory, WORKSPACE_MAX_BYTES } from '../lib/workspace.js';

const HEAD='a'.repeat(40),TREE='b'.repeat(40),OLD_COMMIT='c'.repeat(40),NEW_COMMIT='d'.repeat(40),SECRET={SESSION_SECRET:'very-secret-with-at-least-thirty-two-characters-2026'};
const who={ user:{id:32164997, login:'demo'} };
const C={owner:'demo',repo:'app',branch:'main',path:'src/app.js'};
const oldText='export default 1;\n',newText='export default 2;\n';
const blobSha=t=>{const data=Buffer.from(t,'utf8');return createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex');};
const ORIG=blobSha(oldText),NEXT=blobSha(newText);
const fixtureFiles=[{path:C.path,type:'blob',mode:'100644',sha:ORIG,size:oldText.length},{path:'src/util.js',type:'blob',mode:'100644',sha:'1'.repeat(40),size:2},{path:'README.md',type:'blob',mode:'100644',sha:'2'.repeat(40),size:4},{path:'.env.local',type:'blob',mode:'100644',sha:'3'.repeat(40),size:5},{path:'src/sub/a.css',type:'blob',mode:'100644',sha:'4'.repeat(40),size:5},{path:'src/binary.png',type:'blob',mode:'100644',sha:'5'.repeat(40),size:8},{path:'src/link',type:'blob',mode:'120000',sha:'6'.repeat(40),size:1}];
const response=(status,body)=>({ok:status>=200&&status<300,status,text:async()=>JSON.stringify(body)});
function fixture({head=HEAD,permissions={contents:'write',workflows:'write'},newBranchHead=null,writeDenied=null,workflow=false}={}){
 let calls=[],putCalls=0,headValue=head;
 const fetcher=async(url,opts={})=>{
  const uri=new URL(url),method=opts.method||'GET',p=uri.pathname;
  calls.push([method,p]);
  if(p==='/user/installations')return response(200,{installations:[{id:42,account:{login:'demo'},permissions}]});
  if(p==='/user/installations/42/repositories')return response(200,{repositories:[{full_name:'demo/app',permissions:{push:true}}]});
  if(p==='/repos/demo/app')return response(200,{permissions:{push:true},archived:false,disabled:false});
  if(p==='/repos/demo/app/git/ref/heads/main')return response(200,{object:{sha:headValue}});
  if(p==='/repos/demo/app/git/commits/'+headValue)return response(200,{sha:headValue,tree:{sha:TREE}});
  if(p==='/repos/demo/app/git/trees/'+TREE)return response(200,{truncated:false,tree:fixtureFiles});
  if(p==='/repos/demo/app/git/blobs/'+ORIG)return response(200,{sha:ORIG,encoding:'base64',size:oldText.length,content:Buffer.from(oldText).toString('base64')});
  if(p==='/repos/demo/app/commits')return response(200,[{sha:HEAD,commit:{message:'Previous edit',author:{date:'2026-10-01T12:00:00Z'}}}]);
  if(p==='/repos/demo/app/contents/src/app.js' && method==='PUT'){
    putCalls++;if(writeDenied)return response(writeDenied,{message:'Protected branch'});
    const data=JSON.parse(opts.body);
    if(data.sha!==ORIG)throw Error('Bad file SHA submitted');
    if(data.content!==Buffer.from(newText).toString('base64'))throw Error('Unexpected file content');
    headValue=NEW_COMMIT;return response(200,{commit:{sha:NEW_COMMIT},content:{sha:NEXT}});
  }
  throw Error(`Unexpected request ${method} ${p}`);
 };
 return {fetcher,calls:()=>calls,puts:()=>putCalls,setHead:v=>{headValue=v;}};
}
async function scoped(fetcher,fn){const previous=globalThis.fetch;globalThis.fetch=fetcher;try{return await fn();}finally{globalThis.fetch=previous;}}
const data={...C,expectedHead:HEAD,originalSha:ORIG,content:newText};

test('workspace directory listing groups immediate children and excludes secret files',()=>{
 const root=listDirectoryFromTree(fixtureFiles,'');assert.deepEqual(root.map(x=>x.path),['src','README.md']);
 const src=listDirectoryFromTree(fixtureFiles,'src');assert.deepEqual(src.map(x=>x.name),['sub','app.js','binary.png','link','util.js']);
 assert.equal(src.find(x=>x.name==='link').kind,'symlink');
});
test('directory listing blocks traversal and unsafe path',()=>{
 for(const path of ['../private','/tmp/file','.env.local'])assert.throws(()=>listDirectoryFromTree(fixtureFiles,path));
});
test('workspace proof signed, time limited and tamper resistant',()=>{
 const p={...C,originalSha:ORIG,head:HEAD,newSha:NEXT,uid:who.user.id,at:1000000};
 const proof=signEditProof(p,SECRET);assert.deepEqual(verifyEditProof(proof,SECRET,1000020),p);
 assert.throws(()=>verifyEditProof(proof+'bad',SECRET,1000020),e=>e.code==='WORKSPACE_INVALID_PROOF');
 assert.throws(()=>verifyEditProof(proof,SECRET,1000000+5*60*1000+1),e=>e.code==='WORKSPACE_PROOF_EXPIRED');
});
test('lists current branch tree with GitHub App authorization',async()=>{
 const f=fixture();const v=await scoped(f.fetcher,()=>listWorkspace('secret-token-value',{owner:'demo',repo:'app',branch:'main',directory:'src'}));
 assert.equal(v.head,HEAD);assert.equal(v.entries[0].kind,'directory');assert.equal(v.entries.length,5);
});
test('reads exact Git blob and rejects untrusted binary paths',async()=>{
 const f=fixture();const v=await scoped(f.fetcher,()=>readWorkspaceFile('secret-token-value',C));assert.equal(v.sha,ORIG);assert.equal(v.content,oldText);
 await assert.rejects(()=>readWorkspaceFile('secret-token-value',{...C,path:'src/binary.png'}),e=>e.code==='WORKSPACE_BINARY_FILE');
 await assert.rejects(()=>readWorkspaceFile('secret-token-value',{...C,path:'.env.local'}),e=>e.code==='WORKSPACE_UNSAFE_PATH');
});
test('preview validates HEAD, file SHA, content and signs a 5-minute proof',async()=>{
 const f=fixture();const v=await scoped(f.fetcher,()=>previewWorkspaceEdit('secret-token-value',data,who,SECRET,1000000));
 assert.equal(v.newSha,NEXT);assert.equal(v.originalSha,ORIG);assert.equal(v.oldContent,oldText);
 assert.equal(verifyEditProof(v.proof,SECRET,1000001).uid,who.user.id);assert.equal(f.puts(),0);
});
test('save creates only one conditional PUT after signed preview and confirms commit',async()=>{
 const f=fixture();await scoped(f.fetcher,async()=>{
  const p=await previewWorkspaceEdit('secret-token-value',data,who,SECRET,1000000);
  const v=await commitWorkspaceEdit('secret-token-value',{proof:p.proof,content:newText,message:'Quick edit: src/app.js',confirmed:true},who,SECRET,1000001);
  assert.equal(v.state,'saved');assert.equal(v.sha,NEW_COMMIT);
 });assert.equal(f.puts(),1);
});
test('never writes if HEAD moved or file sha differs',async()=>{
 const f=fixture();await scoped(f.fetcher,async()=>{
  const p=await previewWorkspaceEdit('secret-token-value',data,who,SECRET,1000000);
  f.setHead(NEW_COMMIT);
  await assert.rejects(()=>commitWorkspaceEdit('secret-token-value',{proof:p.proof,content:newText,message:'Quick edit',confirmed:true},who,SECRET,1000001),e=>e.code==='WORKSPACE_STALE_HEAD');
 });assert.equal(f.puts(),0);
 const g=fixture();await scoped(g.fetcher,async()=>assert.rejects(()=>previewWorkspaceEdit('secret-token-value',{...data,originalSha:'0'.repeat(40)},who,SECRET),e=>e.code==='WORKSPACE_STALE_FILE'));
});
test('preview proof cannot be reused by different signed-in user',async()=>{
 const f=fixture();await scoped(f.fetcher,async()=>{
  const p=await previewWorkspaceEdit('secret-token-value',data,who,SECRET,1000000);
  await assert.rejects(()=>commitWorkspaceEdit('secret-token-value',{proof:p.proof,content:newText,message:'Quick edit',confirmed:true},{user:{id:456,login:'other'}},SECRET,1000001),e=>e.code==='WORKSPACE_PROOF_OWNER');
 });assert.equal(f.puts(),0);
});
test('rejects changed text, unconfirmed edit and oversize without pushing',async()=>{
 const f=fixture();await scoped(f.fetcher,async()=>{
  const p=await previewWorkspaceEdit('secret-token-value',data,who,SECRET,1000000);
  await assert.rejects(()=>commitWorkspaceEdit('secret-token-value',{proof:p.proof,content:'changed again',message:'Quick edit',confirmed:true},who,SECRET,1000001),e=>e.code==='WORKSPACE_STALE_PREVIEW');
  await assert.rejects(()=>commitWorkspaceEdit('secret-token-value',{proof:p.proof,content:newText,message:'Quick edit',confirmed:false},who,SECRET,1000001),e=>e.code==='WORKSPACE_CONFIRM_REQUIRED');
  await assert.rejects(()=>previewWorkspaceEdit('secret-token-value',{...data,content:'x'.repeat(WORKSPACE_MAX_BYTES+1)},who,SECRET),e=>e.code==='WORKSPACE_TEXT_TOO_LARGE');
 });assert.equal(f.puts(),0);
});
test('empty text requires separate checkbox',async()=>{
 const f=fixture();await scoped(f.fetcher,async()=>{
  await assert.rejects(()=>previewWorkspaceEdit('secret-token-value',{...data,content:''},who,SECRET),e=>e.code==='WORKSPACE_EMPTY_CONFIRM_REQUIRED');
  const p=await previewWorkspaceEdit('secret-token-value',{...data,content:'',allowEmpty:true},who,SECRET);
  assert.equal(p.newSha,blobSha(''));
 });
});
test('workflow edits require Workflows write before commit',async()=>{
 const f=fixture({permissions:{contents:'write',workflows:'read'}});
 await scoped(f.fetcher,async()=>assert.rejects(()=>previewWorkspaceEdit('secret-token-value',{...data,path:'.github/workflows/ci.yml'},who,SECRET),e=>e.code==='APP_WORKFLOWS_PERMISSION_REQUIRED'));
 assert.equal(f.puts(),0);
});
test('a GitHub 403 / branch protection never appears as success',async()=>{
 const f=fixture({writeDenied:403});await scoped(f.fetcher,async()=>{
  const p=await previewWorkspaceEdit('secret-token-value',data,who,SECRET,1000000);
  await assert.rejects(()=>commitWorkspaceEdit('secret-token-value',{proof:p.proof,content:newText,message:'Quick edit',confirmed:true},who,SECRET,1000001),e=>e.status===403);
 });assert.equal(f.puts(),1);
});
test('file-specific history uses path restriction and selected branch',async()=>{
 const f=fixture();const history=await scoped(f.fetcher,()=>workspaceFileHistory('secret-token-value',{...C,page:1}));assert.equal(history.commits.length,1);assert.ok(f.calls().some(([m,p])=>p==='/repos/demo/app/commits'));
});

test('workspace search is scoped to repository HEAD, bounded and omits sensitive paths',async()=>{
 const {searchWorkspace}=await import('../lib/workspace.js');
 const f=fixture();
 const s=await scoped(f.fetcher,()=>searchWorkspace('secret-token-value',{owner:'demo',repo:'app',branch:'main',query:'src/'}));
 assert.equal(s.head,HEAD);
 assert.equal(s.entries.some(e=>e.path==='.env.local'),false);
 assert.equal(s.entries.length,5);
 await assert.rejects(()=>searchWorkspace('secret-token-value',{owner:'demo',repo:'app',branch:'main',query:''}));
});
test('syntax highlighting emits text segments, no HTML injection or eval',async()=>{
 const {highlightSegments}=await import('../lib/workspace-highlight.js');
 const parts=highlightSegments('const hello = "<script>alert(1)</script>";','JavaScript / TypeScript');
 assert.equal(parts.map(p=>p.text).join(''),'const hello = "<script>alert(1)</script>";');
 assert.equal(parts.find(p=>p.text==='const').kind,'keyword');
 assert.equal(parts.find(p=>p.kind==='string').text,'"<script>alert(1)</script>"');
});
test('workspace UI keeps original 5 tabs and preserves ZIP Push workflow',async()=>{
 const {readFileSync}=await import('node:fs');
 const page=readFileSync(new URL('../app/page.jsx',import.meta.url),'utf8');
 const panel=readFileSync(new URL('../app/components/WorkspacePanel.jsx',import.meta.url),'utf8');
 const menu=readFileSync(new URL('../lib/mobile-ui.js',import.meta.url),'utf8');
 assert.match(page,/<WorkspaceLaunchpad/);
 assert.match(page,/onWorkspace=\{\(\) => \{ setWorkspaceOpen\(true\)/);
 assert.match(page,/workspaceOpen && <WorkspacePanel/);
 assert.match(menu,/\['home', 'repositories', 'activity', 'history', 'settings'\]/);
 assert.match(page,/Commit & Push/);
 assert.match(panel,/Review Changes/);
 assert.match(panel,/Commit & Save File/);
});


test('v1.12 security blocks secret in Quick Edit BEFORE GitHub Contents PUT',async()=>{
 const secretText='export const token = "ghp_'+'Q'.repeat(36)+'";';
 const f=fixture();
 await scoped(f.fetcher,async()=>{
  await assert.rejects(()=>previewWorkspaceEdit('secret-token-value',{...data,content:secretText},who,SECRET),
    e=>e.code==='SECURITY_CRITICAL_BLOCKED' && e.stage==='SECURITY_SCAN');
 });
 assert.equal(f.puts(),0);
});

test('v1.12 Quick Edit returns redacted warnings and no credential value',async()=>{
 const warningText='export const password = "some-password-material-123456";';
 const f=fixture();
 await scoped(f.fetcher,async()=>{
  const preview=await previewWorkspaceEdit('secret-token-value',{...data,content:warningText},who,SECRET,1000000);
  assert.equal(preview.security.warning,1);
  assert.equal(preview.security.findings[0].code,'POSSIBLE_CREDENTIAL');
  assert.ok(!JSON.stringify(preview.security).includes('some-password-material-123456'));
 });
 assert.equal(f.puts(),0);
});
