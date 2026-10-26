import { timingSafeEqual } from 'node:crypto';
import { del,list } from '@vercel/blob';
import { cleanupOrphanedLargeBlobs } from '../../../../lib/large-blob-cleanup.js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=300;
export async function GET(request) {
  const secret=process.env.CRON_SECRET;
  if(!secret || !process.env.BLOB_READ_WRITE_TOKEN) return new Response(null,{status:204});
  const expected=Buffer.from(`Bearer ${secret}`);
  const actual=Buffer.from(request.headers.get('authorization')||'');
  if(expected.length!==actual.length || !timingSafeEqual(actual,expected))
    return Response.json({error:'Forbidden'},{status:403,headers:{'Cache-Control':'no-store'}});
  try {
    const result=await cleanupOrphanedLargeBlobs({list,del});
    return Response.json(result,{headers:{'Cache-Control':'no-store'}});
  }catch {return Response.json({error:'Cleanup failed'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
