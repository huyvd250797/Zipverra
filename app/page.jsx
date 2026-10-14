'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { encodeBase64 } from '../lib/base64.js';
import { readArchiveOffThread } from '../lib/archive-worker-client.js';
import { manifestFingerprint, validatedCheckpoint, makeCheckpoint, uploadBlobsInBatches, UPLOAD_CHECKPOINT_KEY } from '../lib/upload-batches.js';
import { calculateChanges, countChanges } from '../lib/operations.js';
import { zipCommitMessage } from '../lib/paths.js';
import { makeReleaseBranch } from '../lib/branch-names.js';
import { scanSelectedChanges, reportSelectedSecurity } from '../lib/source-security.js';
import { LIMITS } from '../lib/constants.js';
import { PUSH_STAGES, JOURNAL_KEY, withSafeRetry, validJournal } from '../lib/reliability.js';
import { MOBILE_TABS, RECENTS_KEY, THEME_KEY, filterChanges, updateRecentRepositories, getPushTimeline } from '../lib/mobile-ui.js';
import { FAVORITES_KEY, analyzeSource, selectChanges, toggleExcluded, filterReview, sortedRepositories, updateFavorites, isTextPreviewable, decodePreview, makeLineDiff, transferEstimate } from '../lib/smart-push.js';
import SplashScreen from './components/SplashScreen.jsx';
import { WorkflowStrip, CurrentRepository, StatusIndicator, UXViewIntro, StatusEmpty } from './components/ProfessionalUI.jsx';
import MobileViewportGuard from './components/MobileViewportGuard.jsx';
import HistoryPanel from './components/HistoryPanel.jsx';
import WorkspacePanel from './components/WorkspacePanel.jsx';
import BranchPrPanel from './components/BranchPrPanel.jsx';
import ProDashboard from './components/ProDashboard.jsx';
import PushProfiles from './components/PushProfiles.jsx';
import ActivityJournal from './components/ActivityJournal.jsx';
import { PRO_PROFILES_KEY, PRO_ACTIVITY_KEY, PRO_DASHBOARD_KEY, accountStorageKey,
  normalizeProfiles, upsertProfile, removeProfile, addActivity, normalizeActivity, proSnapshot, dashboardRepos } from '../lib/pro-workspace.js';

