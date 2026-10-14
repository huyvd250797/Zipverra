/** Pure UX helpers: no GitHub mutations or persisted ZIP contents. */
const PROCESSING = new Set(['UPLOADING', 'COMMITTING', 'VERIFYING', 'UNCONFIRMED']);

/** Step indices: repo 0, upload 1, analysis 2, confirm 3, Activity 4, finished 5. */
export function deriveWorkflowStep({ phase, chosenRepo, hasFile, hasPreview }) {
  if (phase === 'SUCCEEDED') return 5;
  if (PROCESSING.has(phase)) return 4;
  if (!chosenRepo) return 0;
  if (!hasFile) return 1;
  if (!hasPreview) return 2;
  // Ticking the review checkbox is never enough to mark a Push as started.
  return 3;
}

/** Guard bad inputs before scheduling an expensive ZIP worker. */
export function checkZipCandidate(file, limitBytes) {
  if (!file || typeof file.name !== 'string' || !file.name.toLowerCase().endsWith('.zip'))
    return 'Chỉ hỗ trợ file .zip.';
  if (!Number.isFinite(file.size) || file.size <= 0)
    return 'File ZIP rỗng hoặc không hợp lệ.';
  if (file.size > limitBytes)
    return `ZIP vượt giới hạn ${Math.floor(limitBytes / 1024 / 1024)} MiB.`;
  return null;
}

/** Reduce React state updates while retaining the last event in every sequence. */
export function shouldPublishProgress(previousMs, currentMs, finished = false, thresholdMs = 140) {
  if (finished) return true;
  if (!Number.isFinite(currentMs) || currentMs < previousMs) return true;
  return previousMs === 0 || currentMs - previousMs >= thresholdMs;
}
