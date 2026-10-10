'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { GraphNode } from '@/lib/types';
import { BROWSE_ORDER, TYPE_META } from '@/lib/types-meta';
import { hrefFor } from '@/lib/data';
import { neighboursOf, primaryText } from '@/lib/graph';
import { useMediaQuery, WIDE_LAYOUT_QUERY } from '@/lib/hooks';
import { EntityFields } from '../EntityFields';
import { Paragraphs } from '../RichText';
import { TypeMark } from '../TypeMark';
import { Dialog } from './Dialog';
import { useExplorer } from './ExplorerContext';
import { ArrowLeftIcon, CloseIcon } from './icons';

const MIN_WIDTH = 22; // rem
const MAX_WIDTH = 44; // rem

/**
 * Details of the selected entry.
 *
 * Wide screens: a non-modal side panel (role="complementary") beside the
 * map. Focus moves into it when it opens and back to the trigger when it
 * closes, but Tab is not trapped, so the map stays usable. It can be resized
 * by dragging its edge or with Ctrl/Cmd + ← →.
 *
 * Narrow screens: a full-screen modal dialog.
 */
export function DetailsPanel({ onClose }: { onClose: () => void }) {
  const { selected } = useExplorer();
  const wide = useMediaQuery(WIDE_LAYOUT_QUERY, true);

  if (!selected) return null;
  if (!wide) {
    return (
      <Dialog
        open
        onClose={onClose}
        labelledBy="details-title"
        className="anim-sheet m-0 h-dvh max-h-none w-screen max-w-none bg-paper p-0 text-ink"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-2 border-b border-rule px-2 py-2">
            <button type="button" onClick={onClose} className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-[0.9375rem] font-medium">
              <ArrowLeftIcon />
              Back to the network
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-12 pt-6">
            <DetailsBody node={selected} />
          </div>
        </div>
      </Dialog>
    );
  }
  return <WidePanel node={selected} onClose={onClose} />;
}

function WidePanel({ node, onClose }: { node: GraphNode; onClose: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const [width, setWidth] = useState(28);

  // Move focus to the panel's heading whenever a new entry is shown.
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('#details-title')?.focus({ preventScroll: true });
    const scroller = ref.current?.querySelector<HTMLElement>('[data-scroll]');
    if (scroller) scroller.scrollTop = 0;
  }, [node.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('dialog[open]')) {
        onClose();
        return;
      }
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
  }, [onClose]);

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
      <div className="flex items-center justify-end border-b border-rule px-3 py-2">
        <button type="button" onClick={onClose} className="icon-btn" aria-label="Close details">
          <CloseIcon />
        </button>
      </div>
      <div data-scroll className="min-h-0 flex-1 overflow-y-auto px-6 pb-12 pt-6">
        <DetailsBody node={node} />
      </div>
    </aside>
  );
}

function DetailsBody({ node }: { node: GraphNode }) {
  const { index, select, visibleTypes } = useExplorer();
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
      className="entity-link inline-flex min-h-9 items-baseline gap-2 py-1 text-left"
    >
      {children}
      {hidden && <span className="meta">(hidden by filter)</span>}
    </button>
  );
}
