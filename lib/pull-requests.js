import { AppError, assertAppRepoGrant, github, snapshot } from './github.js';
import { assertRepoCoordinates, refPath } from './paths.js';
import { assertReleaseBranch } from './branch-names.js';

const SHA = /^[a-f0-9]{40}$/i;
const MAX_PR_TITLE = 120;

export function pullRequestPermission(installations, owner) {
  return installations.some(i => i.account?.toLowerCase() === owner.toLowerCase() && i.permissions?.pull_requests === 'write');
}

export async function assertPullRequestGrant(token, owner, repo) {
  // Reuse the installation-level contents and user write grant, then explicitly verify PR permission.
  await assertAppRepoGrant(token, owner, repo);
  const { appInstallations } = await import('./github.js');
  const installs = await appInstallations(token);
  if (!pullRequestPermission(installs, owner)) throw new AppError(
    'GitHub App thiếu Pull requests: Read & write. Vào Settings → Manage GitHub App → Permissions & events để cấp quyền, phê duyệt lại installation rồi Refresh.',
    403, { code: 'APP_PULL_REQUEST_PERMISSION_REQUIRED', stage: 'PREFLIGHT', hint: 'Direct Push vẫn dùng được nếu branch cho phép; PR cần quyền Pull requests: write.' });
  return true;
}

/** Branch is created from the exact base HEAD that was reviewed; never reset an existing branch. */
export async function createReleaseBranch(token, data) {
  const { owner, repo, baseBranch, expectedBaseHead, sourceBranch } = data || {};
  assertRepoCoordinates(owner, repo, baseBranch);
  assertReleaseBranch(sourceBranch);
  if (sourceBranch === baseBranch || !SHA.test(expectedBaseHead || '')) throw new AppError('Branch hoặc base HEAD không hợp lệ.');
  await assertPullRequestGrant(token, owner, repo);
  const base = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const current = await snapshot(token, owner, repo, baseBranch);
  if (current.head !== expectedBaseHead) throw new AppError('Branch đích đã thay đổi từ lúc Review. Hãy phân tích ZIP lại.', 409, { code: 'BASE_HEAD_CHANGED' });
  const sourceRef = `${base}/git/ref/heads/${refPath(sourceBranch)}`;
  try {
    await github(token, sourceRef);
    throw new AppError('Branch này đã tồn tại. Không ghi đè: hãy tạo tên branch khác và phân tích lại.', 409, { code: 'RELEASE_BRANCH_EXISTS' });
  } catch (e) {
    if (!(e instanceof AppError) || e.code !== 'GITHUB_API_ERROR' || e.status !== 404) throw e;
  }
  let recovered = false;
  try {
    const created = await github(token, `${base}/git/refs`, 'POST', { ref: `refs/heads/${sourceBranch}`, sha: expectedBaseHead });
    if (created.object?.sha !== expectedBaseHead || created.ref !== `refs/heads/${sourceBranch}`) throw new AppError('GitHub chưa xác nhận đúng branch mới.', 503);
  } catch (error) {
    // The mutation may have succeeded before a timeout. Reconcile the ref once; never blind-retry POST.
    let confirmed = false;
    try {
      const existing = await github(token, sourceRef);
      confirmed = existing.object?.sha === expectedBaseHead;
    } catch { /* preserve original failure */ }
    if (!confirmed) throw error;
    recovered = true;
  }
  // Check base again even after an ambiguous create response. A changed base must never be silently accepted.
  const baseAfter = await github(token, `${base}/git/ref/heads/${refPath(baseBranch)}`);
  if (baseAfter.object?.sha !== expectedBaseHead) throw new AppError(
    'Branch đích đã thay đổi trong khi tạo branch. Không commit tiếp. Kiểm tra branch mới trên GitHub rồi phân tích lại.',
    409, { code: 'BASE_HEAD_CHANGED' });
  return { branch: sourceBranch, baseBranch, head: expectedBaseHead, ...(recovered ? { recovered: true } : {}) };
}

function checkPRInput(data) {
  const { owner, repo, baseBranch, sourceBranch, expectedSourceHead, title } = data || {};
  assertRepoCoordinates(owner, repo, baseBranch);
  assertReleaseBranch(sourceBranch);
  if (baseBranch === sourceBranch || !SHA.test(expectedSourceHead || '')) throw new AppError('Dữ liệu tạo PR không hợp lệ.');
  if (typeof title !== 'string' || !title.trim() || title.length > MAX_PR_TITLE || /[\r\n\x00-\x1f]/.test(title)) throw new AppError('Tiêu đề PR không hợp lệ.');
  return { owner, repo, baseBranch, sourceBranch, expectedSourceHead, title: title.trim() };
}

function prSummary(pr) {
  return { number: pr.number, title: pr.title, state: pr.state, draft: !!pr.draft,
    url: pr.html_url, head: pr.head?.sha, sourceBranch: pr.head?.ref, baseBranch: pr.base?.ref,
    mergeable: pr.mergeable, mergeableState: pr.mergeable_state, merged: !!pr.merged };
}

async function findExistingPR(token, owner, repo, baseBranch, sourceBranch) {
  const base = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  // Cross-owner PRs cannot impersonate a release branch; use the repo owner in the `head` filter.
  const data = await github(token, `${base}/pulls?state=all&head=${encodeURIComponent(`${owner}:${sourceBranch}`)}&base=${encodeURIComponent(baseBranch)}&per_page=30`);
  if (!Array.isArray(data)) throw new AppError('GitHub không trả về danh sách PR hợp lệ.', 502);
  return data.find(pr => pr.head?.ref === sourceBranch && pr.head?.repo?.full_name?.toLowerCase() === `${owner}/${repo}`.toLowerCase() && pr.base?.ref === baseBranch);
}

