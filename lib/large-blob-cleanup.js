/** Bounded cleanup for interrupted private large uploads. Never touch other Blob data. */
export const LARGE_BLOB_RETENTION_MS = 24*60*60*1000;
export const LARGE_BLOB_PREFIX = 'zipverra-large/';
export async function cleanupOrphanedLargeBlobs({list,del,now=Date.now(),maxPages=10}={}) {
  if (typeof list!=='function' || typeof del!=='function') throw new Error('Thiếu Vercel Blob SDK.');
  let cursor,examined=0,deleted=0;
  for(let page=0;page<maxPages;page++) {
    const response=await list({prefix:LARGE_BLOB_PREFIX,limit:100,cursor,mode:'expanded'});
    for(const item of response.blobs||[]) {
      if(!item?.pathname?.startsWith(LARGE_BLOB_PREFIX)) continue;
      examined++;
      const timestamp = item.uploadedAt instanceof Date?item.uploadedAt.getTime():Date.parse(item.uploadedAt);
      if (!Number.isFinite(timestamp) || timestamp>now-LARGE_BLOB_RETENTION_MS) continue;
      await del(item.pathname);deleted++;
    }
    if (!response.hasMore || !response.cursor || response.cursor===cursor) break;
    cursor=response.cursor;
  }
  return {examined,deleted};
}
