/** Zipverra PWA reliability: pure, bounded public metadata and recovery helpers. */
export const APP_VERSION = '2.8.0';
export const UPDATE_CHECK_MIN_INTERVAL_MS = 60000;
export const RECOVERY_ROLLBACK_KEY = 'zipverra.rollback.pending.v1';
const SHA = /^[a-f0-9]{40}$/i;
const NAME = /^[A-Za-z0-9_.-]{1,100}$/;
const BRANCH = /^[A-Za-z0-9_./-]{1,240}$/;

/** Never trust a version header blindly to navigate the user to a URL. */
export function validPublicVersion(input) {
  return typeof input === 'string' && /^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(input);
}
export function isNewVersion(response, current = APP_VERSION) {
  return Boolean(response && validPublicVersion(response.version) && response.version !== current);
}
export function shouldCheckAgain(lastCheckedAt, now = Date.now(), minInterval = UPDATE_CHECK_MIN_INTERVAL_MS) {
  return Number.isFinite(now) && (!Number.isFinite(lastCheckedAt) || now - lastCheckedAt >= minInterval || now < lastCheckedAt);
}
export function validRollbackJournal(input) {
  return Boolean(input && typeof input === 'object' && !Array.isArray(input) &&
    NAME.test(input.owner || '') && NAME.test(input.repo || '') && BRANCH.test(input.branch || '') &&
    SHA.test(input.expectedHead || '') && SHA.test(input.targetSha || ''));
}
/** Recovery data is never sufficient to authorize or retry a mutation. */
export function recoveryItems({ push, pr, rollback, authorized = [] } = {}) {
  const permitted = new Set(authorized.filter(x => typeof x === 'string').map(x => x.toLowerCase()));
  const allowed = (record) => record && permitted.has(`${record.owner}/${record.repo}`.toLowerCase());
  const items = [];
  if (allowed(push) && SHA.test(push.expectedHead || '')) items.push({ type: 'push', repo: `${push.owner}/${push.repo}`, branch: push.branch, sha: push.expectedHead });
  if (allowed(pr) && SHA.test(pr.expectedSourceHead || '')) items.push({ type: 'pr', repo: `${pr.owner}/${pr.repo}`, branch: pr.sourceBranch, sha: pr.expectedSourceHead });
  if (validRollbackJournal(rollback) && allowed(rollback)) items.push({ type: 'rollback', repo: `${rollback.owner}/${rollback.repo}`, branch: rollback.branch, sha: rollback.targetSha });
  return items;
}
export function safeToActivateUpdate({ busy = false, dirty = false, pending = false } = {}) {
  // An update can hide in-memory ZIP previews or create ambiguity after a mutation.
  return !busy && !dirty && !pending;
}
