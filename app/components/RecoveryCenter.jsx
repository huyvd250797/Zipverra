'use client';

import { useEffect, useState } from 'react';
import { RECOVERY_ROLLBACK_KEY, validRollbackJournal, recoveryItems } from '../../lib/pwa-reliability.js';

function readRollback() {
  try {
    const value = JSON.parse(sessionStorage.getItem(RECOVERY_ROLLBACK_KEY) || 'null');
    return validRollbackJournal(value) ? value : null;
  } catch { return null; }
}

export default function RecoveryCenter({ push, pr, online, busy, authenticated, authorizedRepos, onVerifyPush, onCheckPR, onOpenHistory }) {
  const [rollback, setRollback] = useState(null);
  useEffect(() => {
    const sync = () => setRollback(readRollback());
    sync();
    window.addEventListener('pageshow', sync);
    window.addEventListener('zipverra:recovery-changed', sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      window.removeEventListener('pageshow', sync);
      window.removeEventListener('zipverra:recovery-changed', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);
  if (!authenticated || !authorizedRepos.length) return null;
  const items = recoveryItems({ push, pr, rollback, authorized: authorizedRepos.map(r => r.full_name) });
  if (!items.length) return null;
  return <section className="pwa-recovery-center" aria-label="Recovery Center">
    <div className="pwa-recovery-heading"><span>RECOVERY CENTER</span><h3>{items.length} thao tác cần xác minh</h3><p>Đọc lại kết quả từ GitHub trước khi thực hiện thao tác mới. Không tự tạo commit hoặc merge lại.</p></div>
    <div className="pwa-recovery-list">{items.map(item => <div className="pwa-recovery-item" key={item.type}>
      <div><strong>{({ push: 'GitHub Push', pr: 'Pull Request', rollback: 'Safe Rollback' })[item.type]}</strong>
        <small>{item.repo} · {item.branch} · {item.sha.slice(0, 10)}</small></div>
      <button type="button" className="button secondary" disabled={!online || busy}
        onClick={item.type === 'push' ? onVerifyPush : item.type === 'pr' ? onCheckPR : onOpenHistory}>
        {item.type === 'rollback' ? 'Mở History' : item.type === 'pr' ? 'Kiểm tra / Tạo PR' : 'Xác minh Push'}
      </button>
    </div>)}</div>
    <p className="pwa-recovery-footnote">Không lưu ZIP hoặc mã nguồn vào cache PWA. Các bản ghi phục hồi có thể mất nếu iOS xóa dữ liệu trình duyệt. Khi Rollback ở repo khác, hãy chọn đúng repo và branch trong Repos trước khi xác minh. Nút PR có thể tạo PR còn thiếu sau khi người dùng nhấn.</p>
  </section>;
}
