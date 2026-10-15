/** Zipverra Pro UI primitives — presentation only, no GitHub mutation side effects. */
'use client';
import ContextualHelp from './ContextualHelp.jsx';
import { workflowPosition } from '../../lib/premium-workflow.js';

const views = Object.freeze({
  repositories: { eyebrow: 'YOUR WORKSPACE', title: 'Repositories', description: 'Chọn nơi cập nhật source.', step: '01' },
  home: { eyebrow: 'SOURCE DELIVERY', title: 'Upload & Review', description: 'Đưa ZIP lên GitHub an toàn.', step: '02' },
  activity: { eyebrow: 'OPERATIONS', title: 'Activity', description: 'Theo dõi và xác minh kết quả.', step: '03' },
  history: { eyebrow: 'VERSION CONTROL', title: 'History', description: 'Commit, compare và rollback.', step: '04' },
  settings: { eyebrow: 'PREFERENCES', title: 'Settings', description: 'Tùy chỉnh workspace và GitHub App.', step: '05' },
});

export function UXViewIntro({ activeTab, online, pending, repoTools = null }) {
  const screen = views[activeTab] || views.repositories;
  return <div className="mobile-context pro-view-intro" aria-label={`Màn hình ${screen.title}`}>
    <div className="pro-view-copy"><h2>{screen.title}</h2></div>
    <div className="pro-view-indicators"><span className={`mobile-connection ${online ? 'connected' : 'disconnected'}`} role="status" aria-label={online ? 'Online' : 'Offline'} title={online ? 'Online' : 'Offline'}>{online ? 'Online' : 'Offline'}</span>{repoTools ? <div className="pro-view-tools" role="group" aria-label="Repository controls">{repoTools}</div> : null}{pending && <span className="pro-pending-marker" aria-label="Có thao tác cần xác minh" title="Cần xác minh">!</span>}<ContextualHelp tab={activeTab}/></div>
  </div>;
}

export function StatusIndicator({ online, authenticated, loading }) {
  const state = loading ? 'checking' : !online ? 'offline' : authenticated ? 'connected' : 'guest';
  return <span className={`pro-header-status pro-header-status--${state}`} role="status" aria-label={loading ? 'Đang kết nối' : !online ? 'Thiết bị offline' : authenticated ? 'GitHub đã kết nối' : 'Chưa đăng nhập GitHub'}>
    <span className="pro-header-status-dot" aria-hidden="true"/>{loading ? 'Đang kiểm tra' : !online ? 'Offline' : authenticated ? 'Connected' : 'Guest'}
  </span>;
}

export function WorkflowStrip({ currentStep = 0, onRepo, onUpload, onReview, onActivity }) {
  const steps = [
    { label: 'Repository', compact: 'Repo', description: 'Chọn nơi nhận source.' },
    { label: 'Upload ZIP', compact: 'Upload', description: 'Tải file ZIP từ điện thoại.' },
    { label: 'Analyze', compact: 'Analyze', description: 'Giải nén, so sánh và quét bảo mật.' },
    { label: 'Confirm', compact: 'Confirm', description: 'Kiểm tra thay đổi trước khi gửi.' },
    { label: 'Activity', compact: 'Push', description: 'Theo dõi Push và xác minh kết quả.' },
  ];
  const { active: activeIndex, complete, railPercent } = workflowPosition(currentStep);
  const handlers = [onRepo, onUpload, onReview, onReview, onActivity];
  const activeStep = currentStep >= steps.length ? {label: 'Completed', description: 'Đã push và xác minh commit. Sẵn sàng cho phiên bản tiếp theo.'} : steps[activeIndex];
  return <section className={`pro-stepper${complete ? ' pro-stepper-complete' : ''}`} aria-label="Quy trình cập nhật source">
    <nav className="pro-stepper-nav pro-workflow" aria-label="Quy trình cập nhật source">
      <div className="pro-stepper-rail" aria-hidden="true"><span style={{ width: `${railPercent}%` }}/></div>
      <ol className="pro-stepper-list">
        {steps.map((step,index) => {
          const state = index < currentStep ? 'done' : index === activeIndex ? 'current' : 'upcoming';
          const unavailable = (index === 2 || index === 3) && currentStep < 3 || index === 4 && currentStep < 4;
          return <li key={step.label} className={`pro-stepper-item ${state}`}>
            <button type="button"
              className={`pro-workflow-step ${state}`}
              aria-current={currentStep < steps.length && index === activeIndex ? 'step' : undefined}
              aria-label={`Bước ${index + 1}: ${step.label}`}
              disabled={unavailable}
              onClick={handlers[index]}>
              <span className="pro-workflow-count">{index < currentStep ? '✓' : index + 1}</span>
              <span className="pro-workflow-label">
                <span className="pro-step-index">{String(index + 1).padStart(2, '0')}</span>
                <span className="pro-step-full">{step.label}</span>
                <span className="pro-step-short">{step.compact}</span>
              </span>
            </button>
          </li>;
        })}
      </ol>
    </nav>
    <div className="pro-stepper-summary" role="status" aria-live="polite">
      <span className="pro-stepper-kicker">Step {Math.min(currentStep + 1, steps.length)} of {steps.length}</span>
      <strong>{activeStep.label}</strong>
      
    </div>
  </section>;
}

export function CurrentRepository({ owner, repo, branch, busy, onChoose, onBranch }) {
  return <section className="mobile-quick-card" aria-label="Repository hiện tại">
    <span className="pro-repository-symbol" aria-hidden="true">⌘</span>
    <div><span className="mobile-quick-label">PUSH DESTINATION</span>
      <strong>{owner && repo ? `${owner}/${repo}` : 'Chưa chọn repository'}</strong>
      <small><span className="pro-branch-dot" aria-hidden="true"/>{branch || 'main'}</small></div>
    <div className="zip-current-actions"><button type="button" className="button secondary" onClick={onBranch} disabled={busy} aria-label={`Thay đổi branch ${branch}`}>Branch</button><button type="button" className="button secondary" onClick={onChoose} disabled={busy} aria-label="Thay đổi repository">Đổi repo <span aria-hidden="true">→</span></button></div>
  </section>;
}

export function StatusEmpty({ title, description, icon = 'scan' }) {
  return <div className="empty-preview pro-empty-preview" role="status">
    <div className="circle-placeholder pro-empty-icon" aria-hidden="true">{icon === 'scan' ? '⌕' : '↥'}</div>
    <h3>{title}</h3><p>{description}</p>
  </div>;
}
