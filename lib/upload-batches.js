/** Bounded, per-file Git blob uploads. The browser never sends the full ZIP to Vercel. */
export const UPLOAD_CHECKPOINT_KEY = 'zipverra.upload.checkpoint.v1';
export const UPLOAD_CHECKPOINT_MAX_AGE = 24 * 60 * 60 * 1000;

export async function manifestFingerprint({ owner, repo, branch, head, mode, changes, files }) {
  const shaByPath = new Map(files.map(f => [f.path, f.sha]));
  const manifest = JSON.stringify({ owner, repo, branch, head, mode,
    files: changes.map(c => [c.path, c.kind, c.mode, c.kind === 'delete' ? null : shaByPath.get(c.path)]) });
  const bytes = new TextEncoder().encode(manifest);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), x => x.toString(16).padStart(2, '0')).join('');
}

export function validatedCheckpoint(candidate, fingerprint, changes, now = Date.now(), requireProof = false) {
  if (!candidate || candidate.v !== 1 || candidate.fingerprint !== fingerprint ||
      !Number.isSafeInteger(candidate.timestamp) || candidate.timestamp > now + 60_000 ||
      now - candidate.timestamp > UPLOAD_CHECKPOINT_MAX_AGE ||
      !candidate.uploaded || typeof candidate.uploaded !== 'object' || Array.isArray(candidate.uploaded)) return {};
  const permitted = new Map(changes.filter(c => c.kind !== 'delete').map(c => [c.path, true]));
  const result = {};
  for (const [path, sha] of Object.entries(candidate.uploaded)) {
    const validString = typeof sha === 'string' && /^[0-9a-f]{40}$/.test(sha);
    let proofNotExpired = false;
    if(sha && typeof sha==='object' && typeof sha.proof==='string') {
      try {
        const encoded=sha.proof.split('.')[0];
        const proof=JSON.parse(atob(encoded.replace(/-/g,'+').replace(/_/g,'/')));
        proofNotExpired=Number.isSafeInteger(proof.exp) && proof.exp>now+60_000;
      } catch { /* malformed checkpoint must be ignored */ }
    }
    const validProof = sha && typeof sha === 'object' && /^[0-9a-f]{40}$/.test(sha.sha || '') && typeof sha.proof === 'string' && sha.proof.length <= 1600 && proofNotExpired;
    if (permitted.has(path) && (validProof || (validString && !requireProof)))
      Object.defineProperty(result, path, { value: sha, enumerable: true, writable: true, configurable: true });
  }
  return result;
}

export function makeCheckpoint(fingerprint, uploaded, now = Date.now()) {
  return { v: 1, fingerprint, uploaded: { ...uploaded }, timestamp: now };
}

/**
 * No commit is created here. Each successful Git blob is content-addressed and
 * safe to reuse if the same fingerprint (including HEAD and all file SHAs) matches.
 */
