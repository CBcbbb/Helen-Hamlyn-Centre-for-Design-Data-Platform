'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { GraphNode } from '@/lib/types';
import { BROWSE_ORDER, TYPE_META } from '@/lib/types-meta';
import { hrefFor } from '@/lib/data';
import { neighboursOf, primaryText } from '@/lib/graph';
import { shortLabel } from '@/lib/layout';
import { useMediaQuery, WIDE_LAYOUT_QUERY } from '@/lib/hooks';
import { EntityFields } from '../EntityFields';
import { Paragraphs } from '../RichText';
import { TypeMark } from '../TypeMark';
import { useExplorer } from './ExplorerContext';
import { GuideCard } from './GuideCard';
import { CloseIcon, CollapseIcon, ExpandIcon } from './icons';

const MIN_WIDTH = 22; // rem
const MAX_WIDTH = 44; // rem

/**
 * Details of the selected entry. Never modal, so the map stays in view and
 * usable: selecting another entry on the map simply updates the panel.
 *
 * Wide screens: a side panel beside the map, resizable by dragging its edge
 * or with Ctrl/Cmd + ← →.
 *
 * Narrow screens: a sheet over the lower part of the map, with the selected
 * entry panned into the space above it. It can be expanded to fill the map.
 *
 * Either way it is a labelled complementary region. Focus moves to its
 * heading when an entry opens, Escape closes it, and focus then returns to
 * what opened it.
 */
export function DetailsPanel({ onClose }: { onClose: () => void }) {
  const { selected } = useExplorer();
  const wide = useMediaQuery(WIDE_LAYOUT_QUERY, true);
  if (!selected) return null;
  return wide ? <WidePanel node={selected} onClose={onClose} /> : <Sheet node={selected} onClose={onClose} />;
}

/** Focus the heading on each new entry, scroll to the top, and close on Escape. */
function usePanelBehaviour(ref: React.RefObject<HTMLElement | null>, node: GraphNode, onClose: () => void) {
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('#details-title')?.focus({ preventScroll: true });
    const scroller = ref.current?.querySelector<HTMLElement>('[data-scroll]');
    if (scroller) scroller.scrollTop = 0;
  }, [ref, node.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('dialog[open]')) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
}

function WidePanel({ node, onClose }: { node: GraphNode; onClose: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const [width, setWidth] = useState(28);
  usePanelBehaviour(ref, node, onClose);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setWidth((w) => Math.min(MAX_WIDTH, w + 2));
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          setWidth((w) => Math.max(MIN_WIDTH, w - 2));
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = width;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const move = (ev: PointerEvent) => {
      const next = startW + (startX - ev.clientX) / rem;
      setWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, next)));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <aside
      ref={ref}
      aria-labelledby="details-title"
      className="anim-panel relative flex min-h-0 flex-none flex-col border-l border-rule bg-paper"
      style={{ width: `${width}rem`, maxWidth: '55vw' }}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize details panel"
        aria-valuenow={Math.round(width)}
        aria-valuemin={MIN_WIDTH}
        aria-valuemax={MAX_WIDTH}
        title="Drag to resize, or use Ctrl/Cmd with the left and right arrow keys"
        onPointerDown={startDrag}
        className="absolute inset-y-0 -left-1 z-10 w-2 cursor-col-resize after:absolute after:inset-y-0 after:left-[3px] after:w-px after:bg-transparent after:transition-colors hover:after:bg-accent"
      />
      <div className="flex min-h-14 items-center gap-2 border-b border-rule py-2 pl-6 pr-3">
        <PathTrail />
        <button type="button" onClick={onClose} className="icon-btn ml-auto flex-none" aria-label="Close details">
          <CloseIcon />
        </button>
      </div>
      <div data-scroll className="min-h-0 flex-1 overflow-y-auto px-6 pb-12 pt-6">
        <DetailsBody node={node} />
      </div>
    </aside>
  );
}

