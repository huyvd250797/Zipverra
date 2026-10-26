import { handleUpload } from '@vercel/blob/client';
import { checkOrigin } from '../../lib/auth/session.js';
import { resolveAppSession } from '../../lib/auth/github-app.js';
import { verifyLargeBlobTicket } from '../../lib/large-blob-ticket.js';
import { LIMITS } from '../../lib/constants.js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
/** The upload-completed callback is verified by Vercel Blob SDK, not by a browser session.
 * It intentionally does not update anything in GitHub. Finalization always requires
 * a live GitHub session and a valid path-bound signed ticket. */
export async function POST(request) {
  try {
    if(!process.env.BLOB_READ_WRITE_TOKEN) return Response.json({error:'Private Blob chưa được cấu hình.'},{status:503});
    const body=await request.json();
    const response=await handleUpload({body,request,
      onBeforeGenerateToken:async (pathname,clientPayload)=>{
        checkOrigin(request);
        const {session}=await resolveAppSession(request);
        if(!session) throw new Error('Cần đăng nhập GitHub trước khi tải file.');
        const proof=verifyLargeBlobTicket(clientPayload,session,pathname);
        return {allowedContentTypes:['application/octet-stream'],maximumSizeInBytes:proof.bytes,
          validUntil:Math.min(proof.exp,Date.now()+5*60*1000),addRandomSuffix:false,
          tokenPayload:clientPayload};
      },
      onUploadCompleted:async ()=>{} });
    return Response.json(response,{headers:{'Cache-Control':'no-store'}});
  } catch(e) {
    return Response.json({error:e instanceof Error?e.message:'Tải file lớn thất bại.'},{status:400,headers:{'Cache-Control':'no-store'}});
  }
}
