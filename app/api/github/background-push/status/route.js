import { getRun } from 'workflow/api';
import { handle } from '../../../../../lib/http.js';
import { AppError } from '../../../../../lib/github.js';
import { verifyJobReceipt } from '../../../../../lib/background-job.js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request) {
  return handle(request,async (data,_token,session)=>{
    const target=verifyJobReceipt(data?.runId,data?.receipt,session);
    if (!target) throw new AppError('Job không tồn tại hoặc không thuộc tài khoản đang đăng nhập.',403,{code:'JOB_ACCESS_DENIED'});
    const run=getRun(data.runId);
    if (!await run.exists) throw new AppError('Không tìm thấy job Push trên server.',404,{code:'JOB_NOT_FOUND'});
    const status=await run.status;
    let result=null;
    if (status==='completed') {
      try {result=await run.returnValue;} catch {result={state:'unconfirmed',reason:'Không thể đọc kết quả job. Hãy xác minh trên GitHub.'};}
    }
    return {runId:data.runId,status,repo:`${target.owner}/${target.repo}`,branch:target.branch,result};
  });
}
