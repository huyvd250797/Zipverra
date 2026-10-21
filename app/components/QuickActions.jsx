'use client';
import { quickActionRepos, quickProfile, profileDiffers } from '../../lib/quick-actions.js';

/** Inline Upload shortcuts: one tap to pick a repo; saved release modes never
 * activate silently. The existing Review and consent gates remain authoritative. */
export default function QuickActions({ repos, favorites, recents, usage, selectedRepo, branch, mode, strategy,
  profiles, disabled, onChoose, onOpenPicker, onToggleFavorite, onSaveProfile, onApplyProfile }) {
  const shortcuts = quickActionRepos({ repos, favorites, recents, usage, selected:selectedRepo });
  const profile = quickProfile(profiles, repos, selectedRepo);
  const differs = profileDiffers(profile, {branch, mode, strategy});
  const authorized = (repos || []).some(r => r.full_name?.toLowerCase() === selectedRepo?.toLowerCase());
  const pinned = (favorites || []).some(r => r.toLowerCase() === selectedRepo?.toLowerCase());
  if (!repos?.length) return null;
  return <section className="zip393-quick-actions" aria-label="Truy cập nhanh và cấu hình repository">
    <div className="zip393-quick-heading">
      <strong>Repo thường dùng</strong>
      <button className="zip393-quick-link" type="button" onClick={onOpenPicker} disabled={disabled}>Tất cả repo <span aria-hidden="true">↗</span></button>
    </div>
    {shortcuts.length > 0 ? <div className="zip393-shortcuts" role="group" aria-label="Repository thường dùng">
      {shortcuts.map(item => <button type="button" key={item.repo} className={`zip393-shortcut${item.active ? ' is-active' : ''}`}
        onClick={() => onChoose(item.repo)} disabled={disabled} aria-pressed={item.active} title={item.repo}
        aria-label={`${item.active ? 'Repository hiện tại' : 'Chọn repository'} ${item.repo}`}>
        <span className="zip393-shortcut-icon" aria-hidden="true">{item.origin === 'pinned' ? '★' : item.origin === 'recent' ? '↺' : '⌁'}</span>
        <span className="zip393-shortcut-name"><small>{item.repo.split('/')[0]}</small><strong>{item.repo.split('/').slice(1).join('/')}</strong></span>
      </button>)}
    </div> : <p className="zip393-quick-empty">Chưa có repo thường dùng</p>}
    {selectedRepo && authorized && <div className="zip393-profile-strip">
      <button type="button" className={`zip393-pin-button${pinned ? ' is-pinned' : ''}`} onClick={() => onToggleFavorite(selectedRepo)}
        disabled={disabled} aria-pressed={pinned} title={pinned ? 'Bỏ ghim repository' : 'Ghim repository'}>
        <span aria-hidden="true">{pinned ? '★' : '☆'}</span> {pinned ? 'Đã ghim' : 'Ghim repo'}
      </button>
      <span className="zip393-profile-description" title={profile ? `Đã lưu: ${profile.branch} · ${profile.mode} · ${profile.strategy}` : 'Chưa lưu cấu hình'}>
        {profile ? `Profile: ${profile.branch} · ${profile.mode === 'sync' ? 'Sync' : 'Merge'} / ${profile.strategy === 'pr' ? 'PR' : 'Direct'}` : `Hiện tại: ${branch} · ${mode === 'sync' ? 'Sync' : 'Merge'} / ${strategy === 'pr' ? 'PR' : 'Direct'}`}
      </span>
      {profile && differs && <button type="button" className="zip393-profile-apply" onClick={() => onApplyProfile(profile)} disabled={disabled}
        title="Áp dụng branch, chế độ và chiến lược đã lưu. Bản Review hiện tại sẽ phải phân tích lại.">Dùng Profile</button>}
      {(!profile || differs) && <button type="button" className="zip393-profile-save" onClick={() => onSaveProfile({repo:selectedRepo,branch,mode,strategy})} disabled={disabled}
        title="Lưu lựa chọn hiện tại chỉ trên thiết bị này, không lưu token hay source">{profile ? 'Lưu lại' : 'Lưu Profile'}</button>}
      {profile && !differs && <span className="zip393-profile-current" aria-label="Đang sử dụng profile đã lưu">✓ Đúng Profile</span>}
    </div>}
  </section>;
}
