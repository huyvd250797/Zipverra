'use client';
import ContextualHelp from './components/ContextualHelp.jsx';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import dynamic from 'next/dynamic';
import { encodeBase64 } from '../lib/base64.js';
import { openArchiveOffThread } from '../lib/archive-worker-client.js';
import { manifestFingerprint, validatedCheckpoint, makeCheckpoint, uploadBlobsInBatches, refreshExpiringAttestations, UPLOAD_CHECKPOINT_KEY } from '../lib/upload-batches.js';
import { calculateChanges, countChanges } from '../lib/operations.js';
import { compareProjectIdentity, packageNameFromArchive, packageNameFromText } from '../lib/project-identity.js';
import { zipCommitMessage } from '../lib/paths.js';
import { makeReleaseBranch } from '../lib/branch-names.js';
import { scanSelectedChanges, reportSelectedSecurity, needsSensitiveConsent } from '../lib/source-security.js';
import { LIMITS, archiveCapacity } from '../lib/constants.js';
import { deriveWorkflowStep, shouldPublishProgress, checkZipCandidate } from '../lib/workflow-ux.js';
import { PUSH_STAGES, JOURNAL_KEY, withSafeRetry, validJournal } from '../lib/reliability.js';
import { positionTabViewport, scheduleTabViewport } from '../lib/tab-scroll.js';
import { tabSlideDirection, canSlideTabs } from '../lib/tab-transitions.js';
import { MOBILE_TABS, RECENTS_KEY, THEME_KEY, filterChanges, updateRecentRepositories, getPushTimeline } from '../lib/mobile-ui.js';
import { REPO_USAGE_KEY, normalizeRepositoryUsage, recordRepositorySelection, usageFromActivity } from '../lib/repository-suggestions.js';
import { FAVORITES_KEY, analyzeSource, selectChanges, toggleExcluded, filterReview, sortedRepositories, updateFavorites, isTextPreviewable, decodePreview, makeLineDiff, transferEstimate } from '../lib/smart-push.js';
import SplashScreen from './components/SplashScreen.jsx';
import { FeedbackToast, LoadingSkeleton, ConfirmationDialog, useConfirmationDialog } from './components/InteractionFeedback.jsx';
import { usePwaReliability, PwaStatusBanner } from './components/PwaReliability.jsx';
import RecoveryCenter from './components/RecoveryCenter.jsx';
import { createInteractionNotice, shouldAnnounceEvent } from '../lib/interaction-feedback.js';
import { INITIAL_NOTICES, enqueueNotice, dismissNotice as dismissQueuedNotice } from '../lib/notification-center.js';
import { shouldWarnWorkspaceExit } from '../lib/workspace-ux.js';
import { WorkflowStrip, CurrentRepository, StatusIndicator, UXViewIntro, StatusEmpty } from './components/ProfessionalUI.jsx';
import { ReviewSummary, LiveActivityFocus } from './components/PremiumWorkflow.jsx';
import { ReviewRiskCenter } from './components/ReviewRiskCenter.jsx';
import { summarizeReviewRisks } from '../lib/review-risk-center.js';
import { activityPresentation, reviewDisclosureDefaultOpen } from '../lib/premium-workflow.js';
import { ReviewReadiness, ActivityEmpty, PushOutcome } from './components/PolishedWorkspace.jsx';
import SourceZipDownload from './components/SourceZipDownload.jsx';
import QuickActions from './components/QuickActions.jsx';
import { RepositoryPickerSheet, BranchPickerSheet } from './components/RepositoryWorkflowSheets.jsx';
import { reviewReadiness, themeChoice, resolveTheme } from '../lib/ux-polish.js';
import MobileViewportGuard from './components/MobileViewportGuard.jsx';
import ModalSheet from './components/ModalSheet.jsx';
import VirtualReviewList from './components/VirtualReviewList.jsx';
import { installViewportLayout } from '../lib/viewport-layout-client.js';
const HistoryPanel = dynamic(() => import('./components/HistoryPanel.jsx'), { ssr: false, loading: () => <LoadingSkeleton kind="panel" label="Đang tải HistoryPanel…"/> });
const WorkspacePanel = dynamic(() => import('./components/WorkspacePanel.jsx'), { ssr: false, loading: () => <LoadingSkeleton kind="panel" label="Đang tải WorkspacePanel…"/> });
const BranchPrPanel = dynamic(() => import('./components/BranchPrPanel.jsx'), { ssr: false, loading: () => <LoadingSkeleton kind="panel" label="Đang tải BranchPrPanel…"/> });
const ProDashboard = dynamic(() => import('./components/ProDashboard.jsx'), { ssr: false, loading: () => <LoadingSkeleton kind="panel" label="Đang tải ProDashboard…"/> });
const PushProfiles = dynamic(() => import('./components/PushProfiles.jsx'), { ssr: false, loading: () => <LoadingSkeleton kind="panel" label="Đang tải PushProfiles…"/> });
const ActivityJournal = dynamic(() => import('./components/ActivityJournal.jsx'), { ssr: false, loading: () => <LoadingSkeleton kind="panel" label="Đang tải ActivityJournal…"/> });
import { PRO_PROFILES_KEY, PRO_ACTIVITY_KEY, PRO_DASHBOARD_KEY, accountStorageKey,
  normalizeProfiles, upsertProfile, removeProfile, addActivity, normalizeActivity, proSnapshot, dashboardRepos, validRepoName } from '../lib/pro-workspace.js';

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

