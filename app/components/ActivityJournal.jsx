'use client';
import { useState } from 'react';
const TYPE={push:'Git Push',pr:'Pull Request',merge:'Merge PR',rollback:'Rollback','quick-edit':'Quick Edit',system:'Recovery'};
export default function ActivityJournal({items,onClear}) {
  const [filter,setFilter]=useState('all');
  const list = filter==='all'?items:items.filter(x=>x.state===filter);
  return <section className="pro-journal" aria-label="Nhật ký thao tác trên thiết bị">
    <div className="pro-section-title"><div><span className="pro-kicker">LOCAL ACTIVITY</span><h3>Recent actions</h3></div></div>
    <div className="pro-journal-tools"><select aria-label="Lọc nhật ký" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Tất cả</option><option value="success">Thành công</option><option value="pending">Chờ xác minh</option><option value="failed">Thất bại</option><option value="warning">Cảnh báo</option></select><button type="button" className="button secondary" onClick={onClear} disabled={!items.length}>Xóa lịch sử cục bộ</button></div>
    {list.length ? <div className="pro-journal-rows" role="list">{list.slice(0,20).map(e=><div role="listitem" className="pro-journal-entry" key={e.id}><span className={`pro-journal-dot pro-journal-${e.state}`}/><div><strong>{TYPE[e.kind]}</strong> <small>{new Date(e.at).toLocaleString('vi-VN')}</small><p>{e.repo}{e.message ? ` · ${e.message}` : ''}</p>{e.sha && <code>{e.sha.slice(0,12)}</code>}</div></div>)}</div> : <p className="pro-empty">Chưa có hoạt động tương ứng.</p>}
    
  </section>;
}
