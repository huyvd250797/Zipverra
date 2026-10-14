/** Presentation-only workspace utilities. Never authorize GitHub writes from this module. */
export const WORKSPACE_VIEWS = Object.freeze(['code', 'edit', 'review', 'history']);

export function workspaceBreadcrumbs(directory = '') {
  const parts = String(directory || '').split('/').filter(Boolean);
  return [{ label: 'root', path: '' }, ...parts.map((label, index) => ({
    label, path: parts.slice(0, index + 1).join('/'),
  }))];
}

export function workspaceEntries(entries, query = '') {
  const term = String(query || '').trim().toLocaleLowerCase();
  return (Array.isArray(entries) ? entries : [])
    .filter(item => item && typeof item.name === 'string' && (!term || item.name.toLocaleLowerCase().includes(term)))
    .sort((a,b) => (a.kind === 'directory' ? 0 : 1) - (b.kind === 'directory' ? 0 : 1) || a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }));
}

export function workspaceInsert(draft, selectionStart, selectionEnd, text = '  ') {
  const original = String(draft || '');
  const start = Math.min(original.length, Math.max(0, Number(selectionStart) || 0));
  const end = Math.min(original.length, Math.max(start, Number(selectionEnd) || start));
  const fragment = String(text);
  return { value: original.slice(0, start) + fragment + original.slice(end), caret: start + fragment.length };
}

export function shouldWarnWorkspaceExit({ workspaceOpen, dirty, target, current, identityChanged = false }) {
  return Boolean(workspaceOpen && dirty && (identityChanged || (current === 'repositories' && target && target !== current)));
}
