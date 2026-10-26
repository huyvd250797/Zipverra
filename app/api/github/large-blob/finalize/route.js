import { get,del } from '@vercel/blob';
import { handle } from '../../../../../lib/http.js';
import { secureLargeBlobFinalize } from '../../../../../lib/large-blob-finalize.js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=300;
export async function POST(request) {
  return handle(request,(data,token,session)=>secureLargeBlobFinalize(token,data,session,
    {getBlob:get,deleteBlob:del}));
}
