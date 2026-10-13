import { LIMITS } from './constants.js';
import { assertRepoCoordinates, assertSafeContentPath, refPath } from './paths.js';

export class AppError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
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
    throw new AppError(`GitHub ${r.status}: ${message}`, r.status === 401 ? 401 : r.status === 403 ? 403 : r.status === 404 ? 404 : 400);
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

export async function createCommit(token, data) {
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
  const current = await snapshot(token, owner, repo, branch);
  if (current.head !== expectedHead) throw new AppError('Branch đã thay đổi kể từ preview. Hãy kiểm tra lại trước khi push.', 409);
  const base = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const newTree = await github(token, `${base}/git/trees`, 'POST', { base_tree: current.treeSha, tree: treeEntries });
  const commit = await github(token, `${base}/git/commits`, 'POST', { message: message.trim(), tree: newTree.sha, parents: [expectedHead] });
  try {
    await github(token, `${base}/git/refs/heads/${refPath(branch)}`, 'PATCH', { sha: commit.sha, force: false });
  } catch (error) {
    throw new AppError('Không cập nhật được branch (có thể branch protection hoặc có commit mới). Hãy preview lại. ' + error.message, 409);
  }
  return { sha: commit.sha, url: `https://github.com/${owner}/${repo}/commit/${commit.sha}`, changed: treeEntries.length };
}
