'use client';
import { useEffect, useState } from 'react';

export default function PushProfiles({ selectedRepo, branch, mode, strategy, profiles, authenticated, busy, authorizedRepos, onSave, onApply, onSelectApply, onRemove }) {
  const [notice,setNotice]=useState('');
  useEffect(()=>setNotice(''),[selectedRepo]);
  const stored=profiles.find(p=>p.repo.toLowerCase() === (selectedRepo||'').toLowerCase());
  const save=()=>{if(!selectedRepo)return;onSave({repo:selectedRepo,branch,mode,strategy});setNotice('Đã lưu cấu hình cho repository này trên thiết bị.');};
  return <section className="pro-profiles" aria-label="Push Profiles">
    <div className="pro-section-title"><div><span className="pro-kicker">RELEASE PREFERENCES</span><h3>Push Profiles</h3><p>Lưu branch và chiến lược Push cho từng repo. Chỉ áp dụng khi bạn chọn.</p></div></div>
    {selectedRepo && authenticated ? <>
      <div className="pro-profile-current"><strong>{selectedRepo}</strong><span>{branch} · {mode==='sync'?'Sync':'Merge'} · {strategy==='pr'?'Pull Request':'Direct Push'}</span></div>
      <div className="pro-profile-actions"><button type="button" className="button secondary" disabled={busy} onClick={save}>{stored ? 'Cập nhật Profile' : 'Lưu Profile'}</button>{stored && <button type="button" className="button secondary" disabled={busy} onClick={()=>{onApply(stored);setNotice('Đã áp dụng profile. Hãy review ZIP lại trước Push.');}}>Áp dụng</button>}{stored && <button type="button" className="button ghost" disabled={busy} onClick={()=>{onRemove(selectedRepo);setNotice('Đã xóa profile trên thiết bị.');}}>Xóa</button>}</div>
    </> : <p className="pro-muted">Chọn repository trong Repos để lưu hồ sơ cập nhật.</p>}
    {profiles.length>0 && <div className="pro-saved-profiles">{profiles.map(p=><div key={p.repo}><div className="pro-saved-info"><strong>{p.repo}</strong><small>{p.branch} · {p.mode==='sync'?'Sync':'Merge'} · {p.strategy==='pr'?'Pull Request':'Direct'}</small></div>{authorizedRepos?.some(r=>r.full_name.toLowerCase()===p.repo.toLowerCase()) && <button type="button" className="pro-apply-button" disabled={busy} onClick={()=>{onSelectApply(p);setNotice('Đã chuyển sang Upload theo cấu hình đã lưu.');}}>Sử dụng →</button>}</div>)}</div>}
    {notice && <p role="status" className="pro-notice">{notice}</p>}
    <p className="pro-cached-label">Profiles chỉ chứa tên repository, branch và lựa chọn push; không lưu source ZIP, mật khẩu hoặc GitHub token.</p>
  </section>;
}
