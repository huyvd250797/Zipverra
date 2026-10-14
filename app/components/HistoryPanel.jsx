'use client';

import { useCallback, useEffect, useState } from 'react';

const PENDING_ROLLBACK_KEY = 'zipverra.rollback.pending.v1';
const VALID_SHA = /^[a-f0-9]{40}$/i;

function readRecovery() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(PENDING_ROLLBACK_KEY) || 'null');
    return saved && VALID_SHA.test(saved.expectedHead) && VALID_SHA.test(saved.targetSha) &&
      typeof saved.owner === 'string' && typeof saved.repo === 'string' && typeof saved.branch === 'string' ? saved : null;
  } catch { return null; }
}
function storeRecovery(value) {
  try {
    if (value) sessionStorage.setItem(PENDING_ROLLBACK_KEY, JSON.stringify(value));
    else sessionStorage.removeItem(PENDING_ROLLBACK_KEY);
    window.dispatchEvent(new Event('zipverra:recovery-changed'));
  }
  catch { /* Private mode may restrict storage. No credentials are stored. */ }
}
function dateLabel(value) {
  if (!value) return 'Unknown date';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Unknown date' : parsed.toLocaleString('vi-VN');
}
function DiffRows({ changes }) {
  return <div className="history-file-list" role="list" aria-label="Các file thay đổi">
    {changes.map((file) => <div className="history-file" role="listitem" key={file.path}>
      <span className={`change-mark ${file.kind}`}>{file.kind === 'add' ? 'A' : file.kind === 'delete' ? 'D' : 'M'}</span>
      <span title={file.path}>{file.path}</span>
    </div>)}
  </div>;
}
function Counts({ value }) {
  return <div className="history-stats"><span className="good">+{value.add} thêm</span><span className="warn">~{value.modify} sửa</span><span className="bad">−{value.delete} xóa</span></div>;
}

