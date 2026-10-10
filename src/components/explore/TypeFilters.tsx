'use client';

import { useId, useState } from 'react';
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
export function TypeFilters({ variant }: { variant: 'panel' | 'row' }) {
  const { visibleTypes, filters } = useExplorer();
  const { totals, toggleType, statusText, wide } = filters;
  const [open, setOpen] = useState(false);
  const id = useId();

  const list = (
    <fieldset className="min-w-0">
      <legend className="sr-only">Show entity types</legend>
      <ul className={variant === 'panel' ? 'space-y-0.5' : '-mx-1 flex flex-wrap gap-x-1'}>
        {BROWSE_ORDER.map((t) => (
          <li key={t}>
            <label className="group relative flex min-h-10 cursor-pointer select-none items-center gap-2.5 rounded-md px-2 text-[0.9375rem] text-ink ring-accent transition-colors hover:bg-surface has-[:focus-visible]:ring-2">
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

  if (variant === 'row') {
    return (
      <div className="js-only flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
        {list}
        <p className="meta" aria-hidden="true">
          {statusText}
        </p>
      </div>
    );
  }

  const body = (
    <>
      {list}
      <div className="mt-2 border-t border-rule px-2 pt-2.5">
        <p className="meta" aria-hidden="true">
          {statusText}
        </p>
        {wide && (
          <ul className="meta mt-1.5 space-y-0.5 text-[0.8125rem]">
            <li>Hover or focus an entry for its connections</li>
            <li>Select it for details</li>
            <li>Arrow keys move between entries</li>
          </ul>
        )}
      </div>
    </>
  );

  return (
    <div className="js-only absolute left-3 top-3 z-10 w-[min(15.5rem,calc(100%-1.5rem))] md:left-4 md:top-4">
      {wide ? (
        <div className="rounded-xl bg-paper/95 p-2 shadow-[0_1px_2px_rgb(34_33_42/0.08),0_10px_30px_-14px_rgb(34_33_42/0.3)] ring-1 ring-rule backdrop-blur-sm">
          {body}
        </div>
      ) : (
        <>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={id}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-paper/95 px-3.5 text-[0.875rem] font-medium text-ink shadow-[0_1px_2px_rgb(34_33_42/0.08),0_8px_24px_-12px_rgb(34_33_42/0.25)] ring-1 ring-rule"
          >
            <span className="flex gap-0.5" aria-hidden="true">
              {BROWSE_ORDER.map((t) => (
                <TypeMark key={t} type={t} size="0.6em" />
              ))}
            </span>
            Filters
            {open ? <ExpandIcon /> : <CollapseIcon />}
          </button>
          <div
            id={id}
            hidden={!open}
            className="mt-2 rounded-xl bg-paper p-2 shadow-[0_10px_30px_-14px_rgb(34_33_42/0.35)] ring-1 ring-rule"
          >
            {body}
          </div>
        </>
      )}
    </div>
  );
}
