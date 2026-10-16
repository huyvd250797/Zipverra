import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { scanSourceFile, scanSelectedChanges, reportSelectedSecurity } from '../lib/source-security.js';
import { signBlobAttestation, verifyBlobAttestation, assertSecureCommitEntries, secureBlobUpload } from '../lib/source-security-server.js';
import { uploadBlobsInBatches, validatedCheckpoint, makeCheckpoint } from '../lib/upload-batches.js';
import { previewWorkspaceEdit, commitWorkspaceEdit } from '../lib/workspace.js';

const ENC = new TextEncoder();
const FILE='src/config.js',OWNER='team',REPO='repo',GOOD='export const done = true;';
const TOKEN='ghp_'+'A'.repeat(35);
const AWS='AKIA'+'B'.repeat(16);
const ID={user:{id:1234,login:'alice'}};
const OTHER={user:{id:9876,login:'bob'}};
const ENV={SESSION_SECRET:'secure-test-session-secret-has-at-least-32-chars'};
const gitSha=bytes=>createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const bytes=content=>ENC.encode(content);
function f(path,content){const data=bytes(content);return {path,data,bytes:data.length,sha:gitSha(data),mode:'100644'};}

const contents=(path,content)=>scanSourceFile(path,bytes(content));
const issueCodes=(findings)=>findings.map(x=>x.code);

test('redacted detection of known high-confidence secrets and private key without showing values',()=>{
 // Assemble at runtime: legacy Zipverra versions must not falsely flag the TEST SOURCE itself.
 const fakePrivateKeyHeader = '-----BEGIN' + ' PRIVATE KEY-----';
 const snippets=[`const p = '${TOKEN}'`, `export const key = '${AWS}'`, fakePrivateKeyHeader + '\nMII...'];
 for(const content of snippets){
  const findings=contents(FILE,content);
  assert.ok(findings.some(x=>x.severity==='critical'));
  assert.ok(!JSON.stringify(findings).includes(TOKEN));
  assert.ok(!JSON.stringify(findings).includes(AWS));
  assert.equal(findings[0].path,FILE);
 }
});

test('warns for possible hardcoded credential but skips placeholders and public examples',()=>{
 const warnings=contents('src/config.ts','const password = "really-strong-pwd-123";');
 assert.ok(issueCodes(warnings).includes('POSSIBLE_CREDENTIAL'));
 assert.equal(warnings[0].severity,'warning');
 for(const value of ['process.env.MY_SECRET','YOUR_SECRET_KEY','xxxxxxxxxxxxx','placeholder_value']){
  assert.ok(!issueCodes(contents('README.md',`client_secret = ${value}`)).includes('POSSIBLE_CREDENTIAL'));
 }
});

test('scan includes sensitive names and config, survives binary safely, bounded by max file bytes',()=>{
 assert.ok(issueCodes(contents('.env.production','PORT=123')).includes('SENSITIVE_PATH'));
 assert.ok(!issueCodes(contents('.env.example','PORT=123')).includes('SENSITIVE_PATH'));
 assert.ok(issueCodes(contents('package.json','{}')).includes('CONFIG_CHANGE'));
 assert.ok(issueCodes(scanSourceFile('public/logo.png',new Uint8Array([0,3,4]))).includes('BINARY_NOT_SCANNED'));
 assert.throws(()=>scanSourceFile(FILE,new Uint8Array(2_500_001)),/giới hạn/);
});

test('scan only selected changed source; excluding a Critical file unblocks commit review',()=>{
 const input=[f('README.md', 'Hello'),f(FILE,`const token='${TOKEN}';`)];
 const all=scanSelectedChanges(input,input.map(v=>({path:v.path,kind:'add'})));
 assert.equal(all.blocked,true);
 const filtered=reportSelectedSecurity(all,[{path:'README.md',kind:'add'}]);
 assert.equal(filtered.blocked,false);
 assert.equal(filtered.critical,0);
 assert.equal(filtered.scanned,1);
 assert.ok(reportSelectedSecurity(all,[{path:'package.json',kind:'delete'}]).findings.some(v=>v.code==='CONFIG_DELETE'));
});

