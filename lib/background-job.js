/** Durable server Push job identity and authenticated, account-bound status receipt. */
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { assertVerificationPayload } from './verification.js';

export const BACKGROUND_JOB_KEY = 'zipverra.background.push.v1';
const JOB_RECEIPT_LIFETIME = 7 * 24 * 60 * 60 * 1000;
const RUN_ID = /^[A-Za-z0-9_.:-]{8,256}$/;

function key(env) {
  const secret=env.SESSION_SECRET;
  if (typeof secret !== 'string' || secret.length < 32) throw Error('SESSION_SECRET chưa được cấu hình.');
  return secret;
}
function accountId(session) {
  if (!Number.isSafeInteger(session?.user?.id)) throw Error('Phiên người dùng không hợp lệ.');
  return session.user.id;
}
export function pushJobToken(data, session) {
  assertVerificationPayload(data);
  const fingerprint=JSON.stringify({v:1,uid:accountId(session),owner:data.owner,repo:data.repo,
    branch:data.branch,expectedHead:data.expectedHead,message:data.message,
    entries:data.entries.map(({path,sha,mode})=>[path,sha,mode]),
    pr:data.prRequest || null,allowSensitiveCommit:data.allowSensitiveCommit===true});
  return `zipverra:push:v1:${createHash('sha256').update(fingerprint).digest('hex')}`;
}
export function signJobReceipt(runId,data,session,env=process.env,now=Date.now()) {
  if (typeof runId !== 'string' || !RUN_ID.test(runId)) throw Error('Workflow ID không hợp lệ.');
  const payload=Buffer.from(JSON.stringify({v:1,runId,uid:accountId(session),owner:data.owner,repo:data.repo,
    branch:data.branch,exp:now+JOB_RECEIPT_LIFETIME})).toString('base64url');
  const mac=createHmac('sha256',key(env)).update(payload).digest('base64url');
  return `${payload}.${mac}`;
}
export function verifyJobReceipt(runId,receipt,session,env=process.env,now=Date.now()) {
  if (typeof runId !== 'string' || !RUN_ID.test(runId) || typeof receipt !== 'string' || receipt.length>1200 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(receipt)) return null;
  const [payload,mac]=receipt.split('.');
  const expected=createHmac('sha256',key(env)).update(payload).digest();
  const actual=Buffer.from(mac,'base64url');
  if (actual.length!==expected.length || !timingSafeEqual(actual,expected)) return null;
  try {
    const data=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));
    if (data.v!==1 || data.runId!==runId || data.uid!==accountId(session) || !Number.isSafeInteger(data.exp) || data.exp<now || data.exp>now+JOB_RECEIPT_LIFETIME) return null;
    if (typeof data.owner!=='string'||typeof data.repo!=='string'||typeof data.branch!=='string') return null;
    return {owner:data.owner,repo:data.repo,branch:data.branch};
  } catch { return null; }
}
export function validSavedJob(job) {
  return Boolean(job && typeof job==='object' && !Array.isArray(job) &&
    typeof job.runId==='string' && RUN_ID.test(job.runId) &&
    typeof job.receipt==='string' && job.receipt.length<=1200 &&
    typeof job.repo==='string' && job.repo.length<=200 &&
    typeof job.branch==='string' && job.branch.length<=240);
}
