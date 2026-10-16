'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { APP_VERSION, isNewVersion, shouldCheckAgain, safeToActivateUpdate, validRollbackJournal, RECOVERY_ROLLBACK_KEY } from '../../lib/pwa-reliability.js';
import { FeedbackBanner } from './InteractionFeedback.jsx';

/** Version awareness without caching private data or silently reloading during a Git write. */
export function usePwaReliability({ busy = false, dirty = false, pending = false } = {}) {
  const [reachable, setReachable] = useState(true);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [checking, setChecking] = useState(false);
  const [resumeTick, setResumeTick] = useState(0);
  const [rollbackPending, setRollbackPending] = useState(false);
  const lastChecked = useRef(0);
  const registration = useRef(null);
  const waitingWorker = useRef(null);
  const lock = useRef(false);
  const safe = safeToActivateUpdate({ busy, dirty, pending: pending || rollbackPending });

  const check = useCallback(async (force = false) => {
    if (typeof navigator === 'undefined' || !navigator.onLine || (typeof document !== 'undefined' && document.hidden)) {
      setReachable(false); return;
    }
    if (lock.current || (!force && !shouldCheckAgain(lastChecked.current))) return;
    lock.current = true;
    lastChecked.current = Date.now();
    setChecking(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch('/api/version', { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw Error('Cannot reach version endpoint');
      const payload = await response.json();
      setReachable(true);
      if (isNewVersion(payload, APP_VERSION)) setUpdateAvailable(true);
      if (registration.current) {
        await registration.current.update().catch(() => {});
        if (registration.current.waiting) { waitingWorker.current = registration.current.waiting; setUpdateAvailable(true); }
      }
    } catch { setReachable(false); }
    finally { window.clearTimeout(timeout); lock.current = false; setChecking(false); }
  }, []);

  useEffect(() => {
    let enabled = true;
    if ('serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(reg => {
        if (!enabled) return;
        registration.current = reg;
        if (reg.waiting) { waitingWorker.current = reg.waiting; setUpdateAvailable(true); }
        reg.addEventListener('updatefound', () => {
          const worker = reg.installing;
          worker?.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              waitingWorker.current = reg.waiting || worker;
              setUpdateAvailable(true);
            }
          });
        });
      }).catch(() => { /* Safari private mode or SW disabled: regular network still works. */ });
    }
    const refreshRollback = () => {
      try { setRollbackPending(validRollbackJournal(JSON.parse(sessionStorage.getItem(RECOVERY_ROLLBACK_KEY) || 'null'))); }
      catch { setRollbackPending(false); }
    };
    refreshRollback();
    window.addEventListener('zipverra:recovery-changed', refreshRollback);
    void check(true);
    const sync = () => {
      if (!navigator.onLine) setReachable(false);
      else void check(true);
    };
    const resume = () => {
      if (document.visibilityState === 'visible') {
        setResumeTick(v => v + 1);
        void check();
      }
    };
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    window.addEventListener('pageshow', resume);
    document.addEventListener('visibilitychange', resume);
    return () => {
      enabled = false;
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
      window.removeEventListener('pageshow', resume);
      window.removeEventListener('zipverra:recovery-changed', refreshRollback);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [check]);

  const applyUpdate = useCallback(() => {
    if (!safe) return false;
    // Re-read the journal synchronously: an interrupted rollback must never be
    // hidden by a not-yet-processed React state update.
    try {
      if (validRollbackJournal(JSON.parse(sessionStorage.getItem(RECOVERY_ROLLBACK_KEY) || 'null'))) return false;
    } catch { /* Missing/corrupt optional journal: follow the normal guard. */ }
    const waiting = waitingWorker.current || registration.current?.waiting;
    if (waiting && navigator.serviceWorker?.controller) {
      navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
      waiting.postMessage({ type: 'ZIPVERRA_ACTIVATE_UPDATE' });
    } else window.location.reload();
    return true;
  }, [safe]);

  return { reachable, updateAvailable, checking, resumeTick, canApplyUpdate: safe, applyUpdate, checkForUpdates: () => check(true) };
}

/** A small, accessible banner that never reloads during an unresolved mutation or edit. */
export function PwaStatusBanner({ online, reachable, updateAvailable, canApplyUpdate, applyUpdate, checking, checkForUpdates }) {
  if (!online || !reachable) return <FeedbackBanner tone="warning" className="pwa-lifecycle-banner pwa-lifecycle-banner--offline" title="Đang offline hoặc máy chủ không phản hồi"
    actions={<button type="button" className="button secondary" disabled={!online || checking} onClick={checkForUpdates}>Thử lại</button>}>
    <p>Chỉ xem dữ liệu đã có. Không tự Push, Merge hoặc Rollback khi mạng bị gián đoạn.</p>
  </FeedbackBanner>;
  if (!updateAvailable) return null;
  return <FeedbackBanner tone="info" className="pwa-lifecycle-banner pwa-lifecycle-banner--update" title="Zipverra có phiên bản mới"
    actions={<button className="button secondary" type="button" onClick={applyUpdate} disabled={!canApplyUpdate}>Cập nhật</button>}>
    <p>{canApplyUpdate ? 'Cập nhật khi sẵn sàng. Trang sẽ tải lại sau khi xác nhận.' : 'Hoàn tất Push, bỏ bản Review chưa commit, hoặc lưu bản nháp trước khi cập nhật.'}</p>
  </FeedbackBanner>;
}
