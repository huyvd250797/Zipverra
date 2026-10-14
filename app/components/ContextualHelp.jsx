'use client';
import { useState } from 'react';
import { helpForTab } from '../../lib/contextual-help.js';
import ModalSheet from './ModalSheet.jsx';

/** One global help affordance per active screen; safe background scroll lock. */
export default function ContextualHelp({ tab }) {
  const [open, setOpen] = useState(false);
  const help = helpForTab(tab);
  return <>
    <button type="button" className="compact-help-trigger" onClick={() => setOpen(true)}
      aria-label={`Hướng dẫn ${help.title}`} title="Hướng dẫn màn hình">?</button>
    <ModalSheet open={open} onClose={() => setOpen(false)} title={`${help.title} · Hướng dẫn`} variant="help">
      <div className="compact-help-list">{help.items.map(([label, description]) =>
        <section key={label}><h3>{label}</h3><p>{description}</p></section>)}</div>
    </ModalSheet>
  </>;
}
