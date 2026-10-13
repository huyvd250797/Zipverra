import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { AppError, github, preflight, assertAppRepoGrant, isWorkflowFile } from './github.js';
import { LIMITS } from './constants.js';
import { assertRepoCoordinates, assertSafeContentPath, refPath } from './paths.js';

const SHA = /^[a-f\d]{40}$/i;
const PROOF_TTL_MS = 10 * 60 * 1000;
const PAGE_SIZE = 20;

function sha(value, label = 'Commit SHA') {
  if (typeof value !== 'string' || !SHA.test(value)) throw new AppError(`${label} không hợp lệ.`, 400, { code: 'INVALID_SHA' });
  return value.toLowerCase();
}
function base(owner, repo) { return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`; }
function cleanMessage(value) { return typeof value === 'string' ? value.slice(0, 220) : ''; }
function summary(commit) {
  return {
    sha: commit.sha,
    message: cleanMessage(commit.commit?.message || commit.message).split('\n')[0],
    author: commit.author?.login || commit.commit?.author?.name || commit.author?.name || 'Unknown',
    date: commit.commit?.author?.date || commit.author?.date || null,
    url: commit.html_url || null,
  };
}

/** Read only a bounded page of commits visible through the signed-in GitHub App user token. */
export async function listHistory(token, { owner, repo, branch, page = 1 }) {
  assertRepoCoordinates(owner, repo, branch);
  if (!Number.isInteger(page) || page < 1 || page > 25) throw new AppError('Trang lịch sử không hợp lệ.');
  await assertAppRepoGrant(token, owner, repo);
  const result = await github(token, `${base(owner, repo)}/commits?sha=${encodeURIComponent(branch)}&per_page=${PAGE_SIZE}&page=${page}`);
  if (!Array.isArray(result)) throw new AppError('GitHub không trả về lịch sử commit hợp lệ.', 502);
  return { commits: result.map(summary), page, hasMore: result.length === PAGE_SIZE };
}

async function readBranchHead(token, owner, repo, branch) {
  const ref = await github(token, `${base(owner, repo)}/git/ref/heads/${refPath(branch)}`);
  return sha(ref.object?.sha, 'Branch HEAD');
}

async function commitTree(token, owner, repo, commitSha) {
  const id = sha(commitSha);
  const commit = await github(token, `${base(owner, repo)}/git/commits/${id}`);
  if (commit.sha && commit.sha.toLowerCase() !== id) throw new AppError('GitHub trả về commit khác yêu cầu.', 502);
  const treeSha = sha(commit.tree?.sha, 'Git tree SHA');
  const tree = await github(token, `${base(owner, repo)}/git/trees/${treeSha}?recursive=1`);
  if (tree.truncated || !Array.isArray(tree.tree)) throw new AppError('Cây Git bị rút gọn; không thể rollback an toàn.', 422, { code: 'TREE_TRUNCATED' });
  const tracked = tree.tree.filter((entry) => entry.type === 'blob' || entry.type === 'commit');
  if (tracked.length > LIMITS.trackedFiles) throw new AppError('Repository vượt giới hạn số file hỗ trợ khi rollback.', 422, { code: 'HISTORY_REPO_TOO_LARGE' });
  return { sha: id, treeSha, message: cleanMessage(commit.message), parents: commit.parents || [], files: tracked };
}

/** Compare complete Git trees, not GitHub's possibly truncated commit-file pagination. */
export function computeVersionChanges(current, target) {
  const a = new Map(current.map((entry) => [entry.path, entry]));
  const b = new Map(target.map((entry) => [entry.path, entry]));
  const paths = [...new Set([...a.keys(), ...b.keys()])].sort();
  const changes = [];
  for (const path of paths) {
    const from = a.get(path), to = b.get(path);
    if (from?.sha === to?.sha && from?.mode === to?.mode && from?.type === to?.type) continue;
    // Do not silently restore symlinks (120000), submodules (160000), or insecure filenames.
    try { assertSafeContentPath(path); }
    catch { throw new AppError(`Rollback chứa đường dẫn nhạy cảm hoặc không an toàn: ${path}.`, 422, { code: 'ROLLBACK_UNSAFE_PATH' }); }
    if ([from, to].some((entry) => entry && (entry.type !== 'blob' || !['100644', '100755'].includes(entry.mode)))) {
      throw new AppError(`Rollback thay đổi symlink/submodule hoặc Git mode đặc biệt: ${path}.`, 422, { code: 'ROLLBACK_UNSUPPORTED_MODE' });
    }
    changes.push({ path, kind: !from ? 'add' : !to ? 'delete' : 'modify', before: from?.sha || null, after: to?.sha || null });
  }
  if (changes.length > LIMITS.commitEntries) {
    throw new AppError(`Rollback thay đổi ${changes.length} file, vượt giới hạn ${LIMITS.commitEntries}.`, 422, { code: 'ROLLBACK_TOO_LARGE' });
  }
  return changes;
}

function changeSummary(changes) {
  return { add: changes.filter((x) => x.kind === 'add').length,
    modify: changes.filter((x) => x.kind === 'modify').length,
    delete: changes.filter((x) => x.kind === 'delete').length };
}
function digest(changes) { return createHash('sha256').update(JSON.stringify(changes)).digest('hex'); }
function secret(env) {
  if (typeof env.SESSION_SECRET !== 'string' || env.SESSION_SECRET.length < 32)
    throw new AppError('SESSION_SECRET chưa cấu hình hợp lệ trên server.', 503, { code: 'ROLLBACK_SIGNING_MISSING' });
  return env.SESSION_SECRET;
}
export function signRollbackProof(payload, env = process.env) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = createHmac('sha256', secret(env)).update(body).digest('base64url');
  return `${body}.${mac}`;
}
export function validateRollbackProof(token, env = process.env, now = Date.now()) {
  if (typeof token !== 'string' || token.length > 2500 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token))
    throw new AppError('Preview token không hợp lệ, cần xem trước rollback lại.', 400, { code: 'ROLLBACK_PROOF_INVALID' });
  const [body, mac] = token.split('.');
  const expected = createHmac('sha256', secret(env)).update(body).digest();
  const actual = Buffer.from(mac, 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    throw new AppError('Preview bị thay đổi. Cần xem trước rollback lại.', 403, { code: 'ROLLBACK_PROOF_TAMPERED' });
  let proof;
  try { proof = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); }
  catch { throw new AppError('Preview token không hợp lệ.', 400, { code: 'ROLLBACK_PROOF_INVALID' }); }
  if (!Number.isSafeInteger(proof.at) || now < proof.at - 30_000 || now - proof.at > PROOF_TTL_MS || !SHA.test(proof.head || '') || !SHA.test(proof.target || '') || !/^[a-f0-9]{64}$/i.test(proof.digest || ''))
    throw new AppError('Preview rollback hết hạn hoặc không hợp lệ (10 phút). Vui lòng xem trước lại.', 409, { code: 'ROLLBACK_PROOF_EXPIRED' });
  assertRepoCoordinates(proof.owner, proof.repo, proof.branch);
  return proof;
}

async function assertAncestor(token, owner, repo, target, head) {
  if (target === head) return;
  const relation = await github(token, `${base(owner, repo)}/compare/${target}...${head}?per_page=1`);
  if (relation.status !== 'ahead' || !Number.isInteger(relation.ahead_by) || relation.ahead_by < 1) {
    throw new AppError('Phiên bản đích không phải tổ tiên của branch hiện tại. Không cho phép rollback sang commit ngoài lịch sử.', 409,
      { code: 'ROLLBACK_NOT_ANCESTOR' });
  }
}

async function planRollback(token, { owner, repo, branch, targetSha }, checkPermission = true) {
  assertRepoCoordinates(owner, repo, branch);
  const target = sha(targetSha, 'Target commit');
  if (checkPermission) await assertAppRepoGrant(token, owner, repo);
  const head = await readBranchHead(token, owner, repo, branch);
  if (head === target) throw new AppError('Branch đã ở commit được chọn, không cần rollback.', 409, { code: 'ROLLBACK_NO_CHANGES' });
  await assertAncestor(token, owner, repo, target, head);
  const [current, previous] = await Promise.all([commitTree(token, owner, repo, head), commitTree(token, owner, repo, target)]);
  const changes = computeVersionChanges(current.files, previous.files);
  if (changes.length === 0) throw new AppError('Hai commit có cùng cây source, không cần rollback.', 409, { code: 'ROLLBACK_NO_CHANGES' });
  const workflowPaths = changes.filter((c) => isWorkflowFile(c.path)).map((c) => c.path);
  await preflight(token, owner, repo, branch, workflowPaths);
  return { owner, repo, branch, head, target, treeSha: previous.treeSha, changes, counts: changeSummary(changes), fingerprint: digest(changes), workflowPaths };
}

export async function previewRollback(token, coordinates, env = process.env, now = Date.now()) {
  const plan = await planRollback(token, coordinates);
  const proof = signRollbackProof({ owner: plan.owner, repo: plan.repo, branch: plan.branch, head: plan.head, target: plan.target, digest: plan.fingerprint, at: now }, env);
  return { owner: plan.owner, repo: plan.repo, branch: plan.branch, head: plan.head, targetSha: plan.target,
    counts: plan.counts, total: plan.changes.length, changes: plan.changes,
    workflowChanged: plan.workflowPaths.length > 0, proof, expiresAt: new Date(now + PROOF_TTL_MS).toISOString() };
}

export async function compareVersions(token, { owner, repo, baseSha, headSha }) {
  assertRepoCoordinates(owner, repo, 'main');
  await assertAppRepoGrant(token, owner, repo);
  const [oldSnap, newSnap] = await Promise.all([commitTree(token, owner, repo, sha(baseSha)), commitTree(token, owner, repo, sha(headSha))]);
  const changes = computeVersionChanges(oldSnap.files, newSnap.files);
  return { baseSha: oldSnap.sha, headSha: newSnap.sha, changes, counts: changeSummary(changes), total: changes.length };
}

/** Read-only verification for ambiguous network errors; never creates a commit. */
export async function verifyRollback(token, { owner, repo, branch, expectedHead, targetSha, knownCommitSha = null }) {
  assertRepoCoordinates(owner, repo, branch);
  await assertAppRepoGrant(token, owner, repo);
  const headWas = sha(expectedHead, 'Expected HEAD');
  const target = sha(targetSha, 'Target SHA');
  const known = knownCommitSha == null ? null : sha(knownCommitSha);
  const current = await readBranchHead(token, owner, repo, branch);
  if (current === headWas) return { state: 'not_applied', head: current };
  if (known && current !== known) return { state: 'unknown', head: current };
  const commit = await commitTree(token, owner, repo, current);
  const targetCommit = await commitTree(token, owner, repo, target);
  const expectedMessage = `Zipverra rollback to ${target.slice(0, 12)}`;
  if (commit.parents?.[0]?.sha?.toLowerCase() === headWas && commit.treeSha === targetCommit.treeSha && commit.message === expectedMessage) {
    return { state: 'applied', sha: current, url: `https://github.com/${owner}/${repo}/commit/${current}`, head: current };
  }
  return { state: 'unknown', head: current };
}

