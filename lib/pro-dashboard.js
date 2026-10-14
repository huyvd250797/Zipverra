/** Minimal read-only GitHub dashboard; only installed/writable repositories accepted. */
import { AppError, github, listWritableRepos } from './github.js';
import { validRepoName } from './pro-workspace.js';

export function dashboardRequest(repositories) {
  if (!Array.isArray(repositories) || repositories.length > 5 ||
      repositories.some(name => !validRepoName(name))) throw new AppError('Tối đa 5 repository hợp lệ mỗi lần tải dashboard.');
  return [...new Set(repositories.map(n=>n.toLowerCase()))];
}

export async function loadProDashboard(token, repositories, { list = listWritableRepos, fetchGithub = github } = {}) {
  const names = dashboardRequest(repositories);
  const allowed = await list(token);
  const grants = new Map((allowed.repos || []).map(r=>[r.full_name.toLowerCase(),r]));
  // Never accept arbitrary repositories from a browser or return private data for non-installed repositories.
  for (const n of names) if (!grants.has(n)) throw new AppError('Repository không được GitHub App cấp quyền.',403,{code:'DASHBOARD_REPOSITORY_DENIED'});
  const items = await Promise.all(names.map(async name => {
    const r = grants.get(name); const branch = r.default_branch || 'main';
    const [owner,repo] = r.full_name.split('/');
    try {
      const commits = await fetchGithub(token, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?sha=${encodeURIComponent(branch)}&per_page=1`);
      if (!Array.isArray(commits) || !commits[0] || !/^[a-f\d]{40}$/i.test(commits[0].sha||'')) throw Error('Không đọc được commit gần nhất.');
      const top=commits[0];
      return {repo:r.full_name,branch,sha:top.sha,status:'ok',
        message:String(top.commit?.message || '').split('\n')[0].slice(0,100),date:String(top.commit?.committer?.date || '').slice(0,50)};
    } catch { return {repo:r.full_name,branch,sha:'',status:'error',message:'Không đọc được HEAD. Kiểm tra quyền hoặc thử Refresh.',date:''}; }
  }));
  return {fetchedAt:Date.now(),items};
}