test('blob attestation is time-limited, scoped to GitHub user, repository, path and blob SHA',()=>{
 const now=1_000_000,sha='a'.repeat(40);
 const context={owner:OWNER,repo:REPO,path:FILE,sha};
 const proof=signBlobAttestation(context,ID,ENV,now);
 assert.equal(verifyBlobAttestation(proof,context,ID,ENV,now+100),true);
 for(const invalid of [{...context,sha:'b'.repeat(40)},{...context,path:'src/other.js'},{...context,repo:'other'}]){
  assert.throws(()=>verifyBlobAttestation(proof,invalid,ID,ENV,now+100),e=>e.code==='SECURITY_ATTESTATION_EXPIRED');
 }
 assert.throws(()=>verifyBlobAttestation(proof,context,OTHER,ENV,now+100),e=>e.code==='SECURITY_ATTESTATION_EXPIRED');
 assert.throws(()=>verifyBlobAttestation(proof,context,ID,ENV,now+3600001),e=>e.code==='SECURITY_ATTESTATION_EXPIRED');
 assert.throws(()=>verifyBlobAttestation(proof+'tamper',context,ID,ENV,now+1),e=>e.code==='SECURITY_ATTESTATION_INVALID');
});

test('commit security gate requires attestation for every new/modified blob; deletions do not need proof',()=>{
 const now=1_000_000, sha='a'.repeat(40), context={owner:OWNER,repo:REPO,path:FILE,sha};
 const proof=signBlobAttestation(context,ID,ENV,now);
 const manifest={owner:OWNER,repo:REPO,entries:[{path:FILE,sha,mode:'100644',proof},{path:'old.txt',sha:null,mode:'100644'}]};
 assert.equal(assertSecureCommitEntries(manifest,ID,ENV,now+100),true);
 assert.throws(()=>assertSecureCommitEntries({...manifest,entries:[{path:FILE,sha,mode:'100644'}]},ID,ENV,now+100),e=>e.code==='SECURITY_ATTESTATION_MISSING');
 assert.throws(()=>assertSecureCommitEntries({...manifest,entries:[{path:FILE,sha:'b'.repeat(40),proof}]},ID,ENV,now+100));
});

test('Critical is blocked by the SERVER before any GitHub API request, noncritical returns signed proof',async()=>{
 let calls=0,post;
 const old=globalThis.fetch;
 globalThis.fetch=async(_url,opts)=>{calls++;post=JSON.parse(opts.body);const src=Buffer.from(post.content,'base64');return {ok:true,status:201,text:async()=>JSON.stringify({sha:gitSha(src)})};};
 try {
  await assert.rejects(()=>secureBlobUpload('token',{owner:OWNER,repo:REPO,path:FILE,content:Buffer.from(TOKEN).toString('base64')},ID,ENV),e=>e.code==='SECURITY_CONSENT_REQUIRED' && e.stage==='SECURITY_SCAN');
  assert.equal(calls,0);
  const acknowledged=await secureBlobUpload('token',{owner:OWNER,repo:REPO,path:FILE,content:Buffer.from(TOKEN).toString('base64'),allowSensitiveUpload:true},ID,ENV);
  assert.equal(calls,1);
  assert.equal(acknowledged.security.sensitive,true);
  assert.throws(()=>verifyBlobAttestation(acknowledged.proof,{owner:OWNER,repo:REPO,path:FILE,sha:acknowledged.sha},ID,ENV),e=>e.code==='SECURITY_CONSENT_REQUIRED');
  assert.equal(verifyBlobAttestation(acknowledged.proof,{owner:OWNER,repo:REPO,path:FILE,sha:acknowledged.sha},ID,ENV,Date.now(),true),true);
  const text='export const ready = true';
  const result=await secureBlobUpload('token',{owner:OWNER,repo:REPO,path:FILE,content:Buffer.from(text).toString('base64')},ID,ENV);
  assert.equal(calls,2);assert.equal(result.sha,gitSha(Buffer.from(text)));
  assert.equal(verifyBlobAttestation(result.proof,{owner:OWNER,repo:REPO,path:FILE,sha:result.sha},ID,ENV),true);
  assert.equal(result.security.warning,0);
  assert.throws(()=>assertSecureCommitEntries({owner:OWNER,repo:REPO,entries:[{path:FILE,mode:'100644',sha:acknowledged.sha,proof:acknowledged.proof}]},ID,ENV),e=>e.code==='SECURITY_CONSENT_REQUIRED');
  assert.equal(assertSecureCommitEntries({owner:OWNER,repo:REPO,allowSensitiveCommit:true,entries:[{path:FILE,mode:'100644',sha:acknowledged.sha,proof:acknowledged.proof}]},ID,ENV),true);
  assert.ok(!('token' in result));
 }finally{globalThis.fetch=old;}
});

