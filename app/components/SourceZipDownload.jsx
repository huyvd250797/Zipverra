'use client';

import { useEffect, useRef, useState } from 'react';
import { canShareZip, isIosLike, readSourceZipResponse, SourceZipClientError,
  ZIP_MIME } from '../../lib/source-zip-client.js';

function shortSize(bytes) {
  return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MiB` : `${Math.max(1, Math.ceil(bytes / 1024))} KiB`;
}

/**
 * Two-step browser download. Unlike navigating to application/zip directly,
 * the app first prepares a bounded Blob while remaining on the current tab;
 * the next *user tap* invokes iOS Web Share Level 2 (Save to Files). Keeping
 * the share call in a click handler preserves transient user activation.
 */
export default function SourceZipDownload({ owner, repo, selected, online, busy, compact = false }) {
  const [download, setDownload] = useState({ state: 'idle' });
  const abortRef = useRef(null);
  const revocationRef = useRef(null);
  const identity = `${selected ? 'selected' : 'not-selected'}/${owner}/${repo}`;
  const available = Boolean(selected && online && !busy);
  const url = `/api/github/source-zip?owner=${encodeURIComponent(owner || '')}&repo=${encodeURIComponent(repo || '')}`;

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (revocationRef.current) URL.revokeObjectURL(revocationRef.current);
    };
  }, []);
  useEffect(() => {
    // A prepared ZIP must not be shared after changing GitHub repository.
    abortRef.current?.abort();
    if (revocationRef.current) {
      URL.revokeObjectURL(revocationRef.current);
      revocationRef.current = null;
    }
    setDownload({ state: 'idle' });
  }, [identity]);

  if (!selected || !owner || !repo) return null;

  async function prepareZip() {
    if (!available || download.state === 'preparing') return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setDownload({ state: 'preparing', received: 0, total: null });
    let lastUpdate = 0;
    try {
      const response = await fetch(url, {
        method: 'GET', credentials: 'same-origin', cache: 'no-store',
        headers: { Accept: 'application/zip' }, signal: controller.signal,
      });
      const result = await readSourceZipResponse(response, {
        signal: controller.signal,
        onProgress: ({ received, total }) => {
          const now = Date.now();
          if (now - lastUpdate >= 150 || (total !== null && received === total)) {
            lastUpdate = now;
            setDownload({ state: 'preparing', received, total });
          }
        },
      });
      if (!controller.signal.aborted) {
        const iosShare = isIosLike(navigator) && typeof File === 'function' &&
          canShareZip(navigator, new File([result.blob], result.filename, { type: ZIP_MIME }));
        setDownload({ state: 'ready', ...result, shareSupported: iosShare });
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      const message = error instanceof SourceZipClientError ? error.message :
        'Kết nối tải ZIP bị gián đoạn. Vui lòng thử lại.';
      setDownload({ state: 'error', message, code: error?.code || 'NETWORK_ERROR' });
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }

  function cancelPrepare() {
    abortRef.current?.abort();
    abortRef.current = null;
    setDownload({ state: 'idle' });
  }

  function downloadInBrowser() {
    if (download.state !== 'ready' || !download.blob) return;
    if (revocationRef.current) URL.revokeObjectURL(revocationRef.current);
    const objectUrl = URL.createObjectURL(download.blob);
    revocationRef.current = objectUrl;
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = download.filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setDownload(current => ({ ...current,
      message: 'Đã yêu cầu trình duyệt lưu ZIP. Nếu Safari mở xem trước, chọn Chia sẻ → Lưu vào Tệp.' }));
    // Do not revoke synchronously: Mobile Safari may need time to start saving.
    window.setTimeout(() => {
      if (revocationRef.current === objectUrl) {
        URL.revokeObjectURL(objectUrl);
        revocationRef.current = null;
      }
    }, 120000);
  }

  async function saveToFiles() {
    if (download.state !== 'ready' || !download.blob) return;
    const file = new File([download.blob], download.filename, { type: ZIP_MIME });
    if (!canShareZip(navigator, file)) {
      downloadInBrowser();
      return;
    }
    try {
      // This call must happen before the first await after the user's tap.
      const share = navigator.share({ files: [file], title: download.filename });
      setDownload(current => ({ ...current, message: 'Chọn “Lưu vào Tệp” trong bảng chia sẻ iPhone.' }));
      await share;
      // Sharing does not prove the file was saved, so never claim success.
    } catch (error) {
      if (error?.name !== 'AbortError') {
        setDownload(current => ({ ...current,
          message: 'Không mở được bảng chia sẻ. Nhấn “Tải qua trình duyệt” để lưu ZIP.' }));
      }
    }
  }

  const isPreparing = download.state === 'preparing';
  const isReady = download.state === 'ready';
  const mainLabel = isReady ? (download.shareSupported ? 'Lưu vào Tệp' : 'Tải ZIP') : isPreparing ? 'Đang chuẩn bị...' : 'Chuẩn bị ZIP';
  return <section className={`source-zip-download source-zip-download--share${compact ? ' source-zip-download--compact' : ''}`}
    aria-label="Tải toàn bộ source ZIP của branch main">
    <div className="source-zip-download-detail">
      <span className="source-zip-download-symbol" aria-hidden="true">↓</span>
      <span className="source-zip-download-label">
        <strong>Download Source ZIP</strong>
        <small>Branch <b>main</b></small>
      </span>
    </div>
    {isReady ? <button type="button" className="source-zip-download-action" onClick={download.shareSupported ? saveToFiles : downloadInBrowser}
      aria-label={`Lưu ZIP ${download.filename}`}>{mainLabel} <span aria-hidden="true">↗</span></button>
      : <button type="button" className="source-zip-download-action" onClick={prepareZip}
        disabled={!available || isPreparing} aria-label={`Chuẩn bị ZIP branch main của ${owner}/${repo}`}>
        {mainLabel} <span aria-hidden="true">↓</span>
      </button>}
    {isPreparing && <div className="source-zip-download-progress" role="status" aria-live="polite">
      <span>{download.total ? `Đang tải ${shortSize(download.received)} / ${shortSize(download.total)}` : `Đang tải ${download.received ? shortSize(download.received) : 'source'}...`}</span>
      {download.total ? <progress max={download.total} value={download.received} aria-label="Tiến độ tải source ZIP"/> : <progress aria-label="Đang nhận dữ liệu ZIP"/>}
      <button type="button" className="source-zip-download-text-action" onClick={cancelPrepare}>Hủy</button>
    </div>}
    {isReady && <div className="source-zip-download-ready" role="status" aria-live="polite">
      <strong>✓ ZIP đã sẵn sàng · {shortSize(download.size)}</strong>
      <span className="source-zip-filename" title={download.filename}>{download.filename}</span>
      {download.message && <p>{download.message}</p>}
      {download.shareSupported && <button type="button" className="source-zip-download-text-action" onClick={downloadInBrowser}>Tải qua trình duyệt (dự phòng)</button>}
    </div>}
    {download.state === 'error' && <div className="source-zip-download-error" role="alert">
      <span>{download.message}</span>
      {download.code === 'DOWNLOAD_TOO_LARGE' && <a href={url} target="_blank" rel="noopener noreferrer" className="source-zip-download-text-action">Tải trực tiếp ZIP lớn (mở ngoài ứng dụng)</a>}
    </div>}

  </section>;
}
