'use client';
import { useEffect, useState } from 'react';

export default function PushProfiles({ selectedRepo, branch, mode, strategy, profiles, authenticated, busy, authorizedRepos, onSave, onApply, onSelectApply, onRemove }) {
  const [notice,setNotice]=useState('');
  useEffect(()=>setNotice(''),[selectedRepo]);
  const stored=profiles.find(p=>p.repo.toLowerCase() === (selectedRepo||'').toLowerCase());
  const save=()=>{if(!selectedRepo)return;onSave({repo:selectedRepo,branch,mode,strategy});setNotice('Đã lưu Profile.');};
  return <section className="pro-profiles" aria-label="Push Profiles">
    <div className="pro-section-title"><div><span className="pro-kicker">RELEASE PREFERENCES</span><h3>Push Profiles</h3></div></div>
    {selectedRepo && authenticated ? <>
      <div className="pro-profile-current"><strong>{selectedRepo}</strong><span>{branch} · {mode==='sync'?'Sync':'Merge'} · {strategy==='pr'?'Pull Request':'Direct Push'}</span></div>
      <div className="pro-profile-actions"><button type="button" className="button secondary" disabled={busy} onClick={save}>{stored ? 'Cập nhật Profile' : 'Lưu Profile'}</button>{stored && <button type="button" className="button secondary" disabled={busy} onClick={async()=>{if(await onApply(stored))setNotice('Đã áp dụng. Cần Review lại.');}}>Áp dụng</button>}{stored && <button type="button" className="button ghost" disabled={busy} onClick={()=>{onRemove(selectedRepo);setNotice('Đã xóa Profile.');}}>Xóa</button>}</div>
    </> : <p className="pro-muted">Chọn repository để lưu Profile.</p>}
    {profiles.length>0 && <div className="pro-saved-profiles">{profiles.map(p=><div key={p.repo}><div className="pro-saved-info"><strong>{p.repo}</strong><small>{p.branch} · {p.mode==='sync'?'Sync':'Merge'} · {p.strategy==='pr'?'Pull Request':'Direct'}</small></div>{authorizedRepos?.some(r=>r.full_name.toLowerCase()===p.repo.toLowerCase()) && <button type="button" className="pro-apply-button" disabled={busy} onClick={async()=>{if(await onSelectApply(p))setNotice('Đã chuyển sang Upload theo cấu hình đã lưu.');}}>Sử dụng →</button>}</div>)}</div>}
    {notice && <p role="status" className="pro-notice">{notice}</p>}
    
  </section>;
}