function Sheet({ node, onClose }: { node: GraphNode; onClose: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const [expanded, setExpanded] = useState(false);
  usePanelBehaviour(ref, node, onClose);

  return (
    <aside
      ref={ref}
      aria-labelledby="details-title"
      className={`anim-sheet absolute inset-x-0 bottom-0 z-30 flex flex-col rounded-t-2xl border-t border-rule bg-paper shadow-[0_-12px_40px_-16px_rgb(34_33_42/0.4)] transition-[height] duration-200 ${expanded ? 'h-full rounded-t-none' : 'h-[60%]'}`}
    >
      <div className="flex flex-none items-center gap-1 border-b border-rule px-2 py-1.5">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[0.9375rem] font-medium text-ink"
        >
          {expanded ? <CollapseIcon /> : <ExpandIcon />}
          {expanded ? 'Show the map' : 'Expand'}
        </button>
        <span aria-hidden="true" className="absolute left-1/2 top-1.5 h-1 w-9 -translate-x-1/2 rounded-full bg-rule-strong" />
        <button type="button" onClick={onClose} className="icon-btn ml-auto" aria-label="Close details">
          <CloseIcon />
        </button>
      </div>
      <div data-scroll className="min-h-0 flex-1 overflow-y-auto px-4 pb-10 pt-4">
        <div className="mb-4">
          <PathTrail />
        </div>
        <DetailsBody node={node} />
      </div>
    </aside>
  );
}

/**
 * The entries opened so far. Each earlier step is a button that goes back to
 * it (and shortens the path to there).
 */
function PathTrail() {
  const { path, select, clearPath, selected } = useExplorer();
  if (path.length < 2) return <p className="meta">Details</p>;
  return (
    <nav aria-label="Your path" className="min-w-0 flex-1">
      <ol className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 text-[0.8125rem] leading-tight">
        {path.map((n, i) => {
          const current = n.id === selected?.id;
          return (
            <li key={n.id} className="inline-flex min-w-0 items-center gap-1">
              {i > 0 && (
                <span aria-hidden="true" className="text-ink-muted">
                  →
                </span>
              )}
              {current ? (
                <span aria-current="step" className="inline-flex min-h-8 items-center gap-1.5 font-semibold text-ink">
                  <TypeMark type={n.type} size="0.62em" />
                  <span className="truncate">{shortLabel(n.name)}</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => select(n)}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded px-0.5 text-ink-muted underline decoration-rule-strong underline-offset-2 hover:text-ink hover:decoration-ink"
                >
                  <TypeMark type={n.type} size="0.62em" />
                  <span className="truncate">{shortLabel(n.name)}</span>
                  <span className="sr-only">, step {i + 1}, go back</span>
                </button>
              )}
            </li>
          );
        })}
        <li className="ml-1">
          <button type="button" onClick={clearPath} className="min-h-8 rounded px-1 text-ink-muted hover:text-ink">
            Clear<span className="sr-only"> path</span>
          </button>
        </li>
      </ol>
    </nav>
  );
}

function DetailsBody({ node }: { node: GraphNode }) {
  const { index, select, visibleTypes, guide, setGuide } = useExplorer();
  const meta = TYPE_META[node.type];
  const groups = BROWSE_ORDER.map((t) => [t, neighboursOf(index, node.id, t)] as const).filter(
    ([, list]) => list.length > 0,
  );

  return (
    <div>
      <p className={`heading mb-2 inline-flex items-center gap-2 text-[0.875rem] text-${meta.token}`}>
        <TypeMark type={node.type} size="0.7em" />
        {meta.singular}
      </p>
      <h2 id="details-title" tabIndex={-1} className="display text-[1.875rem] outline-none focus-visible:underline">
        {node.name}
      </h2>

      {guide === 'path' && (
        <GuideCard
          step={3}
          className="mt-5"
          title="Your path"
          primary={{ label: 'Next', onClick: () => setGuide('arrange') }}
          onSkip={() => setGuide('done')}
        >
          Each entry you open is added to the path at the top of this panel. Select an earlier step to go back to it.
        </GuideCard>
      )}

      <p className="mt-4">
        <Link href={hrefFor(node)} className="link text-[0.9375rem]">
          Open the full page for {node.name.length > 36 ? `this ${meta.singularLower}` : node.name}
        </Link>
      </p>

      <Paragraphs value={primaryText(node)} className="mt-6 text-[1.0625rem]!" />

      {groups.length > 0 && (
        <section className="mt-8 border-t border-rule pt-6" aria-labelledby="details-connections">
          <h3 id="details-connections" className="heading mb-4 text-[1.0625rem]">
            Connections
          </h3>
          {guide === 'follow' && (
            <GuideCard
              step={2}
              className="mb-5"
              title="Follow a connection"
              onSkip={() => setGuide('done')}
            >
              These are highlighted on the map too. Select any of them, here or on the map, to keep going.
            </GuideCard>
          )}
          <div className="space-y-5">
            {groups.map(([t, list]) => (
              <div key={t}>
                <h4 className="meta mb-1">
                  {TYPE_META[t].plural} ({list.length})
                </h4>
                <ul>
                  {list.map((n) => (
                    <li key={n.id}>
                      <ConnectionButton onClick={() => select(n)} hidden={!visibleTypes[n.type]}>
                        <TypeMark type={n.type} size="0.6em" />
                        <span>{n.name}</span>
                      </ConnectionButton>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-8 border-t border-rule pt-6 [&_.prose-serif]:text-[1.0625rem]">
        <EntityFields node={node} headingLevel={3} skipPrimary />
      </div>
    </div>
  );
}

function ConnectionButton({ onClick, hidden, children }: { onClick: () => void; hidden: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="entity-link inline-flex min-h-11 items-baseline gap-2 py-2 text-left md:min-h-9 md:py-1"
    >
      {children}
      {hidden && <span className="meta">(hidden by filter)</span>}
    </button>
  );
}
