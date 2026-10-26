'use client';
import { memo } from 'react';

const PHASES={
  ANALYZING:'Đang đọc & kiểm tra ZIP',
  PREFLIGHT:'Đang kiểm tra repository',
  UPLOADING:'Đang tải source lên GitHub',
  COMMITTING:'Đang tạo commit',
  VERIFYING:'Đang xác minh GitHub',
  UNCONFIRMED:'Cần xác minh Commit',
  FAILED:'Xử lý không thành công',
  SUCCEEDED:'Đã xác minh thành công'
};
/** Standalone PC progress, visible without opening Activity. Percent is a bounded
 * workflow-stage value, not a promise of bytes transferred across every stage. */
export default memo(function DesktopOperationProgress({phase,progress=0,busy=false,error='',status='',transfer=null}){
  if(!busy && !error && !['UNCONFIRMED','FAILED'].includes(phase)) return null;
  const value=Math.max(0,Math.min(100,Math.round(Number(progress)||0)));
  const failed=Boolean(error);
  return <section className={`zip3915-progress${failed?' is-error':''}`} role="region" aria-label="Tiến trình xử lý ZIP và Push">
    <div className="zip3915-progress-head">
      <span className="zip3915-progress-icon" aria-hidden="true">{failed?'!':busy?'↻':'i'}</span>
      <div className="zip3915-progress-description">
        <strong>{failed?'Cần kiểm tra':PHASES[phase]||'Đang xử lý'}</strong>
        <small role={failed?'alert':'status'}>{error || status || 'Đang xử lý...'}</small>
      </div>
      {!failed&&<output className="zip3915-progress-percent" aria-live="off">{value}%</output>}
    </div>
    {!failed&&<div className="zip3915-progress-track" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label="Tiến độ xử lý theo từng giai đoạn">
      <div className="zip3915-progress-fill" style={{width:`${value}%`}}/>
    </div>}
    {transfer?.total>0 && !failed && <div className="zip3915-progress-meta"><span>{transfer.completed}/{transfer.total} file</span><span>{transfer.speedBytesPerSec>0?`${(transfer.speedBytesPerSec/1024/1024).toFixed(1)} MB/s`: 'Đang chuẩn bị...'}</span></div>}
  </section>;
});
