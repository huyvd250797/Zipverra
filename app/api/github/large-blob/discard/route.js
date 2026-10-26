import { del } from '@vercel/blob';
import { handle } from '../../../../../lib/http.js';
import { AppError } from '../../../../../lib/github.js';
import { verifyLargeBlobTicket } from '../../../../../lib/large-blob-ticket.js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request) {
  return handle(request,async (data,token,session)=>{
    try {verifyLargeBlobTicket(data.ticket,session,data.pathname);}catch(e){throw new AppError(e.message,403);}
    try {await del(data.pathname);}catch{}
    return {discarded:true};
  });
}
