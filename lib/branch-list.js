/** Minimal read-only branch picker, independent of Pull Requests permission. */
import { AppError, assertAppRepoGrant, github } from './github.js';
import { assertRepoCoordinates } from './paths.js';

export async function listAuthorizedBranches(token, { owner, repo } = {}) {
  assertRepoCoordinates(owner, repo, 'main');
  await assertAppRepoGrant(token, owner, repo);
  const items = await github(token, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches?per_page=100`);
  if (!Array.isArray(items)) throw new AppError('GitHub không trả về danh sách branch hợp lệ.', 502);
  return {
    branches: items.filter(item => typeof item.name === 'string' && item.name.length > 0 && item.name.length <= 240)
      .map(({ name, protected: isProtected, commit }) => ({ name, protected: !!isProtected, sha: /^[a-f0-9]{40}$/i.test(commit?.sha || '') ? commit.sha : '' })),
    truncated: items.length >= 100,
  };
}
