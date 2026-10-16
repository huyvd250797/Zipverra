'use client';

/** One quiet, consistent status-icon family for notifications and Risk Center.
 * Icons carry no decision semantics; labels and approvals remain ordinary text. */
export default function StatusGlyph({ kind = 'info', size = 20 }) {
  const type = ['success', 'info', 'warning', 'error', 'critical', 'identity', 'sync'].includes(kind) ? kind : 'info';
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: 'false' };
  if (type === 'success') return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="m8 12 2.6 2.6L16 9"/></svg>;
  if (type === 'warning') return <svg {...common}><path d="M10.3 4.4a2 2 0 0 1 3.4 0L21 17.6a2 2 0 0 1-1.7 3H4.7a2 2 0 0 1-1.7-3z"/><path d="M12 9v4.5M12 17h.01"/></svg>;
  if (type === 'critical') return <svg {...common}><path d="M12 2.7 20 6v5.8c0 5.2-3.5 8.5-8 9.7-4.5-1.2-8-4.5-8-9.7V6z"/><path d="M12 8v5M12 16.8h.01"/></svg>;
  if (type === 'error') return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/></svg>;
  if (type === 'identity') return <svg {...common}><rect x="3.5" y="4" width="7" height="7" rx="1.4"/><rect x="13.5" y="13" width="7" height="7" rx="1.4"/><path d="M14 6h6v5M20 6l-6 6M10 18H4v-5m0 5 6-6"/></svg>;
  if (type === 'sync') return <svg {...common}><path d="M4 7h16m-14-3h12M7 7l1 13h8l1-13M10 10v7m4-7v7"/></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>;
}
