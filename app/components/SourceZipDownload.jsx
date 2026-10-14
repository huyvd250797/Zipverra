'use client';

/**
 * Native browser download: keep the iOS user gesture attached to a real link.
 * Our same-origin endpoint checks the GitHub App session and redirects to
 * GitHub's short-lived ZIP archive URL. Never fetch the archive into JS memory.
 */
export default function SourceZipDownload({ owner, repo, selected, online, busy, compact = false }) {
  if (!selected || !owner || !repo) return null;
  const url = `/api/github/source-zip?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`;
  const available = Boolean(online && !busy);
  return <section className={`source-zip-download${compact ? ' source-zip-download--compact' : ''}`}
    aria-label="Tải toàn bộ source ZIP của branch main">
    <div className="source-zip-download-detail">
      <span className="source-zip-download-symbol" aria-hidden="true">↓</span>
      <span className="source-zip-download-label">
        <strong>Download Source ZIP</strong>
        <small>Branch <b>main</b> · ZIP từ GitHub</small>
      </span>
    </div>
    {available ? <a className="source-zip-download-action" href={url}
      target="_blank" rel="noopener noreferrer" aria-label={`Tải ZIP branch main của ${owner}/${repo}`}>
      Tải ZIP <span aria-hidden="true">↗</span>
    </a> : <span className="source-zip-download-action is-disabled" role="status" aria-disabled="true">
      {busy ? 'Đang xử lý' : 'Đang offline'}
    </span>}
    {!compact && <p className="source-zip-download-note">Luôn tải source mới nhất của <b>main</b> (không bao gồm lịch sử Git). Trên iPhone, ZIP được tải qua trình duyệt và có thể lưu trong Files.</p>}
  </section>;
}
