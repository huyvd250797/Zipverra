'use client';

/** Shared presentation primitives; no API calls and no GitHub mutations. */
export function UiButton({ children, variant='secondary', className='', type='button', ...props }) {
  const style = ['primary','secondary','ghost','danger'].includes(variant) ? variant : 'secondary';
  return <button {...props} type={type} className={`zip-ui-button zip-ui-button--${style} ${className}`.trim()}>{children}</button>;
}

export function UiIconButton({ children, label, className='', ...props }) {
  return <button {...props} type="button" aria-label={label} title={label}
    className={`zip-ui-icon-button ${className}`.trim()}>{children}</button>;
}

export function UiCard({ children, className='', ...props }) {
  return <div {...props} className={`zip-ui-card ${className}`.trim()}>{children}</div>;
}

export function UiInput({ label, className='', inputClassName='', ...props }) {
  return <label className={`zip-ui-input-label ${className}`.trim()}>
    {label ? <span className="zip-ui-input-caption">{label}</span> : null}
    <input {...props} className={`zip-ui-input ${inputClassName}`.trim()}/>
  </label>;
}

export function UiBadge({ children, tone='neutral', className='' }) {
  const normalized = ['neutral','success','warning','danger'].includes(tone) ? tone : 'neutral';
  return <span className={`zip-ui-badge zip-ui-badge--${normalized} ${className}`.trim()}>{children}</span>;
}

export function UiProgress({ value = 0, label = 'Tiến độ', className='' }) {
  const percent = Number.isFinite(value) ? Math.min(Math.max(value,0),100) : 0;
  return <div className={`zip-ui-progress ${className}`.trim()} role="progressbar"
    aria-label={label} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
    <span style={{width: `${percent}%`}}/>
  </div>;
}
