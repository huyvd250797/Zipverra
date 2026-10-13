import { LIMITS } from './constants.js';
import { assertRepoCoordinates, assertSafeContentPath, refPath } from './paths.js';

export class AppError extends Error {
  constructor(message, status = 400, details = {}) {
    super(message);
    this.status = status;
    this.code = details.code || 'APP_ERROR';
    this.stage = details.stage || null;
    this.hint = details.hint || null;
  }
}

export function githubStage(endpoint, method = 'GET') {
  const route = endpoint.split('?')[0];
  if (method === 'POST' && route.endsWith('/git/blobs')) return 'UPLOAD_BLOB';
  if (method === 'POST' && route.endsWith('/git/trees')) return 'CREATE_TREE';
  if (method === 'POST' && route.endsWith('/git/commits')) return 'CREATE_COMMIT';
  if (method === 'PATCH' && route.includes('/git/refs/')) return 'UPDATE_BRANCH';
  if (method === 'GET' && route.includes('/git/ref/heads/')) return 'READ_BRANCH';
  if (method === 'GET' && route.includes('/git/commits/')) return 'READ_COMMIT';
  if (method === 'GET' && route.includes('/git/trees/')) return 'READ_TREE';
  if (method === 'GET' && /^\/repos\/[^/]+\/[^/]+$/.test(route)) return 'REPO_ACCESS';
  if (method === 'GET' && route.startsWith('/user/repos')) return 'LIST_REPOS';
  return 'GITHUB_API';
}

const STAGE_TEXT = Object.freeze({
  UPLOAD_BLOB: 'upload file lên GitHub', CREATE_TREE: 'tạo cây Git', CREATE_COMMIT: 'tạo commit',
  UPDATE_BRANCH: 'cập nhật branch', READ_BRANCH: 'đọc branch', READ_COMMIT: 'đọc commit',
  READ_TREE: 'đọc cây Git', REPO_ACCESS: 'kiểm tra quyền repository', LIST_REPOS: 'tải danh sách repository',
  GITHUB_API: 'gọi GitHub API',
});

export function describeGithubError(status, message, endpoint, method = 'GET') {
  const stage = githubStage(endpoint, method);
  const hint = status === 404
    ? 'Kiểm tra Owner/Repository, branch, quyền ghi của OAuth App và phê duyệt của tổ chức GitHub (nếu có). Nếu vừa đổi quyền, hãy đăng xuất rồi đăng nhập lại.'
    : status === 403
      ? 'Kiểm tra quyền GitHub, GitHub Actions workflow scope và branch protection/ruleset của repository.'
      : status === 401
        ? 'Phiên cấp quyền GitHub đã bị thu hồi hoặc hết hạn. Hãy đăng xuất rồi đăng nhập lại.'
        : status === 422
          ? 'GitHub từ chối dữ liệu thay đổi hoặc quy tắc của branch. Hãy preview lại và kiểm tra các file bị xung đột.'
          : null;
  return new AppError(`GitHub ${status} tại bước ${STAGE_TEXT[stage]} (${stage}, ${method}): ${message}`, status === 401 || status === 403 || status === 404 || status === 409 || status === 422 ? status : 400,
    { code: 'GITHUB_API_ERROR', stage, hint });
}

export function isWorkflowFile(path) {
  return typeof path === 'string' && /^\.github\/workflows\/[^/]+\.ya?ml$/i.test(path);
}

export function parseOAuthScopes(scope) {
  if (Array.isArray(scope)) return scope.filter((s) => typeof s === 'string').map((s) => s.trim()).filter(Boolean);
  if (typeof scope === 'string') return scope.split(/[ ,]+/).map((s) => s.trim()).filter(Boolean);
  return [];
}