/** One revert commit that points to the selected immutable tree, never force-push. */
export async function executeRollback(token, { proof, confirmation }, env = process.env, now = Date.now()) {
  if (confirmation !== 'ROLLBACK') throw new AppError('Nhập ROLLBACK để xác nhận.', 400, { code: 'ROLLBACK_CONFIRM_REQUIRED' });
  const checked = validateRollbackProof(proof, env, now);
  const plan = await planRollback(token, { owner: checked.owner, repo: checked.repo, branch: checked.branch, targetSha: checked.target });
  if (plan.head !== checked.head || plan.fingerprint !== checked.digest) throw new AppError('Branch hoặc bản preview đã thay đổi. Hãy xem trước rollback lại.', 409, { code: 'ROLLBACK_STALE_HEAD' });
  const endpoint = base(plan.owner, plan.repo);
  const message = `Zipverra rollback to ${plan.target.slice(0, 12)}`;
  const created = await github(token, `${endpoint}/git/commits`, 'POST', { message, tree: plan.treeSha, parents: [plan.head] });
  const createdSha = sha(created.sha, 'Rollback commit SHA');
  let updateError = null;
  try { await github(token, `${endpoint}/git/refs/heads/${refPath(plan.branch)}`, 'PATCH', { sha: createdSha, force: false }); }
  catch (e) { updateError = e; }
  let verified;
  try { verified = await verifyRollback(token, { owner: plan.owner, repo: plan.repo, branch: plan.branch, expectedHead: plan.head, targetSha: plan.target, knownCommitSha: createdSha }); }
  catch { verified = { state: 'unknown' }; }
  if (verified.state === 'applied') return { ...verified, changed: plan.changes.length, recovered: Boolean(updateError) };
  if (updateError && verified.state === 'not_applied' && [401, 403, 404, 409, 422].includes(updateError.status)) throw updateError;
  // Do not auto-recreate a rollback commit or blindly replay PATCH on an uncertain outcome.
  throw new AppError(`Rollback chưa xác minh được. Commit dự kiến: ${createdSha}. Vào History → Xác minh rollback, KHÔNG nhấn rollback lần nữa.`, 503,
    { code: 'ROLLBACK_UNCONFIRMED', stage: 'VERIFY_ROLLBACK', hint: `knownCommitSha=${createdSha}` });
}
