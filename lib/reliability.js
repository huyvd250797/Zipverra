/** Safe retry policy: never retry a branch-mutating commit request at the browser. */
import { LIMITS } from './constants.js';

export const PUSH_STAGES = Object.freeze({
  IDLE: 'IDLE', ANALYZING: 'ANALYZING', PREFLIGHT: 'PREFLIGHT',
  UPLOADING: 'UPLOADING', COMMITTING: 'COMMITTING', VERIFYING: 'VERIFYING',
  SUCCEEDED: 'SUCCEEDED', FAILED: 'FAILED', UNCONFIRMED: 'UNCONFIRMED',
});
export const SAFE_RETRY_ENDPOINTS = Object.freeze(['repos', 'snapshot', 'preflight', 'blob', 'verify', 'text']);
export const JOURNAL_KEY = 'zipverra.push.pending.v1';
export function canRetry(endpoint, error) {
  return SAFE_RETRY_ENDPOINTS.includes(endpoint) &&
    (error?.network === true || [408, 429, 500, 502, 503, 504].includes(error?.httpStatus));
}
export async function withSafeRetry(task, { endpoint, attempts = 3, pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), onRetry = () => {} } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try { return await task(); }
    catch (error) {
      if (attempt === attempts || !canRetry(endpoint, error)) throw error;
      onRetry(attempt, error);
      await pause(350 * 2 ** (attempt - 1));
    }
  }
}
export function validJournal(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (!/^[a-f0-9]{40}$/i.test(value.expectedHead || '')) return false;
  if (typeof value.owner !== 'string' || typeof value.repo !== 'string' || typeof value.branch !== 'string' || typeof value.message !== 'string') return false;
  if (!Array.isArray(value.entries) || value.entries.length === 0 || value.entries.length > LIMITS.commitEntries) return false;
  return value.entries.every((e) => typeof e.path === 'string' && (e.sha === null || /^[a-f0-9]{40}$/i.test(e.sha || '')));
}
