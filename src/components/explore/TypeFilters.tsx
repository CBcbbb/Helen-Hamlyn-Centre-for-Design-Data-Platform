'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { BROWSE_ORDER, TYPE_META } from '@/lib/types-meta';
import { TypeMark } from '../TypeMark';
import { useExplorer } from './ExplorerContext';
import { CollapseIcon, ExpandIcon } from './icons';

/**
 * The legend and the type filters in one: each type's shape, colour, name
 * and count is also the checkbox that shows or hides it. On the map it sits
 * in a small panel at the top left, as in the original platform; on a narrow
 * screen the panel folds away behind a button. Above the table it is a row.
 */
export function TypeFilters({ variant }: { variant: 'menu' | 'row' }) {
  const { visibleTypes, filters } = useExplorer();
  const { totals, toggleType, statusText } = filters;
  const [open, setOpen] = useState(false);
  const id = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // An open menu closes on Escape and on a tap or click outside it; focus
  // goes back to the Filters button rather than being lost with the menu.
  useEffect(() => {
    if (!open) return;
    const close = () => {
      setOpen(false);
      buttonRef.current?.focus({ preventScroll: true });
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      close();
    };
    const onPointer = (e: PointerEvent) => {
      if (!wrapRef.current || wrapRef.current.contains(e.target as Node)) return;
      setOpen(false);
      // Once the tap has finished: if it moved focus somewhere real (an entry
      // on the map, the details it opened, a link), leave it there; if focus
      // fell to the page itself (the body, or a container such as <main>),
      // bring it back to the Filters button.
      const after = () =>
        requestAnimationFrame(() => {
          const active = document.activeElement;
          const lost = !active || active === document.body || (!!wrapRef.current && active.contains(wrapRef.current));
          if (lost) buttonRef.current?.focus({ preventScroll: true });
        });
      document.addEventListener('pointerup', after, { once: true, capture: true });
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  const list = (
    <fieldset className="min-w-0">
      <legend className="sr-only">Show entity types</legend>
      <ul className={variant === 'menu' ? 'space-y-0.5' : 'flex flex-nowrap gap-x-0.5'}>
        {BROWSE_ORDER.map((t) => (
          <li key={t}>
            <label className="group relative flex min-h-9 cursor-pointer select-none items-center gap-2.5 rounded-md px-2 text-[0.9375rem] text-ink ring-accent transition-colors hover:bg-surface has-[:focus-visible]:ring-2">
              <input
                type="checkbox"
                checked={visibleTypes[t]}
                onChange={() => toggleType(t)}
                className="peer absolute inset-0 cursor-pointer appearance-none rounded-md focus:outline-none"
              />
              <span
                aria-hidden="true"
                className="grid size-4 flex-none place-items-center rounded-[4px] ring-1 ring-control ring-inset peer-checked:ring-0"
                style={{ background: visibleTypes[t] ? `var(--color-${TYPE_META[t].token})` : 'transparent' }}
              >
                {visibleTypes[t] && (
                  <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
                    <path d="M2.5 6.2l2.3 2.3 4.7-5" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <TypeMark type={t} size="0.72em" />
              <span className="decoration-1 peer-[:not(:checked)]:text-ink-muted peer-[:not(:checked)]:line-through">
                {TYPE_META[t].plural}
              </span>
              <span className="meta ml-auto pl-2 tabular-nums">{totals[t]}</span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );

  if (variant === 'row') return <div className="js-only flex-none">{list}</div>;

  return (
    <div ref={wrapRef} className="js-only relative flex-none">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[0.875rem] font-medium text-ink ring-1 ring-control"
      >
        <span className="flex gap-0.5" aria-hidden="true">
          {BROWSE_ORDER.map((t) => (
            <TypeMark key={t} type={t} size="0.55em" />
          ))}
        </span>
        <span className="max-sm:sr-only">Filters</span>
        {open ? <ExpandIcon /> : <CollapseIcon />}
      </button>
      <div
        id={id}
        hidden={!open}
        className="absolute right-0 top-12 z-40 w-60 rounded-xl bg-paper p-2 shadow-[0_10px_30px_-14px_rgb(34_33_42/0.35)] ring-1 ring-rule"
      >
        {list}
        <p className="meta mt-2 border-t border-rule px-2 pt-2" aria-hidden="true">
          {statusText}
        </p>
      </div>
    </div>
  );
}
