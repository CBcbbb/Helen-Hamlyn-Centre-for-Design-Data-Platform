'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { select } from 'd3-selection';
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';
import 'd3-transition';
import type { GraphNode } from '@/lib/types';
import { TYPE_META } from '@/lib/types-meta';
import { computeLayout, nearestInDirection, COLUMN_ORDER } from '@/lib/layout';
import { hrefFor } from '@/lib/data';
import { useMediaQuery, useMounted, REDUCED_MOTION_QUERY } from '@/lib/hooks';
import { MARK_PATHS } from '../TypeMark';
import { useExplorer } from './ExplorerContext';
import { FitIcon, MinusIcon, PlusIcon } from './icons';

const LABEL_MAX = 34;
const PAD_RIGHT = 250;

function shortLabel(name: string): string {
  if (name.length <= LABEL_MAX) return name;
  const cut = name.slice(0, LABEL_MAX - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > 20 ? cut.slice(0, space) : cut).replace(/[\s,:;/–-]+$/, '')}…`;
}

const ARROWS: Record<string, 'up' | 'down' | 'left' | 'right'> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

/**
 * The network map. Rendered by React as SVG, so it is part of the server
 * HTML; d3 is used for the layout (d3-force, at build/render time) and for
 * pan and zoom (d3-zoom). Before JavaScript runs, each entry is a plain link
 * to its page. Once hydrated, entries become buttons that open the details
 * panel, and the map becomes a single tab stop navigated with the arrow keys
 * (a roving tabindex), in a reading order of column by column, top to bottom.
 */
export function GraphView() {
  const { data, index, visibleTypes, matches, searchTerm, selected, select: selectNode } = useExplorer();
  const mounted = useMounted();
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);

  const layout = useMemo(() => computeLayout(data), [data]);
  const viewWidth = layout.width + PAD_RIGHT - 160;

  const visibleNodes = useMemo(
    () =>
      data.nodes
        .filter((n) => visibleTypes[n.type])
        .sort((a, b) => {
          const c = COLUMN_ORDER.indexOf(a.type) - COLUMN_ORDER.indexOf(b.type);
          return c || layout.positions[a.id].y - layout.positions[b.id].y;
        }),
    [data.nodes, visibleTypes, layout],
  );
  const visibleIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);
  const visibleLinks = useMemo(
    () => data.links.filter((l) => visibleIds.has(l.source) && visibleIds.has(l.target)),
    [data.links, visibleIds],
  );

  const svgRef = useRef<SVGSVGElement>(null);
  const sceneRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const transformRef = useRef<ZoomTransform>(zoomIdentity);
  const [zoomPct, setZoomPct] = useState(100);

  // Roving tabindex: the one entry in the tab order.
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const tabStop = activeId && visibleIds.has(activeId) ? activeId : (selected?.id ?? visibleNodes[0]?.id);

  // Pan and zoom.
  useEffect(() => {
    const svg = svgRef.current;
    const scene = sceneRef.current;
    if (!svg || !scene) return;
    const behaviour = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.6, 6])
      .on('zoom', (event: { transform: ZoomTransform }) => {
        transformRef.current = event.transform;
        scene.setAttribute('transform', event.transform.toString());
        setZoomPct(Math.round(event.transform.k * 100));
      });
    zoomRef.current = behaviour;
    select(svg).call(behaviour).on('dblclick.zoom', null);

    // On a narrow screen the whole map would be too small to read, so open
    // zoomed in to roughly full-size labels, at the top of the projects
    // column, and let people pinch and drag from there.
    const base = svg.clientWidth / viewWidth;
    if (base > 0 && base < 0.6) {
      const k = Math.min(6, 0.9 / base);
      const projectsX = layout.columns.find((c) => c.type === 'Projects')?.x ?? 0;
      const x = -(projectsX - 40 - 24) * k; // the scene is offset by -40
      select(svg).call(behaviour.transform, zoomIdentity.translate(x, 0).scale(k));
    }
    return () => {
      select(svg).on('.zoom', null);
    };
    // Set up once per layout; later visibility changes keep the current view.
  }, [layout, viewWidth]);

  const duration = reducedMotion ? 0 : 280;
  const zoomBy = (factor: number) => {
    const svg = svgRef.current;
    if (svg && zoomRef.current) select(svg).transition().duration(duration).call(zoomRef.current.scaleBy, factor);
  };
  const resetZoom = () => {
    const svg = svgRef.current;
    if (svg && zoomRef.current) select(svg).transition().duration(duration).call(zoomRef.current.transform, zoomIdentity);
  };

  /** If a focused entry is outside the visible area, pan it into view. */
  const ensureVisible = useCallback(
    (id: string) => {
      const svg = svgRef.current;
      const p = layout.positions[id];
      if (!svg || !p || !zoomRef.current) return;
      const t = transformRef.current;
      const [sx, sy] = t.apply([p.x, p.y]);
      const margin = 60;
      if (sx < margin || sx > viewWidth - margin - 180 || sy < margin || sy > layout.height - margin) {
        select(svg)
          .transition()
          .duration(duration)
          .call(zoomRef.current.translateTo, p.x + 90, p.y);
      }
    },
    [layout, viewWidth, duration],
  );

  const focusNode = (id: string) => {
    setActiveId(id);
    const el = svgRef.current?.querySelector<SVGGElement>(`[data-id="${CSS.escape(id)}"]`);
    el?.focus({ preventScroll: true });
    ensureVisible(id);
  };

  const onKeyDown = (e: React.KeyboardEvent, node: GraphNode) => {
    const dir = ARROWS[e.key];
    if (dir && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      const next = nearestInDirection(node.id, dir, layout.positions, [...visibleIds]);
      if (next) focusNode(next);
      return;
    }
    if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      const target = e.key === 'Home' ? visibleNodes[0] : visibleNodes.at(-1);
      if (target) focusNode(target.id);
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectNode(node, { returnFocusTo: e.currentTarget as HTMLElement });
    }
  };

  // When the selection changes (from the map, the details panel or a URL),
  // it becomes the tab stop. Adjusting state during render is React's
  // recommended pattern for "reset state when a prop changes".
  const [prevSelected, setPrevSelected] = useState(selected);
  if (selected !== prevSelected) {
    setPrevSelected(selected);
    if (selected) setActiveId(selected.id);
  }

  // ...and is panned into view.
  useEffect(() => {
    if (selected && visibleIds.has(selected.id)) ensureVisible(selected.id);
  }, [selected, visibleIds, ensureVisible]);

  // Emphasis: hover/focus shows an entry's neighbourhood; otherwise the
  // selection does; otherwise search matches do.
  const emphasisId = hoverId ?? focusId ?? selected?.id ?? null;
  const emphasis = useMemo(() => {
    if (emphasisId) {
      const set = new Set(index.neighbours.get(emphasisId) ?? []);
      set.add(emphasisId);
      return set;
    }
    if (searchTerm.trim()) return matches;
    return null;
  }, [emphasisId, index, matches, searchTerm]);

  const pos = layout.positions;
  const counts = Object.fromEntries(COLUMN_ORDER.map((t) => [t, visibleNodes.filter((n) => n.type === t).length]));

  return (
    <div className="relative h-full w-full overflow-hidden bg-paper">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${viewWidth} ${layout.height}`}
        preserveAspectRatio="xMidYMin meet"
        className="block h-full w-full touch-none select-none"
        role="group"
        aria-labelledby="map-title"
        aria-describedby="map-instructions"
      >
        <title id="map-title">Network map</title>
        <g ref={sceneRef}>
          <g transform="translate(-40 0)">
            {/* Column headings */}
            <g aria-hidden="true">
              {layout.columns
                .filter((c) => visibleTypes[c.type])
                .map((c) => (
                  <text
                    key={c.type}
                    x={c.x - 6}
                    y={46}
                    className="fill-ink-muted"
                    style={{ font: '600 14px var(--font-display)' }}
                  >
                    {TYPE_META[c.type].plural} ({counts[c.type]})
                  </text>
                ))}
            </g>

            {/* Edges */}
            <g aria-hidden="true" fill="none">
              {visibleLinks.map((l) => {
                const a = pos[l.source];
                const b = pos[l.target];
                const [s, t] = a.x <= b.x ? [a, b] : [b, a];
                const mid = (s.x + t.x) / 2;
                const active = !!emphasisId && (l.source === emphasisId || l.target === emphasisId);
                // With an entry emphasised, only its own edges stay; with a
                // search, edges between two matches stay.
                const dimmed = emphasisId
                  ? !active
                  : !!emphasis && !(emphasis.has(l.source) && emphasis.has(l.target));
                return (
                  <path
                    key={`${l.source}-${l.target}`}
                    d={`M${s.x},${s.y} C${mid},${s.y} ${mid},${t.y} ${t.x},${t.y}`}
                    className="graph-edge"
                    data-active={active || undefined}
                    data-dimmed={dimmed || undefined}
                  />
                );
              })}
            </g>

            {/* Entries */}
            <g>
              {visibleNodes.map((n) => {
                const p = pos[n.id];
                const meta = TYPE_META[n.type];
                const degree = index.neighbours.get(n.id)?.size ?? 0;
                const label = `${n.name}, ${meta.singularLower}, ${degree} connection${degree === 1 ? '' : 's'}`;
                const dimmed = !!emphasis && !emphasis.has(n.id);
                const isMatch = !!searchTerm.trim() && matches.has(n.id);
                const isSelected = selected?.id === n.id;
                const r = 6 + Math.min(4, Math.sqrt(degree));
                // Only emphasised entries keep a full-strength label.
                const content = (
                  <>
                    <circle cx={0} cy={0} r={r + 6} className="focus-ring" />
                    {/* generous hit area */}
                    <rect x={-14} y={-14} width={210} height={28} fill="transparent" />
                    <path
                      d={MARK_PATHS[n.type]}
                      transform={`translate(${-r} ${-r}) scale(${(r * 2) / 10})`}
                      fill={`var(--color-${meta.token})`}
                    />
                    <text x={r + 8} y={4.5}>
                      {shortLabel(n.name)}
                    </text>
                  </>
                );
                const common = {
                  'data-id': n.id,
                  'data-dimmed': dimmed || undefined,
                  'data-match': isMatch || undefined,
                  'data-selected': isSelected || undefined,
                  className: 'graph-node',
                  transform: `translate(${p.x} ${p.y})`,
                };
                if (!mounted) {
                  // Server HTML / no JavaScript: a real link to the entry's page.
                  return (
                    <a key={n.id} href={hrefFor(n)} aria-label={label} {...common}>
                      {content}
                    </a>
                  );
                }
                return (
                  <g
                    key={n.id}
                    role="button"
                    tabIndex={n.id === tabStop ? 0 : -1}
                    aria-label={label}
                    aria-pressed={isSelected}
                    {...common}
                    onClick={(e) => {
                      setActiveId(n.id);
                      selectNode(n, { returnFocusTo: e.currentTarget as unknown as HTMLElement });
                    }}
                    onKeyDown={(e) => onKeyDown(e, n)}
                    onFocus={() => setFocusId(n.id)}
                    onBlur={() => setFocusId((f) => (f === n.id ? null : f))}
                    onPointerEnter={() => setHoverId(n.id)}
                    onPointerLeave={() => setHoverId((h) => (h === n.id ? null : h))}
                  >
                    <title>{n.name}</title>
                    {content}
                  </g>
                );
              })}
            </g>
          </g>
        </g>
      </svg>

      <p id="map-instructions" className="sr-only">
        {visibleNodes.length} entries in four columns: partners, people, projects and methods. Use the arrow keys to
        move between entries and Enter to open details. The table view lists the same data.
      </p>

      {mounted && (
        <div className="no-print absolute bottom-4 right-4 flex items-center gap-1 rounded-full bg-paper/95 p-1 shadow-[0_1px_2px_rgb(34_33_42/0.08),0_8px_24px_-12px_rgb(34_33_42/0.25)] ring-1 ring-rule">
          <button type="button" onClick={() => zoomBy(1 / 1.4)} className="icon-btn shadow-none!" aria-label="Zoom out">
            <MinusIcon />
          </button>
          <span className="meta w-12 text-center tabular-nums" aria-hidden="true">
            {zoomPct}%
          </span>
          <button type="button" onClick={() => zoomBy(1.4)} className="icon-btn shadow-none!" aria-label="Zoom in">
            <PlusIcon />
          </button>
          <button type="button" onClick={resetZoom} className="icon-btn shadow-none!" aria-label="Fit the whole map">
            <FitIcon />
          </button>
        </div>
      )}
    </div>
  );
}
