/*
 * A small ⓘ next to a title: the longer explanation lives here instead of on the page.
 * Hover (or tap on a phone) to read it.
 */
import { useEffect, useRef, useState } from 'react';
import { Info } from 'lucide-react';

export function InfoTip({ children, label = 'About this' }: { children: React.ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('pointerdown', away, true);
    return () => window.removeEventListener('pointerdown', away, true);
  }, [open]);
  return (
    <span ref={ref} className={'info-tip' + (open ? ' open' : '')}>
      <button type="button" className="info-tip-btn" aria-label={label} aria-expanded={open} onClick={() => setOpen((v) => !v)}><Info size={14} /></button>
      <span className="info-tip-body" role="tooltip">{children}</span>
    </span>
  );
}

/** An empty page: an icon, a few words and (usually) one button */
export function Empty({ icon, title, children, tip }: { icon?: React.ReactNode; title: string; children?: React.ReactNode; tip?: React.ReactNode }) {
  return (
    <div className="empty-clean">
      {icon && <div className="empty-icon">{icon}</div>}
      <div className="empty-title">{title}{tip && <InfoTip>{tip}</InfoTip>}</div>
      {children}
    </div>
  );
}
