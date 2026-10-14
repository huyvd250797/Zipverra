'use client';

import { useEffect, useMemo, useState } from 'react';
import { sortedRepositories } from '../../lib/smart-push.js';
import { validBranchName } from '../../lib/pro-workspace.js';
import ModalSheet from './ModalSheet.jsx';

/** Repo choices are always scoped to the installed app's server-authorized list. */
export function RepositoryPickerSheet({ open, onClose, repos, selected, favorites, recents, onChoose, disabled }) {
  const [query, setQuery] = useState('');
  useEffect(() => { if (open) setQuery(''); }, [open]);
  const options = useMemo(() => sortedRepositories(repos, favorites, recents).filter(
    item => item.full_name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())), [repos, favorites, recents, query]);
  return <ModalSheet open={open} onClose={onClose} title="Chọn repository">
    <div className="zip-repo-search"><input type="search" aria-label="Tìm repository" value={query}
      onChange={e => setQuery(e.target.value)} placeholder="Tìm repository..." autoComplete="off"/></div>
    <div className="zip-repo-results" role="list" aria-label="Repository đã được cấp quyền">
      {options.slice(0, 120).map(item => <div role="listitem" key={item.full_name}>
        <button type="button" className={`zip-repo-option${selected === item.full_name ? ' selected' : ''}`}
          disabled={disabled} onClick={() => { onClose(); if (selected !== item.full_name) window.requestAnimationFrame(() => onChoose(item.full_name)); }}>
          <span className="zip-repo-name">{item.full_name}<small>{item.private ? 'Private' : 'Public'}{favorites.includes(item.full_name) ? ' · ★ Ghim' : ''}</small></span>
          <span aria-hidden="true">{selected === item.full_name ? '✓' : '›'}</span>
        </button>
      </div>)}
      {options.length > 120 && <p className="zip-sheet-note">Hiển thị 120 repository. Nhập tên để lọc danh sách.</p>}
      {!options.length && <p className="zip-sheet-note">Không có repository phù hợp.</p>}
    </div>
  </ModalSheet>;
}

/** Lazy, read-only branch discovery. Manual input remains available for paginated repos. */
export function BranchPickerSheet({ open, onClose, owner, repo, current, online, disabled, api, onChoose }) {
  const [query, setQuery] = useState('');
  const [branches, setBranches] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [manual, setManual] = useState('');
  useEffect(() => {
    if (!open) return;
    setQuery(''); setManual(''); setBranches([]); setError('');
    if (!online || !owner || !repo) { setStatus('offline'); return; }
    let active = true;
    setStatus('loading');
    api('branches', { owner, repo }).then(result => {
      if (!active) return;
      setBranches(Array.isArray(result.branches) ? result.branches : []);
      setStatus('ready');
    }).catch(e => { if (active) { setStatus('error'); setError(e.message || 'Không thể tải danh sách branch.'); } });
    return () => { active = false; };
  }, [open, owner, repo, online, api]);
  const validManual = validBranchName(manual.trim());
  const filtered = useMemo(() => branches.filter(item => item.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())), [branches,query]);
  const select = name => { onClose(); if (name !== current) window.requestAnimationFrame(() => onChoose(name)); };
  return <ModalSheet open={open} onClose={onClose} title="Chọn branch">
    <p className="zip-sheet-kicker">{owner}/{repo}</p>
    <div className="zip-repo-search"><input type="search" aria-label="Lọc branch" value={query}
      onChange={e => setQuery(e.target.value)} placeholder="Tìm branch..." autoComplete="off"/></div>
    {status === 'loading' && <p className="zip-sheet-note" role="status">Đang tải branch từ GitHub…</p>}
    {status === 'error' && <p className="zip-sheet-error" role="alert">{error}</p>}
    {status === 'offline' && <p className="zip-sheet-note">Thiết bị offline. Có thể nhập branch thủ công.</p>}
    {status === 'ready' && <div className="zip-branch-results" role="list" aria-label="Danh sách branch">
      {filtered.map(item => <div role="listitem" key={item.name}><button type="button"
        className={`zip-branch-option${current === item.name ? ' selected' : ''}`} disabled={disabled}
        onClick={() => select(item.name)}>
        <span>{item.name}{item.protected && <small> · Protected</small>}</span>
        <span aria-hidden="true">{current === item.name ? '✓' : '›'}</span>
      </button></div>)}
      {!filtered.length && <p className="zip-sheet-note">Không tìm thấy branch phù hợp.</p>}
    </div>}
    <div className="zip-branch-manual"><label htmlFor="zip-branch-manual">Branch khác</label>
      <div><input id="zip-branch-manual" value={manual} onChange={e => setManual(e.target.value)} placeholder="main hoặc feature/name" autoComplete="off" spellCheck={false}/>
        <button type="button" disabled={disabled || !validManual} onClick={() => select(manual.trim())}>Chọn</button></div>
      <small>Danh sách GitHub hiển thị tối đa 100 branch. Nhập tên chính xác nếu branch chưa xuất hiện.</small>
    </div>
  </ModalSheet>;
}
