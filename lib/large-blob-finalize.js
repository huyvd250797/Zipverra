import { createHash } from 'node:crypto';
import { LIMITS } from './constants.js';
import { AppError, createBlob } from './github.js';
import { scanSourceFile, needsSensitiveConsent } from './source-security.js';
import { signBlobAttestation } from './source-security-server.js';
import { verifyLargeBlobTicket } from './large-blob-ticket.js';

/** Stream from private Vercel Blob; never fetch arbitrary client URLs or bypass scanning. */
export async function readBoundedPrivateBlob(pathname,{getBlob,maxBytes=LIMITS.fileBytes}) {
  const response=await getBlob(pathname,{access:'private',useCache:false});
  if(!response || response.statusCode!==200 || !response.stream) throw new AppError('Không tìm thấy file tạm đã tải.',404);
  if (response.blob?.size > maxBytes) throw new AppError('File tạm vượt giới hạn.',413);
  const reader=response.stream.getReader();
  const chunks=[]; let count=0;
  try {
    for(;;) {
      const {done,value}=await reader.read();
      if(done) break;
      if(!(value instanceof Uint8Array)) throw new AppError('Dữ liệu file tạm không hợp lệ.',400);
      count+=value.byteLength;
      if(count>maxBytes) throw new AppError('File tạm vượt giới hạn.',413);
      chunks.push(value);
    }
  } catch(error) { try {await reader.cancel();} catch {} throw error; }
  finally { reader.releaseLock(); }
  return Buffer.concat(chunks,count);
}
export async function secureLargeBlobFinalize(token,data,session,{getBlob,deleteBlob,uploadBlob=createBlob,env=process.env}={}) {
  let bound;
  try { bound=verifyLargeBlobTicket(data.ticket,session,data.pathname,env); }
  catch(e) { throw new AppError(e.message,403,{code:'LARGE_UPLOAD_TICKET_INVALID'}); }
  try {
    const bytes=await readBoundedPrivateBlob(data.pathname,{getBlob,maxBytes:LIMITS.fileBytes});
    if(bytes.length!==bound.bytes) throw new AppError('Kích thước file không khớp với ZIP đã phân tích.',422);
    const actual=createHash('sha1').update(`blob ${bytes.byteLength}\0`).update(bytes).digest('hex');
    if(actual!==bound.sha) throw new AppError('SHA file tải lên không khớp ZIP đã phân tích.',422);
    const findings=scanSourceFile(bound.path,bytes);
    const sensitive=needsSensitiveConsent(findings);
    if(sensitive && data.allowSensitiveUpload !== true)
      throw new AppError('File có rủi ro bảo mật. Hãy xác nhận trong Review.',422,{code:'SECURITY_CONSENT_REQUIRED'});
    const sha=await uploadBlob(token,bound.owner,bound.repo,bytes.toString('base64'));
    if(sha!==bound.sha) throw new AppError('SHA GitHub không khớp source.',502);
    return {sha,proof:signBlobAttestation({...bound,sha,sensitive},session,env),
      security:{scanVersion:1,critical:findings.filter(f=>f.severity==='critical').length,
        warning:findings.filter(f=>f.severity==='warning').length,sensitive}};
  } finally {
    // Best-effort delete after success or failure; GitHub receives only signed & scanned content.
    try { await deleteBlob(data.pathname); } catch { /* Reported separately in Storage metrics. */ }
  }
}