async function requestOnce(endpoint, data) {
  let response;
  const controller = new AbortController();
  // A timeout on `commit` is deliberately ambiguous; journal + Verify Push resolve it.
  const timer = setTimeout(() => controller.abort(), ['commit', 'rollback/execute', 'workspace/save'].includes(endpoint) ? 110000 : 38000);
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

const PR_JOURNAL_KEY = 'zipverra.pr.pending.v1';
function validPendingPR(value) {
  return value && typeof value === 'object' &&
    /^[a-f0-9]{40}$/i.test(value.expectedSourceHead || '') &&
    /^zipverra\/[a-z0-9._-]+-[a-f0-9]{8}$/.test(value.sourceBranch || '') &&
    typeof value.owner === 'string' && typeof value.repo === 'string' &&
    typeof value.baseBranch === 'string' && typeof value.title === 'string';
}
function readPendingPR() {
  try { const value = JSON.parse(window.sessionStorage.getItem(PR_JOURNAL_KEY) || 'null'); return validPendingPR(value) ? value : null; }
  catch { return null; }
}
function savePendingPR(value) {
  try { window.sessionStorage.setItem(PR_JOURNAL_KEY, JSON.stringify(value)); } catch { /* storage optional */ }
}
function clearPendingPR() {
  try { window.sessionStorage.removeItem(PR_JOURNAL_KEY); } catch { /* no-op */ }
}

function prettyBytes(count) {
  return count >= 1024 * 1024 ? `${(count / 1024 / 1024).toFixed(2)} MB` : `${Math.max(0, Math.round(count / 1024))} KB`;
}

function StepTitle({ n, title, desc, centerOnMobile = false }) {
  return <div className={`step-heading${centerOnMobile ? ' step-heading--mobile-center' : ''}`}><span className="step-number" aria-hidden="true">{n}</span><div><h2>{title}</h2><p>{desc}</p></div></div>;
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
    history: <><path d="M3 12a9 9 0 1 0 3-6.7M3 3v4h4"/><path d="M12 7v5l3 2"/></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{shapes[name] || shapes.file}</svg>;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState('repositories');
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [proProfiles, setProProfiles] = useState([]);
  const [proActivity, setProActivity] = useState([]);
  const proProfilesRef = useRef([]);
  const proActivityRef = useRef([]);
  const [proDashboard, setProDashboard] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState('');
  const [repoSearch, setRepoSearch] = useState('');
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [recents, setRecents] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [excludedPaths, setExcludedPaths] = useState([]);
  const [reviewSearch, setReviewSearch] = useState('');
  const [visibleLimit, setVisibleLimit] = useState(100);
  const [diffViewer, setDiffViewer] = useState(null);
  const diffRequestRef = useRef(0);
  const [transfer, setTransfer] = useState(null);
  const [changeFilter, setChangeFilter] = useState('all');
  const [syncConfirmed, setSyncConfirmed] = useState(false);
  const [auth, setAuth] = useState({ loading: true, authenticated: false, user: null });
  const [repos, setRepos] = useState([]);
  const [installations, setInstallations] = useState([]);
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [branch, setBranch] = useState('main');
  const [mode, setMode] = useState('merge');
  const [releaseStrategy, setReleaseStrategy] = useState('direct');
  const [pendingPR, setPendingPR] = useState(null);
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
  const activityRef = useRef(null);

  useEffect(() => {
    try {
      const oldTheme = window.localStorage.getItem(THEME_KEY);
      if (oldTheme === 'dark' || oldTheme === 'light') setTheme(oldTheme);
      const oldRecents = JSON.parse(window.localStorage.getItem(RECENTS_KEY) || '[]');
      if (Array.isArray(oldRecents)) setRecents(oldRecents.filter((v) => typeof v === 'string').slice(0, 5));
      const oldFavorites = JSON.parse(window.localStorage.getItem(FAVORITES_KEY) || '[]');
      if (Array.isArray(oldFavorites)) setFavorites(oldFavorites.filter((v) => typeof v === 'string').slice(0, 8));
    } catch { /* private browsing may block local storage */ }
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { window.localStorage.setItem(THEME_KEY, theme); } catch { /* optional preference */ }
  }, [theme]);
  function goToTab(tab) {
    if (!MOBILE_TABS.includes(tab)) return;
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      if (tab === 'activity' && window.matchMedia('(min-width: 761px)').matches) {
        window.requestAnimationFrame(() => activityRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      } else window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }
  function saveUploadCheckpoint(value) {
    try { window.localStorage.setItem(UPLOAD_CHECKPOINT_KEY, JSON.stringify(value)); } catch { /* no persistent storage available */ }
  }
  function loadUploadCheckpoint() {
    try { return JSON.parse(window.localStorage.getItem(UPLOAD_CHECKPOINT_KEY) || 'null'); } catch { return null; }
  }
  function clearUploadCheckpoint() {
    try { window.localStorage.removeItem(UPLOAD_CHECKPOINT_KEY); } catch { /* no persistent storage available */ }
  }
  function toggleFavorite(value) {
    setFavorites((current) => {
      const next = updateFavorites(current, value);
      try { window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next)); } catch { /* optional preference */ }
      return next;
    });
  }
  function saveRecent(value) {
    setRecents((current) => {
      const next = updateRecentRepositories(current, value);
      try { window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next)); } catch { /* optional metadata */ }
      return next;
    });
  }


  useEffect(() => {
    // Account-scoped local metadata, never a credential store. Do not show another account's cache.
    proProfilesRef.current=[];proActivityRef.current=[];
    setProProfiles([]); setProActivity([]); setProDashboard(null); setDashboardError('');
    if (!auth.authenticated || !auth.user?.login) return;
    try {
      const profileKey=accountStorageKey(PRO_PROFILES_KEY,auth.user);
      const activityKey=accountStorageKey(PRO_ACTIVITY_KEY,auth.user);
      const dashboardKey=accountStorageKey(PRO_DASHBOARD_KEY,auth.user);
      if (profileKey) {const value=normalizeProfiles(JSON.parse(localStorage.getItem(profileKey)||'[]'));proProfilesRef.current=value;setProProfiles(value);}
      if (activityKey) {const value=normalizeActivity(JSON.parse(localStorage.getItem(activityKey)||'[]'));proActivityRef.current=value;setProActivity(value);}
      if (dashboardKey) setProDashboard(proSnapshot(JSON.parse(localStorage.getItem(dashboardKey)||'null')));
    } catch { /* invalid local cache must not break the PWA */ }
  }, [auth.authenticated,auth.user?.login]);

  function saveProfile(value) {
    if (!auth.authenticated || !auth.user?.login) return;
    const next=upsertProfile(proProfilesRef.current,value);
    proProfilesRef.current=next;setProProfiles(next);
    try{localStorage.setItem(accountStorageKey(PRO_PROFILES_KEY,auth.user),JSON.stringify(next));}catch{}
  }
  function deleteProfile(name) {
    const next=removeProfile(proProfilesRef.current,name);
    proProfilesRef.current=next;setProProfiles(next);
    try{localStorage.setItem(accountStorageKey(PRO_PROFILES_KEY,auth.user),JSON.stringify(next));}catch{}
  }
  function applyProfile(profile) {
    if (!auth.authenticated || `${owner}/${repo}`.toLowerCase()!==profile.repo.toLowerCase() || busy || pendingCommit || pendingPR) return;
    setBranch(profile.branch);setMode(profile.mode);setReleaseStrategy(profile.strategy);
    setFile(null); if(fileInput.current)fileInput.current.value=''; reset(); goToTab('home');
  }
  function selectAndApplyProfile(profile) {
    if (!auth.authenticated || busy || pendingCommit || pendingPR ||
        !repos.some(r=>r.full_name.toLowerCase()===profile.repo.toLowerCase())) return;
    const [nextOwner,nextRepo]=profile.repo.split('/');
    setOwner(nextOwner);setRepo(nextRepo);setBranch(profile.branch);
    setMode(profile.mode);setReleaseStrategy(profile.strategy);
    setWorkspaceOpen(false);setFile(null);if(fileInput.current)fileInput.current.value='';
    reset();saveRecent(profile.repo);goToTab('home');
  }
  function logLocalAction(value) {
    if (!auth.authenticated || !auth.user?.login) return;
    const next=addActivity(proActivityRef.current,value);
    proActivityRef.current=next;setProActivity(next);
    try{localStorage.setItem(accountStorageKey(PRO_ACTIVITY_KEY,auth.user),JSON.stringify(next));}catch{}
  }
  function clearLocalActions() {
    if (!window.confirm('Xóa toàn bộ nhật ký hoạt động được lưu trên thiết bị này? Lịch sử GitHub không bị ảnh hưởng.')) return;
    proActivityRef.current=[];setProActivity([]);
    try{localStorage.removeItem(accountStorageKey(PRO_ACTIVITY_KEY,auth.user));}catch{}
  }
  async function refreshDashboard() {
    if (!auth.authenticated || !online || dashboardLoading || busy) return;
    const repositories=dashboardRepos(repos,favorites,recents,owner&&repo?`${owner}/${repo}`:'');
    if (!repositories.length) {setDashboardError('Chọn hoặc ghim repository để xem Dashboard.');return;}
    setDashboardLoading(true);setDashboardError('');
    try {
      const next=proSnapshot(await api('dashboard',{repositories}));
      if (!next)throw Error('Dữ liệu GitHub Dashboard không hợp lệ.');
      setProDashboard(next);
      try{localStorage.setItem(accountStorageKey(PRO_DASHBOARD_KEY,auth.user),JSON.stringify(next));}catch{}
    } catch(e) {setDashboardError(`Không cập nhật được Dashboard: ${e.message}`);}
    finally{setDashboardLoading(false);}
  }

  useEffect(() => {
    setOnline(navigator.onLine);
    const onNetwork = () => setOnline(navigator.onLine);
    window.addEventListener('online', onNetwork);
    window.addEventListener('offline', onNetwork);
    const pendingPr = readPendingPR();
    if (pendingPr) {
      setPendingPR(pendingPr);
      setStatus('Branch đã push; Pull Request chưa được xác nhận. Mở Activity để kiểm tra/tạo PR.');
    }
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
      setFile(null); setMode('merge'); setReleaseStrategy('direct');
      setRepos([]); setOwner(''); setRepo(''); setBranch('main'); reset();
      setActiveTab('repositories'); setWorkspaceOpen(false);
      clearUploadCheckpoint();
      setPendingCommit(null); clearPending(); setPhase(PUSH_STAGES.IDLE);
      setPendingPR(null); clearPendingPR(); setReleaseStrategy('direct');
      try { sessionStorage.removeItem('zipverra.rollback.pending.v1'); } catch { /* no-op */ }
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  const commitMessage = useMemo(() => zipCommitMessage(file?.name), [file]);
  const selectedChanges = useMemo(() => preview ? selectChanges(preview.changes, excludedPaths) : [], [preview, excludedPaths]);
  const stats = preview ? countChanges(selectedChanges) : null;
  const totalStats = preview ? countChanges(preview.changes) : null;
  const securityReport = useMemo(() => preview ? reportSelectedSecurity(preview.archive.security, selectedChanges) : null, [preview,selectedChanges]);
  const shownChanges = preview ? filterReview(preview.changes, changeFilter, reviewSearch) : [];
  const selectedBytes = selectedChanges.filter(c => c.kind !== 'delete').reduce((sum, c) => sum + (c.bytes || 0), 0);
  const baseTimeline = getPushTimeline(phase, { preview: Boolean(preview), result: Boolean(result), pending: Boolean(pendingCommit) });
  const hasPrFlow = releaseStrategy === 'pr' || Boolean(pendingPR) || Boolean(result?.pr) || Boolean(pendingCommit?.prRequest);
  const timeline = hasPrFlow ? [...baseTimeline, { id:'pr', state:result?.pr ? 'complete' : pendingPR ? (busy ? 'active':'uncertain') : 'waiting' }] : baseTimeline;
  const displayedRepos = sortedRepositories(repos, favorites, recents).filter((item) => item.full_name.toLowerCase().includes(repoSearch.trim().toLowerCase()) || item.full_name === `${owner}/${repo}`);
  const authorizedRecents = recents.filter((name) => repos.some((item) => item.full_name === name));
  const chosenRepo = Boolean(owner.trim() && repo.trim() && repos.some((item) => item.full_name.toLowerCase() === `${owner}/${repo}`.toLowerCase()));
  const flowStep = phase === PUSH_STAGES.SUCCEEDED ? 5 : [PUSH_STAGES.UPLOADING, PUSH_STAGES.COMMITTING, PUSH_STAGES.VERIFYING, PUSH_STAGES.UNCONFIRMED].includes(phase) ? 4 : !chosenRepo ? 0 : !file ? 1 : !preview ? 2 : !confirmed ? 3 : 4;
  const reset = () => {
    setPreview(null);
    setConfirmed(false);
    setSyncConfirmed(false);
    setChangeFilter('all');
    setExcludedPaths([]); setReviewSearch(''); setVisibleLimit(100); setDiffViewer(null); diffRequestRef.current += 1;
    setTransfer(null);
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
    setFile(null); setMode('merge'); setReleaseStrategy('direct');
    if (fileInput.current) fileInput.current.value = '';
    reset();
    saveRecent(value);
    goToTab('home');
  }
  function chooseFile(next) {
    change(setFile, next || null);
    if (fileInput.current) fileInput.current.value = '';
  }
  async function analyze() {
    setBusy(true); setError(''); setErrorHint(''); setResult(null); setProgress(0); setPhase(PUSH_STAGES.ANALYZING);
    try {
      if (!online) throw new Error('Thiết bị đang offline. Hãy kết nối Internet rồi phân tích lại.');
      if (pendingCommit) throw new Error('Có một lần push chưa xác minh. Mở Activity → Xác minh push trước khi tiếp tục.');
      if (pendingPR) throw new Error('Branch đã push nhưng PR còn chờ xác minh. Mở Activity → Kiểm tra / Tạo PR.');
      const input = getInputs();
      if (!file) throw new Error('Hãy chọn file ZIP chứa source code.');
      setStatus('Đang phân tích ZIP trong Web Worker, kiểm tra file và tính Git SHA...');
      const archive = await readArchiveOffThread(file, (percent) => setProgress(Math.round(percent * 0.6)),
        typeof Worker !== 'undefined' ? () => new Worker(new URL('./workers/archive.worker.js', import.meta.url), { type: 'module' }) : null,
        async (selected, onProgress) => (await import('../lib/archive.js')).readArchive(selected, onProgress));
      setPhase(PUSH_STAGES.PREFLIGHT);
      setProgress(65);
      setStatus('Đang kiểm tra GitHub App installation và quyền ghi repository...');
      await api('preflight', { ...input, workflowPaths: [] });
      setStatus('Đang đọc HEAD và so sánh với repository...');
      setProgress(75);
      const remote = await api('snapshot', input);
      const changes = calculateChanges(archive.files, remote.files, mode);
      const insights = analyzeSource({ ...archive, changes });
      // Web Worker already scans file contents. Fallback runs the same bounded scanner.
      if (!archive.security) archive.security=scanSelectedChanges(archive.files,archive.files.map(f=>({path:f.path,kind:'add'})));
      const releaseBranch = releaseStrategy === 'pr'
        ? makeReleaseBranch(file.name, crypto.randomUUID().replaceAll('-', '').slice(0, 8)) : null;
      setPreview({ archive, remote, changes, insights, input: { owner: input.owner, repo: input.repo, branch: input.branch }, mode, filename: file.name, releaseStrategy, releaseBranch });
      saveRecent(`${input.owner}/${input.repo}`);
      setChangeFilter('all'); setReviewSearch(''); setVisibleLimit(100); setExcludedPaths([]); setDiffViewer(null); diffRequestRef.current += 1;
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
    logLocalAction({kind:'push',state:'success',repo:`${owner}/${repo}`,sha:outcome.sha,message:'Commit verified on GitHub'});
    setPendingCommit(null);
    clearPending();
    clearUploadCheckpoint();
    setPreview(null);
    setConfirmed(false);
    setSyncConfirmed(false);
    setChangeFilter('all'); setExcludedPaths([]); setDiffViewer(null);
    setError(''); setErrorHint('');
  }

  async function completeVerified(outcome, data) {
    if (!data?.prRequest) {
      finishVerified(outcome);
      return;
    }
    const prData = { ...data.prRequest, expectedSourceHead: outcome.sha };
    clearPending(); setPendingCommit(null); clearUploadCheckpoint();
    setPreview(null); setConfirmed(false); setSyncConfirmed(false);
    setResult({ ...outcome, branchOnly: true, sourceBranch: prData.sourceBranch });
    logLocalAction({kind:'push',state:'success',repo:`${prData.owner}/${prData.repo}`,sha:outcome.sha,message:'Release branch verified'});
    setProgress(100); setPhase(PUSH_STAGES.SUCCEEDED); setActiveTab('activity');
    setPendingPR(prData); savePendingPR(prData);
    setStatus('Branch đã push và xác minh trên GitHub. Đang mở Pull Request...');
    try {
      const pr = await requestOnce('pull-request/create', prData);
      setResult({ ...outcome, pr, sourceBranch: prData.sourceBranch });
      logLocalAction({kind:'pr',state:'success',repo:`${prData.owner}/${prData.repo}`,sha:outcome.sha,message:`Opened Pull Request #${pr.number}`});
      setPendingPR(null); clearPendingPR();
      setStatus(`Pull Request #${pr.number} đã được tạo/xác minh. Chờ review và merge trên GitHub.`);
      setError(''); setErrorHint('');
    } catch(e) {
      setError(`Đã push branch thành công nhưng chưa xác minh PR: ${e.message}`);
      setErrorHint('Không cần push lại ZIP. Dùng nút “Kiểm tra / Tạo PR” trong Activity; thao tác tạo PR có kiểm tra trùng.');
      setStatus('GitHub branch đã cập nhật. Cần xác minh bước mở Pull Request.');
    }
  }

  async function retryPendingPR() {
    if (!pendingPR || busy || !online) return;
    setBusy(true); setError(''); setErrorHint('');
    setStatus('Đang kiểm tra GitHub để tìm PR hiện có trước khi gửi yêu cầu mới...');
    try {
      const pr = await requestOnce('pull-request/create', pendingPR);
      setResult(current => ({ ...(current || {}), sha: pendingPR.expectedSourceHead,
        sourceBranch: pendingPR.sourceBranch, pr, branchOnly:false }));
      logLocalAction({kind:'pr',state:'success',repo:`${pendingPR.owner}/${pendingPR.repo}`,sha:pendingPR.expectedSourceHead,message:`Verified Pull Request #${pr.number}`});
      setPendingPR(null); clearPendingPR(); setPhase(PUSH_STAGES.SUCCEEDED);
      setStatus(`Pull Request #${pr.number} đã được tạo/xác minh.`);
    } catch(e) {
      setError(`Chưa xác minh được PR: ${e.message}`);
      setErrorHint('Không cần push ZIP lại. Có thể kiểm tra trực tiếp Pull Requests trên GitHub rồi thử lại.');
    } finally { setBusy(false); }
  }

  async function verifyPending(data = pendingCommit) {
    if (!data || busy) return;
    setBusy(true); setPhase(PUSH_STAGES.VERIFYING); setError(''); setErrorHint('');
    setStatus('Đang đối chiếu GitHub HEAD, commit và danh sách file, không tạo commit mới...');
    try {
      const checked = await api('verify', data, (attempt) => setStatus(`Đang thử đọc lại GitHub (${attempt}/2)...`));
      if (checked.state === 'applied') {
        await completeVerified({ ...checked, recovered: true }, data);
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

  function updateSelection(path) {
    setExcludedPaths(current => toggleExcluded(preview?.changes || [], current, path));
    setConfirmed(false); setSyncConfirmed(false);
  }
  function bulkSelection(keep) {
    if (!preview) return;
    setExcludedPaths(keep ? [] : preview.changes.map(change => change.path));
    setConfirmed(false); setSyncConfirmed(false);
  }
  async function inspectChange(change) {
    if (!preview || busy) return;
    const requestId = ++diffRequestRef.current;
    setDiffViewer({ path:change.path, loading:true, message:'Đang tải nội dung để so sánh…' });
    try {
      const localFile = preview.archive.files.find(f => f.path === change.path);
      let after = '';
      if (change.kind !== 'delete') {
        if (!isTextPreviewable(localFile)) throw new Error('File này lớn, dạng nhị phân hoặc không phù hợp để hiển thị text diff.');
        after = decodePreview(localFile.data);
        if (after === null) throw new Error('File không phải UTF-8 text.');
      }
      let before = '';
      if (change.kind !== 'add') {
        const response = await api('text', { ...preview.input, expectedHead:preview.remote.head, path:change.path });
        if (!response.available) throw new Error(response.reason || 'Không xem được nội dung cũ.');
        before = response.content;
      }
      const diff=makeLineDiff(before, after);
      if (requestId === diffRequestRef.current) setDiffViewer({ path:change.path, ...diff, loading:false });
    } catch (e) {
      if (requestId === diffRequestRef.current) setDiffViewer({path:change.path, loading:false, message:e.message, lines:[]});
    }
  }

  async function push() {
    if (!preview || !selectedChanges.length || securityReport?.blocked || !confirmed || (mode === 'sync' && stats?.delete > 0 && !syncConfirmed) || busy || pendingCommit || pendingPR) return;
    setBusy(true); setResult(null); setError(''); setErrorHint(''); setProgress(0); setTransfer(null);
    setPhase(PUSH_STAGES.UPLOADING);
    let commitPayload = null;
    try {
      goToTab('activity');
      if (!online) throw new Error('Thiết bị đang offline. Hãy kết nối Internet rồi thử lại.');
      const input = getInputs();
      if (input.owner !== preview.input.owner || input.repo !== preview.input.repo || input.branch !== preview.input.branch || mode !== preview.mode || file?.name !== preview.filename || releaseStrategy !== preview.releaseStrategy) {
        throw new Error('Cấu hình đã thay đổi. Hãy preview lại.');
      }
      // Validate only selected changes: an excluded workflow must not require Workflows: write.
      const workflowPaths = selectedChanges.filter(c => /^\.github\/workflows\/[^/]+\.ya?ml$/i.test(c.path)).map(c => c.path);
      await api('preflight', { ...input, workflowPaths });
      let commitInput = input;
      let expectedCommitHead = preview.remote.head;
      let prRequest = null;
      if (releaseStrategy === 'pr') {
        if (!preview.releaseBranch) throw new Error('Thiếu branch PR. Hãy Review ZIP lại.');
        setStatus('Đang tạo branch riêng từ HEAD đã review (không thay đổi main)...');
        await requestOnce('pull-request/prepare', { owner: input.owner, repo: input.repo,
          baseBranch: input.branch, sourceBranch: preview.releaseBranch, expectedBaseHead: preview.remote.head });
        commitInput = { ...input, branch: preview.releaseBranch };
        prRequest = { owner:input.owner, repo:input.repo, baseBranch:input.branch,
          sourceBranch:preview.releaseBranch, title:commitMessage.slice(0,120) };
      }
      // Refresh expiring GitHub App credentials once before parallel blob workers.
      // This reduces refresh-token races between concurrent serverless requests.
      const sessionResponse = await fetch('/api/auth/session', { cache: 'no-store' });
      const sessionState = await sessionResponse.json().catch(() => ({}));
      if (!sessionResponse.ok || !sessionState.authenticated) throw new Error('Phiên GitHub App đã hết hạn. Hãy đăng nhập lại trước khi push.');
      const fingerprint = await manifestFingerprint({ ...commitInput, head: expectedCommitHead, mode,
        changes: selectedChanges, files: preview.archive.files });
      const existing = validatedCheckpoint(loadUploadCheckpoint(), fingerprint, selectedChanges, Date.now(), true);
      const checkpoint = Object.assign(Object.create(null), existing);
      const transferStarted = Date.now();
      const { blobShas, attestations, reused } = await uploadBlobsInBatches({
        changes: selectedChanges,
        files: preview.archive.files,
        existing,
        concurrency: 2,
        batchSize: 12,
        upload: async (source) => {
          const res = await api('blob', { owner: input.owner, repo: input.repo, path: source.path, content: encodeBase64(source.data) },
            (attempt) => setStatus(`GitHub chậm với ${source.path}. Retry an toàn (${attempt}/2)...`));
          return {sha:res.sha,proof:res.proof};
        },
        onCheckpoint: (completed) => {
          Object.assign(checkpoint, completed);
          saveUploadCheckpoint(makeCheckpoint(fingerprint, checkpoint));
        },
        onProgress: ({ completed, total, batch, totalBatches, reused: reusedCount, completedBytes, totalBytes, uploadedBytes }) => {
          setProgress(Math.round((completed / Math.max(1, total)) * 80));
          setTransfer({ ...transferEstimate(uploadedBytes, Math.max(0, totalBytes - (completedBytes - uploadedBytes)), Date.now() - transferStarted), completed, total, batch, totalBatches, reused: reusedCount, completedBytes, totalBytes });
          setStatus(`Git blobs: ${completed}/${total} · Batch ${batch}/${totalBatches}${reusedCount ? ` · Phục hồi ${reusedCount} file` : ''}`);
        },
      });
      if (reused) setStatus(`Đã tái sử dụng ${reused} Git blob từ lần upload trước; bắt đầu commit...`);
      const entries = selectedChanges.map((c) => ({ path: c.path, mode: c.mode, sha: c.kind === 'delete' ? null : blobShas.get(c.path), ...(c.kind !== 'delete' ? {proof: attestations.get(c.path)} : {}) }));
      commitPayload = { ...commitInput, expectedHead: expectedCommitHead, message: commitMessage, entries, ...(prRequest ? { prRequest } : {}) };
      rememberPending(commitPayload);
      setPendingCommit(commitPayload);
      setPhase(PUSH_STAGES.COMMITTING);
      setProgress(85);
      setStatus('Đang tạo commit và cập nhật branch. Không tự retry thao tác commit...');
      const outcome = await requestOnce('commit', commitPayload);
      await completeVerified(outcome, commitPayload);
    } catch (e) {
      setError(e.message);
      setErrorHint(e.hint || '');
      setProgress(0);
      if (commitPayload) {
        if (releaseStrategy === 'direct' && (e.httpStatus === 403 || e.httpStatus === 422)) {
          setErrorHint('Nếu main được bảo vệ: nhấn Xác minh push trước. Nếu GitHub xác nhận chưa áp dụng, chọn Pull Request ở Upload, phân tích ZIP lại và push lên branch riêng.');
        }
        setPhase(PUSH_STAGES.UNCONFIRMED);
        setStatus('Kết quả commit chưa chắc chắn. Nhấn “Xác minh push” để kiểm tra GitHub trước khi làm lại.');
        logLocalAction({kind:'push',state:'pending',repo:`${commitPayload.owner}/${commitPayload.repo}`,message:'Chưa xác minh kết quả commit'});
      } else {
        setPhase(PUSH_STAGES.FAILED);
        setStatus(`Push dừng trước khi tạo commit${e.stage ? ` (bước ${e.stage})` : ''}. Có thể thử lại sau khi kiểm tra lỗi.`);
        logLocalAction({kind:'push',state:'failed',repo:`${owner}/${repo}`,message:'Dừng trước khi tạo commit'});
      }
    } finally { setBusy(false); }
  }

  return <>
    <MobileViewportGuard/>
    <SplashScreen loading={auth.loading}/>
    <div className="shell pro-shell">
    <div className="glow one"/><div className="glow two"/>
    <header className="topbar" role="banner">
      <div className="brand"><div className="brand-symbol"><Icon name="branch" size={25}/></div><div><strong>Zip<span>verra</span><em> Pro</em></strong><small>MOBILE GIT WORKSPACE</small></div></div>
      <div className="header-actions"><StatusIndicator online={online} authenticated={auth.authenticated} loading={auth.loading}/><span className="version"><span className="live-dot"/> v2.1.0</span></div>
    </header>
    <UXViewIntro activeTab={activeTab} online={online} pending={Boolean(pendingCommit || pendingPR)}/>
    {activeTab !== 'activity' && (error || busy) && <button type="button" className={`mobile-global-status ${error ? 'has-error' : ''}`} onClick={() => goToTab('activity')}><span>{error ? `Cần kiểm tra: ${error}` : `${status || 'Đang xử lý...'} · ${progress}%`}</span><Icon name="arrow" size={17}/></button>}
    <main data-active-view={activeTab}>
      <section className="hero" aria-label="Zipverra workflow">
        <div className="eyebrow"><Icon name="shield" size={15}/> ZIPVERRA PRO · MOBILE GIT WORKSPACE</div>
        <h1>Push to GitHub.<br/><span>From Your Phone.</span></h1>
        
        <p className="hero-subtitle">Chọn repo, kiểm tra thay đổi và cập nhật source một cách an toàn.</p>
        <div className="highlights"><span><Icon name="check" size={15}/> GitHub App</span><span><Icon name="check" size={15}/> Security Review</span><span><Icon name="check" size={15}/> Safe Recovery</span></div>
      </section>

      {activeTab === 'home' && <WorkflowStrip currentStep={flowStep} onRepo={() => goToTab('repositories')} onUpload={() => goToTab('home')} onActivity={() => goToTab('activity')}/> }
      {activeTab === 'home' && <CurrentRepository owner={owner} repo={repo} branch={branch} busy={busy} onChoose={() => goToTab('repositories')}/> }
      {(pendingCommit || pendingPR) && activeTab !== 'activity' && <button type="button" className="mobile-recovery-shortcut" onClick={() => goToTab('activity')}>Có thao tác GitHub cần xác minh · Mở Activity <Icon name="arrow" size={15}/></button>}
      <section className="content-grid" data-active-view={activeTab}>
        <div className="form-column">
          <article className="panel repository-panel" data-mobile-view="repositories" style={workspaceOpen ? {display:'none'} : undefined}>
            <StepTitle n="01" title="Chọn repository" desc="Chọn nơi nhận source trước khi tải ZIP."/>

            {auth.loading ? <div className="repo-auth-minimal">Đang kết nối GitHub...</div> : !auth.authenticated ? <div className="auth-card">
              <p className="auth-muted">Kết nối GitHub để chọn repository được cấp quyền.</p>
              <a className="button primary full login-button" href="/api/auth/login"><Icon name="github" size={19}/> Continue with GitHub <Icon name="arrow" size={16}/></a>
            </div> : <div className="repo-auth-minimal"><div className="repo-auth-user"><Icon name="check" size={15}/> @{auth.user?.login} <span>Connected</span></div><button type="button" className="button secondary" onClick={loadRepos} disabled={busy || loadingRepos}><Icon name="refresh" size={15}/> Refresh</button></div>}
            {chosenRepo && <div className="pro-selected-repo" aria-label="Repository được chọn"><div className="pro-selected-repo-info"><span className="pro-overline">REPOSITORY ĐANG CHỌN</span><strong>{owner}/{repo}</strong><small><Icon name="branch" size={14}/> {branch} · {releaseStrategy === 'pr' ? 'Pull Request' : 'Direct Push'}</small></div><button type="button" className="button primary" disabled={busy || Boolean(pendingCommit) || Boolean(pendingPR)} onClick={() => goToTab('home')}>Upload ZIP <Icon name="arrow" size={17}/></button></div>}
            <div className="field"><label htmlFor="repo-search">Tìm repository</label><div className="input-icon"><Icon name="search" size={17}/><input id="repo-search" type="search" value={repoSearch} disabled={busy || !auth.authenticated} placeholder="Lọc theo tên repository" onChange={(e) => setRepoSearch(e.target.value)}/></div></div>
            {loadingRepos && <div className="repo-skeleton" aria-label="Đang tải danh sách repository"><span/><span/><span/></div>}
            {authorizedRecents.length > 0 && <div className="recents-block"><span className="mini-label">GẦN ĐÂY · lưu trên thiết bị</span><div className="recent-list">{authorizedRecents.slice(0, 3).map((name) => <button type="button" key={name} className="recent-chip" disabled={busy || !auth.authenticated} onClick={() => chooseRepo(name)}>{name}</button>)}</div></div>}
            {favorites.length > 0 && <div className="favorites-block"><span className="mini-label">PINNED REPOSITORIES</span><div className="favorite-list">{displayedRepos.filter(r => favorites.includes(r.full_name)).map(r => <div key={r.full_name} className="favorite-row"><button type="button" disabled={busy} onClick={() => chooseRepo(r.full_name)}>{r.full_name}</button><button type="button" className="favorite-star" onClick={() => toggleFavorite(r.full_name)} aria-label={`Bỏ ghim ${r.full_name}`}>★</button></div>)}</div></div>}
            <div className="field"><label htmlFor="repo-select">Chọn repository</label><select id="repo-select" disabled={busy || !auth.authenticated || !repos.length} value={displayedRepos.some((x) => x.full_name === `${owner}/${repo}`) ? `${owner}/${repo}` : ''} onChange={(e) => chooseRepo(e.target.value)}><option value="">{repos.length ? (displayedRepos.length ? 'Chọn repository được cấp quyền' : 'Không có repo phù hợp') : 'Chưa có repo được GitHub App cấp quyền'}</option>{displayedRepos.map((x) => <option key={x.full_name} value={x.full_name}>{x.full_name}{x.private ? ' 🔒' : ''}</option>)}</select>{chosenRepo && <button type="button" className="favorite-toggle" onClick={() => toggleFavorite(`${owner}/${repo}`)}>{favorites.includes(`${owner}/${repo}`) ? '★ Đã ghim repository' : '☆ Ghim repository này'}</button>}</div>
            <details className="repo-advanced"><summary>Tùy chọn nâng cao · Nhập repo thủ công</summary><div className="two-col"><div className="field"><label htmlFor="owner">Owner</label><input id="owner" value={owner} disabled={busy || !auth.authenticated} placeholder="huyvd250797" onChange={(e) => change(setOwner, e.target.value)}/></div><div className="field"><label htmlFor="repo">Repository</label><input id="repo" value={repo} disabled={busy || !auth.authenticated} placeholder="Finzaro" onChange={(e) => change(setRepo, e.target.value)}/></div></div><p className="hint">Chỉ có thể push lên repository đã được GitHub App cấp quyền.</p></details>
            <div className="field"><label htmlFor="branch">Branch đích <span className="tag">Mặc định: main</span></label><div className="input-icon"><Icon name="branch" size={17}/><input id="branch" value={branch} disabled={busy || !auth.authenticated} placeholder="main" onChange={(e) => change(setBranch, e.target.value)}/></div></div>
            <details className="pro-dash-details"><summary>Zipverra Pro · Multi-repository dashboard</summary>
              <ProDashboard authenticated={auth.authenticated} online={online} loading={dashboardLoading}
                snapshot={proDashboard} repos={repos} profiles={proProfiles} recents={recents} favorites={favorites}
                selectedRepo={chosenRepo} onRefresh={refreshDashboard} onChoose={chooseRepo} onGoUpload={()=>goToTab('home')}/>
              {dashboardError && <p className="pro-error" role="alert">{dashboardError}</p>}
            </details>
            {chosenRepo && <button type="button" className="button secondary full workspace-launch" disabled={busy || !auth.authenticated} onClick={()=>{setWorkspaceOpen(true);goToTab('repositories');}}><Icon name="file" size={18}/> Repository Explorer · Quick Edit <Icon name="arrow" size={16}/></button>}
            {chosenRepo && <BranchPrPanel key={`${owner}/${repo}`} owner={owner} repo={repo} branch={branch} online={online} busy={busy} api={api} onSelectBranch={(next)=>change(setBranch,next)} onMerge={(outcome,number)=>logLocalAction({kind:'merge',state:'success',repo:`${owner}/${repo}`,sha:outcome?.sha,message:`Merged PR #${number}`})}/>}
            <button type="button" className="button secondary full mobile-repo-next" onClick={() => goToTab('home')} disabled={!auth.authenticated || !owner || !repo || busy}>Tiếp tục · Upload ZIP <Icon name="arrow" size={17}/></button>
          </article>
          {workspaceOpen && <WorkspacePanel key={`${owner}/${repo}@${branch}`} authenticated={auth.authenticated} owner={owner} repo={repo} branch={branch} online={online} busy={busy} onBack={()=>{setWorkspaceOpen(false);goToTab('repositories');}} api={api} onCommit={(outcome)=>{reset();logLocalAction({kind:'quick-edit',state:'success',repo:`${owner}/${repo}`,sha:outcome?.sha,message:'Quick Edit saved'});}} />}

          <article className="panel upload-panel" data-mobile-view="home">
            <StepTitle n="02" title="Upload ZIP" desc="Giải nén trong Web Worker, không chặn thao tác điện thoại."/>
            <div className="source-repo-context">{chosenRepo ? <><Icon name="branch" size={16}/><strong>{owner}/{repo}</strong><span>· {branch}</span></> : <><Icon name="shield" size={16}/> Chưa chọn repository. <button type="button" onClick={() => goToTab('repositories')}>Chọn repo →</button></>}</div>
            <input ref={fileInput} id="file" className="visually-hidden" type="file" accept=".zip,application/zip,application/x-zip-compressed" disabled={busy || !chosenRepo} onChange={(e) => chooseFile(e.target.files?.[0])}/>
            <label htmlFor={chosenRepo ? 'file' : undefined} className={`drop-zone ${file ? 'picked' : ''} ${!chosenRepo ? 'locked' : ''}`}><span className="file-symbol"><Icon name={file ? 'file' : 'upload'} size={25}/></span><strong>{file ? file.name : chosenRepo ? 'Chạm để chọn file ZIP' : 'Chọn repo trước khi upload'}</strong><small>{file ? `${prettyBytes(file.size)} · Chạm để thay file` : 'Nguồn ZIP từ ChatGPT hoặc ứng dụng Files'}</small></label>
            {file && <div className="file-detail"><Icon name="check" size={15}/> Đã chọn file · Commit: <strong>{commitMessage}</strong></div>}
            <div className="limits"><span>ZIP tối đa 80 MiB</span><span>2.5 MB / file</span><span>2.500 file</span></div><small className="archive-size-hint">File đơn lẻ trên 2.5 MB chưa hỗ trợ qua Vercel. Hãy dùng Git hoặc Git LFS cho file lớn.</small>
            <div className="field"><label htmlFor="mode">Chế độ cập nhật</label><select id="mode" value={mode} disabled={busy} onChange={(e) => change(setMode, e.target.value)}><option value="merge">Merge — Thêm/sửa, giữ file cũ</option><option value="sync">Sync — Xóa file cũ không có trong ZIP</option></select><small className="hint">Khuyên dùng Merge. Sync có thể xóa những file quan trọng đang có trên repo.</small></div>
            <div className="release-strategy" role="group" aria-label="Chiến lược cập nhật GitHub">
              <strong>Cách cập nhật source</strong>
              <div className="release-choices">
                <label className={`release-choice ${releaseStrategy==='direct' ? 'active':''}`}><input type="radio" name="releaseStrategy" value="direct" disabled={busy} checked={releaseStrategy==='direct'} onChange={()=>change(setReleaseStrategy,'direct')}/> Direct Push</label>
                <label className={`release-choice ${releaseStrategy==='pr' ? 'active':''}`}><input type="radio" name="releaseStrategy" value="pr" disabled={busy} checked={releaseStrategy==='pr'} onChange={()=>change(setReleaseStrategy,'pr')}/> Pull Request</label>
              </div>
              <p className="release-note">{releaseStrategy==='direct' ? `Mặc định: cập nhật trực tiếp ${branch || 'main'}. Branch được bảo vệ có thể chặn push.` : `Tạo branch zipverra/... từ ${branch || 'main'}, push ZIP lên branch đó rồi mở PR. Không tự merge.`}</p>
              {releaseStrategy==='pr' && <p className="release-note"><b>Yêu cầu:</b> GitHub App → Pull requests: Read & write (phải phê duyệt lại quyền). Khi branch bị bảo vệ, đây là lựa chọn an toàn hơn.</p>}
            </div>
            <div className="field"><label htmlFor="message">Commit tự động lấy tên ZIP</label><div className="input-icon"><Icon name="file" size={17}/><input id="message" readOnly value={file ? commitMessage : ''} placeholder="Chọn ZIP để tạo commit message"/></div></div>
            <button className="button primary full" disabled={busy || !file || !auth.authenticated || !chosenRepo || Boolean(pendingCommit) || Boolean(pendingPR)} onClick={analyze}>{busy ? 'Đang xử lý...' : 'Phân tích ZIP và xem thay đổi'} <Icon name="arrow" size={18}/></button>
          </article>
        </div>

        <div className="side-column">
          <article ref={previewRef} className="panel preview-panel" data-mobile-view="home">
            <StepTitle n="03" title="Kiểm tra & xác nhận" desc="Xem file thay đổi, đánh dấu đồng ý rồi Push. Activity sẽ tự mở." centerOnMobile/>
            {!preview ? <StatusEmpty icon="scan" title="Sẵn sàng phân tích source" description="Chọn ZIP và nhấn Phân tích để xem file thêm, sửa, xóa trước khi push."/> : <>
              <div className="summary-line"><span className="pill">{preview.input.owner}/{preview.input.repo}</span><span className="pill branch-pill"><Icon name="branch" size={14}/> {preview.input.branch}</span></div>
              <div className="release-summary" role="status">{preview.releaseStrategy==='pr'
                ? <>Pull Request: <b>{preview.releaseBranch}</b> → <b>{preview.input.branch}</b>. ZIP sẽ được commit vào branch riêng, không đụng trực tiếp branch đích.</>
                : <>Direct Push: cập nhật trực tiếp <b>{preview.input.branch}</b>.</>}</div>
              <div className="stat-grid"><div><strong className="good">+{stats.add}</strong><span>Thêm</span></div><div><strong className="warn">~{stats.modify}</strong><span>Sửa</span></div><div><strong className="bad">−{stats.delete}</strong><span>Xóa</span></div></div>
              <div className="smart-insights"><div className="insight-header"><span className="insight-mark">✦</span><div><strong>Smart ZIP Analyzer</strong><small>{preview.insights.framework.type} · {preview.insights.binaryCount} file nhị phân</small></div></div>{preview.insights.warnings.filter(w=>w.code!=='SECRET_FILE').length ? <div className="insight-warnings">{preview.insights.warnings.filter(w=>w.code!=='SECRET_FILE').map(w => <div className={`insight-notice insight-${w.severity}`} key={w.code}><strong>{w.title}</strong><span>{w.description}</span></div>)}</div> : <p className="insight-clean">Không phát hiện cảnh báo cấu trúc phổ biến. Vẫn cần review source trước khi push.</p>}</div>
              <div className={`security-review ${securityReport?.blocked?'security-review--blocked':''}`} role="status" aria-label="Security review">
                <div className="security-review-title"><Icon name="shield" size={20}/><div><strong>Security & Smart Source Validation</strong><small>{securityReport?.scanned||0} thay đổi được kiểm tra · Không hiển thị nội dung secrets</small></div></div>
                <div className="security-review-stats"><span className="risk-critical">Critical: {securityReport?.critical||0}</span><span className="risk-warning">Warning: {securityReport?.warning||0}</span><span className="risk-info">Info: {securityReport?.info||0}</span></div>
                {securityReport?.findings?.length ? <div className="security-findings">{securityReport.findings.slice(0,20).map((finding,i)=><div key={`${finding.path}-${finding.code}-${i}`} className={`security-finding risk-${finding.severity}`}><strong>{finding.title} <small>· {finding.severity.toUpperCase()}</small></strong><span className="security-finding-path">{finding.path}{finding.line>0?`:${finding.line}`:''}</span><small>{finding.action}</small></div>)}{securityReport.findings.length>20&&<small>Hiển thị 20/{securityReport.findings.length} cảnh báo. Kiểm tra source để xử lý toàn bộ.</small>}</div> : <p className="insight-clean">Không phát hiện credential theo các quy tắc hiện có. Đây không phải bảo đảm source hoàn toàn an toàn.</p>}
                {securityReport?.blocked&&<div className="security-block-note" role="alert">Đã khóa Push/PR: loại bỏ hoặc bỏ chọn file Critical, sau đó xác nhận lại bản review. Server sẽ kiểm tra lại trước khi ghi lên GitHub.</div>}
              </div>
              <div className="review-select-summary"><div><strong>{selectedChanges.length}/{preview.changes.length} thay đổi được chọn</strong><small>File bỏ chọn sẽ giữ nguyên trên GitHub, kể cả trong Sync.</small></div><span>{prettyBytes(selectedBytes)}</span></div>
              <div className="archive-meta">{preview.archive.files.length} file · {prettyBytes(preview.archive.unpackedSize)} đã giải nén{preview.archive.wrapper ? ` · Bỏ thư mục gốc: ${preview.archive.wrapper}/` : ''}{preview.archive.ignored ? ` · Bỏ qua ${preview.archive.ignored} file` : ''}</div>
              <div className="diff-filters" role="group" aria-label="Lọc file thay đổi">{[{id:'all',label:'Tất cả',n:preview.changes.length},{id:'add',label:'Thêm',n:totalStats.add},{id:'modify',label:'Sửa',n:totalStats.modify},{id:'delete',label:'Xóa',n:totalStats.delete}].map((option) => <button type="button" key={option.id} className={`diff-filter ${changeFilter === option.id ? 'selected' : ''}`} aria-pressed={changeFilter === option.id} onClick={() => setChangeFilter(option.id)}>{option.label} <span>{option.n}</span></button>)}</div>
              <div className="review-toolbar"><div className="input-icon"><Icon name="search" size={16}/><input type="search" aria-label="Tìm file thay đổi" placeholder="Tìm file trong diff" value={reviewSearch} onChange={e => {setReviewSearch(e.target.value);setVisibleLimit(100);}}/></div><div className="review-bulk"><button type="button" disabled={busy} onClick={() => bulkSelection(true)}>Chọn tất cả</button><button type="button" disabled={busy} onClick={() => bulkSelection(false)}>Bỏ chọn tất cả</button></div></div>
              <div className="change-list review-list" aria-label="Danh sách thay đổi">{shownChanges.length ? shownChanges.slice(0,visibleLimit).map((item) => <div className={`change-row review-row ${excludedPaths.includes(item.path) ? 'excluded' : ''}`} key={item.path}><label className="review-check"><input type="checkbox" checked={!excludedPaths.includes(item.path)} disabled={busy} onChange={() => updateSelection(item.path)} aria-label={`Chọn ${item.path} để push`}/></label><span className={`change-mark ${item.kind}`}>{item.kind === 'add' ? 'A' : item.kind === 'modify' ? 'M' : 'D'}</span><span title={item.path} className="change-path">{item.path}</span><button type="button" className="review-diff-button" disabled={busy} onClick={() => inspectChange(item)} aria-label={`Xem diff ${item.path}`}>Diff</button></div>) : <div className="empty-change">{preview.changes.length ? 'Không có file thuộc bộ lọc này.' : 'Không có thay đổi để commit.'}</div>}</div>
              {shownChanges.length > visibleLimit && <button type="button" className="button secondary full review-more" onClick={() => setVisibleLimit(v => v + 100)}>Hiển thị thêm {Math.min(100,shownChanges.length-visibleLimit)} file · {shownChanges.length-visibleLimit} còn lại</button>}
              {diffViewer && <div className="inline-diff" aria-live="polite"><div className="inline-diff-heading"><strong>Diff · {diffViewer.path}</strong><button type="button" onClick={() => {diffRequestRef.current++;setDiffViewer(null);}} aria-label="Đóng diff">✕</button></div>{diffViewer.loading ? <p>Đang tải file từ commit đang review…</p> : diffViewer.message ? <p>{diffViewer.message}</p> : <div className="inline-diff-lines">{diffViewer.lines.map((line,index)=><div key={index} className={`diff-line diff-${line.kind}`}><span>{line.kind==='add'?'+':line.kind==='delete'?'−':' '}</span><code>{line.text || ' '}</code></div>)}</div>}</div>}
              {stats.delete > 0 && <div className="warning-banner"><strong>Cảnh báo Sync</strong><p>Chế độ Sync sẽ xóa {stats.delete} file đang có trên GitHub. Các file này có thể bao gồm cấu hình deploy.</p><label className="confirm-row sync-confirm"><input type="checkbox" checked={syncConfirmed} disabled={busy} onChange={(e) => setSyncConfirmed(e.target.checked)}/><span>Tôi đồng ý xóa {stats.delete} file trong repository.</span></label></div>}
              {selectedChanges.length > 0 && !securityReport?.blocked && <><label className="confirm-row"><input type="checkbox" checked={confirmed} disabled={busy} onChange={(e) => setConfirmed(e.target.checked)}/><span>Tôi đã kiểm tra thay đổi và đồng ý {releaseStrategy==='pr' ? 'push lên branch riêng rồi tạo Pull Request' : 'push trực tiếp'} với đích <b>{preview.input.branch}</b>.</span></label><button className="button primary full push-button" disabled={busy || !selectedChanges.length || !!securityReport?.blocked || !confirmed || (mode === 'sync' && stats.delete > 0 && !syncConfirmed) || !auth.authenticated || !online || Boolean(pendingCommit) || Boolean(pendingPR)} onClick={push}><Icon name="upload" size={18}/> {busy ? 'Đang xử lý...' : releaseStrategy==='pr' ? `Push & Create PR (${selectedChanges.length} file)` : `Commit & Push (${selectedChanges.length} file)`}</button></>}
            </>}
          </article>
          <article ref={activityRef} className="panel activity-panel" data-mobile-view="activity"><div className="activity-title"><div><span className="pro-overline">LIVE OPERATIONS</span><h2>Activity · Tiến trình Push</h2></div><span className={`activity-dot ${busy ? 'pulse' : ''}`} aria-label={busy ? 'Đang thực hiện thao tác' : 'Không có thao tác đang chạy'}/></div>
            <div className={`push-timeline ${hasPrFlow ? 'with-pr' : ''}`} aria-label="Tiến trình push và tạo PR">{timeline.map((step, index) => <div key={step.id} className={`timeline-step timeline-${step.state}`}><span className="timeline-icon">{step.state === 'complete' ? <Icon name="check" size={14}/> : index + 1}</span><div><strong>{({validate:'Validate',upload:'Upload',commit:'Commit',verify:'Verify',pr:'Open PR'})[step.id]}</strong><small>{({complete:'Hoàn tất',active:'Đang xử lý',uncertain:'Chưa xác minh',failed:'Cần kiểm tra',waiting:'Chờ xử lý'})[step.state]}</small></div></div>)}</div>
            <div className="progress-track" role="progressbar" aria-label="Tiến độ xử lý" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div className="progress-fill" style={{ width: `${progress}%` }}/></div><p className="status-text" role="status">{status || 'Sẵn sàng nhận file ZIP.'}</p>
            {transfer && <div className="transfer-card"><div className="transfer-card-head"><strong>Upload Git blobs</strong><span>{transfer.completed}/{transfer.total} file</span></div><div className="transfer-meter"><span style={{width:`${Math.round(transfer.completed/Math.max(1,transfer.total)*100)}%`}}/></div><div className="transfer-stats"><span>{prettyBytes(transfer.completedBytes)} / {prettyBytes(transfer.totalBytes)}</span><span>{transfer.speedBytesPerSec > 0 ? `${prettyBytes(transfer.speedBytesPerSec)}/s` : 'Đang chuẩn bị…'}</span><span>{transfer.etaSeconds !== null && transfer.etaSeconds < 3600 ? `ETA ~${transfer.etaSeconds}s` : 'ETA chưa xác định'}</span></div><small>Batch {transfer.batch}/{transfer.totalBatches} · Đã dùng lại {transfer.reused} blob · Ước tính có thể dao động theo mạng</small></div>}
            <div className="push-status-line"><span className={`network-chip ${online ? 'online' : 'offline'}`}>{online ? '● Online' : '● Offline'}</span><span className="stage-chip">{phase.replaceAll('_', ' ')}</span></div>
            {pendingCommit && <div className="recovery-banner" role="status"><strong>Cần xác minh lần push trước</strong><p>{pendingCommit.owner}/{pendingCommit.repo} · {pendingCommit.branch} · {pendingCommit.message}</p><button type="button" className="button secondary full" disabled={busy || !online || !auth.authenticated} onClick={() => verifyPending()}><Icon name="refresh" size={16}/> {busy && phase === PUSH_STAGES.VERIFYING ? 'Đang xác minh...' : 'Xác minh push trên GitHub'}</button><small>Chỉ kiểm tra trạng thái, không tạo commit mới.</small></div>}
            {pendingPR && <div className="branch-pending" role="status"><strong>Branch đã push · PR chưa xác nhận</strong><p>{pendingPR.owner}/{pendingPR.repo} · {pendingPR.sourceBranch} → {pendingPR.baseBranch}<br/>Commit {pendingPR.expectedSourceHead.slice(0,12)}</p><button type="button" className="button secondary" onClick={retryPendingPR} disabled={busy || !online || !auth.authenticated}>Kiểm tra / Tạo PR</button><small>Không upload ZIP hoặc tạo commit mới. Server kiểm tra PR đã tồn tại trước khi tạo.</small></div>}
            {error && <div className="error-banner" role="alert">{error}{errorHint && <p className="error-hint">{errorHint}</p>}</div>}
            {result && <div className="success-banner"><div className="success-title"><Icon name="check" size={17}/>{result.pr ? ` Pull Request #${result.pr.number} đã mở` : result.branchOnly ? ' Branch đã push thành công' : ' Push thành công!'}</div><p>Đã cập nhật {result.changed ?? 'các'} file. Commit: <code>{result.sha?.slice(0,12)}</code></p>{result.sourceBranch && <p>Branch: <b>{result.sourceBranch}</b></p>}{result.url && <a href={result.url} target="_blank" rel="noopener noreferrer">Xem commit <Icon name="external" size={15}/></a>}{result.pr?.url && <> · <a className="branch-pr-link" href={result.pr.url} target="_blank" rel="noopener noreferrer">Mở Pull Request #{result.pr.number} ↗</a><p>PR chưa được merge vào {result.pr.baseBranch}. Hãy kiểm tra diff, CI rồi Merge trong Repos hoặc GitHub.</p></>}</div>}
          </article>
          <HistoryPanel authenticated={auth.authenticated} owner={owner} repo={repo} branch={branch} online={online} busy={busy} setBusy={setBusy} pendingPush={pendingCommit} api={api} requestOnce={requestOnce} onRollback={(outcome)=>logLocalAction({kind:'rollback',state:'success',repo:`${owner}/${repo}`,sha:outcome.sha,message:'Rollback verified'})}/>
          <article className="panel pro-journal-panel" data-mobile-view="activity"><ActivityJournal items={proActivity} onClear={clearLocalActions}/></article>
          <article className="panel settings-panel" data-mobile-view="settings">
            <div className="settings-heading"><Icon name="settings" size={21}/><div><h2>Settings</h2><p>Cài đặt giao diện và kết nối GitHub App.</p></div></div>
            <div className="field"><label>Giao diện</label><div className="theme-options" role="group" aria-label="Chế độ hiển thị"><button type="button" className={theme === 'dark' ? 'selected' : ''} aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}><Icon name="moon" size={18}/> Dark</button><button type="button" className={theme === 'light' ? 'selected' : ''} aria-pressed={theme === 'light'} onClick={() => setTheme('light')}><Icon name="sun" size={18}/> Light</button></div></div>
            <div className="settings-section"><h3><Icon name="github" size={19}/> GitHub Account & App Access</h3>
              {auth.authenticated ? <>
                <div className="settings-account"><strong>@{auth.user?.login}</strong><span className="auth-chip"><Icon name="check" size={14}/> Connected</span></div>
                <p className="auth-muted">{installations.length ? `${installations.length} installation · ${installations.map(x=>x.account).filter(Boolean).join(', ')}` : 'Chưa có installation. Cấp quyền truy cập repo trong GitHub App.'}</p>
                <div className="settings-app-actions"><a className="button secondary" href="/api/auth/install" target="_blank" rel="noopener noreferrer"><Icon name="external" size={16}/> Manage GitHub App</a><button type="button" className="button secondary" disabled={busy || loadingRepos} onClick={loadRepos}><Icon name="refresh" size={16}/> Refresh</button></div>
                <button type="button" className="button ghost settings-logout" onClick={logout} disabled={busy}>Đăng xuất GitHub</button>
              </> : <a className="button primary full" href="/api/auth/login"><Icon name="github" size={18}/> Continue with GitHub</a>}
            </div>
            <PushProfiles selectedRepo={chosenRepo?`${owner}/${repo}`:''} branch={branch} mode={mode} strategy={releaseStrategy}
              profiles={proProfiles} authenticated={auth.authenticated} busy={busy || Boolean(pendingCommit) || Boolean(pendingPR)} authorizedRepos={repos}
              onSave={saveProfile} onApply={applyProfile} onSelectApply={selectAndApplyProfile} onRemove={deleteProfile}/>
            <div className="settings-info"><span>Phiên bản</span><strong>v2.1.0</strong></div>
            <div className="settings-info"><span>Chế độ GitHub</span><strong>GitHub App · User Token</strong></div>
            <div className="settings-info"><span>Commit message</span><strong>Tên file ZIP</strong></div>
            <p className="hint">Push Profiles, Dashboard cache và Local Activity lưu riêng theo tài khoản GitHub trên thiết bị. Không đồng bộ giữa thiết bị và không chạy task ngầm khi đóng PWA.</p>
          </article>
          <article className="hint-card" data-mobile-view="settings"><Icon name="shield" size={22}/><div><strong>Quyền GitHub tối thiểu</strong><p>GitHub App dùng token người dùng có thời hạn, giới hạn bởi quyền người dùng và các repository được cài đặt. Cần <b>Contents: Read & write</b>; khi tạo PR cần thêm <b>Pull requests: Read & write</b>; và <b>Workflows: Read & write</b> khi sửa CI. Token/refresh token ở cookie HttpOnly được mã hóa; branch protection vẫn có thể yêu cầu Pull Request.</p></div></article>
        </div>
      </section>
    </main>
    <footer><span>Zipverra · v2.1.0</span><span>GitHub App · Cookie mã hóa · Không yêu cầu VPS · <span className="accent">Vercel Ready</span></span></footer>
  </div>
  <nav className="mobile-bottom-nav" aria-label="Điều hướng Zipverra">{[{id:'repositories',label:'Repos',icon:'branch'},{id:'home',label:'Upload',icon:'upload'},{id:'activity',label:'Activity',icon:'activity'},{id:'history',label:'History',icon:'history'},{id:'settings',label:'Settings',icon:'settings'}].map((tab) => <button type="button" key={tab.id} className={`mobile-nav-item ${activeTab === tab.id ? 'active' : ''}`} aria-current={activeTab === tab.id ? 'page' : undefined} onClick={() => goToTab(tab.id)}><span className="mobile-nav-icon"><Icon name={tab.icon} size={21}/></span><span>{tab.label}</span>{tab.id === 'activity' && (pendingCommit || pendingPR) && <i className="nav-alert" aria-label="Có push cần xác minh"/>}</button>)}</nav>
  </>;
}