export default function HistoryPanel({ authenticated, owner, repo, branch, online, busy, setBusy, pendingPush, api, requestOnce, onRollback }) {
  const [items, setItems] = useState([]);
  const [historyFilter, setHistoryFilter] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState('');
  const [compareBase, setCompareBase] = useState('');
  const [compareHead, setCompareHead] = useState('');
  const [comparison, setComparison] = useState(null);
  const [preview, setPreview] = useState(null);
  const [checked, setChecked] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [recovery, setRecovery] = useState(null);
  const accountRepo = `${owner}/${repo}`;
  const canRead = authenticated && owner && repo && branch && online;
  const isWorking = busy || loading;

  useEffect(() => { setRecovery(readRecovery()); }, []);
  useEffect(() => {
    setItems([]); setHistoryFilter(''); setPage(0); setHasMore(false); setSelected(''); setCompareBase('');
    setCompareHead(''); setComparison(null); setPreview(null); setChecked(false); setPhrase(''); setError(''); setNotice('');
  }, [owner, repo, branch, authenticated]);

  const load = useCallback(async (nextPage = 1) => {
    if (!canRead || busy || loading) return;
    setLoading(true); setError('');
    try {
      const outcome = await api('history', { owner, repo, branch, page: nextPage });
      setItems((before) => nextPage === 1 ? outcome.commits : [...before, ...outcome.commits.filter((c) => !before.some((old) => old.sha === c.sha))]);
      setPage(nextPage); setHasMore(outcome.hasMore);
      if (nextPage === 1) {
        setCompareHead(outcome.commits[0]?.sha || '');
        setNotice(`Đã tải ${outcome.commits.length} commit gần nhất.`);
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [canRead, busy, loading, api, owner, repo, branch]);

  async function compare() {
    if (!canRead || isWorking || !compareBase || !compareHead) return;
    setBusy(true); setError(''); setComparison(null); setPreview(null);
    try {
      if (compareBase === compareHead) throw Error('Hãy chọn hai commit khác nhau để so sánh.');
      const result = await api('compare', { owner, repo, baseSha: compareBase, headSha: compareHead });
      setComparison(result); setNotice(`Đã so sánh ${result.total} thay đổi.`);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function prepare() {
    if (!canRead || isWorking || !selected || pendingPush || recovery) return;
    setBusy(true); setError(''); setNotice(''); setPreview(null); setChecked(false); setPhrase('');
    try {
      const result = await api('rollback/preview', { owner, repo, branch, targetSha: selected });
      setPreview(result);
      setNotice('Preview đã được xác minh. Có hiệu lực 10 phút; branch thay đổi sẽ bắt buộc preview lại.');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function execute() {
    if (!preview || !checked || phrase !== 'ROLLBACK' || !canRead || isWorking || pendingPush || recovery) return;
    setBusy(true); setError(''); setNotice('Đang tạo một commit khôi phục mới, không force-push...');
    const pending = { owner: preview.owner, repo: preview.repo, branch: preview.branch,
      expectedHead: preview.head, targetSha: preview.targetSha };
    // Journal BEFORE any network mutation so a closed iPhone can reopen and verify safely.
    storeRecovery(pending); setRecovery(pending);
    try {
      const outcome = await requestOnce('rollback/execute', { proof: preview.proof, confirmation: 'ROLLBACK' });
      if (outcome.state !== 'applied') throw Error('Chưa xác minh được rollback. Hãy nhấn Xác minh rollback.');
      storeRecovery(null); setRecovery(null); setPreview(null); setChecked(false); setPhrase('');
      setNotice(`Rollback đã hoàn tất và xác minh: ${outcome.sha.slice(0, 12)}. ${outcome.changed} file đã thay đổi.`);
      onRollback?.(outcome);
      setComparison(null); setItems([]); setPage(0);
    } catch (e) {
      setError(`${e.message} Không thực hiện lại rollback khi chưa xác minh HEAD.`);
    } finally { setBusy(false); }
  }
  async function verify() {
    if (!recovery || !canRead || isWorking || pendingPush) return;
    setBusy(true); setError(''); setNotice('Đang xác minh HEAD và commit trên GitHub; không ghi dữ liệu...');
    try {
      const outcome = await api('rollback/verify', recovery);
      if (outcome.state === 'applied') {
        storeRecovery(null); setRecovery(null); setPreview(null); setComparison(null); setItems([]); setPage(0);
        setNotice(`Đã xác nhận rollback thành công. Commit: ${outcome.sha.slice(0, 12)}.`);
        onRollback?.(outcome);
      } else if (outcome.state === 'not_applied') {
        storeRecovery(null); setRecovery(null); setPreview(null);
        setNotice('Đã xác nhận HEAD chưa thay đổi, rollback không được áp dụng. Có thể preview lại.');
      } else {
        setError('HEAD khác dự kiến và không khớp với rollback. Giữ bản ghi phục hồi, kiểm tra trên GitHub trước khi thao tác khác.');
      }
    } catch (e) { setError(`Không xác minh được rollback: ${e.message}`); }
    finally { setBusy(false); }
  }

  return <article className="panel history-panel" data-mobile-view="history" aria-label="Version History & Safe Rollback">
    <div className="history-heading"><div className="history-eyebrow">VERSION CONTROL</div><h2>History & Safe Rollback</h2><p>Xem phiên bản đã commit và khôi phục bằng commit mới. Không force-push.</p></div>
    <div className="history-repo-label"><strong>{owner && repo ? accountRepo : 'Chưa chọn repository'}</strong><code>{branch || 'main'}</code></div>
    {!authenticated ? <p className="history-empty">Đăng nhập GitHub App để đọc lịch sử.</p> : !owner || !repo ? <p className="history-empty">Mở Repos, chọn repository rồi quay lại History.</p> : <>
      <div className="history-actions"><button type="button" className="button secondary" disabled={!canRead || isWorking} onClick={() => load(1)}>↻ Refresh History</button>
        {hasMore && <button type="button" className="button ghost" disabled={!canRead || isWorking} onClick={() => load(page + 1)}>Tải thêm</button>}</div>
      {items.length === 0 && !loading && <div className="history-empty">Nhấn Refresh History để tải lịch sử commit của branch.</div>}
      {items.length>0&&<div className="history-filter"><label htmlFor="history-filter">Lọc commit đã tải</label><input id="history-filter" type="search" value={historyFilter} onChange={e=>setHistoryFilter(e.target.value)} placeholder="Tìm message, tác giả hoặc SHA"/></div>}
      <div className="history-list" role="list" aria-label="Lịch sử commits">{items.filter(item => !historyFilter.trim() || [item.message,item.author,item.sha].some(part=>String(part||'').toLocaleLowerCase().includes(historyFilter.trim().toLocaleLowerCase()))).map((item, index) => <div role="listitem" className={`history-commit ${selected === item.sha ? 'selected' : ''}`} key={item.sha}>
        <button type="button" className="history-commit-select" disabled={isWorking} onClick={() => { setSelected(item.sha); setCompareBase(item.sha); setPreview(null); setComparison(null); setChecked(false); setPhrase(''); }}>
          <span className="history-commit-title">{item.message || 'Commit không có tiêu đề'}</span><span className="history-commit-meta"><code>{item.sha.slice(0, 12)}</code> · {item.author} · {dateLabel(item.date)} {page === 1 && index === 0 ? '· Latest' : ''}</span>
        </button><a target="_blank" rel="noopener noreferrer" href={item.url || `https://github.com/${owner}/${repo}/commit/${item.sha}`} aria-label="Mở commit trên GitHub">↗</a>
      </div>)}</div>
      {items.length > 0 && !items.some(item => [item.message,item.author,item.sha].some(part=>String(part||'').toLocaleLowerCase().includes(historyFilter.trim().toLocaleLowerCase()))) && <p className="history-empty">Không tìm thấy commit trong danh sách đã tải.</p>}
      {items.length > 1 && <section className="history-section"><h3>So sánh phiên bản</h3><div className="history-compare-grid"><label>Phiên bản gốc<select value={compareBase} disabled={isWorking} onChange={e => setCompareBase(e.target.value)}><option value="">Chọn commit</option>{items.map(c => <option key={c.sha} value={c.sha}>{c.sha.slice(0, 9)} · {c.message.slice(0, 32)}</option>)}</select></label><label>Phiên bản đích<select value={compareHead} disabled={isWorking} onChange={e => setCompareHead(e.target.value)}><option value="">Chọn commit</option>{items.map(c => <option key={c.sha} value={c.sha}>{c.sha.slice(0, 9)} · {c.message.slice(0, 32)}</option>)}</select></label></div><button type="button" className="button secondary full" disabled={!canRead || isWorking || !compareBase || !compareHead} onClick={compare}>So sánh thay đổi</button>
        {comparison && <div className="history-preview"><p><strong>{comparison.total} file</strong> thay đổi giữa hai commit</p><Counts value={comparison.counts}/><DiffRows changes={comparison.changes}/></div>}</section>}
      <section className="history-section"><h3>Khôi phục source an toàn</h3><p>Chọn commit trong danh sách phía trên. Zipverra chỉ chấp nhận commit thuộc lịch sử của branch đang chọn.</p>
        {recovery && <div className="history-warning" role="status"><strong>Rollback trước chưa được xác minh</strong><p>{recovery.owner}/{recovery.repo} · {recovery.branch} · mục tiêu {recovery.targetSha.slice(0, 12)}</p><button className="button secondary full" type="button" disabled={!canRead || isWorking || pendingPush || recovery.owner !== owner || recovery.repo !== repo || recovery.branch !== branch} onClick={verify}>Xác minh rollback trên GitHub</button><small>Chỉ đọc GitHub, không tạo commit mới.</small></div>}
        <button type="button" className="button secondary full" disabled={!canRead || isWorking || !selected || Boolean(pendingPush) || Boolean(recovery)} onClick={prepare}>Preview rollback về commit đã chọn</button>
        {preview && <div className="history-preview" role="region" aria-label="Rollback preview"><div className="history-warning"><strong>Rollback sẽ ghi lại toàn bộ snapshot cũ</strong><p>Branch: <code>{preview.branch}</code> · HEAD: <code>{preview.head.slice(0, 12)}</code> → Target: <code>{preview.targetSha.slice(0, 12)}</code></p><p>Những thay đổi sau commit đích trên branch có thể bị đảo ngược. Git giữ nguyên lịch sử và tạo một commit khôi phục mới.</p></div><Counts value={preview.counts}/><DiffRows changes={preview.changes}/>
          {preview.workflowChanged && <p className="history-warning">Có GitHub Actions workflow thay đổi; yêu cầu Workflows: write.</p>}
          <p className="history-expiry">Preview hết hạn: {dateLabel(preview.expiresAt)}. Nếu HEAD đổi, cần xem trước lại.</p>
          <label className="confirm-row"><input type="checkbox" checked={checked} disabled={isWorking} onChange={e => setChecked(e.target.checked)}/> Tôi đã kiểm tra toàn bộ {preview.total} file và đồng ý rollback branch <strong>{preview.branch}</strong>.</label>
          <label className="history-phrase">Nhập <strong>ROLLBACK</strong> để xác nhận<input autoCapitalize="characters" autoComplete="off" spellCheck="false" placeholder="ROLLBACK" value={phrase} disabled={isWorking} onChange={e => setPhrase(e.target.value)}/></label>
          <button type="button" className="button history-danger full" disabled={!canRead || isWorking || !checked || phrase !== 'ROLLBACK' || Boolean(recovery) || Boolean(pendingPush)} onClick={execute}>Tạo commit khôi phục ({preview.total} file)</button>
        </div>}
      </section>
    </>}
    {loading && <p role="status" className="history-muted">Đang tải dữ liệu từ GitHub...</p>}
    {error && <div className="error-banner" role="alert">{error}</div>}
    {notice && <p role="status" className="history-notice">{notice}</p>}
  </article>;
}
