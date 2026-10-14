/** Zipverra Pro v2 — local, non-sensitive workspace metadata only. */
export const PRO_VERSION = '2.0.0';
export const PRO_PROFILES_KEY = 'zipverra.pro.profiles.v2';
export const PRO_ACTIVITY_KEY = 'zipverra.pro.activity.v2';
export const PRO_DASHBOARD_KEY = 'zipverra.pro.dashboard.v2';
const REPO = /^[a-z\d](?:[a-z\d-]{0,38})\/[\w.-]{1,100}$/i;
const BRANCH_PART = /^[\w-][\w.-]*$/;
const MAX_PROFILE_COUNT = 30;

export function accountStorageKey(base, user) {
  const login = typeof user === 'string' ? user : user?.login;
  if (!/^[a-z\d](?:[a-z\d-]{0,38})$/i.test(login || '')) return null;
  return `${base}:${login.toLowerCase()}`;
}
export function validRepoName(name) {
  return typeof name === 'string' && name.length <= 140 && REPO.test(name) &&
    !name.split('/').some(p => p === '.' || p === '..' || p.endsWith('.lock'));
}
export function validBranchName(name) {
  return typeof name === 'string' && name.length <= 240 && !name.includes('..') && !name.includes('//') &&
    !name.includes('@{') && name.split('/').every(p => BRANCH_PART.test(p) && !p.startsWith('.') && !p.endsWith('.') && !p.endsWith('.lock'));
}
export function createPushProfile(input, now = Date.now()) {
  if (!validRepoName(input?.repo) || !validBranchName(input?.branch)) throw new Error('Repository hoặc branch không hợp lệ.');
  if (!['merge','sync'].includes(input.mode) || !['direct','pr'].includes(input.strategy)) throw new Error('Chế độ cập nhật không hợp lệ.');
  return Object.freeze({ repo: input.repo, branch: input.branch, mode: input.mode, strategy: input.strategy, updatedAt: now });
}
export function normalizeProfiles(input, allowedRepos = null) {
  if (!Array.isArray(input)) return [];
  const allowed = Array.isArray(allowedRepos) ? new Set(allowedRepos.filter(validRepoName).map(x => x.toLowerCase())) : null;
  const seen = new Set(), result = [];
  for (const raw of input.slice(0, 100)) {
    try {
      const profile = createPushProfile(raw, Number.isSafeInteger(raw.updatedAt) && raw.updatedAt >= 0 ? raw.updatedAt : 0);
      const key = profile.repo.toLowerCase();
      if (seen.has(key) || (allowed && !allowed.has(key))) continue;
      seen.add(key); result.push(profile);
      if (result.length >= MAX_PROFILE_COUNT) break;
    } catch { /* ignore corrupt or malformed profile */ }
  }
  return result;
}
export function upsertProfile(input, profile) {
  const valid = createPushProfile(profile);
  return [valid,...normalizeProfiles(input).filter(p => p.repo.toLowerCase() !== valid.repo.toLowerCase())].slice(0, MAX_PROFILE_COUNT);
}
export function removeProfile(input, repo) {
  return normalizeProfiles(input).filter(p => p.repo.toLowerCase() !== (repo || '').toLowerCase());
}
export const ACTIVITY_KINDS = Object.freeze(['push','pr','merge','rollback','quick-edit','system']);
export const ACTIVITY_STATES = Object.freeze(['success','warning','failed','pending']);
export function addActivity(previous, input, now = Date.now()) {
  const before = normalizeActivity(previous);
  if (!ACTIVITY_KINDS.includes(input?.kind) || !ACTIVITY_STATES.includes(input?.state)) return before;
  const repo = validRepoName(input.repo) ? input.repo : '';
  const sha = typeof input.sha === 'string' && /^[a-f\d]{40}$/i.test(input.sha) ? input.sha.toLowerCase() : '';
  const message = typeof input.message === 'string' ? input.message.replace(/[\x00-\x1f]/g, ' ').slice(0, 100) : '';
  const value = { id: `${now}-${Math.random().toString(36).slice(2,9)}`, at: now, kind: input.kind, state: input.state, repo, sha, message };
  return [value,...before].slice(0, 50);
}
export function normalizeActivity(input, now = Date.now()) {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 100).filter(x => x && typeof x.id === 'string' && x.id.length < 70 &&
    Number.isSafeInteger(x.at) && x.at > 0 && x.at <= now+60000 &&
    ACTIVITY_KINDS.includes(x.kind) && ACTIVITY_STATES.includes(x.state) &&
    (x.repo === '' || validRepoName(x.repo)) &&
    (x.sha === '' || /^[a-f\d]{40}$/i.test(x.sha)) &&
    typeof x.message === 'string' && x.message.length <= 100).slice(0,50)
    .map(({id,at,kind,state,repo,sha,message}) => ({id,at,kind,state,repo,sha,message}));
}
export function proSnapshot(input, now = Date.now()) {
  if (!input || !Array.isArray(input.items) || !Number.isFinite(input.fetchedAt) || input.fetchedAt <= 0 || input.fetchedAt > now + 60000) return null;
  const items = input.items.slice(0,5).filter(x => validRepoName(x.repo) &&
    (x.sha === '' || /^[a-f\d]{40}$/i.test(x.sha)) &&
    typeof x.branch === 'string' && validBranchName(x.branch) &&
    typeof x.status === 'string' && ['ok','error'].includes(x.status))
    .map(({repo,branch,sha,status,message,date}) => ({repo,branch,sha,status,message:typeof message==='string'?message.slice(0,100):'',date:typeof date==='string'?date.slice(0,50):''}));
  return {fetchedAt:input.fetchedAt,items};
}
export function dashboardRepos(repos, favorites, recents, current, limit=5) {
  const allowed = new Map((Array.isArray(repos)?repos:[]).filter(x => validRepoName(x.full_name)).map(x => [x.full_name.toLowerCase(),x.full_name]));
  const order = [...(current?[current]:[]),...(favorites||[]),...(recents||[])];
  const result = [], seen = new Set();
  for (const name of order) {
    const real=allowed.get(typeof name==='string'?name.toLowerCase():'');
    if (!real || seen.has(real.toLowerCase())) continue;
    seen.add(real.toLowerCase()); result.push(real);
    if (result.length>=limit) break;
  }
  return result;
}
