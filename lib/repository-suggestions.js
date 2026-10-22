/** Local, account-scoped usage metadata for quick repository selection.
 * Never store tokens or infer access from this data: the API-authorized repo
 * list is always the only source of valid suggestions.
 */
import { validRepoName } from './pro-workspace.js';

export const REPO_USAGE_KEY = 'zipverra.repositoryUsage.v1';
const MAX_ITEMS = 50;
const MAX_COUNT = 100000;
const MAX_TIME_DRIFT = 60_000;

export function normalizeRepositoryUsage(input, now = Date.now()) {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of input.slice(0, 160)) {
    if (!raw || !validRepoName(raw.repo) || !Number.isSafeInteger(raw.count) || raw.count < 1 || raw.count > MAX_COUNT ||
        !Number.isSafeInteger(raw.lastUsed) || raw.lastUsed < 0 || raw.lastUsed > now + MAX_TIME_DRIFT) continue;
    const key = raw.repo.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ repo: raw.repo, count: raw.count, lastUsed: raw.lastUsed });
    if (out.length >= MAX_ITEMS) break;
  }
  return out;
}

export function recordRepositorySelection(input, name, allowedRepos = [], now = Date.now()) {
  const before = normalizeRepositoryUsage(input, now);
  const allowed = new Map((Array.isArray(allowedRepos) ? allowedRepos : [])
    .filter(r => validRepoName(r?.full_name)).map(r => [r.full_name.toLowerCase(), r.full_name]));
  if (!validRepoName(name) || !allowed.has(name.toLowerCase())) return before;
  const repo = allowed.get(name.toLowerCase());
  const previous = before.find(item => item.repo.toLowerCase() === repo.toLowerCase());
  return [{ repo, count: Math.min(MAX_COUNT, (previous?.count ?? 0) + 1), lastUsed: now },
    ...before.filter(item => item.repo.toLowerCase() !== repo.toLowerCase())].slice(0, MAX_ITEMS);
}

export function repositoryQuickPicks(repos = [], usage = [], recents = [], favorites = [], limit = 3) {
  // This filter must run every time, including after GitHub App permission changes.
  const allowed = new Map((Array.isArray(repos) ? repos : [])
    .filter(r => validRepoName(r?.full_name)).map(r => [r.full_name.toLowerCase(), r]));
  const max = Math.min(Math.max(Number.isInteger(limit) ? limit : 3, 1), 4);
  const used = normalizeRepositoryUsage(usage).filter(entry => allowed.has(entry.repo.toLowerCase()));
  const frequent = used.filter(entry => entry.count >= 2)
    .sort((a, b) => b.count - a.count || b.lastUsed - a.lastUsed || a.repo.localeCompare(b.repo))
    .slice(0, max).map(entry => allowed.get(entry.repo.toLowerCase()));
  const frequentKeys = new Set(frequent.map(r => r.full_name.toLowerCase()));
  // Recency is the same per-account persisted order used by the existing dashboard.
  const recent = [];
  const seen = new Set();
  for (const raw of Array.isArray(recents) ? recents.slice(0, 30) : []) {
    if (typeof raw !== 'string') continue;
    const key = raw.toLowerCase();
    if (seen.has(key) || frequentKeys.has(key) || !allowed.has(key)) continue;
    seen.add(key);
    recent.push(allowed.get(key));
    if (recent.length >= max) break;
  }
  const pinned = [];
  const alreadySuggested = new Set([...frequent,...recent].map(r => r.full_name.toLowerCase()));
  for (const raw of Array.isArray(favorites) ? favorites.slice(0, 16) : []) {
    if (typeof raw !== 'string') continue;
    const key = raw.toLowerCase();
    if (alreadySuggested.has(key) || pinned.some(x => x.full_name.toLowerCase() === key) || !allowed.has(key)) continue;
    pinned.push(allowed.get(key));
    if (pinned.length >= max) break;
  }
  return { frequent, recent, pinned };
}

/** Seed the frequent section from verified Push events only. Mere selection,
 * PR attempts, editing or analysis must not affect recommendation order.
 * Activity metadata never authorizes access to any repository.
 */
export function usageFromActivity(items = [], now = Date.now()) {
  if (!Array.isArray(items)) return [];
  const tally = new Map();
  for (const item of items.slice(0, 60)) {
    if (!validRepoName(item?.repo) || (item.kind !== 'push' || item.state !== 'success' || !/^[0-9a-f]{40}$/i.test(item.sha || '')) ||
        !Number.isSafeInteger(item.at) || item.at < 0 || item.at > now + MAX_TIME_DRIFT) continue;
    const key = item.repo.toLowerCase();
    const existing = tally.get(key);
    tally.set(key, {repo:existing?.repo || item.repo,count:Math.min(MAX_COUNT,(existing?.count || 0)+1),
      lastUsed:Math.max(existing?.lastUsed || 0,item.at)});
  }
  return normalizeRepositoryUsage([...tally.values()].sort((a,b)=>b.count-a.count || b.lastUsed-a.lastUsed),now);
}
