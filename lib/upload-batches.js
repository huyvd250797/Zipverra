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

export function validatedCheckpoint(candidate, fingerprint, changes, now = Date.now()) {
  if (!candidate || candidate.v !== 1 || candidate.fingerprint !== fingerprint ||
      !Number.isSafeInteger(candidate.timestamp) || candidate.timestamp > now + 60_000 ||
      now - candidate.timestamp > UPLOAD_CHECKPOINT_MAX_AGE ||
      !candidate.uploaded || typeof candidate.uploaded !== 'object' || Array.isArray(candidate.uploaded)) return {};
  const permitted = new Map(changes.filter(c => c.kind !== 'delete').map(c => [c.path, true]));
  const result = {};
  for (const [path, sha] of Object.entries(candidate.uploaded)) {
    if (permitted.has(path) && /^[0-9a-f]{40}$/.test(sha)) Object.defineProperty(result, path, { value: sha, enumerable: true, writable: true, configurable: true });
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
    if (existing[c.path] === source.sha) { uploaded[c.path] = source.sha; reused += 1; }
  }
  const waiting = selected.filter(c => !Object.hasOwn(uploaded, c.path));
  let finished = reused;
  onProgress({ completed: finished, total: selected.length, reused, batch: 0, totalBatches: Math.ceil(waiting.length / batchSize) });
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
          const resultSha = await upload(source, { batch: batchNumber, totalBatches: Math.ceil(waiting.length / batchSize) });
          if (resultSha !== source.sha) throw new Error(`GitHub SHA không khớp: ${source.path}`);
          uploaded[change.path] = resultSha;
          finished += 1;
          onCheckpoint({ ...uploaded });
          onProgress({ completed: finished, total: selected.length, reused, batch: batchNumber, totalBatches: Math.ceil(waiting.length / batchSize) });
        } catch (e) { firstError ||= e; }
      }
    });
    await Promise.all(runners);
    if (firstError) throw firstError;
  }
  return { blobShas: new Map(Object.entries(uploaded)), reused, completed: finished };
}
