import { createHmac, timingSafeEqual } from 'node:crypto';
import { AppError, createBlob } from './github.js';
import { assertRepoCoordinates, assertSafeContentPath } from './paths.js';
import { scanSourceFile, needsSensitiveConsent } from './source-security.js';

export const ATTESTATION_MS=60*60*1000;
const SHA=/^[a-f0-9]{40}$/i;
function identity(session) {
  if (!Number.isSafeInteger(session?.user?.id)) throw new AppError('Phiên GitHub không hợp lệ.',401,{code:'SECURITY_SESSION_REQUIRED'});
  return session.user.id;
}
function secret(env) {
  if(typeof env.SESSION_SECRET!=='string'||env.SESSION_SECRET.length<32)
    throw new AppError('SESSION_SECRET chưa cấu hình.',503,{code:'SECURITY_CONFIG_ERROR'});
  return env.SESSION_SECRET;
}
export function signBlobAttestation(input,session,env=process.env,now=Date.now()) {
  assertRepoCoordinates(input.owner,input.repo,'main');assertSafeContentPath(input.path, { allowSensitive: true });
  if (!SHA.test(input.sha||'')) throw new AppError('Git blob SHA không hợp lệ.');
  const payload={v:1,uid:identity(session),owner:input.owner,repo:input.repo,path:input.path,sha:input.sha.toLowerCase(),sensitive:input.sensitive===true?1:0,exp:now+ATTESTATION_MS};
  const body=Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac=createHmac('sha256',secret(env)).update(body).digest('base64url');
  return `${body}.${mac}`;
}
export function verifyBlobAttestation(value, input, session, env=process.env,now=Date.now(), allowSensitiveCommit=false) {
  if(typeof value!=='string'||value.length>1600||!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value))
    throw new AppError('Thiếu chứng nhận quét file. Hãy tải lại ZIP và phân tích trước khi push.',422,{code:'SECURITY_ATTESTATION_MISSING'});
  const [encoded,mac]=value.split('.');
  const expected=createHmac('sha256',secret(env)).update(encoded).digest();
  const actual=Buffer.from(mac,'base64url');
  if(actual.length!==expected.length || !timingSafeEqual(actual,expected))
    throw new AppError('Chứng nhận file không hợp lệ.',403,{code:'SECURITY_ATTESTATION_INVALID'});
  let proof;
  try {proof=JSON.parse(Buffer.from(encoded,'base64url').toString('utf8'));}
  catch{throw new AppError('Chứng nhận file không đọc được.',400,{code:'SECURITY_ATTESTATION_INVALID'});}
  if(proof.v!==1||proof.uid!==identity(session)||proof.owner!==input.owner||proof.repo!==input.repo||proof.path!==input.path||
     proof.sha!==input.sha?.toLowerCase()||![0,1].includes(proof.sensitive)||!Number.isSafeInteger(proof.exp)||proof.exp<=now||proof.exp>now+ATTESTATION_MS)
    throw new AppError('Chứng nhận quét không khớp file/repository hoặc đã hết hạn. Hãy upload lại file.',422,{code:'SECURITY_ATTESTATION_EXPIRED'});
  if (proof.sensitive === 1 && allowSensitiveCommit !== true)
    throw new AppError('Commit chứa file nhạy cảm nhưng chưa có xác nhận rủi ro hợp lệ.',422,{code:'SECURITY_CONSENT_REQUIRED'});
  return true;
}
export function assertSecureCommitEntries(data,session,env=process.env,now=Date.now()) {
  if(!data || !Array.isArray(data.entries)||!data.entries.length)
    throw new AppError('Commit không có file hợp lệ.',400);
  for(const entry of data.entries) {
    assertSafeContentPath(entry.path, { allowSensitive: entry.sha === null || data.allowSensitiveCommit === true });
    if(entry.sha!==null)verifyBlobAttestation(entry.proof,{owner:data.owner,repo:data.repo,path:entry.path,sha:entry.sha},session,env,now,data.allowSensitiveCommit===true);
  }
  return true;
}
export async function secureBlobUpload(token,data,session,env=process.env) {
  const {owner,repo,path,content}=data||{};
  assertRepoCoordinates(owner,repo,'main');assertSafeContentPath(path, { allowSensitive: true });
  // Ensure proof can be signed before creating any Git object.
  identity(session); secret(env);
  if(typeof content!=='string'||content.length>3_400_000||!(/^[A-Za-z0-9+/]+={0,2}$/.test(content)||content===''))
    throw new AppError('Nội dung Base64 không hợp lệ hoặc quá lớn.',413);
  const bytes=Buffer.from(content,'base64');
  if(bytes.length>2_500_000||bytes.toString('base64')!==content)throw new AppError('File quá lớn hoặc Base64 không hợp lệ.',413);
  const findings=scanSourceFile(path,bytes);
  const sensitive=needsSensitiveConsent(findings);
  if(sensitive && data.allowSensitiveUpload !== true)
    throw new AppError(`Phát hiện file nhạy cảm: ${path}. Vui lòng xác nhận cảnh báo trong Review trước khi upload.`,422,{code:'SECURITY_CONSENT_REQUIRED',stage:'SECURITY_SCAN',hint:'Không hiển thị giá trị bí mật. Hãy loại file hoặc đồng ý rõ ràng với rủi ro nếu vẫn muốn tiếp tục.'});
  const sha=await createBlob(token,owner,repo,content);
  return {sha,proof:signBlobAttestation({owner,repo,path,sha,sensitive},session,env),security:{scanVersion:1,critical:findings.filter(f=>f.severity==='critical').length,warning:findings.filter(f=>f.severity==='warning').length,sensitive}};
}
