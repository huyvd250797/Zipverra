import { LIMITS } from './constants.js';
import { assertRepoCoordinates, assertSafeContentPath } from './paths.js';

const SHA = /^[a-f0-9]{40}$/i;

/** Fail closed: only accept an exact first-child commit with the expected message and files. */
export function classifyPushOutcome({ expectedHead, message, entries, head, commit, files, knownCommitSha }) {
  if (head === expectedHead) return { state: 'not_applied', verified: false };
  if (!commit || commit.message !== message || commit.parents?.[0]?.sha !== expectedHead) {
    return { state: 'unknown', verified: false };
  }
  if (knownCommitSha && head !== knownCommitSha) return { state: 'unknown', verified: false };
  if (!Array.isArray(files)) return { state: 'unknown', verified: false };
  const remote = new Map(files.filter((f) => f.type === 'blob').map((f) => [f.path, f]));
  const matching = entries.every(({ path, sha, mode }) => {
    const actual = remote.get(path);
    return sha === null ? !actual : Boolean(actual && actual.sha === sha && actual.mode === mode);
  });
  return matching ? { state: 'applied', verified: true, sha: head } : { state: 'unknown', verified: false };
}
export function assertVerificationPayload(data) {
  const { owner, repo, branch, expectedHead, message, entries, knownCommitSha } = data || {};
  assertRepoCoordinates(owner, repo, branch);
  if (!SHA.test(expectedHead || '')) throw new Error('Expected HEAD không hợp lệ.');
  if (typeof message !== 'string' || !message.trim() || message.length > 200) throw new Error('Commit message không hợp lệ.');
  if (knownCommitSha != null && !SHA.test(knownCommitSha)) throw new Error('Commit SHA không hợp lệ.');
  if (!Array.isArray(entries) || !entries.length || entries.length > LIMITS.commitEntries) throw new Error('Danh sách thay đổi không hợp lệ.');
  const unique = new Set();
  for (const entry of entries) {
    const path = assertSafeContentPath(entry?.path, { allowSensitive: entry?.sha === null || data.allowSensitiveCommit === true });
    if (unique.has(path)) throw new Error('Đường dẫn trùng.');
    unique.add(path);
    if (entry.sha !== null && !SHA.test(entry.sha || '')) throw new Error('File SHA không hợp lệ.');
    if (entry.sha !== null && !['100644', '100755'].includes(entry.mode)) throw new Error('Git mode không hợp lệ.');
  }
}
