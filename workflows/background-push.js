import { decodeSession } from '../lib/auth/session.js';
import { exchangeAppToken } from '../lib/auth/github-app.js';
import { createCommit, verifyPush } from '../lib/github.js';
import { ensurePullRequest } from '../lib/pull-requests.js';
import { assertSecureCommitEntries } from '../lib/source-security-server.js';

/** Only this step can perform the GitHub mutation. It must never throw a retryable
 * error after a potentially accepted branch update: reconcile read-only instead.
 * On a hard process crash, replay checks HEAD first through createCommit(). */
export async function completeGitHubPush(data, encryptedSession) {
  'use step';
  const session=decodeSession(encryptedSession);
  if (!session) return {state:'unconfirmed',reason:'Phiên GitHub đã hết hạn; kiểm tra GitHub trước khi Push lại.'};
  let token=session.token;
  if (session.tokenExpiresAt < Date.now()+60_000) {
    try {token=(await exchangeAppToken({refreshToken:session.refreshToken})).token;}
    catch {return {state:'unconfirmed',reason:'Không thể gia hạn quyền GitHub. Kiểm tra GitHub trước khi Push lại.'};}
  }
  let outcome;
  try {
    // Re-verify the account-bound, short-lived, signed file proofs on the server.
    assertSecureCommitEntries(data,session);
    outcome=await createCommit(token,data);
    if (!outcome?.verified || !/^[a-f0-9]{40}$/i.test(outcome.sha||'')) throw Error('Commit chưa được xác minh.');
  } catch (error) {
    try {
      const checked=await verifyPush(token,data);
      if (checked.state==='applied' && checked.verified) outcome={...checked,recovered:true};
      else return {state:checked.state==='not_applied'?'not_applied':'unconfirmed',reason: String(error?.message||'Chưa xác minh được GitHub.').slice(0,250)};
    } catch {return {state:'unconfirmed',reason:'Không thể đọc HEAD từ GitHub. Tuyệt đối không tự Push lại.'};}
  }
  if (!data.prRequest) return {state:'succeeded',outcome};
  const prData={...data.prRequest,expectedSourceHead:outcome.sha};
  try {
    const pr=await ensurePullRequest(token,prData);
    return {state:'succeeded',outcome,pr,prState:'verified'};
  } catch {
    // GitHub may have created the PR; user can use the existing read-before-write recovery.
    return {state:'succeeded',outcome,prState:'unconfirmed',prRequest:prData};
  }
}

export async function durablePushWorkflow(data, encryptedSession) {
  'use workflow';
  return completeGitHubPush(data,encryptedSession);
}