test('secure resumable uploads reuse only signed and unexpired checkpoints',async()=>{
 const content='Hello from safe source',source=f(FILE,content),now=Date.now();
 const proof=signBlobAttestation({owner:OWNER,repo:REPO,path:FILE,sha:source.sha},ID,ENV,now);
 const changes=[{path:FILE,kind:'add'}],fingerprint='abcdef';
 const stored=makeCheckpoint(fingerprint,{[FILE]:{sha:source.sha,proof}},now);
 const valid=validatedCheckpoint(stored,fingerprint,changes,now,true);
 assert.equal(valid[FILE].sha,source.sha);
 assert.deepEqual(validatedCheckpoint(makeCheckpoint(fingerprint,{[FILE]:source.sha},now),fingerprint,changes,now,true),{});
 assert.deepEqual(validatedCheckpoint(stored,fingerprint,changes,now+3600001,true),{});
 const result=await uploadBlobsInBatches({changes,files:[source],existing:valid,upload:()=>{throw Error('already uploaded');}});
 assert.equal(result.reused,1);assert.equal(result.attestations.get(FILE),proof);
});

test('Quick Edit security review is enforced by backend even for direct save or modified content',()=>{
 const workspace=readFileSync(new URL('../lib/workspace.js',import.meta.url),'utf8');
 assert.match(workspace,/scanSourceFile\(plan\.path,Buffer\.from\(plan\.content,'utf8'\)\)/);
 assert.match(workspace,/SECURITY_CRITICAL_BLOCKED/);
 const blobRoute=readFileSync(new URL('../app/api/github/blob/route.js',import.meta.url),'utf8');
 const commitRoute=readFileSync(new URL('../app/api/github/commit/route.js',import.meta.url),'utf8');
 assert.match(blobRoute,/secureBlobUpload/);
 assert.match(commitRoute,/assertSecureCommitEntries/);
});

test('new UI displays redacted security report and gates BOTH direct push and Pull Request',()=>{
 const page=readFileSync(new URL('../app/page.jsx',import.meta.url),'utf8');
 assert.match(page,/Security & Smart Source Validation/);
 assert.match(page,/\(requiresConsent && !sensitiveConsent\)/);
 assert.match(page,/attestations\.get/);
 assert.match(page,/validatedCheckpoint\(loadUploadCheckpoint\(\), fingerprint, selectedChanges, Date\.now\(\), true\)/);
 assert.match(page,/goToTab\('activity'\)/);
 assert.doesNotMatch(page,/Vercel Deployment Tracking/);
});