function StepTitle({ n, title, desc, centerOnMobile = false, actions = null }) {
  return <div className={`step-heading${centerOnMobile ? ' step-heading--mobile-center' : ''}${actions ? ' step-heading--with-actions' : ''}`}><span className="step-number" aria-hidden="true">{n}</span><div><h2>{title}</h2>{desc && <p>{desc}</p>}</div>{actions ? <div className="step-heading-actions">{actions}</div> : null}</div>;
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

const DESKTOP_TAB_ORDER = Object.freeze(['home','activity','history','settings']);
const DESKTOP_TAB_META = Object.freeze({
  home: {label:'Upload & Review',detail:'Cập nhật source',icon:'upload'},
  activity: {label:'Activity',detail:'Tiến trình & xác minh',icon:'activity'},
  history: {label:'History',detail:'Commit & rollback',icon:'history'},
  settings: {label:'Settings',detail:'Tùy chỉnh ứng dụng',icon:'settings'},
});

export default function Home() {
  const [activeTab, setActiveTab] = useState('home');
  const [notifications, setNotifications] = useState(INITIAL_NOTICES);
  const noticeSequence = useRef(0);
  const { ask: askConfirmation, request: confirmRequest, answer: answerConfirmation } = useConfirmationDialog();
  const notify = useCallback((event, verified = false) => {
    if (!shouldAnnounceEvent(event, verified)) return;
    const message = createInteractionNotice(event);
    // Errors, security risks and repository/review states are already displayed
    // contextually: don't announce the same event again in a floating toast.
    if (message && message.presentation !== 'inline') {
      const nextNotice = { ...message, id: ++noticeSequence.current };
      setNotifications(current => enqueueNotice(current, nextNotice));
    }
  }, []);
  const dismissNotice = useCallback(id => setNotifications(current => dismissQueuedNotice(current, id)), []);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [repoSheetOpen, setRepoSheetOpen] = useState(false);
  const [branchSheetOpen, setBranchSheetOpen] = useState(false);
  const workspaceDirtyRef = useRef(false);
  const [workspaceDirty, setWorkspaceDirty] = useState(false);
  const onWorkspaceDirtyChange = useCallback(value => { workspaceDirtyRef.current = Boolean(value); setWorkspaceDirty(Boolean(value)); }, []);
  function canLeaveWorkspace(target = '', identityChanged = false) {
    return !shouldWarnWorkspaceExit({workspaceOpen, dirty:workspaceDirtyRef.current, target, current:activeTab, identityChanged}) ||
      window.confirm(identityChanged
        ? 'File trong Workspace chưa được commit. Đổi repository/branch sẽ bỏ bản nháp. Tiếp tục?'
        : 'Workspace có thay đổi chưa commit. Chuyển tab? Bản nháp vẫn được giữ trong Workspace.');
  }

  const [theme, setTheme] = useState('dark');
  const [themeReady, setThemeReady] = useState(false);
  const viewTransitionRef = useRef(null);
  const viewTransitionIdRef = useRef(0);
  const navigationFocusRef = useRef(null);
  const viewTimerRef = useRef(null);
  const [prefersLight, setPrefersLight] = useState(false);
  const [proProfiles, setProProfiles] = useState([]);
  const [proActivity, setProActivity] = useState([]);
  const proProfilesRef = useRef([]);
  const proActivityRef = useRef([]);
  const [proDashboard, setProDashboard] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [prToolsOpen, setPrToolsOpen] = useState(false);
  const [dashboardError, setDashboardError] = useState('');
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [recents, setRecents] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [repositoryUsage, setRepositoryUsage] = useState([]);
  const [excludedPaths, setExcludedPaths] = useState([]);
  const [reviewSearch, setReviewSearch] = useState('');
  const [diffViewer, setDiffViewer] = useState(null);
  const diffRequestRef = useRef(0);
  const [transfer, setTransfer] = useState(null);
  const [changeFilter, setChangeFilter] = useState('all');
  const [syncConfirmed, setSyncConfirmed] = useState(false);
  const [projectMismatchConfirmed, setProjectMismatchConfirmed] = useState(false);
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
  const [archiveMode, setArchiveMode] = useState('standard');
  const archiveSessionRef = useRef(null);
  const fileSelectionSeqRef = useRef(0);
  const [preview, setPreview] = useState(null);
  const [fileDetailsOpen, setFileDetailsOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [decisionSheetOpen, setDecisionSheetOpen] = useState(false);
  const [riskSheetOpen, setRiskSheetOpen] = useState(false);
  // One-time, in-memory consent for the currently selected ZIP changes. Never
  // persisted to localStorage, and cleared whenever source/selection changes.
  const [sensitiveConsent, setSensitiveConsent] = useState(false);
  const [securityDialogOpen, setSecurityDialogOpen] = useState(false);
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
  const decisionRef = useRef(null);
  const activityRef = useRef(null);
  const analyzingRef = useRef(false);
  const archiveProgressAtRef = useRef(0);
  const uploadProgressAtRef = useRef(0);
  const lastSessionRefresh = useRef(0);
  useEffect(() => () => { archiveSessionRef.current?.close(); archiveSessionRef.current = null; }, []);
  const pwa = usePwaReliability({ busy: busy || auth.loading, dirty: workspaceDirty || (Boolean(file || preview) && phase !== PUSH_STAGES.SUCCEEDED), pending: Boolean(pendingCommit || pendingPR) });

  useEffect(() => {
    try {
      const oldTheme = window.localStorage.getItem(THEME_KEY);
      if (oldTheme === 'dark' || oldTheme === 'light' || oldTheme === 'system') setTheme(themeChoice(oldTheme));
    } catch { /* private browsing may block local storage */ }
    setThemeReady(true);
  }, []);
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: light)');
    const onThemeChange = () => setPrefersLight(query.matches);
    onThemeChange();
    query.addEventListener?.('change', onThemeChange);
    return () => query.removeEventListener?.('change', onThemeChange);
  }, []);
  useEffect(() => {
    if (!themeReady) return;
    document.documentElement.dataset.theme = resolveTheme(theme, prefersLight);
    document.documentElement.style.colorScheme = resolveTheme(theme, prefersLight);
    try { window.localStorage.setItem(THEME_KEY, theme); } catch { /* optional preference */ }
  }, [theme, prefersLight, themeReady]);
  // Move the viewport only after the new tab commits to the DOM. In mobile
  // Safari, scrollTo issued before setActiveTab renders can retain the previous
  // long Review/Recent Actions scroll position and hide Live Push progress.
  const pendingSameTabScroll = useRef(null);
  useEffect(() => () => pendingSameTabScroll.current?.(), []);
  useEffect(() => {
    if (document.documentElement.classList.contains('zip410-switching')) return;
    return scheduleTabViewport(window, document, activeTab, activityRef.current);
  }, [activeTab]);
  useEffect(() => {
    if (activeTab !== 'home' || !preview) { setDecisionSheetOpen(false); setRiskSheetOpen(false); }
  }, [activeTab, preview]);
  useEffect(() => { if (activeTab !== 'history') setPrToolsOpen(false); }, [activeTab]);
  // A keyboard/screen-reader-initiated tab change needs a predictable reading
  // position. Never steal focus on first hydration or a background GitHub event.
  useEffect(() => {
    if (navigationFocusRef.current !== activeTab) return;
    navigationFocusRef.current = null;
    document.getElementById('zipverra-main')?.focus({ preventScroll: true });
  }, [activeTab]);
  useEffect(() => () => {
    window.clearTimeout(viewTimerRef.current);
    viewTransitionRef.current?.skipTransition?.();
    document.documentElement.removeAttribute('data-zip-tab-direction');
    document.documentElement.classList.remove('zip410-switching', 'zip410-fallback');
  }, []);
  function goToTab(tab) {
    if (!MOBILE_TABS.includes(tab) || !canLeaveWorkspace(tab)) return;
    if (tab === activeTab) {
      pendingSameTabScroll.current?.();
      pendingSameTabScroll.current = scheduleTabViewport(window, document, tab, activityRef.current);
      return;
    }
    navigationFocusRef.current = tab;
    setRepoSheetOpen(false); setBranchSheetOpen(false);
    diffRequestRef.current += 1; setDiffViewer(null);
    const direction = tabSlideDirection(activeTab, tab);
    const root = document.documentElement;
    const transitionId = ++viewTransitionIdRef.current;
    window.clearTimeout(viewTimerRef.current);
    viewTransitionRef.current?.skipTransition?.();
    root.classList.remove('zip410-fallback');
    root.dataset.zipTabDirection = direction;
    root.classList.add('zip410-switching');
    const commitTab = () => {
      // Commit during the native transition's update callback. Both the old
      // and new view are then captured, enabling real simultaneous sliding.
      flushSync(() => setActiveTab(tab));
      // Reset Safari's previously scrolled long page before capturing the
      // incoming view, not half-way through the animation.
      positionTabViewport(window, document, tab, activityRef.current);
    };
    const clearTransition = () => {
      if (transitionId !== viewTransitionIdRef.current) return;
      root.classList.remove('zip410-switching', 'zip410-fallback');
      root.removeAttribute('data-zip-tab-direction');
      viewTransitionRef.current = null;
    };
    if (canSlideTabs(document, window)) {
      try {
        const transition = document.startViewTransition(commitTab);
        viewTransitionRef.current = transition;
        void transition.finished.then(clearTransition, clearTransition);
        return;
      } catch { /* Older WebKit: navigate immediately without a black fade. */ }
    }
    commitTab();
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
      clearTransition();
    } else {
      // Non-supporting browsers get a short horizontal entrance; never block
      // navigation waiting for an exit, and never dim the entire app.
      root.classList.add('zip410-fallback');
      viewTimerRef.current = window.setTimeout(clearTransition, 250);
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
    if (!auth.authenticated || !auth.user?.login) return;
    setFavorites(current => {
      const next = updateFavorites(current, value);
      try { window.localStorage.setItem(accountStorageKey(FAVORITES_KEY, auth.user), JSON.stringify(next)); } catch { /* optional preference */ }
      return next;
    });
  }
  // A repository selection, Profile change or ZIP review does NOT affect the
  // quick-access order. A verified GitHub Push is the only promotion event.
  function recordVerifiedPushRepo(value, verifiedSha) {
    if (!auth.authenticated || !auth.user?.login || !/^[0-9a-f]{40}$/i.test(verifiedSha || '')) return;
    if (!repos.some(item => item.full_name?.toLowerCase() === value?.toLowerCase())) return;
    // Recovery verification of an already-recorded commit must be idempotent.
    if (proActivityRef.current.some(item => item.kind === 'push' && item.state === 'success' &&
      item.sha === verifiedSha && item.repo?.toLowerCase() === value.toLowerCase())) return;
    setRecents(current => {
      const next = updateRecentRepositories(current, value);
      try { window.localStorage.setItem(accountStorageKey(RECENTS_KEY, auth.user), JSON.stringify(next)); } catch { /* optional metadata */ }
      return next;
    });
    setRepositoryUsage(current => {
      const next = recordRepositorySelection(current, value, repos);
      try { window.localStorage.setItem(accountStorageKey(REPO_USAGE_KEY, auth.user), JSON.stringify(next)); } catch { /* optional metadata */ }
      return next;
    });
  }


  useEffect(() => {
    // Account-scoped local metadata, never a credential store. Do not show another account's cache.
    proProfilesRef.current=[];proActivityRef.current=[];
    setProProfiles([]); setProActivity([]); setProDashboard(null); setDashboardError('');
    // Never show another GitHub account's local repo history or usage counts.
    setRecents([]); setFavorites([]); setRepositoryUsage([]);
    if (!auth.authenticated || !auth.user?.login) return;
    try {
      const recentKey = accountStorageKey(RECENTS_KEY, auth.user);
      const favoriteKey = accountStorageKey(FAVORITES_KEY, auth.user);
      const usageKey = accountStorageKey(REPO_USAGE_KEY, auth.user);
      // One-time migration from v3.2.0's unscoped local preferences to the
      // current account, then remove those keys so later accounts never inherit them.
      const oldRecent = localStorage.getItem(RECENTS_KEY);
      const oldPinned = localStorage.getItem(FAVORITES_KEY);
      const recentRaw = localStorage.getItem(recentKey) ?? oldRecent ?? '[]';
      const favoriteRaw = localStorage.getItem(favoriteKey) ?? oldPinned ?? '[]';
      const storedRecents = JSON.parse(recentRaw);
      const storedFavorites = JSON.parse(favoriteRaw);
      const recentList = Array.isArray(storedRecents) ? storedRecents.filter(validRepoName).slice(0, 5) : [];
      const favoriteList = Array.isArray(storedFavorites) ? storedFavorites.filter(validRepoName).slice(0, 8) : [];
      setRecents(recentList); setFavorites(favoriteList);
      if (oldRecent !== null) { if (!localStorage.getItem(recentKey)) localStorage.setItem(recentKey,JSON.stringify(recentList)); localStorage.removeItem(RECENTS_KEY); }
      if (oldPinned !== null) { if (!localStorage.getItem(favoriteKey)) localStorage.setItem(favoriteKey,JSON.stringify(favoriteList)); localStorage.removeItem(FAVORITES_KEY); }
      if (usageKey) setRepositoryUsage(normalizeRepositoryUsage(JSON.parse(localStorage.getItem(usageKey) || '[]')));
      const profileKey=accountStorageKey(PRO_PROFILES_KEY,auth.user);
      const activityKey=accountStorageKey(PRO_ACTIVITY_KEY,auth.user);
      const dashboardKey=accountStorageKey(PRO_DASHBOARD_KEY,auth.user);
      if (profileKey) {const value=normalizeProfiles(JSON.parse(localStorage.getItem(profileKey)||'[]'));proProfilesRef.current=value;setProProfiles(value);}
      if (activityKey) {
        const value=normalizeActivity(JSON.parse(localStorage.getItem(activityKey)||'[]'));
        proActivityRef.current=value;setProActivity(value);
        if (usageKey && localStorage.getItem(usageKey) === null) {
          const seeded = usageFromActivity(value);
          setRepositoryUsage(seeded);
          if (seeded.length) localStorage.setItem(usageKey,JSON.stringify(seeded));
        }
      }
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
  async function applyProfile(profile) {
    // A saved profile is a proposal, never an implicit change of destination or
    // a security consent. Validate against the currently authorized repo list.
    if (!auth.authenticated || busy || pendingCommit || pendingPR ||
        `${owner}/${repo}`.toLowerCase() !== profile?.repo?.toLowerCase() ||
        !repos.some(r => r.full_name.toLowerCase() === profile.repo.toLowerCase())) return false;
    if (file && phase !== PUSH_STAGES.SUCCEEDED && !await askConfirmation({
      title:'Áp dụng Push Profile?',
      message:'Đổi branch hoặc chế độ sẽ bỏ ZIP và bản Review chưa Push. Bạn sẽ cần phân tích ZIP lại.',
      confirmLabel:'Áp dụng Profile',danger:true,
    })) return false;
    if (profile.mode === 'sync' && mode !== 'sync' && !await askConfirmation({
      title:'Profile dùng chế độ Sync',
      message:'Sync có thể xóa các file đang có trên GitHub nhưng không nằm trong ZIP. Các xác nhận Review/Sync vẫn bắt buộc.',
      confirmLabel:'Chọn Sync',danger:true,
    })) return false;
    if (busy || pendingCommit || pendingPR || !canLeaveWorkspace('',true)) return false;
    workspaceDirtyRef.current=false;setWorkspaceOpen(false);
    setBranch(profile.branch);setMode(profile.mode);setReleaseStrategy(profile.strategy);
    setFile(null);if(fileInput.current)fileInput.current.value='';
    reset();goToTab('home');
    setStatus(`Đã áp dụng Profile: ${profile.branch} · ${profile.mode === 'sync'?'Sync':'Merge'} · ${profile.strategy === 'pr'?'Pull Request':'Direct Push'}. Hãy chọn ZIP và Review trước khi Push.`);
    return true;
  }
  async function selectAndApplyProfile(profile) {
    if (!auth.authenticated || busy || pendingCommit || pendingPR ||
        !repos.some(r=>r.full_name.toLowerCase()===profile?.repo?.toLowerCase())) return false;
    if (file && phase !== PUSH_STAGES.SUCCEEDED && !await askConfirmation({
      title:'Đổi repository và áp dụng Profile?',
      message:'ZIP và bản Review chưa Push sẽ bị bỏ. Cấu hình trong Profile sẽ được áp dụng cho repository mới.',
      confirmLabel:'Đổi và áp dụng',danger:true,
    })) return false;
    if (profile.mode === 'sync' && !await askConfirmation({
      title:'Profile dùng chế độ Sync',
      message:'Sync có thể xóa file cũ trên GitHub. Các bước xác nhận Review và Push vẫn bắt buộc.',
      confirmLabel:'Chọn Sync',danger:true,
    })) return false;
    if (busy || pendingCommit || pendingPR || !canLeaveWorkspace('',true)) return false;
    workspaceDirtyRef.current=false;
    const [nextOwner,nextRepo]=profile.repo.split('/');
    setOwner(nextOwner);setRepo(nextRepo);setBranch(profile.branch);
    setMode(profile.mode);setReleaseStrategy(profile.strategy);
    setWorkspaceOpen(false);setFile(null);if(fileInput.current)fileInput.current.value='';
    reset();goToTab('home');
    setStatus(`Đã chọn ${profile.repo} · ${profile.branch}; hãy Review ZIP trước khi Push.`);
    return true;
  }
  function logLocalAction(value) {
    if (!auth.authenticated || !auth.user?.login) return;
    const next=addActivity(proActivityRef.current,value);
    proActivityRef.current=next;setProActivity(next);
    try{localStorage.setItem(accountStorageKey(PRO_ACTIVITY_KEY,auth.user),JSON.stringify(next));}catch{}
  }
  async function clearLocalActions() {
    if (!await askConfirmation({ title: 'Xóa nhật ký trên thiết bị?', message: 'Toàn bộ nhật ký hoạt động lưu trên thiết bị này sẽ bị xóa. Lịch sử commit trên GitHub không bị ảnh hưởng.', confirmLabel: 'Xóa nhật ký', danger: true })) return;
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
    const onNetwork = () => { const connected = navigator.onLine; setOnline(connected); notify(connected ? 'network-online' : 'network-offline'); };
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

  // iOS may suspend Safari/PWA for hours. Revalidate the session on a foreground
  // return, but never interrupt a GitHub mutation or unsaved Workspace draft.
  useEffect(() => {
    if (!pwa.resumeTick || !auth.authenticated || busy || workspaceDirty || !navigator.onLine) return;
    if (Date.now() - lastSessionRefresh.current < 60000) return;
    lastSessionRefresh.current = Date.now();
    let cancelled = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    fetch('/api/auth/session', { cache:'no-store', signal:controller.signal })
      .then(async response => { if (!response.ok) throw Error('session unreachable'); return response.json(); })
      .then(data => {
        if (cancelled) return;
        const currentLogin = auth.user?.login?.toLowerCase();
        if (!data.authenticated || data.user?.login?.toLowerCase() !== currentLogin) {
          setAuth({ loading:false, authenticated:false, user:null });
          archiveSessionRef.current?.close();archiveSessionRef.current=null;
          setRepos([]);setInstallations([]);setOwner('');setRepo('');setFile(null);setArchiveMode('standard');setPreview(null);setResult(null);setTransfer(null);
          setWorkspaceOpen(false);workspaceDirtyRef.current=false;setWorkspaceDirty(false);
          setStatus('Phiên GitHub đã thay đổi. Hãy đăng nhập lại trước khi thao tác tiếp.');
          setError('Phiên đăng nhập đã hết hạn hoặc tài khoản đã thay đổi. Vui lòng đăng nhập lại.');
        }
      })
      // Transient network failure must not be treated as sign-out.
      .catch(() => {}).finally(() => window.clearTimeout(timeout));
    return () => { cancelled=true;controller.abort();window.clearTimeout(timeout); };
  }, [pwa.resumeTick, auth.authenticated, auth.user?.login, busy, workspaceDirty]);

  // beforeunload is best-effort on iOS; server-side verification journals remain authoritative.
  useEffect(() => {
    const onLeave = event => {
      if (!busy && !workspaceDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [busy, workspaceDirty]);

  useEffect(() => {
    if (!auth.authenticated) return;
    let active = true;
    setLoadingRepos(true);
    api('repos', {}).then((data) => { if (active) { setRepos(data.repos || []); setInstallations(data.installations || []); } })
      .catch((e) => { if (active) setError(`Không tải được repositories: ${e.message}`); })
      .finally(() => { if (active) setLoadingRepos(false); });
    return () => { active = false; };
  }, [auth.authenticated]);


  async function logout() {
    if (!canLeaveWorkspace('', true)) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST', cache: 'no-store' });
      if (!response.ok) throw new Error('Không thể đăng xuất.');
      setAuth({ loading: false, authenticated: false, user: null });
      setFile(null); setArchiveMode('standard'); setMode('merge'); setReleaseStrategy('direct');
      setRepos([]); setOwner(''); setRepo(''); setBranch('main'); reset();
      setActiveTab('home'); setWorkspaceOpen(false);
      clearUploadCheckpoint();
      setPendingCommit(null); clearPending(); setPhase(PUSH_STAGES.IDLE);
      setPendingPR(null); clearPendingPR(); setReleaseStrategy('direct');
      try { sessionStorage.removeItem('zipverra.rollback.pending.v1'); window.dispatchEvent(new Event('zipverra:recovery-changed')); } catch { /* no-op */ }
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  const commitMessage = useMemo(() => zipCommitMessage(file?.name), [file]);
  const selectedChanges = useMemo(() => preview ? selectChanges(preview.changes, excludedPaths) : [], [preview, excludedPaths]);
  const stats = preview ? countChanges(selectedChanges) : null;
  const totalStats = preview ? countChanges(preview.changes) : null;
  const securityReport = useMemo(() => preview ? reportSelectedSecurity(preview.archive.security, selectedChanges) : null, [preview,selectedChanges]);
  const sensitiveFindings = useMemo(() => securityReport?.findings?.filter(f => f.severity === 'critical' || f.code === 'POSSIBLE_CREDENTIAL') || [], [securityReport]);
  const requiresConsent = needsSensitiveConsent(sensitiveFindings);
  const shownChanges = useMemo(() => preview ? filterReview(preview.changes, changeFilter, reviewSearch) : [], [preview, changeFilter, reviewSearch]);
  const selectedBytes = useMemo(() => selectedChanges.filter(c => c.kind !== 'delete').reduce((sum, c) => sum + (c.bytes || 0), 0), [selectedChanges]);
  const baseTimeline = getPushTimeline(phase, { preview: Boolean(preview), result: Boolean(result), pending: Boolean(pendingCommit) });
  const hasPrFlow = releaseStrategy === 'pr' || Boolean(pendingPR) || Boolean(result?.pr) || Boolean(pendingCommit?.prRequest);
  const timeline = hasPrFlow ? [...baseTimeline, { id:'pr', state:result?.pr ? 'complete' : pendingPR ? (busy ? 'active':'uncertain') : 'waiting' }] : baseTimeline;
  const displayedRepos = useMemo(() => sortedRepositories(repos, favorites, recents), [repos, favorites, recents]);
  const chosenRepo = Boolean(owner.trim() && repo.trim() && repos.some((item) => item.full_name.toLowerCase() === `${owner}/${repo}`.toLowerCase()));
  const visibleRecoveryPush = auth.authenticated && repos.some(r => r.full_name?.toLowerCase() === `${pendingCommit?.owner}/${pendingCommit?.repo}`.toLowerCase());
  const visibleRecoveryPR = auth.authenticated && repos.some(r => r.full_name?.toLowerCase() === `${pendingPR?.owner}/${pendingPR?.repo}`.toLowerCase());
  const flowStep = deriveWorkflowStep({ phase, chosenRepo, hasFile: Boolean(file), hasPreview: Boolean(preview) });
  const activityFocus = activityPresentation({ phase, busy, pendingCommit, pendingPR, result, progress });
  const pushReadiness = useMemo(() => reviewReadiness({
    hasPreview: Boolean(preview), selectedCount: selectedChanges.length,
    critical: securityReport?.critical || 0, sensitiveFindings: sensitiveFindings.length,
    sensitiveConsent, authenticated: auth.authenticated,
    online: online && pwa.reachable, busy, pending: Boolean(pendingCommit || pendingPR),
    confirmed, syncDeleteCount: mode === 'sync' ? (stats?.delete || 0) : 0,
    syncConfirmed,
  }), [preview, selectedChanges.length, securityReport?.critical, sensitiveFindings.length, sensitiveConsent, auth.authenticated,
    online, pwa.reachable, busy, pendingCommit, pendingPR, confirmed, mode, stats?.delete, syncConfirmed]);
  const riskSummary = useMemo(() => summarizeReviewRisks({
    report: securityReport, insights: preview?.insights, identity: preview?.identity,
    mode, deleteCount: stats?.delete || 0, requiresConsent, sensitiveConsent,
    mismatchConsent: projectMismatchConfirmed, syncConfirmed,
  }), [securityReport, preview?.insights, preview?.identity, mode, stats?.delete, requiresConsent,
    sensitiveConsent, projectMismatchConfirmed, syncConfirmed]);
  const diagnosticsRef = useRef(null);
  // One shared geometry calculation: avoid guessed fixed dock heights on
  // iPhone safe areas/large text and reserve the actual desktop workspace.
  useEffect(() => {
    if (activeTab !== 'home') return;
    const main = document.getElementById('zipverra-main');
    return installViewportLayout({ main, dock:decisionRef.current, win:window, ResizeObserverImpl:window.ResizeObserver });
  }, [activeTab, Boolean(preview), riskSummary.pendingCount, selectedChanges.length, releaseStrategy]);

  // Scroll only the Review viewport, never the full Upload page when it is bounded.
  const scrollReviewTo = (target) => {
    const panel = previewRef.current;
    if (!target || !panel) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (panel.scrollHeight > panel.clientHeight + 2) {
      const offset = target.getBoundingClientRect().top - panel.getBoundingClientRect().top;
      panel.scrollTo({ top: Math.max(0, panel.scrollTop + offset - 10), behavior: reduced ? 'instant' : 'smooth' });
    } // No document scroll fallback: the Review region owns its own viewport.
  };
  const showReviewDiagnostics = () => {
    const details = diagnosticsRef.current;
    if (!details) return;
    details.open = true;
    window.requestAnimationFrame(() => scrollReviewTo(details));
  };
  const isMobileViewport = () => typeof window !== 'undefined' && window.matchMedia?.('(max-width: 760px)').matches;
  const focusRiskCenter = () => {
    setDecisionSheetOpen(false);
    if (isMobileViewport()) { setRiskSheetOpen(true); return; }
    const target = previewRef.current?.querySelector('.review-risk-center');
    if (!target) return;
    window.requestAnimationFrame(() => scrollReviewTo(target));
  };
  const openDecisionSheet = () => {
    if (!preview) return;
    if (isMobileViewport()) { setDecisionSheetOpen(true); return; }
    goToDecision();
  };
  const canSubmitPush = pushReadiness.ready && (preview?.identity?.severity !== 'critical' || projectMismatchConfirmed);
  const copyCommitSha = useCallback(async (sha) => {
    if (!/^[a-f0-9]{40}$/i.test(sha || '')) return;
    try { await navigator.clipboard.writeText(sha); notify('sha-copied'); }
    catch { setStatus('Không sao chép được SHA. Bạn có thể mở commit trên GitHub để xem.'); }
  }, [notify]);
  const reset = () => {
    archiveSessionRef.current?.close();
    archiveSessionRef.current = null;
    setDecisionSheetOpen(false); setRiskSheetOpen(false);
    setPreview(null);
    setFileDetailsOpen(false);
    setConfirmed(false);
    setSyncConfirmed(false); setSensitiveConsent(false); setSecurityDialogOpen(false); setProjectMismatchConfirmed(false);
    setChangeFilter('all');
    setExcludedPaths([]); setReviewSearch(''); setDiffViewer(null); diffRequestRef.current += 1;
    setTransfer(null);
    setResult(null);
    setError(''); setErrorHint('');
    setStatus('');
    setProgress(0);
    if (!pendingCommit) setPhase(PUSH_STAGES.IDLE);
  };
  async function restartWorkspace() {
    // A pending write must be verified, never silently hidden by a reset.
    if (busy || loadingRepos || pendingCommit || pendingPR) {
      await askConfirmation({ title: 'Chưa thể khởi động lại', message: 'Đang xử lý hoặc có thao tác GitHub cần xác minh. Mở Activity và hoàn tất trước khi khởi động lại.', confirmLabel: 'Đã hiểu' });
      return;
    }
    if ((file || preview || workspaceDirtyRef.current) && !await askConfirmation({ title: 'Khởi động lại Zipverra?', message: 'Repository, ZIP, Review và bản nháp chưa commit đang chọn sẽ bị bỏ. Lịch sử GitHub và tùy chọn giao diện vẫn được giữ.', confirmLabel: 'Khởi động lại', danger: true })) return;
    if (busy || loadingRepos || pendingCommit || pendingPR) return;
    clearUploadCheckpoint();
    // Unmount all transient editors/sheets and request a clean, fully reloaded home screen.
    window.location.assign(window.location.pathname);
  }
  function change(setter, value) {
    if (workspaceOpen && [setOwner,setRepo,setBranch].includes(setter)) {
      if (!canLeaveWorkspace('', true)) return;
      workspaceDirtyRef.current = false;setWorkspaceOpen(false);
    }
    setter(value); reset();
  }
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
  async function chooseRepo(value) {
    if (!value || busy || pendingCommit || pendingPR) return;
    // Re-selecting the same repo must not erase an uncommitted ZIP Review.
    if (value.toLowerCase() === `${owner}/${repo}`.toLowerCase()) { goToTab('home'); return; }
    if (file && phase !== PUSH_STAGES.SUCCEEDED && !await askConfirmation({ title: 'Đổi repository?', message: 'ZIP và Review chưa Push sẽ bị bỏ. Thao tác đã ghi lên GitHub không bị ảnh hưởng.', confirmLabel: 'Đổi repository', danger: true })) return;
    if (busy || pendingCommit || pendingPR) return;
    if (!canLeaveWorkspace('', true)) return;
    workspaceDirtyRef.current = false;setWorkspaceOpen(false);
    const index = value.indexOf('/');
    setOwner(value.slice(0, index));
    setRepo(value.slice(index + 1));
    setBranch('main');
    setFile(null); setArchiveMode('standard'); setMode('merge'); setReleaseStrategy('direct');
    if (fileInput.current) fileInput.current.value = '';
    reset();
    notify('repo-selected');
    goToTab('home');
  }
  async function chooseBranch(nextBranch) {
    if (!nextBranch || nextBranch === branch || busy || pendingCommit || pendingPR) return;
    if (file && phase !== PUSH_STAGES.SUCCEEDED && !await askConfirmation({ title: 'Đổi branch?', message: 'Bản Review ZIP chưa Push sẽ bị bỏ. Không thay đổi các commit đã có trên GitHub.', confirmLabel: 'Đổi branch', danger: true })) return;
    if (busy || pendingCommit || pendingPR) return;
    change(setBranch, nextBranch);
  }
  async function chooseFile(next) {
    if (busy || pendingCommit || pendingPR || !chosenRepo) return;
    if (fileInput.current) fileInput.current.value = '';
    if (!next) return;
    const selectionSeq=++fileSelectionSeqRef.current;
    const selectedRepo=`${owner}/${repo}@${branch}`;
    const candidateError = checkZipCandidate(next, archiveCapacity('extended').zipBytes);
    if (candidateError) { change(setFile,null);setArchiveMode('standard');setError(candidateError); setStatus('Hãy chọn một file ZIP hợp lệ (tối đa 200 MiB).'); notify('zip-invalid'); return; }
    let capacityMode = 'standard';
    if (next.size > archiveCapacity('standard').zipBytes) {
      const accepted = await askConfirmation({
        title: 'Bật Extended Mode (200 MiB)?',
        message: 'ZIP lớn có thể dùng nhiều RAM và mất thời gian trên iPhone. Hãy giữ ứng dụng ở foreground đến khi hoàn tất; nếu thiết bị thiếu bộ nhớ, quá trình sẽ dừng trước Commit.',
        confirmLabel: 'Tiếp tục · 200 MiB', danger: false,
      });
      if (!accepted || selectionSeq!==fileSelectionSeqRef.current || selectedRepo!==`${owner}/${repo}@${branch}` || busy || pendingCommit || pendingPR) return;
      capacityMode = 'extended';
    }
    // Every selected ZIP starts a fresh non-persistent capacity consent.
    change(setFile, next);
    setArchiveMode(capacityMode);
  }
  // A new ZIP is deliberately analyzed automatically. Security review and the Push
  // confirmation remain explicit; selecting a ZIP is never consent to mutate GitHub.
  useEffect(() => {
    if (!file || !chosenRepo || pendingCommit || pendingPR || !auth.authenticated) return;
    void analyze();
    // File selection is the only automatic trigger. Changing repo/settings still
    // invalidates the preview; after changing those controls the user can re-analyze.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);
  async function analyze() {
    if (analyzingRef.current || busy) return;
    analyzingRef.current = true;
    archiveProgressAtRef.current = 0;
    setBusy(true); setError(''); setErrorHint(''); setResult(null); setProgress(0); setPhase(PUSH_STAGES.ANALYZING);
    try {
      if (!online) throw new Error('Thiết bị đang offline. Hãy kết nối Internet rồi phân tích lại.');
      if (pendingCommit) throw new Error('Có một lần push chưa xác minh. Mở Activity → Xác minh push trước khi tiếp tục.');
      if (pendingPR) throw new Error('Branch đã push nhưng PR còn chờ xác minh. Mở Activity → Kiểm tra / Tạo PR.');
      const input = getInputs();
      if (!file) throw new Error('Hãy chọn file ZIP chứa source code.');
      setStatus('Đang phân tích ZIP trong Web Worker, kiểm tra file và tính Git SHA...');
      // Keep compressed archive only in the Worker. The UI receives paths, SHAs,
      // metadata and redacted security findings; content bytes are read on demand.
      archiveSessionRef.current?.close();
      archiveSessionRef.current = null;
      const session = await openArchiveOffThread(file, (percent) => {
        const now = Date.now();
        if (shouldPublishProgress(archiveProgressAtRef.current, now, percent >= 100)) { archiveProgressAtRef.current = now; setProgress(Math.round(percent * 0.6)); }
      },
        typeof Worker !== 'undefined' ? () => new Worker(new URL('./workers/archive.worker.js', import.meta.url), { type: 'module' }) : null,
        archiveMode);
      archiveSessionRef.current = session;
      const archive = session.archive;
      setPhase(PUSH_STAGES.PREFLIGHT);
      setProgress(65);
      setStatus('Đang kiểm tra GitHub App installation và quyền ghi repository...');
      await api('preflight', { ...input, workflowPaths: [] });
      setStatus('Đang đọc HEAD và so sánh với repository...');
      setProgress(75);
      const remote = await api('snapshot', input);
      const changes = calculateChanges(archive.files, remote.files, mode);
      const insights = analyzeSource({ ...archive, changes });
      // This read-only check is advisory: paths and manifests cannot prove project identity.
      // Never block the upload if optional manifest retrieval fails.
      let remotePackageName = '';
      const initialIdentity = compareProjectIdentity({archiveFiles:archive.files,remoteFiles:remote.files});
      if (initialIdentity.severity !== 'matched' && remote.files.some(f => f.type === 'blob' && f.path === 'package.json')) {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 5500);
        try {
          const response = await fetch('/api/github/text', {method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({...input,expectedHead:remote.head,path:'package.json'}),signal:controller.signal});
          if (response.ok) {const data=await response.json(); if (data.available) remotePackageName=packageNameFromText(data.content);}
        } catch { /* heuristic remains available using file tree only */ }
        finally { window.clearTimeout(timer); }
      }
      const identity=compareProjectIdentity({archiveFiles:archive.files,remoteFiles:remote.files,
        localName:packageNameFromArchive(archive.files),remoteName:remotePackageName});
      // Web Worker already scans file contents. Fallback runs the same bounded scanner.
      if (!archive.security) archive.security=scanSelectedChanges(archive.files,archive.files.map(f=>({path:f.path,kind:'add'})));
      const releaseBranch = releaseStrategy === 'pr'
        ? makeReleaseBranch(file.name, crypto.randomUUID().replaceAll('-', '').slice(0, 8)) : null;
      setPreview({ archive, remote, changes, insights, identity, input: { owner: input.owner, repo: input.repo, branch: input.branch }, mode, filename: file.name, releaseStrategy, releaseBranch });
      setFileDetailsOpen(reviewDisclosureDefaultOpen(changes.length));
      setChangeFilter('all'); setReviewSearch(''); setExcludedPaths([]); setDiffViewer(null); diffRequestRef.current += 1;
      setConfirmed(false); setSyncConfirmed(false); setSensitiveConsent(false); setProjectMismatchConfirmed(false);
      const selectedReport=reportSelectedSecurity(archive.security,changes);
      const sensitiveWarning=needsSensitiveConsent(selectedReport.findings);
      setSecurityDialogOpen(sensitiveWarning);
      // A probable cross-project upload needs a full-sized review on mobile,
      // not just a tiny warning hidden behind a persistent Push control.
      setRiskSheetOpen(identity.severity === 'critical' && !sensitiveWarning && isMobileViewport());
      setStatus(changes.length ? `Đã phân tích: ${changes.length} thay đổi cần xử lý.` : 'ZIP và repository đã đồng bộ, không có gì cần push.');
      setProgress(100);
      setPhase(PUSH_STAGES.IDLE);
      notify(changes.length ? 'review-ready' : 'no-changes');
    } catch (e) { archiveSessionRef.current?.close(); archiveSessionRef.current=null; setError(e.message); setErrorHint(e.hint || ''); setPreview(null); setSecurityDialogOpen(false); setRiskSheetOpen(false); setStatus(''); setPhase(PUSH_STAGES.FAILED); notify('action-failed'); }
    finally { analyzingRef.current = false; setBusy(false); }
  }
  function finishVerified(outcome) {
    setDecisionSheetOpen(false); setRiskSheetOpen(false);
    setResult(outcome);
    setStatus(outcome.recovered ? 'Push đã thành công, được xác minh lại trên GitHub.' : 'Đã push và xác minh commit trên GitHub.');
    setProgress(100);
    setPhase(PUSH_STAGES.SUCCEEDED);
    goToTab('activity');
    notify('push-verified', true);
    recordVerifiedPushRepo(`${owner}/${repo}`, outcome.sha);
    logLocalAction({kind:'push',state:'success',repo:`${owner}/${repo}`,sha:outcome.sha,message:'Commit verified on GitHub'});
    setPendingCommit(null);
    clearPending();
    clearUploadCheckpoint();
    setPreview(null);
    setConfirmed(false);
    setSyncConfirmed(false); setSensitiveConsent(false); setSecurityDialogOpen(false); setProjectMismatchConfirmed(false);
    setChangeFilter('all'); setExcludedPaths([]); setDiffViewer(null);
    setError(''); setErrorHint('');
  }

  async function completeVerified(outcome, data) {
    setDecisionSheetOpen(false); setRiskSheetOpen(false);
    if (!data?.prRequest) {
      finishVerified(outcome);
      return;
    }
    const prData = { ...data.prRequest, expectedSourceHead: outcome.sha };
    clearPending(); setPendingCommit(null); clearUploadCheckpoint();
    setPreview(null); setConfirmed(false); setSyncConfirmed(false); setSensitiveConsent(false); setSecurityDialogOpen(false);
    setResult({ ...outcome, branchOnly: true, sourceBranch: prData.sourceBranch });
    recordVerifiedPushRepo(`${prData.owner}/${prData.repo}`, outcome.sha);
    logLocalAction({kind:'push',state:'success',repo:`${prData.owner}/${prData.repo}`,sha:outcome.sha,message:'Release branch verified'});
    setProgress(100); setPhase(PUSH_STAGES.SUCCEEDED); goToTab('activity');
    setPendingPR(prData); savePendingPR(prData);
    setStatus('Branch đã push và xác minh trên GitHub. Đang mở Pull Request...');
    try {
      const pr = await requestOnce('pull-request/create', prData);
      setResult({ ...outcome, pr, sourceBranch: prData.sourceBranch });
      logLocalAction({kind:'pr',state:'success',repo:`${prData.owner}/${prData.repo}`,sha:outcome.sha,message:`Opened Pull Request #${pr.number}`});
      setPendingPR(null); clearPendingPR();
      setStatus(`Pull Request #${pr.number} đã được tạo/xác minh. Chờ review và merge trên GitHub.`);
      notify('pr-verified', true);
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
      notify('pr-verified', true);
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

  function startNextVersion() {
    if (busy || pendingCommit || pendingPR || phase !== PUSH_STAGES.SUCCEEDED) return;
    setDecisionSheetOpen(false); setRiskSheetOpen(false);
    setFile(null);setArchiveMode('standard');
    if (fileInput.current) fileInput.current.value = '';
    reset();
    goToTab('home');
    // The chooser is initiated only by a separate user tap (iOS Safari requirement).
  }
  const lastPositionedPreviewRef = useRef(null);
  // Do not scroll the document when a ZIP becomes ready or when switching tabs.
  // Only a genuinely new Review clears the independent panel position.
  useEffect(() => {
    if (!preview || activeTab !== 'home' || lastPositionedPreviewRef.current === preview) return;
    lastPositionedPreviewRef.current = preview;
    previewRef.current?.scrollTo?.({ top: 0, behavior: 'instant' });
  }, [preview, activeTab]);
  function goToReview() {
    if (!preview) return;
    if (activeTab !== 'home') { goToTab('home'); return; }
    // For large reviews, only scroll the independent Review panel.
    previewRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' });
    // Leave the document at its current position; the review surface is bounded.
  }

  // A file list can contain thousands of paths. Return to the single, gated
  // consent section without creating a second commit button or bypassing checks.
  function goToDecision() {
    if (!preview) return;
    setFileDetailsOpen(false);
    if (isMobileViewport()) { setDecisionSheetOpen(true); return; }
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      const decision = decisionRef.current;
      if (!decision?.isConnected) return;
      // The submit dock is always visible in the active workspace.
      // Focus it without moving the outer document or pushing the mobile dock.
      decision.focus({ preventScroll: true });
    }));
  }

  function updateSelection(path) {
    setExcludedPaths(current => toggleExcluded(preview?.changes || [], current, path));
    setConfirmed(false); setSyncConfirmed(false); setSensitiveConsent(false); setSecurityDialogOpen(false); setProjectMismatchConfirmed(false);
  }
  function bulkSelection(keep) {
    if (!preview) return;
    setExcludedPaths(keep ? [] : preview.changes.map(change => change.path));
    setConfirmed(false); setSyncConfirmed(false); setSensitiveConsent(false); setSecurityDialogOpen(false); setProjectMismatchConfirmed(false);
  }
  async function inspectChange(change) {
    if (!preview || busy) return;
    const requestId = ++diffRequestRef.current;
    setDiffViewer({ path:change.path, loading:true, message:'Đang tải nội dung để so sánh…' });
    try {
      // Never display credential-like source in a client-side diff, including on iPhone.
      if (sensitiveFindings.some(f => f.path === change.path)) throw new Error('Ẩn Diff cho file nghi ngờ chứa thông tin bí mật. Hãy kiểm tra source gốc trước khi xác nhận.');
      const localFile = preview.archive.files.find(f => f.path === change.path);
      let after = '';
      if (change.kind !== 'delete') {
        if (!isTextPreviewable(localFile)) throw new Error('File này lớn, dạng nhị phân hoặc không phù hợp để hiển thị text diff.');
        if (!archiveSessionRef.current) throw new Error('Phiên ZIP đã hết hạn. Hãy phân tích lại trước khi xem Diff.');
        after = decodePreview(await archiveSessionRef.current.getFile(localFile.path));
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
    if (!preview || !selectedChanges.length || (requiresConsent && !sensitiveConsent) || !confirmed || (mode === 'sync' && stats?.delete > 0 && !syncConfirmed) || busy || pendingCommit || pendingPR || !canSubmitPush) return;
    // Let the native iPhone confirmation sheet close before taking Activity
    // snapshots; otherwise its dark modal backdrop can obscure the slide.
    const closingSheet = decisionSheetOpen ? document.querySelector('dialog.zip-modal--sheet[open]') : null;
    setDecisionSheetOpen(false); setRiskSheetOpen(false);
    setBusy(true); setResult(null); setError(''); setErrorHint(''); setProgress(0); setTransfer(null);
    setPhase(PUSH_STAGES.UPLOADING);
    let commitPayload = null;
    try {
      if (closingSheet) await new Promise(resolve => {
        let timeout;
        const settled = () => { window.clearTimeout(timeout); closingSheet.removeEventListener('close', settled); resolve(); };
        closingSheet.addEventListener('close', settled, { once:true });
        timeout = window.setTimeout(settled, 350); // fallback if browser skips native close event
      });
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
      if (!archiveSessionRef.current) throw new Error('Phiên ZIP đã đóng. Hãy phân tích ZIP lại trước khi Push.');
      const transferStarted = Date.now();
      uploadProgressAtRef.current = 0;
      const { blobShas, attestations, reused } = await uploadBlobsInBatches({
        changes: selectedChanges,
        files: preview.archive.files,
        existing,
        concurrency: 2,
        batchSize: 12,
        upload: async (source) => {
          const res = await api('blob', { owner: input.owner, repo: input.repo, path: source.path, content: encodeBase64(await archiveSessionRef.current.getFile(source.path)), allowSensitiveUpload: requiresConsent && sensitiveConsent },
            (attempt) => setStatus(`GitHub chậm với ${source.path}. Retry an toàn (${attempt}/2)...`));
          return {sha:res.sha,proof:res.proof};
        },
        onCheckpoint: (completed) => {
          Object.assign(checkpoint, completed);
          saveUploadCheckpoint(makeCheckpoint(fingerprint, checkpoint));
        },
        onProgress: ({ completed, total, batch, totalBatches, reused: reusedCount, completedBytes, totalBytes, uploadedBytes }) => {
          const now = Date.now();
          if (!shouldPublishProgress(uploadProgressAtRef.current, now, completed >= total)) return;
          uploadProgressAtRef.current = now;
          setProgress(Math.round((completed / Math.max(1, total)) * 80));
          setTransfer({ ...transferEstimate(uploadedBytes, Math.max(0, totalBytes - (completedBytes - uploadedBytes)), now - transferStarted), completed, total, batch, totalBatches, reused: reusedCount, completedBytes, totalBytes });
          setStatus(`Git blobs: ${completed}/${total} · Batch ${batch}/${totalBatches}${reusedCount ? ` · Phục hồi ${reusedCount} file` : ''}`);
        },
      });
      // A large batch can outlive the 60-minute signed security proof.
      // Refresh expiring proofs by re-reading/verifying bytes and re-scanning on server,
      // never by extending their client-side expiry or bypassing validation.
      setStatus('Đang kiểm tra thời hạn chứng nhận bảo mật trước Commit...');
      await refreshExpiringAttestations({ changes:selectedChanges,files:preview.archive.files,blobShas,attestations,
        onCheckpoint:(path,item)=>{checkpoint[path]=item;saveUploadCheckpoint(makeCheckpoint(fingerprint,checkpoint));},
        upload:async source=>{
          const res=await api('blob',{owner:input.owner,repo:input.repo,path:source.path,
            content:encodeBase64(await archiveSessionRef.current.getFile(source.path)),
            allowSensitiveUpload:requiresConsent && sensitiveConsent});
          return {sha:res.sha,proof:res.proof};
        },
        onProgress:(done,total)=>setStatus(`Gia hạn chứng nhận an toàn: ${done}/${total} file...`),
      });
      if (reused) setStatus(`Đã tái sử dụng ${reused} Git blob từ lần upload trước; bắt đầu commit...`);
      const entries = selectedChanges.map((c) => ({ path: c.path, mode: c.mode, sha: c.kind === 'delete' ? null : blobShas.get(c.path), ...(c.kind !== 'delete' ? {proof: attestations.get(c.path)} : {}) }));
      commitPayload = { ...commitInput, expectedHead: expectedCommitHead, message: commitMessage, entries,
        allowSensitiveCommit: requiresConsent && sensitiveConsent, ...(prRequest ? { prRequest } : {}) };
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
      notify('action-failed');
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
    <FeedbackToast notice={notifications.active} queuedCount={notifications.queued.length} onDismiss={dismissNotice}/>
    <ConfirmationDialog request={confirmRequest} onAnswer={answerConfirmation}/>
    <a className="polish-skip-link" href="#zipverra-main">Bỏ qua điều hướng, đến nội dung chính</a>
    <div className="shell pro-shell polish-shell">
    <div className="glow one"/><div className="glow two"/>
    {/* Desktop: a persistent workspace navigation; mobile retains the original bottom tabs. */}
    <aside className="desktop-workspace-nav" aria-label="Điều hướng desktop">
      <button type="button" className="desktop-rail-top" onClick={restartWorkspace} aria-label="Khởi động lại Zipverra và bỏ lựa chọn hiện tại" title="Khởi động lại ứng dụng"><span className="desktop-rail-emblem" aria-hidden="true"><Icon name="branch" size={21}/></span><div><strong>Zipverra <span>Pro</span></strong><small>GITHUB WORKSPACE</small></div></button>
      <div className="desktop-rail-label">WORKSPACE</div>
      <nav className="desktop-rail-links" aria-label="Các khu vực ứng dụng">
        {DESKTOP_TAB_ORDER.map(id => {
          const item = DESKTOP_TAB_META[id];
          return <button type="button" key={id} className={`desktop-rail-link${activeTab === id ? ' is-active' : ''}`} title={item.label} aria-label={`Mở ${item.label}`}
            aria-current={activeTab === id ? 'page' : undefined} onClick={() => goToTab(id)}>
            <Icon name={item.icon} size={19}/><span className="desktop-rail-link-copy"><strong>{item.label}</strong><small>{item.detail}</small></span>
            {id === 'activity' && (pendingCommit || pendingPR) && <span className="desktop-rail-alert" aria-label="Có thao tác cần xác minh"/>}
          </button>})}
      </nav>
      <div className="desktop-rail-bottom">
        <span className="desktop-rail-label">GITHUB ACCOUNT</span>
        <strong>{auth.user?.login ? `@${auth.user.login}` : 'Chưa đăng nhập'}</strong>
        <span className="desktop-rail-branch"><Icon name="branch" size={14}/>{chosenRepo ? `${repo} · ${branch}` : 'Chọn repository để bắt đầu'}</span>
        <span className={`desktop-rail-status${online && pwa.reachable ? ' is-online' : ''}`}>{online && pwa.reachable ? '● Connected' : '● Offline'} · v3.9.11</span>
      </div>
    </aside>
    <header className="topbar" role="banner">
      <div className="desktop-topbar-path" aria-label="Khu vực đang mở"><span>WORKSPACE</span><Icon name="arrow" size={14}/><strong>{DESKTOP_TAB_META[activeTab]?.label || 'Repositories'}</strong></div>
      <button type="button" className="brand brand-restart" onClick={restartWorkspace} aria-label="Khởi động lại Zipverra về màn hình ban đầu" title="Khởi động lại ứng dụng và bỏ lựa chọn hiện tại"><div className="brand-symbol"><Icon name="branch" size={25}/></div><div><strong>Zip<span>verra</span><em> Pro</em></strong><small>GIT WORKSPACE</small></div></button>
      <div className="header-actions"><span className="desktop-header-help">
        
        <ContextualHelp tab={activeTab}/>
      </span>{auth.authenticated && online && pwa.reachable ? <span className="header-connected-mark" role="status" aria-label="GitHub đã kết nối" title={auth.user?.login ? `GitHub: @${auth.user.login} đã kết nối` : 'GitHub đã kết nối'}><Icon name="check" size={17}/></span> : <StatusIndicator online={online && pwa.reachable} authenticated={auth.authenticated} loading={auth.loading}/>}<span className="version">v3.9.11</span></div>
    </header>
    <UXViewIntro activeTab={activeTab} key={activeTab} online={online && pwa.reachable} pending={Boolean(pendingCommit || pendingPR)} />
    <PwaStatusBanner online={online} reachable={pwa.reachable} updateAvailable={pwa.updateAvailable} canApplyUpdate={pwa.canApplyUpdate} applyUpdate={pwa.applyUpdate} checking={pwa.checking} checkForUpdates={pwa.checkForUpdates}/>
    {activeTab !== 'activity' && (error || busy) && <button type="button" className={`mobile-global-status ${error ? 'has-error' : ''}`} onClick={() => goToTab('activity')}><span>{error ? `Cần kiểm tra: ${error}` : `${status || 'Đang xử lý...'} · ${progress}%`}</span><Icon name="arrow" size={17}/></button>}
    <main id="zipverra-main" tabIndex={-1} aria-labelledby="zipverra-current-view" data-active-view={activeTab} data-review-ready={Boolean(preview && activeTab === 'home') ? 'true' : 'false'} >
      {/* Desktop session summary keeps the destination visible without repeated long cards. */}
      <section className="desktop-session-bar" data-has-repo={chosenRepo ? 'true' : 'false'} aria-label="Thanh ngữ cảnh phiên làm việc">
        <div className="desktop-session-location">
          <span className="desktop-session-eyebrow">REPOSITORY / BRANCH</span>
          <div className="desktop-session-target">
            <button type="button" className="desktop-target-repo" disabled={busy || Boolean(pendingCommit || pendingPR)} onClick={() => setRepoSheetOpen(true)} title="Chọn hoặc đổi repository" aria-label={chosenRepo ? `Đổi repository ${owner}/${repo}` : 'Chọn repository'}>
              <Icon name="branch" size={15}/><strong>{chosenRepo ? `${owner}/${repo}` : 'Chọn repository'}</strong><span aria-hidden="true">⌄</span>
            </button>
            {chosenRepo && <button type="button" className="desktop-target-branch" disabled={busy || Boolean(pendingCommit || pendingPR)} onClick={() => setBranchSheetOpen(true)} title={`Đổi branch ${branch}`} aria-label={`Đổi branch ${branch}`}><span>{branch}</span><span aria-hidden="true">⌄</span></button>}
          </div>
        </div>
        <div className="desktop-session-actions">
          {activeTab === 'home' ? <>
            <button type="button" className={`desktop-session-step${chosenRepo ? ' is-complete' : ' is-current'}`} onClick={() => setRepoSheetOpen(true)}><span>01</span><b>Repo</b></button>
            <button type="button" className={`desktop-session-step${file ? ' is-complete' : chosenRepo ? ' is-current' : ''}`} disabled={!chosenRepo || busy || Boolean(pendingCommit || pendingPR)} onClick={() => fileInput.current?.click()}><span>02</span><b>ZIP</b></button>
            <button type="button" className={`desktop-session-step${preview ? ' is-current' : ''}`} disabled={!preview || busy} onClick={goToReview}><span>03</span><b>Review</b></button>
          </> : null}
        </div>
      </section>
      {activeTab === 'home' && <WorkflowStrip currentStep={flowStep} onRepo={() => setRepoSheetOpen(true)} onUpload={() => goToTab('home')} onReview={goToReview} onActivity={() => goToTab('activity')}/> }
      {activeTab === 'home' && <CurrentRepository owner={owner} repo={repo} branch={branch} busy={busy || Boolean(pendingCommit || pendingPR)} onChoose={() => setRepoSheetOpen(true)} onBranch={() => setBranchSheetOpen(true)}/> }
      {(pendingCommit || pendingPR) && activeTab !== 'activity' && <button type="button" className="mobile-recovery-shortcut" onClick={() => goToTab('activity')}>Có thao tác GitHub cần xác minh · Mở Activity <Icon name="arrow" size={15}/></button>}
      <section className="content-grid" data-active-view={activeTab}>
        <div className="form-column">
          <article className={`panel upload-panel${preview ? ' zip392-reviewed' : ''}`} data-mobile-view="home">
            <StepTitle n="02" title="Upload ZIP" desc=""/>
            {!auth.loading && !auth.authenticated && <a className="button primary full zip392-login" href="/api/auth/login"><Icon name="github" size={17}/> Kết nối GitHub để chọn repository</a>}
            <div className="zip392-target-switch" role="group" aria-label="Đích cập nhật source">
              <button type="button" className="zip392-target-repo" disabled={!auth.authenticated || busy || Boolean(pendingCommit || pendingPR)} onClick={() => setRepoSheetOpen(true)} title="Chọn hoặc đổi repository">
                <Icon name="branch" size={16}/><span><small>REPOSITORY</small><strong>{chosenRepo ? `${owner}/${repo}` : 'Chọn repository'}</strong></span><span aria-hidden="true">⌄</span>
              </button>
              <button type="button" className="zip392-target-branch" disabled={!chosenRepo || busy || Boolean(pendingCommit || pendingPR)} onClick={() => setBranchSheetOpen(true)} title="Chọn branch">
                <span><small>BRANCH</small><strong>{chosenRepo ? branch : '—'}</strong></span><span aria-hidden="true">⌄</span>
              </button>
            </div>
            {chosenRepo && !preview && <SourceZipDownload owner={owner} repo={repo} selected={chosenRepo} online={online && pwa.reachable} busy={busy || Boolean(pendingCommit || pendingPR)} compact/>}
            {auth.authenticated && !loadingRepos && !preview && <QuickActions
              repos={repos} favorites={favorites} recents={recents} usage={repositoryUsage}
              selectedRepo={chosenRepo ? `${owner}/${repo}` : ''} branch={branch} mode={mode} strategy={releaseStrategy}
              profiles={proProfiles} disabled={busy || Boolean(pendingCommit || pendingPR)}
              onChoose={chooseRepo} onOpenPicker={() => setRepoSheetOpen(true)}
              onToggleFavorite={toggleFavorite} onSaveProfile={saveProfile} onApplyProfile={applyProfile}/>}
            {preview && <div className="zip392-source-compact" role="status">
              <div className="zip392-source-copy"><Icon name="file" size={16}/><span title={file?.name || ''}><strong>{file?.name}</strong><small>{prettyBytes(file?.size || 0)} · {selectedChanges.length} thay đổi</small></span></div>
              <button type="button" className="zip392-replace-zip" disabled={busy || Boolean(pendingCommit || pendingPR)} onClick={() => fileInput.current?.click()} aria-label="Chọn ZIP khác">Thay ZIP</button>
            </div>}
            <input ref={fileInput} id="file" className="visually-hidden" type="file" accept=".zip,application/zip,application/x-zip-compressed" disabled={busy || !chosenRepo} onChange={(e) => chooseFile(e.target.files?.[0])}/>
            <label htmlFor={chosenRepo ? 'file' : undefined} className={`drop-zone ${file ? 'picked' : ''} ${!chosenRepo ? 'locked' : ''}`}><span className="file-symbol"><Icon name={file ? 'file' : 'upload'} size={25}/></span><strong>{file ? file.name : chosenRepo ? 'Chọn ZIP' : 'Chọn repository'}</strong>{file && <small>{prettyBytes(file.size)}</small>}</label>
            {file && <div className="file-detail"><Icon name="check" size={15}/> {busy && phase === PUSH_STAGES.ANALYZING ? 'Đang phân tích...' : preview ? 'Review sẵn sàng' : 'Đã chọn ZIP'} · <strong>{commitMessage}</strong></div>}
            {archiveMode === 'extended' && <p className="archive-capacity-note" role="status">Extended 200 MiB · Giữ app mở khi xử lý.</p>}
            <details className="workflow-options"><summary><Icon name="settings" size={16}/> Tùy chọn nâng cao <span>{mode === 'sync' ? 'Sync' : 'Merge'} · {releaseStrategy === 'pr' ? 'Pull Request' : 'Direct Push'}</span></summary><div className="workflow-options-body">
            <div className="limits"><span>{archiveMode === 'extended' ? 'Extended · 200 MiB ZIP / 400 MiB giải nén' : 'Standard · 120 MiB ZIP / 240 MiB giải nén'}</span><span>2.500 file · 2,5 MB/file</span></div>
            <div className="field"><label htmlFor="mode">Chế độ cập nhật</label><select id="mode" value={mode} disabled={busy} onChange={(e) => change(setMode, e.target.value)}><option value="merge">Merge · Giữ file cũ</option><option value="sync">Sync · Đồng bộ & xóa file thừa</option></select>{mode === 'sync' && <small className="hint" role="status">Sync có thể xóa file trên GitHub.</small>}</div>
            <div className="release-strategy" role="group" aria-label="Chiến lược cập nhật GitHub">
              <strong>Cách cập nhật source</strong>
              <div className="release-choices">
                <label className={`release-choice ${releaseStrategy==='direct' ? 'active':''}`}><input type="radio" name="releaseStrategy" value="direct" disabled={busy} checked={releaseStrategy==='direct'} onChange={()=>change(setReleaseStrategy,'direct')}/> Direct Push</label>
                <label className={`release-choice ${releaseStrategy==='pr' ? 'active':''}`}><input type="radio" name="releaseStrategy" value="pr" disabled={busy} checked={releaseStrategy==='pr'} onChange={()=>change(setReleaseStrategy,'pr')}/> Pull Request</label>
              </div>
              <p className="release-note">{releaseStrategy==='direct' ? `Đích: ${branch || 'main'}` : `Tạo branch mới từ ${branch || 'main'} · Mở PR`}</p>
              {releaseStrategy==='pr' && <p className="release-note">Cần quyền Pull requests: Read & write.</p>}
            </div>
            <div className="field"><label htmlFor="message">Commit message</label><div className="input-icon"><Icon name="file" size={17}/><input id="message" readOnly value={file ? commitMessage : ''} placeholder="Chọn ZIP để tạo commit message"/></div></div>
            </div></details>
            {preview ? <button className="button primary full workflow-next" disabled={busy} onClick={goToReview}><Icon name="check" size={18}/> Xem Review · {selectedChanges.length} thay đổi <Icon name="arrow" size={18}/></button>
              : file && !busy && <button className="button secondary full" disabled={!auth.authenticated || !chosenRepo || Boolean(pendingCommit) || Boolean(pendingPR)} onClick={analyze}>Phân tích lại ZIP <Icon name="arrow" size={18}/></button>}
          </article>
        </div>

        <div className="side-column">
          <article ref={previewRef} className="panel preview-panel" data-mobile-view="home">
            <StepTitle n="03" title="Review & Push" desc="" centerOnMobile/>
            {!preview ? busy && (phase === PUSH_STAGES.ANALYZING || phase === PUSH_STAGES.PREFLIGHT) ? <LoadingSkeleton kind="panel" label="Đang phân tích ZIP và kiểm tra GitHub…"/> : <StatusEmpty icon="scan" title="Chưa có ZIP" description="Chọn ZIP để bắt đầu Review."/> : <>
              <ReviewSummary selected={selectedChanges.length} total={preview.changes.length} bytes={prettyBytes(selectedBytes)} strategy={releaseStrategy} target={preview.input.branch}/>
              <div className="stat-grid"><div><strong className="good">+{stats.add}</strong><span>Thêm</span></div><div><strong className="warn">~{stats.modify}</strong><span>Sửa</span></div><div><strong className="bad">−{stats.delete}</strong><span>Xóa</span></div></div>
              <button type="button" className={`zip396-review-risk-banner zip396-review-risk-banner--${riskSummary.hasCritical ? 'critical' : riskSummary.pendingCount ? 'pending' : riskSummary.items.length ? 'advisory' : 'clear'}`} onClick={focusRiskCenter} aria-label={riskSummary.pendingCount ? `Xem ${riskSummary.pendingCount} cảnh báo cần xác nhận trước khi Push` : 'Xem kết quả kiểm tra rủi ro'}>
                <span className="zip396-review-risk-banner-icon" aria-hidden="true"><Icon name={riskSummary.items.length ? 'shield' : 'check'} size={21}/></span>
                <span className="zip396-review-risk-banner-text"><strong>{riskSummary.pendingCount ? `${riskSummary.pendingCount} cảnh báo cần xác nhận` : riskSummary.items.length ? `${riskSummary.items.length} cảnh báo cần xem` : 'Kiểm tra an toàn'}</strong><small>{riskSummary.hasCritical ? 'Nghiêm trọng · Kiểm tra ngay' : riskSummary.pendingCount ? 'Mở cảnh báo' : riskSummary.items.length ? 'Xem chi tiết' : 'Đã quét source'}</small></span>
                <span className="zip396-review-risk-banner-arrow" aria-hidden="true"><Icon name="arrow" size={17}/></span>
              </button>
              <ReviewRiskCenter summary={riskSummary} busy={busy} owner={preview.input.owner} repo={preview.input.repo} branch={preview.input.branch}
                onSecurityDecision={() => setSecurityDialogOpen(true)}
                onMismatchConsent={(value) => { setProjectMismatchConfirmed(value); setConfirmed(false); }}
                onSyncConsent={(value) => { setSyncConfirmed(value); setConfirmed(false); }}
                onShowDetails={showReviewDiagnostics}/>
              <span id="push-readiness-help" className="visually-hidden">Trạng thái trước khi Push: {riskSummary.pendingCount ? `Còn ${riskSummary.pendingCount} xác nhận tại Đánh giá rủi ro` : pushReadiness.title}. {pushReadiness.detail}</span>
              <section className="premium-review-confirm" aria-label="Xác nhận và Push"><div className="premium-decision-heading"><strong>{releaseStrategy === 'pr' ? 'Xác nhận tạo Pull Request' : 'Sẵn sàng Commit & Push'}</strong><small>{selectedChanges.length} thay đổi · {preview.input.owner}/{preview.input.repo} · {preview.input.branch}</small></div>
                {!['SECURITY', 'SYNC', 'CONFIRM', 'READY'].includes(pushReadiness.code) && <ReviewReadiness state={pushReadiness} selectedCount={selectedChanges.length} totalCount={preview.changes.length} strategy={releaseStrategy}/>}
                {riskSummary.pendingCount > 0 && <p className="review-risk-next-step" role="status">Còn {riskSummary.pendingCount} cảnh báo chưa xác nhận.</p>}
              </section>
              
              <details className="premium-review-files" open={fileDetailsOpen} onToggle={(event) => setFileDetailsOpen(event.currentTarget.open)}>
                <summary className="premium-review-files-trigger"><span><strong>File thay đổi</strong><small>{selectedChanges.length}/{preview.changes.length} được chọn</small></span><span aria-hidden="true" className="premium-files-chevron">⌄</span></summary>
              {fileDetailsOpen && <>
              <div className="review-select-summary"><div><strong>{selectedChanges.length}/{preview.changes.length} file đã chọn</strong><small>File bỏ chọn được giữ nguyên.</small></div><span>{prettyBytes(selectedBytes)}</span></div>
              <div className="archive-meta">{preview.archive.files.length} file · {prettyBytes(preview.archive.unpackedSize)} đã giải nén{preview.archive.wrapper ? ` · Bỏ thư mục gốc: ${preview.archive.wrapper}/` : ''}{preview.archive.ignored ? ` · Bỏ qua ${preview.archive.ignored} file` : ''}</div>
              <div className="diff-filters" role="group" aria-label="Lọc file thay đổi">{[{id:'all',label:'Tất cả',n:preview.changes.length},{id:'add',label:'Thêm',n:totalStats.add},{id:'modify',label:'Sửa',n:totalStats.modify},{id:'delete',label:'Xóa',n:totalStats.delete}].map((option) => <button type="button" key={option.id} className={`diff-filter ${changeFilter === option.id ? 'selected' : ''}`} aria-pressed={changeFilter === option.id} onClick={() => setChangeFilter(option.id)}>{option.label} <span>{option.n}</span></button>)}</div>
              <div className="review-toolbar"><div className="input-icon"><Icon name="search" size={16}/><input type="search" aria-label="Tìm file thay đổi" placeholder="Tìm tên file" value={reviewSearch} onChange={e => setReviewSearch(e.target.value)}/></div><div className="review-bulk"><button type="button" disabled={busy} onClick={() => bulkSelection(true)}>Chọn tất cả</button><button type="button" disabled={busy} onClick={() => bulkSelection(false)}>Bỏ chọn tất cả</button></div></div>
              <VirtualReviewList changes={shownChanges} allCount={preview.changes.length} excludedPaths={excludedPaths} busy={busy} onToggle={updateSelection} onDiff={inspectChange} filterKey={`${changeFilter}:${reviewSearch}:${preview.remote.head}`} />
              <div className="review-return-bottom"><button type="button" className="button secondary full" onClick={goToDecision}><Icon name="check" size={16}/> Xác nhận & Push</button></div>

              </>}
              </details>
              <details ref={diagnosticsRef} className="premium-review-diagnostics" defaultOpen={false} key={`${preview.remote.head}-diagnostics`}>
                <summary><span>Phân tích source</span><span className="premium-files-chevron" aria-hidden="true">⌄</span></summary>
              <details className="smart-insights workflow-insights" defaultOpen={preview.insights.warnings.some(w => w.code !== 'SECRET_FILE' && w.severity !== 'info')}><summary className="insight-header"><span className="insight-mark">✦</span><div><strong>Smart ZIP Analyzer</strong><small>{preview.insights.framework.type} · {preview.insights.binaryCount} file nhị phân</small></div></summary>{preview.insights.warnings.filter(w=>w.code!=='SECRET_FILE').length ? <div className="insight-warnings">{preview.insights.warnings.filter(w=>w.code!=='SECRET_FILE').map(w => <div className={`insight-notice insight-${w.severity}`} key={w.code}><strong>{w.title}</strong><span>{w.description}</span></div>)}</div> : <p className="insight-clean">Không có cảnh báo cấu trúc.</p>}</details>
              <div className={`security-review ${securityReport?.blocked && !sensitiveConsent?'security-review--blocked':''}`} role="status" aria-label="Security review">
                <div className="security-review-title"><Icon name="shield" size={20}/><div><strong>Security Scan</strong><small>{securityReport?.scanned||0} file đã quét</small></div></div>
                <div className="security-review-stats"><span className="risk-critical">Critical: {securityReport?.critical||0}</span><span className="risk-warning">Warning: {securityReport?.warning||0}</span><span className="risk-info">Info: {securityReport?.info||0}</span></div>
                {securityReport?.findings?.length ? <div className="security-findings">{securityReport.findings.slice(0,20).map((finding,i)=><div key={`${finding.path}-${finding.code}-${i}`} className={`security-finding risk-${finding.severity}`}><strong>{finding.title} <small>· {finding.severity.toUpperCase()}</small></strong><span className="security-finding-path">{finding.path}{finding.line>0?`:${finding.line}`:''}</span><small>{finding.action}</small></div>)}{securityReport.findings.length>20&&<small>Hiển thị 20/{securityReport.findings.length} cảnh báo. Kiểm tra source để xử lý toàn bộ.</small>}</div> : <p className="insight-clean">Không phát hiện credential theo quy tắc quét.</p>}

              </div>
              </details>
            </>}
          </article>
          {preview && activeTab === 'home' && <section ref={decisionRef} tabIndex={-1} className="zip392-action-dock zip396-action-dock" data-mobile-view="home" aria-label="Xác nhận và Push · Thanh thao tác">
            <div className="zip396-dock-header">
              <div className="zip392-dock-context"><strong>{releaseStrategy === 'pr' ? 'Create Pull Request' : 'Commit & Push'}</strong><span title={`${preview.input.owner}/${preview.input.repo}@${preview.input.branch}`}>{preview.input.owner}/{preview.input.repo} · {preview.input.branch} · {selectedChanges.length} file</span></div>
              <span className={`zip396-dock-state zip396-dock-state--${riskSummary.pendingCount > 0 ? 'warning' : confirmed ? 'ready' : 'info'}`}>{riskSummary.pendingCount > 0 ? `${riskSummary.pendingCount} chưa xác nhận` : confirmed ? 'Đã xác nhận' : 'Chưa xác nhận'}</span>
            </div>
            <div className="zip396-mobile-only">
              {riskSummary.pendingCount > 0 ? <button type="button" className="zip396-mobile-cta zip396-mobile-cta--warning" onClick={focusRiskCenter}>Xử lý {riskSummary.pendingCount} cảnh báo <Icon name="arrow" size={15}/></button>
                : <button type="button" className="button secondary full zip396-mobile-cta" disabled={busy || !selectedChanges.length} onClick={openDecisionSheet}><Icon name="check" size={17}/> {confirmed ? 'Kiểm tra & Push' : 'Xác nhận & Push'}</button>}
              <p className="zip396-mobile-note">Cảnh báo phải được xử lý trước khi Push.</p>
            </div>
            <div className="zip396-desktop-only">
              {riskSummary.pendingCount > 0 && <button type="button" className="zip392-dock-risk" onClick={focusRiskCenter}>{riskSummary.pendingCount} cảnh báo chưa xác nhận · Xem ngay <Icon name="arrow" size={14}/></button>}
              <label className="confirm-row zip392-dock-consent"><input type="checkbox" checked={confirmed} disabled={busy || !selectedChanges.length || (requiresConsent && !sensitiveConsent) || (preview.identity?.severity === 'critical' && !projectMismatchConfirmed) || riskSummary.pendingCount > 0} onChange={(e) => setConfirmed(e.target.checked)}/><span>Tôi đã kiểm tra và đồng ý {releaseStrategy === 'pr' ? 'tạo PR' : 'Push'} lên <b>{preview.input.branch}</b>.</span></label>
              <button type="button" className="button primary full zip392-dock-push" disabled={!canSubmitPush} aria-describedby="push-readiness-help" onClick={push}><Icon name="upload" size={17}/> {busy ? 'Đang xử lý...' : releaseStrategy === 'pr' ? `Push & Create PR (${selectedChanges.length})` : `Commit & Push (${selectedChanges.length})`}</button>
            </div>
          </section>}
          {preview && activeTab === 'home' && <ModalSheet open={riskSheetOpen} onClose={() => setRiskSheetOpen(false)} title="Đánh giá rủi ro" variant="sheet">
            <div className="zip396-risk-sheet">
              <div className="zip397-risk-destination">
                <span>Đích cập nhật</span>
                <strong>{preview.input.owner}/{preview.input.repo} · {preview.input.branch}</strong>
              </div>
              <ReviewRiskCenter summary={riskSummary} busy={busy} owner={preview.input.owner} repo={preview.input.repo} branch={preview.input.branch}
                onSecurityDecision={() => { setRiskSheetOpen(false); setSecurityDialogOpen(true); }}
                onMismatchConsent={(value) => { setProjectMismatchConfirmed(value); setConfirmed(false); }}
                onSyncConsent={(value) => { setSyncConfirmed(value); setConfirmed(false); }}
                onShowDetails={() => { setRiskSheetOpen(false); showReviewDiagnostics(); }}/>
              {riskSummary.pendingCount === 0 && <button type="button" className="button secondary full zip396-risk-sheet-done" onClick={() => setRiskSheetOpen(false)}>{riskSummary.items.length ? 'Trở lại Review' : 'Đóng'}</button>}
            </div>
          </ModalSheet>}
          {preview && activeTab === 'home' && <ModalSheet open={decisionSheetOpen} onClose={() => setDecisionSheetOpen(false)} title={releaseStrategy === 'pr' ? 'Xác nhận tạo Pull Request' : 'Xác nhận Commit & Push'} variant="sheet">
            <div className="zip396-sheet">
              <div className="zip396-sheet-summary">
                <strong>{selectedChanges.length}/{preview.changes.length} file đã chọn</strong>
                <small>{preview.input.owner}/{preview.input.repo} · {preview.input.branch} · {prettyBytes(selectedBytes)}</small>
              </div>
              <div className="zip396-sheet-metrics" aria-hidden="true">
                <span className="zip396-metric zip396-metric--good">+{stats.add} thêm</span>
                <span className="zip396-metric zip396-metric--warn">~{stats.modify} sửa</span>
                <span className="zip396-metric zip396-metric--bad">−{stats.delete} xóa</span>
              </div>
              {(riskSummary.pendingCount > 0 || !['CONFIRM','READY'].includes(pushReadiness.code)) ? <div className="zip396-sheet-alert" role="status">
                <strong>{riskSummary.pendingCount > 0 ? `${riskSummary.pendingCount} cảnh báo chưa xác nhận` : pushReadiness.title}</strong>
                <p>{riskSummary.pendingCount > 0 ? 'Kiểm tra và xác nhận rủi ro trước khi Push.' : pushReadiness.detail}</p>
                <button type="button" className="button secondary full" onClick={focusRiskCenter}><Icon name="arrow" size={16}/> Xem cảnh báo</button>
              </div> : <>
                <div className="zip397-final-status" role="status"><Icon name="shield" size={17}/> {confirmed ? 'Đã xác nhận Review' : 'Xác nhận để tiếp tục'}</div>
                <label className="confirm-row zip396-sheet-consent"><input type="checkbox" checked={confirmed} disabled={busy || !selectedChanges.length || (requiresConsent && !sensitiveConsent) || (preview.identity?.severity === 'critical' && !projectMismatchConfirmed)} onChange={(e) => setConfirmed(e.target.checked)}/><span>Tôi đã kiểm tra và đồng ý {releaseStrategy === 'pr' ? 'tạo PR' : 'Push'} lên <b>{preview.input.branch}</b>.</span></label>
                <button type="button" className="button primary full zip396-sheet-push" disabled={!canSubmitPush} aria-describedby="push-readiness-help" onClick={() => push()}><Icon name="upload" size={17}/> {busy ? 'Đang xử lý...' : releaseStrategy === 'pr' ? `Push & Create PR (${selectedChanges.length})` : `Commit & Push (${selectedChanges.length})`}</button>
              </>}
            </div>
          </ModalSheet>}
          <article ref={activityRef} className="panel activity-panel" data-mobile-view="activity"><div id="activity-live-flow" className="activity-title"><div><span className="pro-overline">LIVE OPERATIONS</span><h2>Live Activity</h2></div><span className={`activity-dot ${busy ? 'pulse' : ''}`} aria-label={busy ? 'Đang thực hiện thao tác' : 'Không có thao tác đang chạy'}/></div>
            {phase === PUSH_STAGES.IDLE && !busy && !result && !pendingCommit && !pendingPR && <ActivityEmpty canUpload={chosenRepo} onUpload={() => goToTab('home')}/>}
            <LiveActivityFocus presentation={activityFocus}/>
            {(phase !== PUSH_STAGES.IDLE || busy || result || pendingCommit || pendingPR) && <div className={`push-timeline ${hasPrFlow ? 'with-pr' : ''}`}  aria-label="Tiến trình push và tạo PR">{timeline.map((step, index) => <div key={step.id} className={`timeline-step timeline-${step.state}`}><span className="timeline-icon">{step.state === 'complete' ? <Icon name="check" size={14}/> : index + 1}</span><div><strong>{({validate:'Validate',upload:'Upload',commit:'Commit',verify:'Verify',pr:'Open PR'})[step.id]}</strong><small>{({complete:'Hoàn tất',active:'Đang xử lý',uncertain:'Chưa xác minh',failed:'Cần kiểm tra',waiting:'Chờ xử lý'})[step.state]}</small></div></div>)}</div>}
            {phase === PUSH_STAGES.SUCCEEDED && !pendingCommit && !pendingPR && <div className="workflow-complete"><div><strong>Đã xác minh trên GitHub</strong><small>Bạn có thể bắt đầu bản ZIP tiếp theo mà không cần chọn lại repository.</small></div><button type="button" className="button primary" onClick={startNextVersion} disabled={busy}>Push bản tiếp theo <Icon name="arrow" size={16}/></button></div>}
            <div className="progress-track" role="progressbar" aria-label="Tiến độ xử lý" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div className="progress-fill" style={{ width: `${progress}%` }}/></div><p className="status-text" role="status">{status || 'Sẵn sàng nhận file ZIP.'}</p>
            {transfer && <div className="transfer-card"><div className="transfer-card-head"><strong>Upload Git blobs</strong><span>{transfer.completed}/{transfer.total} file</span></div><div className="transfer-stats"><span>{prettyBytes(transfer.completedBytes)} / {prettyBytes(transfer.totalBytes)}</span><span>{transfer.speedBytesPerSec > 0 ? `${prettyBytes(transfer.speedBytesPerSec)}/s` : 'Đang chuẩn bị…'}</span><span>{transfer.etaSeconds !== null && transfer.etaSeconds < 3600 ? `ETA ~${transfer.etaSeconds}s` : 'ETA chưa xác định'}</span></div><small>Batch {transfer.batch}/{transfer.totalBatches} · Đã dùng lại {transfer.reused} blob · Ước tính có thể dao động theo mạng</small></div>}
            <div className="push-status-line"><span className={`network-chip ${online && pwa.reachable ? 'online' : 'offline'}`}>{online && pwa.reachable ? '● Online' : '● Offline'}</span><span className="stage-chip">{phase.replaceAll('_', ' ')}</span></div>
            {pendingCommit && visibleRecoveryPush && <details className="pwa-recovery-advanced"><summary>Chi tiết Push chưa xác minh</summary><div className="recovery-banner" role="status"><strong>Cần xác minh lần push trước</strong><p>{pendingCommit.owner}/{pendingCommit.repo} · {pendingCommit.branch} · {pendingCommit.message}</p><button type="button" className="button secondary full" disabled={busy || !online || !auth.authenticated} onClick={() => verifyPending()}><Icon name="refresh" size={16}/> {busy && phase === PUSH_STAGES.VERIFYING ? 'Đang xác minh...' : 'Xác minh push trên GitHub'}</button><small>Chỉ kiểm tra trạng thái, không tạo commit mới.</small></div></details>}
            {pendingPR && visibleRecoveryPR && <details className="pwa-recovery-advanced"><summary>Chi tiết Pull Request chưa xác minh</summary><div className="branch-pending" role="status"><strong>Branch đã push · PR chưa xác nhận</strong><p>{pendingPR.owner}/{pendingPR.repo} · {pendingPR.sourceBranch} → {pendingPR.baseBranch}<br/>Commit {pendingPR.expectedSourceHead.slice(0,12)}</p><button type="button" className="button secondary" onClick={retryPendingPR} disabled={busy || !online || !auth.authenticated}>Kiểm tra / Tạo PR</button><small>Không upload ZIP hoặc tạo commit mới. Server kiểm tra PR đã tồn tại trước khi tạo.</small></div></details>}
            {error && <div className="error-banner" role="alert">{error}{errorHint && <p className="error-hint">{errorHint}</p>}</div>}
            {result && <PushOutcome result={result} onCopy={copyCommitSha}/>}
            <RecoveryCenter push={pendingCommit} pr={pendingPR} online={online && pwa.reachable} busy={busy} authenticated={auth.authenticated} authorizedRepos={repos} onVerifyPush={() => verifyPending()} onCheckPR={retryPendingPR} onOpenHistory={() => goToTab('history')}/>
          </article>
          {activeTab === 'history' && <HistoryPanel authenticated={auth.authenticated} owner={owner} repo={repo} branch={branch} online={online} busy={busy} setBusy={setBusy} pendingPush={pendingCommit} api={api} requestOnce={requestOnce} onRollback={(outcome)=>logLocalAction({kind:'rollback',state:'success',repo:`${owner}/${repo}`,sha:outcome.sha,message:'Rollback verified'})}/>}
          {activeTab === 'history' && chosenRepo && <details className="zip399-history-tools" data-mobile-view="history" onToggle={event => setPrToolsOpen(event.currentTarget.open)}><summary>Branches & Pull Requests</summary>{prToolsOpen && <BranchPrPanel key={`${owner}/${repo}`} owner={owner} repo={repo} branch={branch} online={online} busy={busy} api={api} onSelectBranch={chooseBranch} onMerge={(outcome,number)=>logLocalAction({kind:'merge',state:'success',repo:`${owner}/${repo}`,sha:outcome?.sha,message:`Merged PR #${number}`})}/>}</details>}
          {activeTab === 'activity' && <article className="panel pro-journal-panel" data-mobile-view="activity"><ActivityJournal items={proActivity} onClear={clearLocalActions}/></article>}
          {activeTab === 'settings' && <article className="panel settings-panel" data-mobile-view="settings">
            <div className="settings-heading"><Icon name="settings" size={21}/><div><h2>Settings</h2></div></div>
            <div className="field"><label>Giao diện</label><div className="theme-options" role="group" aria-label="Chế độ hiển thị"><button type="button" className={theme === 'dark' ? 'selected' : ''} aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}><Icon name="moon" size={18}/> Dark</button><button type="button" className={theme === 'light' ? 'selected' : ''} aria-pressed={theme === 'light'} onClick={() => setTheme('light')}><Icon name="sun" size={18}/> Light</button><button type="button" className={theme === 'system' ? 'selected' : ''} aria-pressed={theme === 'system'} onClick={() => setTheme('system')}><Icon name="settings" size={18}/> System</button></div></div>
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
            <details className="zip399-advanced-tools"><summary>Công cụ GitHub</summary>
              <div className="zip399-tools-body">
                <details className="repo-advanced"><summary>Nhập repository thủ công</summary><div className="two-col"><div className="field"><label htmlFor="owner">Owner</label><input id="owner" value={owner} disabled={busy || !auth.authenticated} placeholder="owner" onChange={(e) => change(setOwner, e.target.value)}/></div><div className="field"><label htmlFor="repo">Repository</label><input id="repo" value={repo} disabled={busy || !auth.authenticated} placeholder="repo" onChange={(e) => change(setRepo, e.target.value)}/></div></div></details>
                <details className="pro-dash-details" onToggle={event => setDashboardOpen(event.currentTarget.open)}><summary>Thống kê repositories</summary>
                  {dashboardOpen && <ProDashboard authenticated={auth.authenticated} online={online} loading={dashboardLoading}
                    snapshot={proDashboard} repos={repos} profiles={proProfiles} recents={recents} favorites={favorites}
                    selectedRepo={chosenRepo} onRefresh={refreshDashboard} onChoose={chooseRepo} onGoUpload={() => goToTab('home')}/>}
                  {dashboardError && <p className="pro-error" role="alert">{dashboardError}</p>}
                </details>
                <button type="button" className="button secondary full" disabled={!chosenRepo || busy} onClick={() => setWorkspaceOpen(value => !value)}>{workspaceOpen ? 'Đóng Quick Edit' : 'Mở Quick Edit'}</button>
                {workspaceOpen && <WorkspacePanel hostView="settings" key={`${owner}/${repo}@${branch}`} authenticated={auth.authenticated} owner={owner} repo={repo} branch={branch} online={online} busy={busy} onBack={() => {workspaceDirtyRef.current=false;setWorkspaceOpen(false);}} onDirtyChange={onWorkspaceDirtyChange} api={api} onCommit={(outcome)=>{reset();logLocalAction({kind:'quick-edit',state:'success',repo:`${owner}/${repo}`,sha:outcome?.sha,message:'Quick Edit saved'});}}/>}
              </div>
            </details>
            <div className="settings-info"><span>Phiên bản</span><strong>v3.9.11</strong></div>
            <div className="settings-info"><span>PWA</span><strong>{pwa.updateAvailable ? 'Có bản cập nhật' : pwa.reachable ? 'Đã kết nối' : 'Offline / Không phản hồi'}</strong></div>
            <button type="button" className="button secondary full" disabled={!online || pwa.checking} onClick={pwa.checkForUpdates}>{pwa.checking ? 'Đang kiểm tra bản mới...' : 'Kiểm tra cập nhật PWA'}</button>
            <div className="settings-info"><span>Chế độ GitHub</span><strong>GitHub App · User Token</strong></div>
            <div className="settings-info"><span>Commit message</span><strong>Tên file ZIP</strong></div>

          </article>}

        </div>
      </section>
    </main>
    <footer><span>Zipverra · v3.9.11</span><span>GitHub App · <span className="accent">Vercel Ready</span></span></footer>
  </div>
  <ModalSheet open={Boolean(preview && diffViewer && activeTab === 'home')} title={`Diff · ${diffViewer?.path || ''}`}
    onClose={() => { diffRequestRef.current += 1; setDiffViewer(null); }} variant="diff">
    <div className="zip394-diff-viewer" aria-live="polite">
      
      {diffViewer?.loading ? <p role="status" className="zip394-diff-status">Đang tải file từ commit đang review…</p>
        : diffViewer?.message ? <p role="status" className="zip394-diff-status">{diffViewer.message}</p>
        : <div className="zip394-diff-lines inline-diff-lines" role="region" aria-label="Nội dung Diff">
          {diffViewer?.lines?.map((line,index)=><div key={index} className={`diff-line diff-${line.kind}`}>
            <span aria-hidden="true">{line.kind==='add'?'+':line.kind==='delete'?'−':' '}</span>
            <code>{line.text || ' '}</code>
          </div>)}
        </div>}
    </div>
  </ModalSheet>
  <ModalSheet open={Boolean(preview && securityDialogOpen && requiresConsent)} onClose={() => setSecurityDialogOpen(false)} title="Cảnh báo thông tin nhạy cảm" variant="sheet">
    <div className="sensitive-consent-modal" role="alert">
      <div className="sensitive-consent-alert"><Icon name="shield" size={26}/><div><strong>Security Scan phát hiện rủi ro · Không tự động Push</strong><p>Phát hiện {securityReport?.critical || 0} Critical / {sensitiveFindings.length} cảnh báo nhạy cảm trong {new Set(sensitiveFindings.map(f => f.path)).size} file được chọn.</p></div></div>
      <p>Nếu repository công khai, token hoặc mật khẩu thật có thể bị lộ ngay khi Push hoặc tạo Pull Request. Nên bỏ các file này khỏi ZIP và thu hồi/đổi khóa nếu đã lộ.</p>
      <div className="sensitive-consent-paths" aria-label="Danh sách file cảnh báo">{[...new Set(sensitiveFindings.map(f => f.path))].slice(0,5).map(p => <code key={p}>{p}</code>)}{new Set(sensitiveFindings.map(f => f.path)).size > 5 && <small>Và các file khác trong Security Scan.</small>}</div>
      <p><strong>Bạn có muốn tiếp tục với những file này không?</strong></p>
      <div className="sensitive-consent-actions"><button className="button secondary full" type="button" onClick={() => { setSensitiveConsent(false); setConfirmed(false); setSecurityDialogOpen(false); }}>Không, kiểm tra lại</button><button className="button primary full" type="button" onClick={() => { setSensitiveConsent(true); setConfirmed(false); setSecurityDialogOpen(false); }}>Có, tôi hiểu rủi ro · Tiếp tục</button></div>
      <small>Chọn Có cho phép tiếp tục với cảnh báo Security Scan của đúng danh sách file đang chọn. Bạn vẫn phải tick xác nhận Commit/PR. Không thể bỏ qua quyền GitHub, GitHub Push Protection, kiểm tra ZIP hoặc các lỗi kỹ thuật.</small>
    </div>
  </ModalSheet>
  <RepositoryPickerSheet open={repoSheetOpen} onClose={() => setRepoSheetOpen(false)}
    repos={repos} selected={chosenRepo ? `${owner}/${repo}` : ''} favorites={favorites} recents={recents} usage={repositoryUsage}
    disabled={busy || Boolean(pendingCommit || pendingPR)} onChoose={chooseRepo}/>
  <BranchPickerSheet open={branchSheetOpen} onClose={() => setBranchSheetOpen(false)}
    owner={owner} repo={repo} current={branch} online={online && pwa.reachable}
    disabled={busy || Boolean(pendingCommit || pendingPR)} api={api} onChoose={chooseBranch}/>
  <nav className="mobile-bottom-nav" aria-label="Điều hướng Zipverra">{[{id:'home',label:'Upload',icon:'upload'},{id:'activity',label:'Activity',icon:'activity'},{id:'history',label:'History',icon:'history'},{id:'settings',label:'Settings',icon:'settings'}].map((tab) => <button type="button" key={tab.id} className={`mobile-nav-item ${activeTab === tab.id ? 'active' : ''}`} aria-current={activeTab === tab.id ? 'page' : undefined} aria-label={`Mở ${tab.label}${tab.id === 'activity' && (pendingCommit || pendingPR) ? ' — có thao tác cần xác minh' : ''}`} onClick={() => goToTab(tab.id)}><span className="mobile-nav-icon"><Icon name={tab.icon} size={21}/></span><span>{tab.label}</span>{tab.id === 'activity' && (pendingCommit || pendingPR) && <i className="nav-alert" aria-label="Có push cần xác minh"/>}</button>)}</nav>
  </>;
}
