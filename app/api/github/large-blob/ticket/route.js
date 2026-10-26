import { handle } from '../../../../../lib/http.js';
import { AppError, preflight } from '../../../../../lib/github.js';
import { createLargeBlobTicket } from '../../../../../lib/large-blob-ticket.js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request) {
  return handle(request,async (data,token,session)=>{
    if(!process.env.BLOB_READ_WRITE_TOKEN) throw new AppError('Để tải file trên 3 MB, kết nối Private Vercel Blob với Zipverra.',503,{code:'LARGE_BLOB_NOT_CONFIGURED'});
    await preflight(token,data.owner,data.repo,data.branch||'main',/^\.github\/workflows\/[^/]+\.ya?ml$/i.test(data.path||'')?[data.path]:[]);
    try {return createLargeBlobTicket(data,session);} catch(e){throw new AppError(e.message,400,{code:'INVALID_LARGE_FILE'});}
  });
}