export function validateWorkflowScope(entries, scopes = []) {
  const workflowFiles = entries.filter((entry) => isWorkflowFile(entry?.path));
  if (workflowFiles.length && !parseOAuthScopes(scopes).includes('workflow')) {
    throw new AppError(`ZIP thay đổi ${workflowFiles.length} GitHub Actions workflow. Phiên OAuth thiếu scope workflow. Hãy Đăng xuất → Continue with GitHub để cấp lại quyền repo + workflow, sau đó phân tích ZIP lại.`, 403,
      { code: 'WORKFLOW_SCOPE_REQUIRED', stage: 'PREFLIGHT', hint: 'Cần scope workflow khi thêm/sửa .github/workflows/*.yml hoặc *.yaml.' });
  }
}

export function ensureToken(token) {
  if (typeof token !== 'string' || !token.trim() || token.length > 1024) {
    throw new AppError('Phiên xác thực GitHub không hợp lệ.');
  }
  return token.trim();
}

export async function github(token, endpoint, method = 'GET', body, fetcher = fetch) {
  ensureToken(token);
  const r = await fetcher(`https://api.github.com${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Zipverra',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    cache: 'no-store',
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(25000),
  });
  const raw = await r.text();
  let response;
  try { response = JSON.parse(raw); } catch { response = {}; }
  if (!r.ok) {
    const message = typeof response.message === 'string' ? response.message.slice(0, 320) : 'GitHub từ chối yêu cầu';
    throw describeGithubError(r.status, message, endpoint, method);
  }
  return response;
}

export async function listWritableRepos(token) {
  const repos = [];
  for (let page = 1; page <= 5; page += 1) {
    const data = await github(token, `/user/repos?per_page=100&page=${page}&sort=updated&affiliation=owner,collaborator,organization_member`);
    if (!Array.isArray(data)) throw new AppError('GitHub không trả về danh sách repository.');
    for (const r of data) {
      if (r.permissions?.push) repos.push({ full_name: r.full_name, private: Boolean(r.private), default_branch: r.default_branch });
    }
    if (data.length < 100) break;
  }
  return repos;
}

export async function preflight(token, owner, repo, branch, workflowPaths = [], scopes = []) {
  assertRepoCoordinates(owner, repo, branch);
  if (!Array.isArray(workflowPaths) || workflowPaths.length > LIMITS.commitEntries ||
    workflowPaths.some((x) => typeof x !== 'string' || x.length > 500 || !isWorkflowFile(x))) {
    throw new AppError('Danh sách workflow cần cập nhật không hợp lệ.');
  }
  validateWorkflowScope(workflowPaths.map((path) => ({ path })), scopes);
  const info = await github(token, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
  if (info.permissions?.push === false) {
    throw new AppError(`Tài khoản GitHub không có quyền push lên ${owner}/${repo}. Hãy kiểm tra quyền Write hoặc chọn repository khác.`, 403,
      { code: 'REPO_WRITE_DENIED', stage: 'PREFLIGHT' });
  }
  if (info.archived || info.disabled) throw new AppError('Repository đã archived hoặc disabled nên không thể push.', 403,
    { code: 'REPO_READ_ONLY', stage: 'PREFLIGHT' });
  return { writable: true, workflowPermission: parseOAuthScopes(scopes).includes('workflow') };
}

export async function snapshot(token, owner, repo, branch) {
  assertRepoCoordinates(owner, repo, branch);
  const base = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const ref = await github(token, `${base}/git/ref/heads/${refPath(branch)}`);
  if (!/^[a-f0-9]{40}$/i.test(ref.object?.sha || '')) throw new AppError('Không đọc được HEAD của branch.');
  const commit = await github(token, `${base}/git/commits/${ref.object.sha}`);
  const tree = await github(token, `${base}/git/trees/${commit.tree.sha}?recursive=1`);
  if (tree.truncated || !Array.isArray(tree.tree)) throw new AppError('Repository quá lớn để so sánh an toàn (GitHub tree truncated).');
  const files = tree.tree.filter((f) => f.type === 'blob' || f.type === 'commit');
  if (files.length > LIMITS.trackedFiles) throw new AppError(`Repo có hơn ${LIMITS.trackedFiles} file, vượt giới hạn MVP.`);
  return {
    head: ref.object.sha,
    treeSha: commit.tree.sha,
    files: files.map((f) => ({ path: f.path, sha: f.sha, mode: f.mode, type: f.type })),
  };
}

export async function createBlob(token, owner, repo, base64) {
  assertRepoCoordinates(owner, repo, 'main');
  if (typeof base64 !== 'string' || base64.length > 3_400_000 || (base64 && !/^[A-Za-z0-9+/]+={0,2}$/.test(base64))) {
    throw new AppError('Dữ liệu file Base64 không hợp lệ hoặc quá lớn.');
  }
  const decoded = Buffer.from(base64, 'base64');
  if (decoded.length > LIMITS.fileBytes || decoded.toString('base64') !== base64) {
    throw new AppError(`Một file vượt giới hạn ${LIMITS.fileBytes / 1_000_000} MB hoặc Base64 không hợp lệ.`);
  }
  const blob = await github(token, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/blobs`, 'POST', { content: base64, encoding: 'base64' });
  if (!/^[a-f0-9]{40}$/i.test(blob.sha || '')) throw new AppError('GitHub không trả về blob SHA hợp lệ.');
  return blob.sha;
}

