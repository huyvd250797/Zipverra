/** Safe-to-store job references only. Never persist GitHub user credentials. */
export const BACKGROUND_JOB_KEY='zipverra.background.push.v1';
export function validSavedJob(job) {
  return Boolean(job && typeof job==='object' && !Array.isArray(job) &&
    typeof job.runId==='string' && /^[A-Za-z0-9_.:-]{8,256}$/.test(job.runId) &&
    typeof job.receipt==='string' && job.receipt.length<=1200 && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(job.receipt) &&
    typeof job.repo==='string' && job.repo.length<=200 &&
    typeof job.branch==='string' && job.branch.length<=240);
}