/** Idempotent when a timeout happens after GitHub accepted POST /pulls. */
export async function ensurePullRequest(token, data) {
  const { owner, repo, baseBranch, sourceBranch, expectedSourceHead, title } = checkPRInput(data);
  await assertPullRequestGrant(token, owner, repo);
  const base = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const sourceRef = await github(token, `${base}/git/ref/heads/${refPath(sourceBranch)}`);
  if (sourceRef.object?.sha !== expectedSourceHead) throw new AppError('Branch PR đã thay đổi. Không tự mở PR cho commit khác; hãy kiểm tra lại.', 409, { code: 'PR_SOURCE_CHANGED' });
  const existing = await findExistingPR(token, owner, repo, baseBranch, sourceBranch);
  if (existing) {
    if (existing.state !== 'open') throw new AppError('Pull Request cho branch này đã đóng hoặc merge. Hãy kiểm tra PR trên GitHub trước khi tạo branch mới.', 409, { code: 'PR_ALREADY_CLOSED' });
    if (existing.head.sha !== expectedSourceHead) throw new AppError('Pull Request hiện tại trỏ tới commit khác.', 409);
    return { ...prSummary(existing), reused: true };
  }
  try {
    const created = await github(token, `${base}/pulls`, 'POST', {
      title, head: sourceBranch, base: baseBranch, draft: false,
      body: `Created with Zipverra v1.12.0.\n\nSource branch: \`${sourceBranch}\`\nTarget: \`${baseBranch}\`\nCommit: \`${expectedSourceHead}\`\n\nReview the changes and CI checks before merging.`,
    });
    if (!Number.isSafeInteger(created.number) || created.number < 1 || created.head?.sha !== expectedSourceHead) throw new AppError('GitHub chưa xác nhận Pull Request đúng commit.', 503);
    return { ...prSummary(created), reused: false };
  } catch (err) {
    try {
      const recovered = await findExistingPR(token, owner, repo, baseBranch, sourceBranch);
      if (recovered?.head?.sha === expectedSourceHead && recovered.state === 'open') return { ...prSummary(recovered), reused: true, recovered: true };
    } catch { /* Preserve original error */ }
    throw err;
  }
}

export async function branchPullRequestOverview(token, data) {
  const { owner, repo } = data || {};
  assertRepoCoordinates(owner, repo, 'main');
  await assertAppRepoGrant(token, owner, repo);
  const base = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const [branches, prs] = await Promise.all([
    github(token, `${base}/branches?per_page=60`),
    github(token, `${base}/pulls?state=open&per_page=50&sort=updated&direction=desc`),
  ]);
  if (!Array.isArray(branches) || !Array.isArray(prs)) throw new AppError('GitHub không trả về danh sách branch/PR hợp lệ.', 502);
  return {
    branches: branches.filter(b => typeof b.name === 'string').map(b => ({ name:b.name, protected: !!b.protected, sha:b.commit?.sha || '' })),
    prs: prs.filter(p => Number.isSafeInteger(p.number)).map(prSummary),
  };
}

export async function mergePullRequest(token, data) {
  const { owner, repo, number, expectedSourceHead, confirmation } = data || {};
  assertRepoCoordinates(owner, repo, 'main');
  if (!Number.isSafeInteger(number) || number < 1 || number > 1_000_000_000 || !SHA.test(expectedSourceHead || '') || confirmation !== 'MERGE') {
    throw new AppError('Cần xác nhận MERGE và cung cấp commit SHA đã xem trước.', 400);
  }
  await assertPullRequestGrant(token, owner, repo);
  const base = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const pr = await github(token, `${base}/pulls/${number}`);
  if (pr.state !== 'open' || pr.draft || pr.merged || pr.head?.sha !== expectedSourceHead ||
      pr.head?.repo?.full_name?.toLowerCase() !== `${owner}/${repo}`.toLowerCase() ||
      typeof pr.base?.ref !== 'string') {
    throw new AppError('PR đã thay đổi/không thể merge. Hãy Refresh và kiểm tra lại.', 409, { code: 'STALE_PR' });
  }
  if (pr.mergeable !== true || pr.mergeable_state !== 'clean') {
    throw new AppError('GitHub chưa xác nhận PR có thể merge (conflict, draft, blocked hoặc trạng thái đang tính). Hãy kiểm tra PR trên GitHub.', 409, { code: 'PR_NOT_MERGEABLE' });
  }
  // Let GitHub enforce required reviews, status checks, branch protection and rulesets.
  // `sha` protects against a new commit landing on the PR between read and merge.
  try {
    const merged = await github(token, `${base}/pulls/${number}/merge`, 'PUT', { sha: expectedSourceHead, merge_method: 'merge' });
    if (!merged.merged || !SHA.test(merged.sha || '')) throw new AppError('GitHub chưa xác nhận PR đã được merge.', 503);
    return { merged: true, sha: merged.sha, url: `https://github.com/${owner}/${repo}/pull/${number}` };
  } catch (error) {
    // A network timeout after merge is ambiguous: check PR state first, never re-send PUT blindly.
    try {
      const after = await github(token, `${base}/pulls/${number}`);
      if (after.merged && after.head?.sha === expectedSourceHead) return { merged: true, sha: after.merge_commit_sha, url: after.html_url, recovered: true };
    } catch { /* error stays ambiguous */ }
    throw error;
  }
}
