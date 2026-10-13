'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { readArchive, encodeBase64 } from '../lib/archive.js';
import { calculateChanges, countChanges } from '../lib/operations.js';
import { zipCommitMessage } from '../lib/paths.js';
import { LIMITS } from '../lib/constants.js';
import { PUSH_STAGES, JOURNAL_KEY, withSafeRetry, validJournal } from '../lib/reliability.js';
import SplashScreen from './components/SplashScreen.jsx';
import MobileViewportGuard from './components/MobileViewportGuard.jsx';

async function requestOnce(endpoint, data) {
  let response;
  const controller = new AbortController();
  // A timeout on `commit` is deliberately ambiguous; journal + Verify Push resolve it.
  const timer = setTimeout(() => controller.abort(), endpoint === 'commit' ? 110000 : 38000);
  try {
    response = await fetch(`/api/github/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify(data),
      signal: controller.signal,
    });
  } catch {
    const problem = new Error('Không kết nối được máy chủ hoặc yêu cầu quá thời gian. Kiểm tra Internet và thử lại.');
    problem.network = true;
    throw problem;
  } finally { clearTimeout(timer); }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const problem = new Error(result.error || `Lỗi API HTTP ${response.status}`);
    problem.stage = result.stage || null;
    problem.code = result.code || null;
    problem.httpStatus = response.status;
    problem.hint = result.hint || null;
    throw problem;
  }
  return result;
}

async function api(endpoint, data, onRetry) {
  // Intentionally excluded: 'commit'. Never blind-retry a potentially successful mutation.
  return withSafeRetry(() => requestOnce(endpoint, data), { endpoint, onRetry });
}
function readPending() {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(JOURNAL_KEY) || 'null');
    return validJournal(value) ? value : null;
  } catch { return null; }
}
function rememberPending(value) {
  try { window.sessionStorage.setItem(JOURNAL_KEY, JSON.stringify(value)); } catch { /* storage may be unavailable */ }
}
function clearPending() {
  try { window.sessionStorage.removeItem(JOURNAL_KEY); } catch { /* no-op */ }
}

function prettyBytes(count) {
  return count >= 1024 * 1024 ? `${(count / 1024 / 1024).toFixed(2)} MB` : `${Math.max(0, Math.round(count / 1024))} KB`;
}

function StepTitle({ n, title, desc, centerOnMobile = false }) {
  return <div className={`step-heading${centerOnMobile ? ' step-heading--mobile-center' : ''}`}><span className="step-number">{n}</span><div><h2>{title}</h2><p>{desc}</p></div></div>;
}

function Icon({ name, size = 20 }) {
  const shapes = {
    github: <><path d="M9 19c-4.3 1.3-4.3-2.3-6-2.7m12 2.7v-3a2.6 2.6 0 0 0-.7-2c2.5-.3 5.2-1.3 5.2-5.7A4.4 4.4 0 0 0 18.3 5a4 4 0 0 0-.1-3.3S16.6 1.2 15 3a12.3 12.3 0 0 0-6 0C7.4 1.2 5.8 1.7 5.8 1.7A4 4 0 0 0 5.7 5 4.4 4.4 0 0 0 4.5 8.3c0 4.4 2.7 5.4 5.2 5.7a2.6 2.6 0 0 0-.7 2v3" /></>,
    upload: <><path d="M12 17V3m-5 5 5-5 5 5"/><path d="M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5"/></>,
    file: <><path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10Z"/><path d="M13 3v7h7M8 15h8m-8 3h5"/></>,
    branch: <><circle cx="6" cy="5" r="2"/><circle cx="18" cy="7" r="2"/><circle cx="6" cy="19" r="2"/><path d="M6 7v10m12-8a6 6 0 0 1-6 6H6"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></>,
    arrow: <><path d="M5 12h14m-6-6 6 6-6 6"/></>,
    external: <><path d="M14 4h6v6M20 4l-9 9"/><path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5"/></>,
    refresh: <><path d="M20 7v-4l-3 3a8 8 0 1 0 3 6"/></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{shapes[name] || shapes.file}</svg>;
}

export default function Home() {
  const [auth, setAuth] = useState({ loading: true, authenticated: false, user: null });
  const [repos, setRepos] = useState([]);
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [branch, setBranch] = useState('main');
  const [mode, setMode] = useState('merge');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [errorHint, setErrorHint] = useState('');
  const [phase, setPhase] = useState(PUSH_STAGES.IDLE);
  const [online, setOnline] = useState(true);
  const [pendingCommit, setPendingCommit] = useState(null);
  const fileInput = useRef(null);

  useEffect(() => {
    setOnline(navigator.onLine);
    const onNetwork = () => setOnline(navigator.onLine);
    window.addEventListener('online', onNetwork);
    window.addEventListener('offline', onNetwork);
    const pending = readPending();
    if (pending) {
      setPendingCommit(pending);
      setPhase(PUSH_STAGES.UNCONFIRMED);
      setStatus('Có một lần push chưa xác nhận từ phiên trước. Hãy xác minh trước khi thử lại.');
    }
    return () => { window.removeEventListener('online', onNetwork); window.removeEventListener('offline', onNetwork); };
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/session', { cache: 'no-store' })
      .then(async (r) => { if (!r.ok) throw new Error('Không đọc được phiên đăng nhập.'); return r.json(); })
      .then((data) => { if (active) setAuth({ loading: false, authenticated: data.authenticated, user: data.user || null }); })
      .catch(() => { if (active) { setAuth({ loading: false, authenticated: false, user: null }); setError('Không kiểm tra được phiên GitHub. Hãy tải lại trang.'); } });
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get('auth_error');
    if (oauthError) {
      const messages = { cancelled: 'Bạn đã hủy cấp quyền GitHub.', invalid_state: 'Phiên OAuth không khớp hoặc đã hết hạn. Vui lòng đăng nhập lại.', missing_scope: 'Bạn cần cấp quyền repo để đọc và cập nhật source trên GitHub.', exchange_failed: 'GitHub không hoàn tất đăng nhập. Hãy kiểm tra cấu hình OAuth và thử lại.' };
      setError(messages[oauthError] || 'Đăng nhập GitHub thất bại.');
    }
    if (oauthError || params.has('auth')) window.history.replaceState({}, '', window.location.pathname);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!auth.authenticated) return;
    let active = true;
    api('repos', {}).then((data) => { if (active) setRepos(data.repos || []); })
      .catch((e) => { if (active) setError(`Không tải được repositories: ${e.message}`); });
    return () => { active = false; };
  }, [auth.authenticated]);

  async function logout() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST', cache: 'no-store' });
      if (!response.ok) throw new Error('Không thể đăng xuất.');
      setAuth({ loading: false, authenticated: false, user: null });
      setRepos([]); setOwner(''); setRepo(''); setBranch('main'); reset();
      setPendingCommit(null); clearPending(); setPhase(PUSH_STAGES.IDLE);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  const commitMessage = useMemo(() => zipCommitMessage(file?.name), [file]);
  const stats = preview ? countChanges(preview.changes) : null;
  const reset = () => {
    setPreview(null);
    setConfirmed(false);
    setResult(null);
    setError(''); setErrorHint('');
    setStatus('');
    setProgress(0);
    if (!pendingCommit) setPhase(PUSH_STAGES.IDLE);
  };
  function change(setter, value) { setter(value); reset(); }
  function getInputs() {
    if (!auth.authenticated) throw new Error('Hãy đăng nhập GitHub trước khi tiếp tục.');
    if (!owner.trim() || !repo.trim()) throw new Error('Hãy chọn hoặc nhập repository.');
    if (!branch.trim()) throw new Error('Hãy nhập branch, mặc định main.');
    return { owner: owner.trim(), repo: repo.trim(), branch: branch.trim() };
  }
  async function loadRepos() {
    setBusy(true); setError(''); setErrorHint(''); setStatus('Đang tải repository từ GitHub...');
    try {
      if (!auth.authenticated) throw new Error('Hãy đăng nhập GitHub trước.');
      const result = await api('repos', {});
      setRepos(result.repos);
      setStatus(`Đã tải ${result.repos.length} repository có quyền ghi. Nếu thiếu repo, có thể nhập thủ công.`);
    } catch (e) { setError(e.message); setStatus(''); }
    finally { setBusy(false); }
  }
  function chooseRepo(value) {
    if (!value) return;
    const index = value.indexOf('/');
    setOwner(value.slice(0, index));
    setRepo(value.slice(index + 1));
    setBranch('main');
    reset();
  }
  function chooseFile(next) {
    change(setFile, next || null);
  }
  async function analyze() {
    setBusy(true); setError(''); setErrorHint(''); setResult(null); setProgress(0); setPhase(PUSH_STAGES.ANALYZING);
    try {
      if (!online) throw new Error('Thiết bị đang offline. Hãy kết nối Internet rồi phân tích lại.');
      const input = getInputs();
      if (!file) throw new Error('Hãy chọn file ZIP chứa source code.');
      setStatus('Đang giải nén, kiểm tra file và tính Git SHA...');
      const archive = await readArchive(file, setProgress);
      setStatus('Đang đọc HEAD và so sánh với repository...');
      const remote = await api('snapshot', input);
      const changes = calculateChanges(archive.files, remote.files, mode);
      setPhase(PUSH_STAGES.PREFLIGHT);
      setStatus('Đang kiểm tra quyền push và GitHub Actions workflow...');
      await api('preflight', { ...input, workflowPaths: changes.filter((c) => /\.github\/workflows\/[^/]+\.ya?ml$/i.test(c.path)).map((c) => c.path) });
      setPreview({ archive, remote, changes, input: { owner: input.owner, repo: input.repo, branch: input.branch }, mode, filename: file.name });
      setConfirmed(false);
      setStatus(changes.length ? `Đã phân tích: ${changes.length} thay đổi cần xử lý.` : 'ZIP và repository đã đồng bộ, không có gì cần push.');
      setProgress(100);
      setPhase(PUSH_STAGES.IDLE);
    } catch (e) { setError(e.message); setErrorHint(e.hint || ''); setPreview(null); setStatus(''); setPhase(PUSH_STAGES.FAILED); }
    finally { setBusy(false); }
  }
  function finishVerified(outcome) {
    setResult(outcome);
    setStatus(outcome.recovered ? 'Push đã thành công, được xác minh lại trên GitHub.' : 'Đã push và xác minh commit trên GitHub.');
    setProgress(100);
    setPhase(PUSH_STAGES.SUCCEEDED);
    setPendingCommit(null);
    clearPending();
    setPreview(null);
    setConfirmed(false);
    setError(''); setErrorHint('');
  }

  async function verifyPending(data = pendingCommit) {
    if (!data || busy) return;
    setBusy(true); setPhase(PUSH_STAGES.VERIFYING); setError(''); setErrorHint('');
    setStatus('Đang đối chiếu GitHub HEAD, commit và danh sách file, không tạo commit mới...');
    try {
      const checked = await api('verify', data, (attempt) => setStatus(`Đang thử đọc lại GitHub (${attempt}/2)...`));
      if (checked.state === 'applied') {
        finishVerified({ ...checked, recovered: true });
      } else if (checked.state === 'not_applied') {
        clearPending(); setPendingCommit(null);
        setPhase(PUSH_STAGES.FAILED); setProgress(0);
        setStatus('Đã xác minh: branch chưa nhận commit. Có thể phân tích ZIP lại để tiếp tục.');
        setError('GitHub HEAD vẫn ở commit cũ. Chưa có thay đổi nào được push lên branch.');
      } else {
        setPhase(PUSH_STAGES.UNCONFIRMED);
        setStatus('HEAD đã thay đổi nhưng không trùng commit dự kiến. Không tự động push lại.');
        setError('Không xác minh được kết quả. Kiểm tra lịch sử commit trên GitHub và phân tích lại khi đã rõ trạng thái.');
      }
    } catch (e) {
      setPhase(PUSH_STAGES.UNCONFIRMED);
      setError(`Chưa xác minh được GitHub: ${e.message}`);
      setErrorHint(e.hint || 'Giữ nguyên bản ghi phục hồi. Hãy thử xác minh khi kết nối ổn định.');
    } finally { setBusy(false); }
  }

  async function push() {
    if (!preview || !confirmed || busy || pendingCommit) return;
    setBusy(true); setResult(null); setError(''); setErrorHint(''); setProgress(0);
    setPhase(PUSH_STAGES.UPLOADING);
    let commitPayload = null;
    try {
      if (!online) throw new Error('Thiết bị đang offline. Hãy kết nối Internet rồi thử lại.');
      const input = getInputs();
      if (input.owner !== preview.input.owner || input.repo !== preview.input.repo || input.branch !== preview.input.branch || mode !== preview.mode || file?.name !== preview.filename) {
        throw new Error('Cấu hình đã thay đổi. Hãy preview lại.');
      }
      const uploadChanges = preview.changes.filter((c) => c.kind !== 'delete');
      const byPath = new Map(preview.archive.files.map((f) => [f.path, f]));
      const blobShas = new Map();
      let finished = 0;
      const workers = Array.from({ length: Math.min(3, uploadChanges.length) }, async (_, worker) => {
        for (let i = worker; i < uploadChanges.length; i += 3) {
          const change = uploadChanges[i];
          const source = byPath.get(change.path);
          if (!source) throw new Error(`Thiếu file nguồn: ${change.path}`);
          const res = await api('blob', { owner: input.owner, repo: input.repo, content: encodeBase64(source.data) },
            (attempt) => setStatus(`GitHub chậm với ${source.path}. Retry an toàn (${attempt}/2)...`));
          if (res.sha !== source.sha) throw new Error(`GitHub trả về SHA không khớp cho ${source.path}; đã dừng push.`);
          blobShas.set(change.path, res.sha);
          finished += 1;
          setProgress(Math.round((finished / Math.max(1, uploadChanges.length)) * 80));
          setStatus(`Đã upload Git blobs: ${finished}/${uploadChanges.length} file...`);
        }
      });
      // Do not leave concurrent blob workers writing status after the UI reports failure.
      const workerResults = await Promise.allSettled(workers);
      const firstFailure = workerResults.find((item) => item.status === 'rejected');
      if (firstFailure) throw firstFailure.reason;
      const entries = preview.changes.map((c) => ({ path: c.path, mode: c.mode, sha: c.kind === 'delete' ? null : blobShas.get(c.path) }));
      commitPayload = { ...input, expectedHead: preview.remote.head, message: commitMessage, entries };
      rememberPending(commitPayload);
      setPendingCommit(commitPayload);
      setPhase(PUSH_STAGES.COMMITTING);
      setProgress(85);
      setStatus('Đang tạo commit và cập nhật branch. Không tự retry thao tác commit...');
      const outcome = await requestOnce('commit', commitPayload);
      finishVerified(outcome);
    } catch (e) {
      setError(e.message);
      setErrorHint(e.hint || '');
      setProgress(0);
      if (commitPayload) {
        setPhase(PUSH_STAGES.UNCONFIRMED);
        setStatus('Kết quả commit chưa chắc chắn. Nhấn “Xác minh push” để kiểm tra GitHub trước khi làm lại.');
      } else {
        setPhase(PUSH_STAGES.FAILED);
        setStatus(`Push dừng trước khi tạo commit${e.stage ? ` (bước ${e.stage})` : ''}. Có thể thử lại sau khi kiểm tra lỗi.`);
      }
    } finally { setBusy(false); }
  }

  return <>
    <MobileViewportGuard/>
    <SplashScreen loading={auth.loading}/>
    <div className="shell">
    <div className="glow one"/><div className="glow two"/>
    <header className="topbar">
      <div className="brand"><div className="brand-symbol"><Icon name="branch" size={25}/></div><div><strong>Zip<span>verra</span></strong><small>ZIP TO GITHUB · GITHUB OAUTH</small></div></div>
      <div className="version"><span className="live-dot"/> v1.3.4</div>
    </header>
    <main>
      <section className="hero">
        <div className="eyebrow"><Icon name="shield" size={15}/> SECURE SOURCE DELIVERY</div>
        <h1>Push to GitHub.<br/><span>From Your Phone.</span></h1>
        <p>Upload ZIP do ChatGPT tạo, chọn repo và branch. App sẽ tự tạo commit theo tên ZIP rồi push lên GitHub — không cần Terminal.</p>
        <div className="highlights"><span><Icon name="check" size={15}/> Vercel-native</span><span><Icon name="check" size={15}/> Hỗ trợ binary</span><span><Icon name="check" size={15}/> So sánh trước khi push</span></div>
      </section>

      <section className="content-grid">
        <div className="form-column">
          <article className="panel">
            <StepTitle n="01" title="Đăng nhập GitHub" desc="Kết nối tài khoản bằng GitHub OAuth, không cần nhập token thủ công."/>
            {auth.loading ? <div className="auth-card"><span className="auth-muted">Đang kiểm tra phiên đăng nhập GitHub...</span></div> : auth.authenticated ? <div className="auth-card signed-in">
              <div className="account-row"><div className="account-avatar">{auth.user?.login?.slice(0, 1).toUpperCase() || 'G'}</div><div className="account-info"><strong>@{auth.user?.login}</strong><small>Đã kết nối GitHub</small></div><span className="auth-chip"><Icon name="check" size={14}/> Connected</span></div>
              <div className="inline-actions"><button type="button" className="button secondary" disabled={busy} onClick={loadRepos}><Icon name="refresh" size={17}/> Tải repositories</button><button type="button" className="button ghost" onClick={logout} disabled={busy}>Đăng xuất</button></div>
            </div> : <div className="auth-card">
              <p className="auth-muted">Đăng nhập để chọn repository và cấp quyền tạo commit. Token OAuth chỉ được xử lý trên máy chủ.</p>
              <a className="button primary full login-button" href="/api/auth/login"><Icon name="github" size={19}/> Continue with GitHub <Icon name="arrow" size={16}/></a>
              <small className="hint">GitHub OAuth App yêu cầu quyền <b>repo</b> và <b>workflow</b> để push source bao gồm GitHub Actions. Chỉ đăng nhập khi bạn tin cậy ứng dụng này.</small>
            </div>}
            <div className="field"><label htmlFor="repo-select">Chọn repository</label><select id="repo-select" disabled={busy || !auth.authenticated || !repos.length} value={repos.some((x) => x.full_name === `${owner}/${repo}`) ? `${owner}/${repo}` : ''} onChange={(e) => chooseRepo(e.target.value)}><option value="">{repos.length ? 'Chọn repository hoặc nhập bên dưới' : 'Chưa tải — có thể nhập thủ công'}</option>{repos.map((x) => <option key={x.full_name} value={x.full_name}>{x.full_name}{x.private ? ' 🔒' : ''}</option>)}</select></div>
            <div className="two-col"><div className="field"><label htmlFor="owner">Owner</label><input id="owner" value={owner} disabled={busy || !auth.authenticated} placeholder="huyvd250797" onChange={(e) => change(setOwner, e.target.value)}/></div><div className="field"><label htmlFor="repo">Repository</label><input id="repo" value={repo} disabled={busy || !auth.authenticated} placeholder="Finzaro" onChange={(e) => change(setRepo, e.target.value)}/></div></div>
            <div className="field"><label htmlFor="branch">Branch đích <span className="tag">Mặc định: main</span></label><div className="input-icon"><Icon name="branch" size={17}/><input id="branch" value={branch} disabled={busy || !auth.authenticated} placeholder="main" onChange={(e) => change(setBranch, e.target.value)}/></div></div>
          </article>

          <article className="panel">
            <StepTitle n="02" title="Tải source ZIP" desc="Giải nén trực tiếp trên điện thoại, chỉ gửi file cần thay đổi."/>
            <input ref={fileInput} id="file" className="visually-hidden" type="file" accept=".zip,application/zip,application/x-zip-compressed" disabled={busy} onChange={(e) => chooseFile(e.target.files?.[0])}/>
            <label htmlFor="file" className={`drop-zone ${file ? 'picked' : ''}`}><span className="file-symbol"><Icon name={file ? 'file' : 'upload'} size={25}/></span><strong>{file ? file.name : 'Chạm để chọn file ZIP'}</strong><small>{file ? `${prettyBytes(file.size)} · Chạm để thay file` : 'Nguồn ZIP từ ChatGPT hoặc ứng dụng Files'}</small></label>
            <div className="limits"><span>Tối đa 20 MB / ZIP</span><span>2.5 MB / file</span><span>1.200 file</span></div>
            <div className="field"><label htmlFor="mode">Chế độ cập nhật</label><select id="mode" value={mode} disabled={busy} onChange={(e) => change(setMode, e.target.value)}><option value="merge">Merge — Thêm/sửa, giữ file cũ</option><option value="sync">Sync — Xóa file cũ không có trong ZIP</option></select><small className="hint">Khuyên dùng Merge. Sync có thể xóa những file quan trọng đang có trên repo.</small></div>
            <div className="field"><label htmlFor="message">Commit tự động lấy tên ZIP</label><div className="input-icon"><Icon name="file" size={17}/><input id="message" readOnly value={file ? commitMessage : ''} placeholder="Chọn ZIP để tạo commit message"/></div></div>
            <button className="button primary full" disabled={busy || !file || !auth.authenticated} onClick={analyze}>{busy ? 'Đang xử lý...' : 'Phân tích ZIP và xem thay đổi'} <Icon name="arrow" size={18}/></button>
          </article>
        </div>

        <div className="side-column">
          <article className="panel preview-panel">
            <StepTitle n="03" title="Kiểm tra & Push" desc="Xem thay đổi trước khi GitHub tạo commit." centerOnMobile/>
            {!preview ? <div className="empty-preview"><div className="circle-placeholder"><Icon name="branch" size={27}/></div><h3>Chưa có bản preview</h3><p>Chọn repository, upload file ZIP rồi nhấn <b>Phân tích ZIP</b> để xem danh sách file được cập nhật.</p></div> : <>
              <div className="summary-line"><span className="pill">{preview.input.owner}/{preview.input.repo}</span><span className="pill branch-pill"><Icon name="branch" size={14}/> {preview.input.branch}</span></div>
              <div className="stat-grid"><div><strong className="good">+{stats.add}</strong><span>Thêm</span></div><div><strong className="warn">~{stats.modify}</strong><span>Sửa</span></div><div><strong className="bad">−{stats.delete}</strong><span>Xóa</span></div></div>
              <div className="archive-meta">{preview.archive.files.length} file · {prettyBytes(preview.archive.unpackedSize)} đã giải nén{preview.archive.wrapper ? ` · Bỏ thư mục gốc: ${preview.archive.wrapper}/` : ''}{preview.archive.ignored ? ` · Bỏ qua ${preview.archive.ignored} file` : ''}</div>
              <div className="change-list" aria-label="Danh sách thay đổi">{preview.changes.length ? preview.changes.map((item) => <div className="change-row" key={item.path}><span className={`change-mark ${item.kind}`}>{item.kind === 'add' ? 'A' : item.kind === 'modify' ? 'M' : 'D'}</span><span title={item.path}>{item.path}</span></div>) : <div className="empty-change">Không có thay đổi để commit.</div>}</div>
              {stats.delete > 0 && <div className="warning-banner">Chế độ Sync sẽ xóa {stats.delete} file đang có trên GitHub. Kiểm tra danh sách trước khi tiếp tục.</div>}
              {preview.changes.length > 0 && <><label className="confirm-row"><input type="checkbox" checked={confirmed} disabled={busy} onChange={(e) => setConfirmed(e.target.checked)}/><span>Tôi đã kiểm tra thay đổi và đồng ý push lên <b>{preview.input.branch}</b>.</span></label><button className="button primary full push-button" disabled={busy || !confirmed || !auth.authenticated || !online || Boolean(pendingCommit)} onClick={push}><Icon name="upload" size={18}/> {busy ? 'Đang push...' : `Commit & Push (${preview.changes.length} file)`}</button></>}
            </>}
          </article>
          <article className="panel activity-panel"><div className="activity-title"><h2>Trạng thái xử lý</h2><span className={`activity-dot ${busy ? 'pulse' : ''}`}/></div><div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }}/></div><p className="status-text" role="status">{status || 'Sẵn sàng nhận file ZIP.'}</p>
            <div className="push-status-line"><span className={`network-chip ${online ? 'online' : 'offline'}`}>{online ? '● Online' : '● Offline'}</span><span className="stage-chip">{phase.replaceAll('_', ' ')}</span></div>
            {pendingCommit && <div className="recovery-banner" role="status"><strong>Cần xác minh lần push trước</strong><p>{pendingCommit.owner}/{pendingCommit.repo} · {pendingCommit.branch} · {pendingCommit.message}</p><button type="button" className="button secondary full" disabled={busy || !online || !auth.authenticated} onClick={() => verifyPending()}><Icon name="refresh" size={16}/> {busy && phase === PUSH_STAGES.VERIFYING ? 'Đang xác minh...' : 'Xác minh push trên GitHub'}</button><small>Chỉ kiểm tra trạng thái, không tạo commit mới.</small></div>}
            {error && <div className="error-banner" role="alert">{error}{errorHint && <p className="error-hint">{errorHint}</p>}</div>}
            {result && <div className="success-banner"><div className="success-title"><Icon name="check" size={17}/> Push thành công!</div><p>Đã cập nhật {result.changed} file. Commit: <code>{result.sha.slice(0, 12)}</code></p><a href={result.url} target="_blank" rel="noopener noreferrer">Xem commit trên GitHub <Icon name="external" size={15}/></a></div>}
          </article>
          <article className="hint-card"><Icon name="shield" size={22}/><div><strong>Quyền GitHub tối thiểu</strong><p>GitHub OAuth App yêu cầu scope <b>repo</b> và <b>workflow</b> để cập nhật cả workflow CI. Không lưu token trong JavaScript phía trình duyệt. Nếu branch được bảo vệ, GitHub có thể từ chối push và yêu cầu Pull Request.</p></div></article>
        </div>
      </section>
    </main>
    <footer><span>Zipverra · v1.3.4</span><span>OAuth cookie mã hóa · Không yêu cầu VPS · <span className="accent">Vercel Ready</span></span></footer>
  </div>
  </>;
}
