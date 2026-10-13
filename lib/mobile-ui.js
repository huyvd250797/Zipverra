/** Presentation-only helpers. No credentials or GitHub mutations here. */
export const MOBILE_TABS = Object.freeze(['home', 'repositories', 'activity', 'history', 'settings']);
export const CHANGE_FILTERS = Object.freeze(['all', 'add', 'modify', 'delete']);
export const RECENTS_KEY = 'zipverra.recentRepositories.v1';
export const THEME_KEY = 'zipverra.theme.v1';
export function filterChanges(changes = [], filter = 'all') {
  if (!CHANGE_FILTERS.includes(filter) || filter === 'all') return changes;
  return changes.filter((change) => change.kind === filter);
}
export function updateRecentRepositories(previous = [], value, limit = 5) {
  if (!/^[a-z\d](?:[a-z\d-]{0,38})\/[a-z\d_.-]{1,100}$/i.test(value || '')) return previous.slice(0, limit);
  return [value, ...previous.filter((item) => item !== value)].slice(0, limit);
}
export function getPushTimeline(phase, { preview = false, result = false, pending = false } = {}) {
  const stages = ['validate', 'upload', 'commit', 'verify'];
  const current = ({ ANALYZING: 0, PREFLIGHT: 0, UPLOADING: 1, COMMITTING: 2, VERIFYING: 3 })[phase];
  return stages.map((id, index) => {
    let state = 'waiting';
    if (phase === 'SUCCEEDED' || result) state = 'complete';
    else if (pending || phase === 'UNCONFIRMED') {
      if (index < 2) state = 'complete';
      else if (index === 2) state = 'uncertain';
    } else if (current !== undefined) {
      state = index < current ? 'complete' : index === current ? 'active' : 'waiting';
    } else if (preview) {
      state = index === 0 ? 'complete' : 'waiting';
    } else if (phase === 'FAILED') {
      state = index === 0 ? 'failed' : 'waiting';
    }
    return { id, state };
  });
}
