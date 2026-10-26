/** Upload tickets bind private temporary storage to a GitHub user, repository, path,
 * expected Git blob digest and exact byte count. Never an authorization to commit. */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { LIMITS } from './constants.js';
import { assertRepoCoordinates, assertSafeContentPath } from './paths.js';

export const LARGE_TICKET_MS = 15 * 60 * 1000;
const SHA = /^[a-f0-9]{40}$/i;
const NONCE = /^[a-f0-9]{32}$/;
const TMP_PREFIX = 'zipverra-large/';
const validUser = session => Number.isSafeInteger(session?.user?.id) && session.user.id > 0;
function secret(env) {
  if (!env?.SESSION_SECRET || typeof env.SESSION_SECRET !== 'string' || env.SESSION_SECRET.length < 32)
    throw new Error('SESSION_SECRET chưa được cấu hình an toàn.');
  return env.SESSION_SECRET;
}
function createMac(encoded, env) {
  return createHmac('sha256', secret(env)).update(encoded).digest();
}
export function createLargeBlobTicket(input, session, env = process.env, now = Date.now()) {
  if (!validUser(session)) throw new Error('Phiên GitHub không hợp lệ.');
  assertRepoCoordinates(input?.owner,input?.repo,input?.branch || 'main');
  assertSafeContentPath(input?.path,{allowSensitive:true});
  if (!SHA.test(input?.sha || '') || !Number.isSafeInteger(input?.bytes) ||
      input.bytes <= LIMITS.directFileBytes || input.bytes > LIMITS.fileBytes)
    throw new Error('Kích thước hoặc SHA file lớn không hợp lệ.');
  const nonce = randomBytes(16).toString('hex');
  const payload = {v:1,uid:session.user.id,owner:input.owner,repo:input.repo,path:input.path,
    sha:input.sha.toLowerCase(),bytes:input.bytes,nonce,exp:now+LARGE_TICKET_MS};
  const encoded=Buffer.from(JSON.stringify(payload)).toString('base64url');
  const ticket=`${encoded}.${createMac(encoded,env).toString('base64url')}`;
  return {ticket, pathname:`${TMP_PREFIX}${session.user.id}/${nonce}`};
}
export function verifyLargeBlobTicket(ticket, session, pathname, env = process.env, now = Date.now()) {
  if (!validUser(session) || typeof ticket !== 'string' || ticket.length > 1800 ||
      !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(ticket)) throw new Error('Phiên upload file lớn không hợp lệ.');
  const [encoded,signature]=ticket.split('.');
  const expected=createMac(encoded,env);
  const actual=Buffer.from(signature,'base64url');
  if (actual.length!==expected.length || !timingSafeEqual(actual,expected)) throw new Error('Chứng nhận upload không hợp lệ.');
  let payload;
  try { payload=JSON.parse(Buffer.from(encoded,'base64url').toString('utf8')); }
  catch { throw new Error('Chứng nhận upload bị hỏng.'); }
  if (payload.v!==1 || payload.uid!==session.user.id || !NONCE.test(payload.nonce || '') ||
      !Number.isSafeInteger(payload.exp) || payload.exp<=now || payload.exp>now+LARGE_TICKET_MS ||
      payload.bytes<=LIMITS.directFileBytes || payload.bytes>LIMITS.fileBytes ||
      !Number.isSafeInteger(payload.bytes) || !SHA.test(payload.sha||'') ||
      pathname!==`${TMP_PREFIX}${payload.uid}/${payload.nonce}`) throw new Error('Chứng nhận upload hết hạn hoặc không khớp tệp.');
  assertRepoCoordinates(payload.owner,payload.repo,'main');
  assertSafeContentPath(payload.path,{allowSensitive:true});
  return payload;
}
