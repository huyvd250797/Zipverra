'use client';

import { memo } from 'react';
import { selectedRepoLabel } from '../../lib/ux-polish.js';

/** A compact mobile-first launchpad. It does not read or mutate any GitHub data. */
export const WorkspaceLaunchpad = memo(function WorkspaceLaunchpad({ owner, repo, branch, selected, disabled, onChooseRepo, onChooseBranch, onUpload, onWorkspace, onHistory }) {
  const destination = selectedRepoLabel(owner, repo);
  return <section className="zip-mobile-hub" aria-label="Repository và thao tác nhanh">
    <div className="zip-hub-selectors" role="group" aria-label="Đích cập nhật source">
      <button type="button" className="zip-hub-repo" onClick={onChooseRepo} disabled={disabled}
        aria-label={selected ? `Thay đổi repository ${destination}` : 'Chọn repository'}>
        <span className="zip-hub-selector-icon" aria-hidden="true">⌘</span>
        <span className="zip-hub-repo-copy"><small>REPOSITORY</small><strong>{selected ? destination : 'Chọn repository'}</strong></span>
        <span className="zip-hub-chevron" aria-hidden="true">⌄</span>
      </button>
      {selected && <button type="button" className="zip-hub-branch" onClick={onChooseBranch} disabled={disabled}
        aria-label={`Thay đổi branch ${branch || 'main'}`}>
        <small>BRANCH</small><strong>{branch || 'main'}</strong><span aria-hidden="true">⌄</span>
      </button>}
    </div>
    <button type="button" className="zip-hub-primary" disabled={!selected || disabled} onClick={onUpload}>
      <span aria-hidden="true">↥</span><strong>Push ZIP</strong><span aria-hidden="true">→</span>
    </button>
    <div className="zip-hub-shortcuts" role="group" aria-label="Thao tác nhanh">
      <button type="button" onClick={onWorkspace} disabled={!selected || disabled}><span aria-hidden="true">⌘</span> Workspace</button>
      <button type="button" onClick={onHistory} disabled={!selected || disabled}><span aria-hidden="true">◷</span> History</button>
    </div>
  </section>;
});

export const RepositoryEmpty = memo(function RepositoryEmpty({ authenticated, loading, onRefresh }) {
  if (!authenticated || loading) return null;
  return <div className="polish-empty" role="status">
    <span className="polish-empty-icon" aria-hidden="true">⌁</span>
    <strong>Chưa có repository được cấp quyền</strong>
    <p>Kiểm tra installation của GitHub App, cấp Contents: Read &amp; write cho repository rồi làm mới danh sách.</p>
    <div className="polish-empty-actions">
      <a href="/api/auth/install" target="_blank" rel="noopener noreferrer" className="button secondary">Quản lý GitHub App ↗</a>
      <button type="button" className="button secondary" onClick={onRefresh}>Tải lại repo</button>
    </div>
  </div>;
});

export const ReviewReadiness = memo(function ReviewReadiness({ state, selectedCount, totalCount, strategy }) {
  return <section className={`polish-readiness polish-readiness--${state.tone}`} aria-label="Điều kiện trước khi Push" aria-live="polite">
    <div className="polish-readiness-header">
      <span className="polish-readiness-icon" aria-hidden="true">{state.ready ? '✓' : state.tone === 'danger' ? '!' : 'i'}</span>
      <div><strong>{state.title}</strong><p>{state.detail}</p></div>
    </div>
    <div className="polish-readiness-meta">
      <span>{selectedCount}/{totalCount} file</span>
      <span>{strategy === 'pr' ? 'Pull Request' : 'Direct Push'}</span>
      <span>{state.ready ? 'Ready to push' : 'Review required'}</span>
    </div>
  </section>;
});

export const ActivityEmpty = memo(function ActivityEmpty({ canUpload, onUpload }) {
  return <section className="polish-empty polish-activity-empty" aria-label="Chưa có tiến trình Push">
    <span className="polish-empty-icon" aria-hidden="true">↥</span>
    <strong>Chưa có thao tác Push mới</strong>

    <button type="button" className="button secondary" disabled={!canUpload} onClick={onUpload}>Bắt đầu Upload ZIP →</button>
  </section>;
});

export const PushOutcome = memo(function PushOutcome({ result, onCopy }) {
  if (!result) return null;
  const validSha = typeof result.sha === 'string' && /^[a-f0-9]{40}$/i.test(result.sha);
  return <section className="polish-outcome" aria-label="Kết quả GitHub đã xác minh" role="status">
    <div className="polish-outcome-icon" aria-hidden="true">✓</div>
    <div className="polish-outcome-copy">
      <span className="polish-kicker">GITHUB VERIFIED</span>
      <h3>{result.pr ? `Đã mở Pull Request #${result.pr.number}` : result.branchOnly ? 'Branch đã được Push' : 'Push thành công'}</h3>
      {(result.pr || result.branchOnly) && <p>{result.pr ? 'PR đã mở, chưa tự động Merge vào branch đích.' : 'Commit đã được xác minh trên branch riêng.'}</p>}
      {validSha && <div className="polish-outcome-sha"><code>{result.sha.slice(0,12)}</code><button type="button" onClick={() => onCopy(result.sha)} aria-label="Sao chép commit SHA">Copy SHA</button></div>}
      <div className="polish-outcome-actions">
        {result.url && <a href={result.url} target="_blank" rel="noopener noreferrer">Xem commit ↗</a>}
        {result.pr?.url && <a href={result.pr.url} target="_blank" rel="noopener noreferrer">Xem Pull Request ↗</a>}
      </div>
    </div>
  </section>;
});
