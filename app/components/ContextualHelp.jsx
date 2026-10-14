'use client';
import { useRef } from 'react';
import { helpForTab } from '../../lib/contextual-help.js';

/** One global help affordance per active screen; no extra '?' on individual cards. */
export default function ContextualHelp({ tab }) {
  const dialogRef = useRef(null);
  const help = helpForTab(tab);
  function open() {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }
  function close() { dialogRef.current?.close(); }
  return <>
    <button type="button" className="compact-help-trigger" onClick={open}
      aria-label={`Hướng dẫn ${help.title}`} title="Hướng dẫn màn hình">?</button>
    <dialog ref={dialogRef} className="compact-help-dialog" aria-labelledby="compact-help-title"
      onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className="compact-help-content">
        <div className="compact-help-head"><h2 id="compact-help-title">{help.title} · Hướng dẫn</h2>
          <button type="button" onClick={close} className="compact-help-close" aria-label="Đóng hướng dẫn">Đóng</button></div>
        <div className="compact-help-list">{help.items.map(([label, description]) =>
          <section key={label}><h3>{label}</h3><p>{description}</p></section>)}</div>
      </div>
    </dialog>
  </>;
}
