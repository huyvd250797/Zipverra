import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { AppError, github, snapshot, assertAppRepoGrant, preflight, isWorkflowFile } from './github.js';
import { assertRepoCoordinates, assertSafeContentPath, refPath } from './paths.js';

export const WORKSPACE_MAX_BYTES = 64 * 1024;
export const WORKSPACE_PROOF_MS = 5 * 60 * 1000;
const SHA = /^[a-f\d]{40}$/i;
const TREE_LIMIT = 12000;
const ALLOWED_MODES = new Set(['100644', '100755']);
const BASE64 = /^[a-zA-Z0-9+/]+={0,2}$/;
const unsafeText = /\x00|[\x01-\x08\x0b\x0c\x0e-\x1f]/;
const binaryNames = /\.(?:png|jpe?g|gif|webp|avif|ico|pdf|zip|woff2?|ttf|otf|wasm|mp[34]|mov|heic|exe|dll|bin|class|jar|sqlite|db)$/i;
const MAX_URL_SEGMENT = 900;

function base(owner, repo) { return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`; }
function coordinates({ owner, repo, branch }) { assertRepoCoordinates(owner, repo, branch); return { owner, repo, branch }; }
function sha(value, name='SHA') { if (typeof value !== 'string' || !SHA.test(value)) throw new AppError(`${name} không hợp lệ.`, 400, { code: 'WORKSPACE_INVALID_SHA' }); return value.toLowerCase(); }
function validateFile(path) {
  if (typeof path !== 'string' || !path || path.length > MAX_URL_SEGMENT) throw new AppError('Chưa chọn file hợp lệ.', 400);
  try { assertSafeContentPath(path); } catch { throw new AppError('Không được xem/chỉnh sửa đường dẫn có khả năng chứa thông tin nhạy cảm.',403,{code:'WORKSPACE_UNSAFE_PATH'}); }
  if (binaryNames.test(path)) throw new AppError('Quick Edit chỉ hỗ trợ file text.', 415, { code:'WORKSPACE_BINARY_FILE' });
  return path;
}
function validateText(value) {
  if (typeof value !== 'string' || Buffer.byteLength(value, 'utf8') > WORKSPACE_MAX_BYTES || unsafeText.test(value))
    throw new AppError('Nội dung không phải UTF-8 text hợp lệ hoặc vượt 64 KiB.', 413, { code:'WORKSPACE_TEXT_TOO_LARGE' });
  return value;
}
function gitBlobSha(text) {
  const bytes=Buffer.from(text,'utf8');
  return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}
function ensureEditable(entry, path) {
  if (!entry || entry.type !== 'blob' || !ALLOWED_MODES.has(entry.mode))
    throw new AppError('File không tồn tại hoặc là symlink/submodule. Quick Edit không hỗ trợ loại file này.',415,{code:'WORKSPACE_FILE_UNSUPPORTED'});
  validateFile(path);
}
function decodeBlob(blob, entry) {
  if (blob.sha?.toLowerCase() !== entry.sha.toLowerCase() || blob.encoding !== 'base64' || !Number.isSafeInteger(blob.size) || blob.size < 0 || blob.size > WORKSPACE_MAX_BYTES || typeof blob.content !== 'string')
    throw new AppError('File quá lớn, không phải Git blob hợp lệ hoặc đã thay đổi.',415,{code:'WORKSPACE_FILE_UNSUPPORTED'});
  const compact=blob.content.replace(/\s/g,'');
  if (compact.length > Math.ceil(WORKSPACE_MAX_BYTES*4/3)+4 || !BASE64.test(compact)) throw new AppError('Git blob Base64 không hợp lệ.',502);
  const bytes=Buffer.from(compact,'base64');
  if (bytes.length !== blob.size || bytes.toString('base64') !== compact) throw new AppError('Git blob không toàn vẹn.',502);
  let text;
  try { text=new TextDecoder('utf-8',{fatal:true}).decode(bytes); }
  catch { throw new AppError('Không thể chỉnh sửa file không phải UTF-8.',415,{code:'WORKSPACE_BINARY_FILE'}); }
  validateText(text);
  if(gitBlobSha(text)!==entry.sha.toLowerCase()) throw new AppError('Git blob bị thay đổi hoặc không toàn vẹn.', 502, {code:'WORKSPACE_BLOB_MISMATCH'});
  return text;
}

/** Directory listing is based on the actual branch HEAD, never an arbitrary client supplied commit SHA. */
export function listDirectoryFromTree(files, directory='') {
  if (directory) {
    try { assertSafeContentPath(directory); } catch { throw new AppError('Thư mục không hợp lệ.',400); }
  }
  const prefix=directory ? `${directory}/` : '';
  const result=new Map();
  for (const e of files) {
    if (typeof e.path !== 'string' || !e.path.startsWith(prefix)) continue;
    const remainder=e.path.slice(prefix.length);
    if (!remainder || !remainder.includes('/') && e.type !== 'blob' && e.type !== 'commit') continue;
    const next=remainder.split('/')[0];
    const fullPath=prefix+next;
    // Hidden/secret-bearing filenames are never displayed or served.
    try { assertSafeContentPath(fullPath); } catch { continue; }
    if (remainder.includes('/')) result.set(next,{ name:next, path:fullPath, kind:'directory' });
    else if (!result.has(next)) result.set(next,{ name:next,path:fullPath, kind:e.mode === '120000' ? 'symlink' : e.type === 'blob' ? 'file' : 'submodule', size:e.size??null,sha:e.sha,mode:e.mode });
  }
  return [...result.values()].sort((a,b)=>(a.kind==='directory'?0:1)-(b.kind==='directory'?0:1) || a.name.localeCompare(b.name));
}

/** Bounded filename/path search, never returning content or arbitrary Git refs. */
export async function searchWorkspace(token,data) {
  const {owner,repo,branch}=coordinates(data);
  if(typeof data.query!=='string'||!data.query.trim()||data.query.length>120)throw new AppError('Từ khóa tìm kiếm không hợp lệ.',400);
  await assertAppRepoGrant(token,owner,repo);
  const snap=await snapshot(token,owner,repo,branch);
  const matches=[];
  const q=data.query.trim().toLocaleLowerCase();
  for(const e of snap.files){
    if(!e.path.toLocaleLowerCase().includes(q))continue;
    try{assertSafeContentPath(e.path);}catch{continue;}
    matches.push({name:e.path.split('/').at(-1),path:e.path,kind:e.type==='blob'&&(e.mode==='100644'||e.mode==='100755')?'file':'unsupported',size:e.size??null,sha:e.sha,mode:e.mode});
    if(matches.length>=61)break;
  }
  return {head:snap.head,entries:matches.slice(0,60),truncated:matches.length>60};
}

export async function listWorkspace(token, data) {
  const {owner,repo,branch}=coordinates(data);
  const directory=data.directory ?? '';
  if (typeof directory !== 'string' || directory.length>900) throw new AppError('Thư mục không hợp lệ.',400);
  await assertAppRepoGrant(token,owner,repo);
  const snap=await snapshot(token,owner,repo,branch);
  if(snap.files.length>TREE_LIMIT) throw new AppError('Repo có quá nhiều file cho Workspace.',422);
  const entries=listDirectoryFromTree(snap.files,directory);
  return { owner,repo,branch,head:snap.head,directory,entries, count:entries.length };
}

async function readFromSnapshot(token,{owner,repo,branch,path}, snap) {
  validateFile(path);
  const entry=snap.files.find(e=>e.path===path);
  ensureEditable(entry,path);
  const blob=await github(token, `${base(owner,repo)}/git/blobs/${entry.sha}`);
  const content=decodeBlob(blob,entry);
  return {entry,content};
}
export async function readWorkspaceFile(token,data) {
  const {owner,repo,branch}=coordinates(data); const path=validateFile(data.path);
  await assertAppRepoGrant(token,owner,repo);
  const snap=await snapshot(token,owner,repo,branch);
  const {entry,content}=await readFromSnapshot(token,{owner,repo,branch,path},snap);
  return {owner,repo,branch,path,head:snap.head,sha:entry.sha,mode:entry.mode,content,bytes:Buffer.byteLength(content),url:`https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/blob/${snap.head}/${path.split('/').map(encodeURIComponent).join('/')}`};
}

function secret(env){if(typeof env.SESSION_SECRET!=='string'||env.SESSION_SECRET.length<32)throw new AppError('SESSION_SECRET chưa cấu hình.',503);return env.SESSION_SECRET;}
export function signEditProof(payload,env=process.env){const body=Buffer.from(JSON.stringify(payload)).toString('base64url');const mac=createHmac('sha256',secret(env)).update(body).digest('base64url');return `${body}.${mac}`;}
export function verifyEditProof(value,env=process.env,now=Date.now()){
  if(typeof value!=='string'||value.length>2300||!/^[\w-]+\.[\w-]+$/.test(value))throw new AppError('Preview không hợp lệ; cần xem diff lại.',400,{code:'WORKSPACE_INVALID_PROOF'});
  const [body,signature]=value.split('.');const expected=createHmac('sha256',secret(env)).update(body).digest(),actual=Buffer.from(signature,'base64url');
  if(expected.length!==actual.length||!timingSafeEqual(expected,actual))throw new AppError('Preview đã bị thay đổi.',403,{code:'WORKSPACE_INVALID_PROOF'});
  let payload;try{payload=JSON.parse(Buffer.from(body,'base64url').toString('utf8'));}catch{throw new AppError('Preview không hợp lệ.',400);}
  if(!Number.isSafeInteger(payload.at)|| now<payload.at-30000 || now-payload.at>WORKSPACE_PROOF_MS)throw new AppError('Preview hết hạn (5 phút). Hãy xem lại diff.',409,{code:'WORKSPACE_PROOF_EXPIRED'});
  coordinates(payload);validateFile(payload.path);sha(payload.head);sha(payload.originalSha);sha(payload.newSha);
  if(!Number.isSafeInteger(payload.uid)||payload.uid<0)throw new AppError('Phiên preview không hợp lệ.',403);
  return payload;
}
function identity(session){if(!Number.isSafeInteger(session?.user?.id))throw new AppError('Phiên GitHub không hợp lệ.',401);return session.user.id;}
function checkEditorInput(data){
  const {owner,repo,branch}=coordinates(data),path=validateFile(data.path);
  const originalSha=sha(data.originalSha,'File SHA'),expectedHead=sha(data.expectedHead,'Branch HEAD');
  const content=validateText(data.content);
  if(content.length===0 && !data.allowEmpty) throw new AppError('File rỗng cần xác nhận riêng.',400,{code:'WORKSPACE_EMPTY_CONFIRM_REQUIRED'});
  return {owner,repo,branch,path,originalSha,expectedHead,content,newSha:gitBlobSha(content)};
}
async function planEditor(token,data,session){
  const input=checkEditorInput(data);
  await preflight(token,input.owner,input.repo,input.branch,isWorkflowFile(input.path)?[input.path]:[]);
  const snap=await snapshot(token,input.owner,input.repo,input.branch);
  if(snap.head!==input.expectedHead)throw new AppError('Branch đã thay đổi. Hãy tải lại file trước khi sửa.',409,{code:'WORKSPACE_STALE_HEAD'});
  const {entry,content:currentContent}=await readFromSnapshot(token,input,snap);
  if(entry.sha!==input.originalSha)throw new AppError('File đã có phiên bản mới. Hãy tải lại để tránh ghi đè.',409,{code:'WORKSPACE_STALE_FILE'});
  if(currentContent===input.content)throw new AppError('Không có thay đổi để commit.',409,{code:'WORKSPACE_NO_CHANGE'});
  return {...input,previousContent:currentContent,uid:identity(session)};
}
export async function previewWorkspaceEdit(token,data,session,env=process.env,now=Date.now()){
  const plan=await planEditor(token,data,session);
  const proof=signEditProof({owner:plan.owner,repo:plan.repo,branch:plan.branch,path:plan.path,originalSha:plan.originalSha,head:plan.expectedHead,newSha:plan.newSha,uid:plan.uid,at:now},env);
  return {proof, expiresAt:new Date(now+WORKSPACE_PROOF_MS).toISOString(),head:plan.expectedHead,path:plan.path,originalSha:plan.originalSha,newSha:plan.newSha,changed:true,previousBytes:Buffer.byteLength(plan.previousContent),nextBytes:Buffer.byteLength(plan.content),oldContent:plan.previousContent};
}

export async function commitWorkspaceEdit(token,data,session,env=process.env,now=Date.now()){
  if(data?.confirmed!==true)throw new AppError('Cần xác nhận commit sau khi xem diff.',400,{code:'WORKSPACE_CONFIRM_REQUIRED'});
  const proof=verifyEditProof(data.proof,env,now);
  if(proof.uid!==identity(session))throw new AppError('Preview không thuộc phiên GitHub hiện tại.',403,{code:'WORKSPACE_PROOF_OWNER'});
  const plan=await planEditor(token,{...data,owner:proof.owner,repo:proof.repo,branch:proof.branch,path:proof.path,expectedHead:proof.head,originalSha:proof.originalSha},session);
  if(plan.newSha!==proof.newSha)throw new AppError('Nội dung đã thay đổi sau preview. Hãy xem diff lại.',409,{code:'WORKSPACE_STALE_PREVIEW'});
  const message=typeof data.message==='string'?data.message.trim():'';
  if(!message||message.length>200||/[\x00-\x1f]/.test(message))throw new AppError('Commit message không hợp lệ (1–200 ký tự).',400);
  // Contents API provides file-SHA conditional update, protects against concurrent edits to this file.
  // A branch change between the HEAD check and PUT to *other* files can be included in the resulting commit.
  const pathEncoded=proof.path.split('/').map(encodeURIComponent).join('/');
  const response=await github(token,`${base(proof.owner,proof.repo)}/contents/${pathEncoded}`,'PUT',{
    message,content:Buffer.from(plan.content,'utf8').toString('base64'),sha:plan.originalSha,branch:proof.branch,
  });
  if(!SHA.test(response.commit?.sha||'')||response.content?.sha?.toLowerCase()!==plan.newSha)
    throw new AppError('GitHub chưa xác nhận được phiên bản nội dung sau commit. Hãy kiểm tra GitHub trước khi thử lại.',503,{code:'WORKSPACE_SAVE_UNCONFIRMED'});
  return {state:'saved',sha:response.commit.sha,contentSha:plan.newSha,branch:proof.branch,path:proof.path,url:`https://github.com/${proof.owner}/${proof.repo}/commit/${response.commit.sha}`};
}
export async function workspaceFileHistory(token,data){
  const {owner,repo,branch}=coordinates(data),path=validateFile(data.path);
  const page=data.page??1;
  if(!Number.isInteger(page)||page<1||page>10)throw new AppError('Trang lịch sử không hợp lệ.',400);
  await assertAppRepoGrant(token,owner,repo);
  const response=await github(token,`${base(owner,repo)}/commits?sha=${encodeURIComponent(branch)}&path=${encodeURIComponent(path)}&per_page=15&page=${page}`);
  if(!Array.isArray(response))throw new AppError('GitHub không trả về lịch sử file.',502);
  return {commits:response.map(c=>({sha:c.sha,message:(c.commit?.message||'').split('\n')[0].slice(0,160),date:c.commit?.author?.date||null,url:c.html_url||null})),hasMore:response.length===15};
}
