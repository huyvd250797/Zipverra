/** Zipverra v3.9.3 — account-scoped, read-only Quick Action presentation.
 * Suggestions are ALWAYS intersected with the current GitHub-authorized repo
 * response, never treated as authorization and never trigger GitHub writes.
 */
import { validRepoName, normalizeProfiles } from './pro-workspace.js';

import { normalizeRepositoryUsage } from './repository-suggestions.js';

export function quickActionRepos({ repos = [], favorites = [], recents = [], usage = [], selected = '', limit = 4 } = {}) {
  const max = Math.max(1, Math.min(Number.isInteger(limit) ? limit : 4, 4));
  const allowed = new Map((Array.isArray(repos) ? repos : []).filter(r => validRepoName(r?.full_name))
    .map(r => [r.full_name.toLowerCase(), r.full_name]));
  const frequent = normalizeRepositoryUsage(usage)
    .filter(item => item.count >= 2 && allowed.has(item.repo.toLowerCase()))
    .sort((a,b) => b.count - a.count || b.lastUsed - a.lastUsed)
    .slice(0, 12).map(item => item.repo);
  const groups = [
    // Verified Push history is the primary order; pinning doesn't override
    // the repository most recently updated on GitHub.
    [(Array.isArray(recents) ? recents : []).slice(0, 10), 'recent'],
    [(Array.isArray(favorites) ? favorites : []).slice(0, 16), 'pinned'],
    [frequent, 'frequent'],
  ];
  const used = new Set();
  const output = [];
  for (const [items, origin] of groups) {
    for (const item of items) {
      const name = typeof item === 'string' ? allowed.get(item.toLowerCase()) : null;
      if (!name || used.has(name.toLowerCase())) continue;
      used.add(name.toLowerCase());
      output.push({ repo: name, origin, active: name.toLowerCase() === selected.toLowerCase() });
      if (output.length >= max) return output;
    }
  }
  return output;
}

/** Profiles only survive local storage if validated; additionally require a
 * currently authorized repository before any "Apply" shortcut is offered.
 */
export function quickProfile(profiles, repos, selected) {
  if (!validRepoName(selected)) return null;
  const allowed = (Array.isArray(repos) ? repos : [])
    .filter(r => validRepoName(r?.full_name)).map(r => r.full_name);
  if (!allowed.some(r => r.toLowerCase() === selected.toLowerCase())) return null;
  return normalizeProfiles(profiles, allowed).find(p => p.repo.toLowerCase() === selected.toLowerCase()) || null;
}

export function profileDiffers(profile, {branch, mode, strategy} = {}) {
  return Boolean(profile && (profile.branch !== branch || profile.mode !== mode || profile.strategy !== strategy));
}
