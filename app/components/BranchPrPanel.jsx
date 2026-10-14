'use client';

import { useState } from 'react';

export default function BranchPrPanel({ owner, repo, branch, online, busy, api, onSelectBranch }) {
  const [opened, setOpened] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [mergeCandidate, setMergeCandidate] = useState(null);
  const [mergeConfirm, setMergeConfirm] = useState('');
  const [mergeBusy, setMergeBusy] = useState(false);
  async function load() {
    if (!owner || !repo || !online || busy) return;
    setLoading(true); setError(''); setNotice('');
    try { setData(await api('pull-request/overview', { owner, repo })); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }
  async function merge() {
    if (mergeConfirm !== 'MERGE' || !mergeCandidate || busy || mergeBusy) return;
    setMergeBusy(true); setError(''); setNotice('');
    try {
      const result = await api('pull-request/merge', { owner, repo,
        number:mergeCandidate.number, expectedSourceHead:mergeCandidate.head, confirmation:mergeConfirm });
      setNotice(`Đã merge PR #${mergeCandidate.number}. Commit ${result.sha?.slice(0,12) || 'đã xác nhận trên GitHub'}.`);
      setMergeCandidate(null); setMergeConfirm('');
      setData(await api('pull-request/overview', { owner, repo }));
    } catch(e) {
      setError(`Chưa xác nhận merge: ${e.message}. Kiểm tra PR trên GitHub trước khi thử lại.`);
    } finally { setMergeBusy(false); }
  }
  return <section className="branch-pr-manager" aria-label="Branch & Pull Request Manager">
    <button type="button" className="branch-pr-toggle" aria-expanded={opened} onClick={() => { setOpened(v=>!v); setError(''); }}>
      <span>Branch & Pull Requests <small>Tùy chọn nâng cao</small></span><span aria-hidden="true">{opened ? '▴' : '▾'}</span>
    </button>
    {opened && <div className="branch-pr-content">
      <p className="branch-pr-note">Branch riêng và PR giúp review trước khi Merge vào <b>main</b>. ZIP Push thông thường vẫn trực tiếp lên branch đã chọn.</p>
      <button type="button" className="button secondary full" onClick={load} disabled={!online || busy || loading || mergeBusy}>{loading ? 'Đang tải...' : 'Refresh branches & PRs'}</button>
      {error && <div className="branch-pr-error" role="alert">{error}</div>}
      {notice && <div className="branch-pr-success" role="status">{notice}</div>}
      {data && <>
        <h3>Branches <small>({data.branches.length}{data.branches.length===60 ? '+' : ''})</small></h3>
        <div className="branch-pr-list" role="list">{data.branches.map(item => <div key={item.name} className="branch-pr-item" role="listitem"><div><strong>{item.name}</strong><small>{item.sha?.slice(0,8)} {item.protected ? '· Protected' : ''}</small></div><button type="button" className="branch-pr-mini" disabled={busy || mergeBusy || item.name===branch} onClick={()=>{onSelectBranch(item.name);setOpened(false);}}>Dùng branch</button></div>)}</div>
        <h3>Open Pull Requests <small>({data.prs.length}{data.prs.length===50 ? '+' : ''})</small></h3>
        {data.prs.length ? <div className="branch-pr-list" role="list">{data.prs.map(item => <div className="branch-pr-pr" role="listitem" key={item.number}>
          <strong>#{item.number} · {item.title}</strong>
          <small>{item.sourceBranch} → {item.baseBranch} · {item.head?.slice(0,8)}{item.draft ? ' · Draft' : ''}</small>
          <div className="branch-pr-actions"><a href={item.url} target="_blank" rel="noopener noreferrer" className="branch-pr-mini">Mở PR ↗</a><button type="button" className="branch-pr-mini" disabled={busy || mergeBusy || item.draft} onClick={()=>{setMergeCandidate(item);setMergeConfirm('');setError('');}}>Merge…</button></div>
        </div>)}</div> : <p className="branch-pr-note">Không có PR đang mở.</p>}
      </>}
      {mergeCandidate && <div className="branch-pr-merge">
        <h3>Xác nhận merge PR #{mergeCandidate.number}</h3>
        <p>Chỉ merge sau khi đã review diff, approvals và CI trên GitHub. GitHub vẫn thực thi branch protection và required checks. Zipverra sẽ kiểm tra SHA trước khi merge.</p>
        <p><b>{mergeCandidate.sourceBranch}</b> → <b>{mergeCandidate.baseBranch}</b></p>
        <label htmlFor="pr-merge-confirm">Nhập <b>MERGE</b> để xác nhận</label>
        <input id="pr-merge-confirm" value={mergeConfirm} onChange={e=>setMergeConfirm(e.target.value)} autoComplete="off" spellCheck={false} placeholder="MERGE" />
        <div className="branch-pr-actions"><button type="button" className="button secondary" onClick={()=>{setMergeCandidate(null);setMergeConfirm('');}} disabled={mergeBusy}>Hủy</button><button type="button" className="button primary" disabled={mergeBusy || !online || mergeConfirm!=='MERGE'} onClick={merge}>{mergeBusy ? 'Đang kiểm tra…' : 'Merge PR'}</button></div>
      </div>}
    </div>}
  </section>;
}