test('v3.8.6 sensitive file ZIP consent allows .npmrc but never unsafe ZIP traversal', async()=>{
  const { assertSafeContentPath } = await import('../lib/paths.js');
  const { calculateChanges } = await import('../lib/operations.js');
  const { assertVerificationPayload } = await import('../lib/verification.js');
  const credential=f('.npmrc','//registry.npmjs.org/:_authToken=private-token-value-12345');
  assert.throws(()=>assertSafeContentPath(credential.path),/bị chặn/);
  assert.equal(assertSafeContentPath(credential.path,{allowSensitive:true}),'.npmrc');
  assert.throws(()=>assertSafeContentPath('../.npmrc',{allowSensitive:true}),/không an toàn/);
  assert.throws(()=>assertSafeContentPath('.git/config',{allowSensitive:true}),/\.git/);
  assert.equal(calculateChanges([credential],[],'merge')[0].path,'.npmrc');
  const payload={owner:OWNER,repo:REPO,branch:'main',expectedHead:'b'.repeat(40),message:'test',entries:[{path:'.npmrc',sha:'a'.repeat(40),mode:'100644'}]};
  assert.throws(()=>assertVerificationPayload(payload),/bị chặn/);
  assert.doesNotThrow(()=>assertVerificationPayload({...payload,allowSensitiveCommit:true}));
  let count=0;const fetcher=globalThis.fetch;
  globalThis.fetch=async (url,options)=>{count++; return {ok:true,status:201,text:async()=>JSON.stringify({sha:gitSha(Buffer.from(JSON.parse(options.body).content,'base64'))})};};
  try{
    await assert.rejects(()=>secureBlobUpload('token',{owner:OWNER,repo:REPO,path:'.npmrc',content:Buffer.from(credential.data).toString('base64')},ID,ENV),e=>e.code==='SECURITY_CONSENT_REQUIRED');
    assert.equal(count,0);
    const uploaded=await secureBlobUpload('token',{owner:OWNER,repo:REPO,path:'.npmrc',content:Buffer.from(credential.data).toString('base64'),allowSensitiveUpload:true},ID,ENV);
    assert.equal(count,1);assert.equal(uploaded.security.sensitive,true);
    const committed={owner:OWNER,repo:REPO,allowSensitiveCommit:true,entries:[{path:'.npmrc',sha:uploaded.sha,mode:'100644',proof:uploaded.proof}]};
    assert.equal(assertSecureCommitEntries(committed,ID,ENV),true);
    assert.throws(()=>assertSecureCommitEntries({...committed,allowSensitiveCommit:false},ID,ENV));
  }finally{globalThis.fetch=fetcher;}
});


test('v3.8.6 Sync can delete stale secret file without granting upload consent', async()=>{
  const { assertVerificationPayload }=await import('../lib/verification.js');
  const deletion={owner:OWNER,repo:REPO,branch:'main',expectedHead:'b'.repeat(40),message:'remove stale credentials',entries:[{path:'.npmrc',sha:null,mode:'100644'}]};
  assert.doesNotThrow(()=>assertVerificationPayload(deletion));
  assert.equal(assertSecureCommitEntries(deletion,ID,ENV),true);
});

test('v3.8.6 sensitive user decision is explicit, ephemeral and required on both upload and commit',()=>{
 const page=readFileSync(new URL('../app/page.jsx',import.meta.url),'utf8');
 assert.match(page,/setSensitiveConsent\(false\); setSecurityDialogOpen\(false\)/);
 assert.match(page,/setSecurityDialogOpen\(needsSensitiveConsent\(selectedReport\.findings\)\)/);
 assert.match(page,/Có, tôi hiểu rủi ro · Tiếp tục/);
 assert.match(page,/Không, kiểm tra lại/);
 assert.match(page,/allowSensitiveUpload: requiresConsent && sensitiveConsent/);
 assert.match(page,/allowSensitiveCommit: requiresConsent && sensitiveConsent/);
 assert.match(page,/requiresConsent && !sensitiveConsent/);
 assert.match(page,/Ẩn Diff cho file nghi ngờ chứa thông tin bí mật/);
});
