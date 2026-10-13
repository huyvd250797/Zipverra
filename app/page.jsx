'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { readArchive, encodeBase64 } from '../lib/archive.js';
import { calculateChanges, countChanges } from '../lib/operations.js';
import { zipCommitMessage } from '../lib/paths.js';
import { LIMITS } from '../lib/constants.js';
import { PUSH_STAGES, JOURNAL_KEY, withSafeRetry, validJournal } from '../lib/reliability.js';
import { MOBILE_TABS, RECENTS_KEY, THEME_KEY, filterChanges, updateRecentRepositories, getPushTimeline } from '../lib/mobile-ui.js';
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
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10Z"/></>,
    activity: <><path d="M3 12h5l3-7 3 14 3-7h4"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .4 2-2.4 2.4-2-.4-1.4.8-1 1.8h-3l-1-1.8-1.4-.8-2 .4L3.2 17l.4-2-.8-1.4-1.8-1v-3l1.8-1 .8-1.4-.4-2L5.6 2.8l2 .4L9 2.4l1-1.8h3l1 1.8 1.4.8 2-.4L19.8 5l-.4 2 .8 1.4 1.8 1v3l-1.8 1Z"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></>,
    moon: <path d="M20 16.4A8 8 0 0 1 7.6 4 8 8 0 1 0 20 16.4Z"/>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M19 5l-1.5 1.5m-11 11L5 19"/></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{shapes[name] || shapes.file}</svg>;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState('home');
  const [theme, setTheme] = useState('dark');
  const [repoSearch, setRepoSearch] = useState('');
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [recents, setRecents] = useState([]);
  const [changeFilter, setChangeFilter] = useState('all');
  const [syncConfirmed, setSyncConfirmed] = useState(false);
  const [auth, setAuth] = useState({ loading: true, authenticated: false, user: null });
  const [repos, setRepos] = useState([]);
  const [installations, setInstallations] = useState([]);
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
  const previewRef = useRef(null);

  useEffect(() => {
    try {
      const oldTheme = window.localStorage.getItem(THEME_KEY);
      if (oldTheme === 'dark' || oldTheme === 'light') setTheme(oldTheme);
      const oldRecents = JSON.parse(window.localStorage.getItem(RECENTS_KEY) || '[]');
      if (Array.isArray(oldRecents)) setRecents(oldRecents.filter((v) => typeof v === 'string').slice(0, 5));
    } catch { /* private browsing may block local storage */ }
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { window.localStorage.setItem(THEME_KEY, theme); } catch { /* optional preference */ }
  }, [theme]);
  function goToTab(tab) {
    if (!MOBILE_TABS.includes(tab)) return;
    setActiveTab(tab);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'auto' });
  }
  function saveRecent(value) {
    setRecents((current) => {
      const next = updateRecentRepositories(current, value);
      try { window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next)); } catch { /* optional metadata */ }
      return next;
    });
  }


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
      const messages = { cancelled: 'Bạn đã hủy cấp quyền GitHub.', invalid_state: 'Phiên OAuth không khớp hoặc đã hết hạn. Vui lòng đăng nhập lại.', expiration_disabled: 'GitHub App cần bật User-to-server token expiration và đăng nhập lại.', exchange_failed: 'GitHub App không hoàn tất đăng nhập. Hãy kiểm tra Client ID/Secret, Callback URL và thử lại.' };
      setError(messages[oauthError] || 'Đăng nhập GitHub thất bại.');
    }
    if (oauthError || params.has('auth')) window.history.replaceState({}, '', window.location.pathname);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!auth.authenticated) return;
    let active = true;
    setLoadingRepos(true);
    api('repos', {}).then((data) => { if (active) { setRepos(data.repos || []); setInstallations(data.installations || []); } })
      .catch((e) => { if (active) setError(`Không tải được repositories: ${e.message}`); })
      .finally(() => { if (active) setLoadingRepos(false); });
    return () => { active = false; };
  }, [auth.authenticated]);

  useEffect(() => {
    if (!preview || activeTab !== 'home' || !window.matchMedia('(max-width: 760px)').matches) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    previewRef.current?.scrollIntoView({ behavior: motion, block: 'start' });
  }, [preview]);

  async function logout() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST', cache: 'no-store' });
      if (!response.ok) throw new Error('Không thể đăng xuất.');
      setAuth({ loading: false, authenticated: false, user: null });
      setRepos([]); setOwner(''); setRepo(''); setBranch('main'); reset();
      setActiveTab('repositories');
      setPendingCommit(null); clearPending(); setPhase(PUSH_STAGES.IDLE);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  const commitMessage = useMemo(() => zipCommitMessage(file?.name), [file]);
  const stats = preview ? countChanges(preview.changes) : null;
  const shownChanges = preview ? filterChanges(preview.changes, changeFilter) : [];
  const timeline = getPushTimeline(phase, { preview: Boolean(preview), result: Boolean(result), pending: Boolean(pendingCommit) });
  const displayedRepos = repos.filter((item) => item.full_name.toLowerCase().includes(repoSearch.trim().toLowerCase()) || item.full_name === `${owner}/${repo}`);
  const reset = () => {
    setPreview(null);
    setConfirmed(false);
    setSyncConfirmed(false);
    setChangeFilter('all');
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
    setBusy(true); setLoadingRepos(true); setError(''); setErrorHint(''); setStatus('Đang tải repository từ GitHub...');
    try {
      if (!auth.authenticated) throw new Error('Hãy đăng nhập GitHub trước.');
      const result = await api('repos', {});
      setRepos(result.repos || []);
      setInstallations(result.installations || []);
      setStatus(`Đã tải ${(result.repos || []).length} repository có quyền ghi. Nếu thiếu repo, mở Install / Manage GitHub App và nhấn Refresh.`);
    } catch (e) { setError(e.message); setStatus(''); }
    finally { setBusy(false); setLoadingRepos(false); }
  }
  function chooseRepo(value) {
    if (!value) return;
    const index = value.indexOf('/');
    setOwner(value.slice(0, index));
    setRepo(value.slice(index + 1));
    setBranch('main');
    reset();
    saveRecent(value);
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
      setPhase(PUSH_STAGES.PREFLIGHT);
      setStatus('Đang kiểm tra GitHub App installation và quyền ghi repository...');
      await api('preflight', { ...input, workflowPaths: [] });
      setStatus('Đang đọc HEAD và so sánh với repository...');
      const remote = await api('snapshot', input);
      const changes = calculateChanges(archive.files, remote.files, mode);
      const workflowPaths = changes.filter((c) => /^\.github\/workflows\/[^/]+\.ya?ml$/i.test(c.path)).map((c) => c.path);
      if (workflowPaths.length) {
        setStatus('Đang kiểm tra quyền Workflows: write cho file CI...');
        await api('preflight', { ...input, workflowPaths });
      }
      setPreview({ archive, remote, changes, input: { owner: input.owner, repo: input.repo, branch: input.branch }, mode, filename: file.name });
      saveRecent(`${input.owner}/${input.repo}`);
      setChangeFilter('all');
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
    setActiveTab('activity');
    setPendingCommit(null);
    clearPending();
    setPreview(null);
    setConfirmed(false);
    setSyncConfirmed(false);
    setChangeFilter('all');
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
    if (!preview || !confirmed || (mode === 'sync' && stats?.delete > 0 && !syncConfirmed) || busy || pendingCommit) return;
    setBusy(true); setResult(null); setError(''); setErrorHint(''); setProgress(0);
    setPhase(PUSH_STAGES.UPLOADING);
    let commitPayload = null;
    try {
      if (!online) throw new Error('Thiết bị đang offline. Hãy kết nối Internet rồi thử lại.');
      const input = getInputs();
      if (input.owner !== preview.input.owner || input.repo !== preview.input.repo || input.branch !== preview.input.branch || mode !== preview.mode || file?.name !== preview.filename) {
        throw new Error('Cấu hình đã thay đổi. Hãy preview lại.');
      }
      // Refresh expiring GitHub App credentials once before parallel blob workers.
      // This reduces refresh-token races between concurrent serverless requests.
      const sessionResponse = await fetch('/api/auth/session', { cache: 'no-store' });
      const sessionState = await sessionResponse.json().catch(() => ({}));
      if (!sessionResponse.ok || !sessionState.authenticated) throw new Error('Phiên GitHub App đã hết hạn. Hãy đăng nhập lại trước khi push.');
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
      <div className="brand"><div className="brand-symbol"><Icon name="branch" size={25}/></div><div><strong>Zip<span>verra</span></strong><small>ZIP TO GITHUB · GITHUB APP</small></div></div>
      <div className="version"><span className="live-dot"/> v1.5.1</div>
    </header>
    <div className="mobile-context"><div><span className="mobile-eyebrow">ZIPVERRA / {({ home: 'HOME', repositories: 'REPOSITORIES', activity: 'ACTIVITY', settings: 'SETTINGS' })[activeTab]}</span><h2>{({ home: 'Upload source', repositories: 'GitHub repositories', activity: 'Push activity', settings: 'Preferences' })[activeTab]}</h2></div><span className={`mobile-connection ${online ? 'connected' : 'disconnected'}`} aria-label={online ? 'Online' : 'Offline'}>{online ? 'Online' : 'Offline'}</span></div>
    {activeTab !== 'activity' && (error || busy) && <button type="button" className={`mobile-global-status ${error ? 'has-error' : ''}`} onClick={() => goToTab('activity')}><span>{error ? `Cần kiểm tra: ${error}` : `${status || 'Đang xử lý...'} · ${progress}%`}</span><Icon name="arrow" size={17}/></button>}
    <main data-active-view={activeTab}>
      <section className="hero">
        <div className="eyebrow"><Icon name="shield" size={15}/> SECURE SOURCE DELIVERY</div>
        <h1>Push to GitHub.<br/><span>From Your Phone.</span></h1>
        <p>Upload ZIP do ChatGPT tạo, chọn repo và branch. App sẽ tự tạo commit theo tên ZIP rồi push lên GitHub — không cần Terminal.</p>
        <div className="highlights"><span><Icon name="check" size={15}/> Vercel-native</span><span><Icon name="check" size={15}/> Hỗ trợ binary</span><span><Icon name="check" size={15}/> So sánh trước khi push</span></div>
      </section>

      <section className="mobile-quick-card" aria-label="Repository hiện tại"><div><span className="mobile-quick-label">TARGET REPOSITORY</span><strong>{owner && repo ? `${owner}/${repo}` : 'Chưa chọn repository'}</strong><small><Icon name="branch" size={13}/> {branch || 'main'}</small></div><button type="button" className="button secondary" onClick={() => goToTab('repositories')} disabled={busy}>Chọn repo <Icon name="arrow" size={14}/></button></section>
      {pendingCommit && activeTab !== 'activity' && <button type="button" className="mobile-recovery-shortcut" onClick={() => goToTab('activity')}>Có lần push chưa xác minh · Mở Activity <Icon name="arrow" size={15}/></button>}
      <section className="content-grid" data-active-view={activeTab}>
        <div className="form-column">
          <article className="panel repository-panel" data-mobile-view="repositories">
            <StepTitle n="01" title="Đăng nhập GitHub" desc="Đăng nhập an toàn bằng GitHub App, chỉ truy cập repository được cấp phép."/>
            {auth.loading ? <div className="auth-card"><span className="auth-muted">Đang kiểm tra phiên đăng nhập GitHub...</span></div> : auth.authenticated ? <div className="auth-card signed-in">
              <div className="account-row"><div className="account-avatar">{auth.user?.login?.slice(0, 1).toUpperCase() || 'G'}</div><div className="account-info"><strong>@{auth.user?.login}</strong><small>GitHub App · Quyền theo repository</small></div><span className="auth-chip"><Icon name="check" size={14}/> Connected</span></div>
              <div className="inline-actions"><button type="button" className="button secondary" disabled={busy} onClick={loadRepos}><Icon name="refresh" size={17}/> Tải repositories</button><button type="button" className="button ghost" onClick={logout} disabled={busy}>Đăng xuất</button></div>
            </div> : <div className="auth-card">
              <p className="auth-muted">Đăng nhập với GitHub App, sau đó cài App cho những repository muốn cập nhật. Không cần nhập PAT.</p>
              <a className="button primary full login-button" href="/api/auth/login"><Icon name="github" size={19}/> Continue with GitHub <Icon name="arrow" size={16}/></a>
              <small className="hint">GitHub App chỉ thấy repository đã được cài và cấp quyền. Cần <b>Contents: Read & write</b>; cấp thêm <b>Workflows: Read & write</b> nếu ZIP thay đổi file workflow.</small>
            </div>}
            {auth.authenticated && <div className="app-install-panel" aria-label="GitHub App access">
              <div className="app-install-head"><Icon name="shield" size={18}/><strong>GitHub App Access</strong><span className="app-install-pill">{installations.length} installation</span></div>
              <p className="auth-muted">{installations.length ? `Đã liên kết: ${installations.map((x) => x.account).filter(Boolean).join(', ')}. Chỉ repo có quyền Write mới xuất hiện.` : 'Chưa thấy GitHub App installation có quyền truy cập. Hãy cài GitHub App cho tài khoản hoặc tổ chức rồi làm mới danh sách.'}</p>
              <div className="app-install-actions"><a className="button secondary app-install-link" href="/api/auth/install" target="_blank" rel="noopener noreferrer"><Icon name="external" size={16}/> Install / Manage GitHub App</a><button type="button" className="button secondary app-install-reload" disabled={loadingRepos || busy} onClick={async () => {setLoadingRepos(true); setError(''); try {const data = await api('repos', {}); setRepos(data.repos || []); setInstallations(data.installations || []);} catch (e) { setError(e.message); } finally {setLoadingRepos(false);} }}><Icon name="refresh" size={16}/> Refresh</button></div>
            </div>}
            <div className="field"><label htmlFor="repo-search">Tìm repository</label><div className="input-icon"><Icon name="search" size={17}/><input id="repo-search" type="search" value={repoSearch} disabled={busy || !auth.authenticated} placeholder="Lọc theo tên repository" onChange={(e) => setRepoSearch(e.target.value)}/></div></div>
            {loadingRepos && <div className="repo-skeleton" aria-label="Đang tải danh sách repository"><span/><span/><span/></div>}
            {recents.length > 0 && <div className="recents-block"><span className="mini-label">GẦN ĐÂY · lưu trên thiết bị</span><div className="recent-list">{recents.map((name) => <button type="button" key={name} className="recent-chip" disabled={busy || !auth.authenticated} onClick={() => chooseRepo(name)}>{name}</button>)}</div></div>}
            <div className="field"><label htmlFor="repo-select">Chọn repository</label><select id="repo-select" disabled={busy || !auth.authenticated || !repos.length} value={displayedRepos.some((x) => x.full_name === `${owner}/${repo}`) ? `${owner}/${repo}` : ''} onChange={(e) => chooseRepo(e.target.value)}><option value="">{repos.length ? (displayedRepos.length ? 'Chọn repository được cấp quyền' : 'Không có repo phù hợp') : 'Chưa có repo được GitHub App cấp quyền'}</option>{displayedRepos.map((x) => <option key={x.full_name} value={x.full_name}>{x.full_name}{x.private ? ' 🔒' : ''}</option>)}</select></div>
            <div className="two-col"><div className="field"><label htmlFor="owner">Owner</label><input id="owner" value={owner} disabled={busy || !auth.authenticated} placeholder="huyvd250797" onChange={(e) => change(setOwner, e.target.value)}/></div><div className="field"><label htmlFor="repo">Repository</label><input id="repo" value={repo} disabled={busy || !auth.authenticated} placeholder="Finzaro" onChange={(e) => change(setRepo, e.target.value)}/></div></div>
            <div className="field"><label htmlFor="branch">Branch đích <span className="tag">Mặc định: main</span></label><div className="input-icon"><Icon name="branch" size={17}/><input id="branch" value={branch} disabled={busy || !auth.authenticated} placeholder="main" onChange={(e) => change(setBranch, e.target.value)}/></div></div>
            <button type="button" className="button secondary full mobile-repo-next" onClick={() => goToTab('home')} disabled={!auth.authenticated || !owner || !repo || busy}>Tiếp tục tải ZIP <Icon name="arrow" size={17}/></button>
          </article>

          <article className="panel upload-panel" data-mobile-view="home">
            <StepTitle n="02" title="Tải source ZIP" desc="Giải nén trực tiếp trên điện thoại, chỉ gửi file cần thay đổi."/>
            <input ref={fileInput} id="file" className="visually-hidden" type="file" accept=".zip,application/zip,application/x-zip-compressed" disabled={busy} onChange={(e) => chooseFile(e.target.files?.[0])}/>
            <label htmlFor="file" className={`drop-zone ${file ? 'picked' : ''}`}><span className="file-symbol"><Icon name={file ? 'file' : 'upload'} size={25}/></span><strong>{file ? file.name : 'Chạm để chọn file ZIP'}</strong><small>{file ? `${prettyBytes(file.size)} · Chạm để thay file` : 'Nguồn ZIP từ ChatGPT hoặc ứng dụng Files'}</small></label>
            {file && <div className="file-detail"><Icon name="check" size={15}/> Đã chọn file · Commit: <strong>{commitMessage}</strong></div>}
            <div className="limits"><span>Tối đa 20 MB / ZIP</span><span>2.5 MB / file</span><span>1.200 file</span></div>
            <div className="field"><label htmlFor="mode">Chế độ cập nhật</label><select id="mode" value={mode} disabled={busy} onChange={(e) => change(setMode, e.target.value)}><option value="merge">Merge — Thêm/sửa, giữ file cũ</option><option value="sync">Sync — Xóa file cũ không có trong ZIP</option></select><small className="hint">Khuyên dùng Merge. Sync có thể xóa những file quan trọng đang có trên repo.</small></div>
            <div className="field"><label htmlFor="message">Commit tự động lấy tên ZIP</label><div className="input-icon"><Icon name="file" size={17}/><input id="message" readOnly value={file ? commitMessage : ''} placeholder="Chọn ZIP để tạo commit message"/></div></div>
            <button className="button primary full" disabled={busy || !file || !auth.authenticated || !owner || !repo} onClick={analyze}>{busy ? 'Đang xử lý...' : 'Phân tích ZIP và xem thay đổi'} <Icon name="arrow" size={18}/></button>
          </article>
        </div>

        <div className="side-column">
          <article ref={previewRef} className="panel preview-panel" data-mobile-view="home">
            <StepTitle n="03" title="Kiểm tra & Push" desc="Xem thay đổi trước khi GitHub tạo commit." centerOnMobile/>
            {!preview ? <div className="empty-preview"><div className="circle-placeholder"><Icon name="branch" size={27}/></div><h3>Chưa có bản preview</h3><p>Chọn repository, upload file ZIP rồi nhấn <b>Phân tích ZIP</b> để xem danh sách file được cập nhật.</p></div> : <>
              <div className="summary-line"><span className="pill">{preview.input.owner}/{preview.input.repo}</span><span className="pill branch-pill"><Icon name="branch" size={14}/> {preview.input.branch}</span></div>
              <div className="stat-grid"><div><strong className="good">+{stats.add}</strong><span>Thêm</span></div><div><strong className="warn">~{stats.modify}</strong><span>Sửa</span></div><div><strong className="bad">−{stats.delete}</strong><span>Xóa</span></div></div>
              <div className="archive-meta">{preview.archive.files.length} file · {prettyBytes(preview.archive.unpackedSize)} đã giải nén{preview.archive.wrapper ? ` · Bỏ thư mục gốc: ${preview.archive.wrapper}/` : ''}{preview.archive.ignored ? ` · Bỏ qua ${preview.archive.ignored} file` : ''}</div>
              <div className="diff-filters" role="group" aria-label="Lọc file thay đổi">{[{id:'all',label:'Tất cả',n:preview.changes.length},{id:'add',label:'Thêm',n:stats.add},{id:'modify',label:'Sửa',n:stats.modify},{id:'delete',label:'Xóa',n:stats.delete}].map((option) => <button type="button" key={option.id} className={`diff-filter ${changeFilter === option.id ? 'selected' : ''}`} aria-pressed={changeFilter === option.id} onClick={() => setChangeFilter(option.id)}>{option.label} <span>{option.n}</span></button>)}</div>
              <div className="change-list" aria-label="Danh sách thay đổi">{shownChanges.length ? shownChanges.map((item) => <div className="change-row" key={item.path}><span className={`change-mark ${item.kind}`}>{item.kind === 'add' ? 'A' : item.kind === 'modify' ? 'M' : 'D'}</span><span title={item.path}>{item.path}</span></div>) : <div className="empty-change">{preview.changes.length ? 'Không có file thuộc bộ lọc này.' : 'Không có thay đổi để commit.'}</div>}</div>
              {stats.delete > 0 && <div className="warning-banner"><strong>Cảnh báo Sync</strong><p>Chế độ Sync sẽ xóa {stats.delete} file đang có trên GitHub. Các file này có thể bao gồm cấu hình deploy.</p><label className="confirm-row sync-confirm"><input type="checkbox" checked={syncConfirmed} disabled={busy} onChange={(e) => setSyncConfirmed(e.target.checked)}/><span>Tôi đồng ý xóa {stats.delete} file trong repository.</span></label></div>}
              {preview.changes.length > 0 && <><label className="confirm-row"><input type="checkbox" checked={confirmed} disabled={busy} onChange={(e) => setConfirmed(e.target.checked)}/><span>Tôi đã kiểm tra thay đổi và đồng ý push lên <b>{preview.input.branch}</b>.</span></label><button className="button primary full push-button" disabled={busy || !confirmed || (mode === 'sync' && stats.delete > 0 && !syncConfirmed) || !auth.authenticated || !online || Boolean(pendingCommit)} onClick={push}><Icon name="upload" size={18}/> {busy ? 'Đang push...' : `Commit & Push (${preview.changes.length} file)`}</button></>}
            </>}
          </article>
          <article className="panel activity-panel" data-mobile-view="activity"><div className="activity-title"><h2>Trạng thái xử lý</h2><span className={`activity-dot ${busy ? 'pulse' : ''}`}/></div>
            <div className="push-timeline" aria-label="Tiến trình push">{timeline.map((step, index) => <div key={step.id} className={`timeline-step timeline-${step.state}`}><span className="timeline-icon">{step.state === 'complete' ? <Icon name="check" size={14}/> : index + 1}</span><div><strong>{({validate:'Validate',upload:'Upload',commit:'Commit',verify:'Verify'})[step.id]}</strong><small>{({complete:'Hoàn tất',active:'Đang xử lý',uncertain:'Chưa xác minh',failed:'Cần kiểm tra',waiting:'Chờ xử lý'})[step.state]}</small></div></div>)}</div>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }}/></div><p className="status-text" role="status">{status || 'Sẵn sàng nhận file ZIP.'}</p>
            <div className="push-status-line"><span className={`network-chip ${online ? 'online' : 'offline'}`}>{online ? '● Online' : '● Offline'}</span><span className="stage-chip">{phase.replaceAll('_', ' ')}</span></div>
            {pendingCommit && <div className="recovery-banner" role="status"><strong>Cần xác minh lần push trước</strong><p>{pendingCommit.owner}/{pendingCommit.repo} · {pendingCommit.branch} · {pendingCommit.message}</p><button type="button" className="button secondary full" disabled={busy || !online || !auth.authenticated} onClick={() => verifyPending()}><Icon name="refresh" size={16}/> {busy && phase === PUSH_STAGES.VERIFYING ? 'Đang xác minh...' : 'Xác minh push trên GitHub'}</button><small>Chỉ kiểm tra trạng thái, không tạo commit mới.</small></div>}
            {error && <div className="error-banner" role="alert">{error}{errorHint && <p className="error-hint">{errorHint}</p>}</div>}
            {result && <div className="success-banner"><div className="success-title"><Icon name="check" size={17}/> Push thành công!</div><p>Đã cập nhật {result.changed} file. Commit: <code>{result.sha.slice(0, 12)}</code></p><a href={result.url} target="_blank" rel="noopener noreferrer">Xem commit trên GitHub <Icon name="external" size={15}/></a></div>}
          </article>
          <article className="panel settings-panel" data-mobile-view="settings"><div className="settings-heading"><Icon name="settings" size={21}/><div><h2>Tùy chỉnh Zipverra</h2><p>Cài đặt giao diện chỉ lưu trên thiết bị.</p></div></div><div className="field"><label>Giao diện</label><div className="theme-options" role="group" aria-label="Chế độ hiển thị"><button type="button" className={theme === 'dark' ? 'selected' : ''} aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}><Icon name="moon" size={18}/> Dark</button><button type="button" className={theme === 'light' ? 'selected' : ''} aria-pressed={theme === 'light'} onClick={() => setTheme('light')}><Icon name="sun" size={18}/> Light</button></div></div><div className="settings-info"><span>Phiên bản</span><strong>v1.5.1</strong></div><div className="settings-info"><span>Chế độ GitHub</span><strong>GitHub App · User Token</strong></div><div className="settings-info"><span>Commit message</span><strong>Tên file ZIP</strong></div><p className="hint">Danh sách repo gần đây và giao diện được lưu trên thiết bị, không chứa GitHub token.</p></article>
          <article className="hint-card" data-mobile-view="settings"><Icon name="shield" size={22}/><div><strong>Quyền GitHub tối thiểu</strong><p>GitHub App dùng token người dùng có thời hạn, giới hạn bởi quyền người dùng và các repository được cài đặt. Cần <b>Contents: Read & write</b> và <b>Workflows: Read & write</b> khi sửa CI. Token/refresh token ở cookie HttpOnly được mã hóa; branch protection vẫn có thể yêu cầu Pull Request.</p></div></article>
        </div>
      </section>
    </main>
    <footer><span>Zipverra · v1.5.1</span><span>GitHub App · Cookie mã hóa · Không yêu cầu VPS · <span className="accent">Vercel Ready</span></span></footer>
  </div>
  <nav className="mobile-bottom-nav" aria-label="Điều hướng Zipverra">{[{id:'home',label:'Home',icon:'home'},{id:'repositories',label:'Repos',icon:'branch'},{id:'activity',label:'Activity',icon:'activity'},{id:'settings',label:'Settings',icon:'settings'}].map((tab) => <button type="button" key={tab.id} className={`mobile-nav-item ${activeTab === tab.id ? 'active' : ''}`} aria-current={activeTab === tab.id ? 'page' : undefined} onClick={() => goToTab(tab.id)}><Icon name={tab.icon} size={21}/><span>{tab.label}</span>{tab.id === 'activity' && pendingCommit && <i className="nav-alert" aria-label="Có push cần xác minh"/>}</button>)}</nav>
  </>;
}
