import { start } from 'workflow/api';
import { HookConflictError } from 'workflow/errors';
import { handle } from '../../../../../lib/http.js';
import { encodeSession } from '../../../../../lib/auth/session.js';
import { assertSecureCommitEntries } from '../../../../../lib/source-security-server.js';
import { assertVerificationPayload } from '../../../../../lib/verification.js';
import { pushJobToken, signJobReceipt } from '../../../../../lib/background-job.js';
import { durablePushWorkflow } from '../../../../../workflows/background-push.js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function POST(request) {
  return handle(request,async (data,_token,session)=>{
    assertVerificationPayload(data);
    assertSecureCommitEntries(data,session);
    if (data.prRequest && (data.prRequest.owner!==data.owner || data.prRequest.repo!==data.repo ||
      data.prRequest.sourceBranch!==data.branch || typeof data.prRequest.baseBranch!=='string'))
      throw new Error('Pull Request không khớp repository/branch đã Review.');
    const jobToken=pushJobToken(data,session);
    let runId,duplicate=false;
    try {
      const run=await start(durablePushWorkflow,[data,encodeSession(session)],{
        experimental_hook:{token:jobToken,experimental_minRetention:'1h'},
      });
      runId=run.runId;
    } catch(error) {
      if (!HookConflictError.is(error)) throw error;
      runId=error.conflictingRunId;
      duplicate=true;
    }
    return {runId,receipt:signJobReceipt(runId,data,session),duplicate,
      owner:data.owner,repo:data.repo,branch:data.branch,stage:'SERVER_QUEUED'};
  });
}