export async function createCommit(token, data, scopes = []) {
  const { owner, repo, branch, expectedHead, message, entries } = data;
  assertRepoCoordinates(owner, repo, branch);
  if (!/^[a-f0-9]{40}$/i.test(expectedHead || '')) throw new AppError('Thiếu HEAD từ bản preview.');
  if (typeof message !== 'string' || !message.trim() || message.length > 200) throw new AppError('Commit message không hợp lệ.');
  if (!Array.isArray(entries) || !entries.length || entries.length > LIMITS.commitEntries) throw new AppError('Không có file cần commit hoặc số lượng thay đổi vượt giới hạn.');
  const paths = new Set();
  const treeEntries = entries.map((entry) => {
    if (!entry || typeof entry !== 'object') throw new AppError('File commit không hợp lệ.');
    const path = assertSafeContentPath(entry.path);
    if (paths.has(path)) throw new AppError('Có đường dẫn bị trùng khi commit.');
    paths.add(path);
    if (entry.sha !== null && !/^[a-f0-9]{40}$/i.test(entry.sha || '')) throw new AppError('Blob SHA không hợp lệ.');
    if (entry.sha !== null && entry.mode !== '100644' && entry.mode !== '100755') throw new AppError('File mode không hợp lệ.');
    return { path, mode: entry.sha === null ? '100644' : entry.mode, type: 'blob', sha: entry.sha };
  });
  validateWorkflowScope(treeEntries, scopes);
  const current = await snapshot(token, owner, repo, branch);
  if (current.head !== expectedHead) throw new AppError('Branch đã thay đổi kể từ preview. Hãy kiểm tra lại trước khi push.', 409);
  const base = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const newTree = await github(token, `${base}/git/trees`, 'POST', { base_tree: current.treeSha, tree: treeEntries });
  const commit = await github(token, `${base}/git/commits`, 'POST', { message: message.trim(), tree: newTree.sha, parents: [expectedHead] });
  try {
    await github(token, `${base}/git/refs/heads/${refPath(branch)}`, 'PATCH', { sha: commit.sha, force: false });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Không xác nhận được cập nhật branch. Hãy kiểm tra commit trên GitHub trước khi thử lại.', 502,
      { code: 'BRANCH_UPDATE_UNCONFIRMED', stage: 'UPDATE_BRANCH' });
  }
  return { sha: commit.sha, url: `https://github.com/${owner}/${repo}/commit/${commit.sha}`, changed: treeEntries.length };
}
