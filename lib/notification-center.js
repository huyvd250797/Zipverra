/** v3.8.4 — Pure UI notification queue. No credentials, persistence or GitHub requests. */
export const MAX_QUEUED_NOTICES = 3;
export const INITIAL_NOTICES = Object.freeze({ active: null, queued: [] });

export function enqueueNotice(state, candidate) {
  if (!candidate || !Number.isSafeInteger(candidate.id) || !candidate.event) return state;
  const current = state || INITIAL_NOTICES;
  // A confirmation must never be replaced by a transient notification.
  const existing = [current.active, ...(current.queued || [])].filter(Boolean);
  if (existing.some(item => item.event === candidate.event)) return current;
  if (!current.active) return { active: candidate, queued: [] };
  let queued = [...(current.queued || [])];
  // Preserve verified GitHub success messages ahead of routine informational hints.
  if (candidate.event === 'push-verified' || candidate.event === 'pr-verified') queued.unshift(candidate);
  else queued.push(candidate);
  if (queued.length > MAX_QUEUED_NOTICES) {
    // Drop oldest informational hint first; never silently discard a verified outcome.
    const dropIndex = queued.findIndex(item => !['push-verified','pr-verified'].includes(item.event));
    if (dropIndex >= 0) queued.splice(dropIndex, 1);
    else queued = queued.slice(0, MAX_QUEUED_NOTICES);
  }
  return { active: current.active, queued };
}

export function dismissNotice(state, id) {
  const current = state || INITIAL_NOTICES;
  if (current.active?.id !== id) return current; // stale timeout must not close a newer toast
  const [active, ...queued] = current.queued || [];
  return { active: active || null, queued };
}

export function clearNotices() { return { active: null, queued: [] }; }
