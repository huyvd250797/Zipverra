'use client';

export default function ProDashboard({ authenticated, online, loading, snapshot, repos, profiles, recents, favorites, selectedRepo, onRefresh, onChoose, onGoUpload }) {
  // A cached private repository must not remain visible after GitHub App access is revoked.
  const visibleItems = (snapshot?.items || []).filter(item => repos.some(r=>r.full_name.toLowerCase()===item.repo.toLowerCase()));
  const favoriteCount = favorites.filter(n => repos.some(r => r.full_name === n)).length;
  const recentCount = recents.filter(n => repos.some(r => r.full_name === n)).length;
  const when = snapshot?.fetchedAt ? new Date(snapshot.fetchedAt).toLocaleString('vi-VN') : '';
  return <section className="pro-dashboard" aria-label="Zipverra Pro dashboard">
    <div className="pro-section-title"><div><span className="pro-kicker">PRO WORKSPACE</span><h3>Repository overview</h3></div><span className="pro-version-chip">PRO 2.0</span></div>
    <div className="pro-stats" aria-label="Thống kê workspace"><div><strong>{repos.length}</strong><span>Repo có quyền</span></div><div><strong>{favoriteCount}</strong><span>Đã ghim</span></div><div><strong>{profiles.length}</strong><span>Push profiles</span></div></div>
    <div className="pro-dashboard-actions"><button type="button" className="button secondary" disabled={!authenticated || !online || loading || !repos.length} onClick={onRefresh}>{loading ? 'Đang cập nhật...' : '↻ Refresh status'}</button>{selectedRepo && <button type="button" className="button primary" onClick={onGoUpload}>Upload ZIP →</button>}</div>
    {visibleItems.length ? <div className="pro-repo-list">{visibleItems.map(item => <div className="pro-repo-item" key={item.repo}>
      <button type="button" className="pro-repo-name" onClick={() => onChoose(item.repo)}><b>{item.repo}</b><small>{item.branch} · {item.status === 'ok' ? item.sha.slice(0,8) : 'Cần kiểm tra'}</small></button>
      <span className={`pro-health pro-health-${item.status}`}>{item.status === 'ok' ? '● HEAD' : '!'}</span>
      <small className="pro-commit-line">{item.message || 'Chưa có trạng thái commit.'}</small>
    </div>)}</div> : <div className="pro-empty">{authenticated ? (online ? 'Nhấn Refresh status để tải commit mới nhất của các repository gần đây.' : 'Offline — có thể xem cache từ lần tải trước nếu đã có.') : 'Đăng nhập GitHub để xem workspace.'}</div>}
    <p className="pro-cached-label">{visibleItems.length ? `Commit gần nhất trên GitHub · Cập nhật ${when}${!online ? ' · Dữ liệu lưu trên thiết bị' : ''}` : `${recentCount} repo gần đây`}</p>
  </section>;
}