export async function uploadBlobsInBatches({ changes, files, existing = {}, upload,
  concurrency = 2, batchSize = 12, onProgress = () => {}, onCheckpoint = () => {} }) {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4 ||
      !Number.isInteger(batchSize) || batchSize < concurrency || batchSize > 100) {
    throw new Error('Cấu hình batch upload không hợp lệ.');
  }
  const selected = changes.filter(c => c.kind !== 'delete');
  const sourceByPath = new Map(files.map(f => [f.path, f]));
  const uploaded = Object.create(null);
  let reused = 0;
  for (const c of selected) {
    const source = sourceByPath.get(c.path);
    if (!source || !/^[a-f0-9]{40}$/.test(source.sha)) throw new Error(`Thiếu dữ liệu hoặc SHA nguồn: ${c.path}`);
    const checkpointValue=existing[c.path];
    if (checkpointValue === source.sha || checkpointValue?.sha === source.sha && typeof checkpointValue.proof === 'string') { uploaded[c.path] = checkpointValue; reused += 1; }
  }
  const waiting = selected.filter(c => !Object.hasOwn(uploaded, c.path));
  let finished = reused;
  const totalBytes = selected.reduce((sum,c)=>sum + sourceByPath.get(c.path).bytes, 0);
  let completedBytes = selected.filter(c => Object.hasOwn(uploaded,c.path)).reduce((sum,c)=>sum+sourceByPath.get(c.path).bytes,0);
  let uploadedBytes = 0;
  onProgress({ completed: finished, total: selected.length, reused, batch: 0, totalBatches: Math.ceil(waiting.length / batchSize), completedBytes, uploadedBytes, totalBytes });
  for (let start = 0; start < waiting.length; start += batchSize) {
    const batch = waiting.slice(start, start + batchSize);
    const batchNumber = Math.floor(start / batchSize) + 1;
    let firstError = null;
    const runners = Array.from({ length: Math.min(concurrency, batch.length) }, async (_, worker) => {
      for (let i = worker; i < batch.length; i += concurrency) {
        if (firstError) return;
        const change = batch[i];
        const source = sourceByPath.get(change.path);
        try {
          const uploadedResult = await upload(source, { batch: batchNumber, totalBatches: Math.ceil(waiting.length / batchSize) });
          const resultSha=typeof uploadedResult==='string'?uploadedResult:uploadedResult?.sha;
          if (resultSha !== source.sha) throw new Error(`GitHub SHA không khớp: ${source.path}`);
          uploaded[change.path] = uploadedResult;
          finished += 1;
          completedBytes += source.bytes; uploadedBytes += source.bytes;
          onCheckpoint({ ...uploaded });
          onProgress({ completed: finished, total: selected.length, reused, batch: batchNumber, totalBatches: Math.ceil(waiting.length / batchSize), completedBytes, uploadedBytes, totalBytes });
        } catch (e) { firstError ||= e; }
      }
    });
    await Promise.all(runners);
    if (firstError) throw firstError;
  }
  return { blobShas: new Map(Object.entries(uploaded).map(([path,v])=>[path,typeof v==='string'?v:v.sha])),
    attestations: new Map(Object.entries(uploaded).filter(([,v])=>v && typeof v==='object').map(([path,v])=>[path,v.proof])),reused, completed: finished };
}

/** Advisory expiry parsing only: authenticity is always reverified on the server. */
export function attestationExpiry(proof) {
  if (typeof proof !== 'string' || proof.length > 1600) return 0;
  try {
    const token=proof.split('.')[0];
    if (!token || !/^[A-Za-z0-9_-]+$/.test(token)) return 0;
    const decoded=JSON.parse(atob(token.replace(/-/g,'+').replace(/_/g,'/')));
    return Number.isSafeInteger(decoded.exp) ? decoded.exp : 0;
  } catch { return 0; }
}

/** Prevent a multi-hour upload from reaching Commit with expired security proofs.
 * Re-uploading a blob includes a fresh server-side scan and signed attestation.
 * No client expiry extension or weakening of the server checks is permitted.
 */
export async function refreshExpiringAttestations({changes,files,blobShas,attestations,upload,
  minRemainingMs=120_000,now=()=>Date.now(),onCheckpoint=()=>{},onProgress=()=>{}}) {
  const sourceByPath=new Map(files.map(f=>[f.path,f]));
  const relevant=changes.filter(c=>c.kind!=='delete');
  const toRefresh=relevant.filter(c=>attestationExpiry(attestations.get(c.path))<=now()+minRemainingMs);
  let done=0;
  for(const change of toRefresh) {
    const source=sourceByPath.get(change.path);
    if(!source || blobShas.get(change.path)!==source.sha) throw new Error(`Không thể xác minh SHA trước Commit: ${change.path}`);
    const refreshed=await upload(source);
    if(!refreshed || refreshed.sha!==source.sha || typeof refreshed.proof!=='string' ||
       attestationExpiry(refreshed.proof)<=now()+minRemainingMs)
      throw new Error(`Không thể gia hạn chứng nhận quét an toàn: ${change.path}. Hãy thử lại.`);
    attestations.set(change.path,refreshed.proof);
    onCheckpoint(change.path,{sha:source.sha,proof:refreshed.proof});
    onProgress(++done,toRefresh.length);
  }
  // A long refresh can itself invalidate an earlier attestation. Fail closed;
  // the user can retry with checkpoints, without ever blindly retrying Git writes.
  for(const change of relevant) {
    if(attestationExpiry(attestations.get(change.path))<=now()+60_000)
      throw new Error(`Chứng nhận bảo mật sắp hết hạn: ${change.path}. Upload kéo dài; hãy thử lại trên kết nối ổn định.`);
  }
  return {refreshed:done,checked:relevant.length};
}
