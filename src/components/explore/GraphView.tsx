'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { select } from 'd3-selection';
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';
import 'd3-transition';
import type { GraphNode } from '@/lib/types';
import { TYPE_META } from '@/lib/types-meta';
import {
  STAR_CHAR,
  COLUMN_ORDER,
  NODE_RADIUS,
  easeInOut,
  lerpPosition,
  nearestInDirection,
  shortLabel,
  starBox,
  wrapLabel,
  STAR_LINE,
  type Arrangement,
  type Position,
} from '@/lib/layout';
import { hrefFor } from '@/lib/data';
import { useMediaQuery, useMounted, REDUCED_MOTION_QUERY, WIDE_LAYOUT_QUERY } from '@/lib/hooks';
import { MARK_PATHS, TypeMark } from '../TypeMark';
import { useExplorer } from './ExplorerContext';
import { ColumnsIcon, ConstellationIcon, FitIcon, GuideIcon, MinusIcon, PlusIcon } from './icons';
import { GuideCard } from './GuideCard';

const R = NODE_RADIUS;
/** Switching arrangement: each type sets off a little after the previous one. */
const MOVE_MS = 760;
const TYPE_DELAY = 110;
/** Below this zoom, only emphasised entries keep their label. */
const FEW_LABELS_BELOW = 0.55;

const ARROWS: Record<string, 'up' | 'down' | 'left' | 'right'> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

const ARRANGEMENT_LABEL: Record<Arrangement, string> = {
  constellation: 'Constellation',
  columns: 'By type',
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const labelWidth = (name: string) => shortLabel(name).length * 7.7 + 4;
/** How much of the constellation label is showing at a given progress towards columns (they crossfade mid-move). */
const starOpacity = (p: number) => 1 - clamp01((p - 0.3) / 0.4);

/**
 * The network map. Rendered by React as SVG, so it is part of the server
 * HTML; d3 is used for the layouts (computed once, at build time) and for pan
 * and zoom (d3-zoom). Before JavaScript runs, each entry is a plain link to
 * its page. Once hydrated, entries become buttons that open the details
 * panel, and the map becomes a single tab stop navigated with the arrow keys
 * (a roving tabindex).
 *
 * The same entries can be arranged freely (a constellation) or sorted by
 * type into columns; switching moves every entry from one place to the
 * other, so you can follow what changed.
 */
export function GraphView() {
  const {
    data,
    index,
    layout,
    visibleTypes,
    matches,
    searchTerm,
    selected,
    select: selectNode,
    arrangement,
    setArrangement,
    path,
    guide,
    setGuide,
    guideStartId,
  } = useExplorer();
  const mounted = useMounted();
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const wide = useMediaQuery(WIDE_LAYOUT_QUERY, true);

  /* ------------------------------------------------------------------ */
  /* Arrangement and the move between arrangements                      */
  /* ------------------------------------------------------------------ */

  const [settled, setSettled] = useState<Arrangement>(arrangement);
  const [anim, setAnim] = useState<{ from: Arrangement; to: Arrangement; elapsed: number } | null>(null);
  const animRef = useRef(anim);

  useEffect(() => {
    const running = animRef.current;
    if (!running && arrangement === settled) return;
    if (reducedMotion) {
      animRef.current = null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- no motion: jump straight to the new arrangement
      setSettled(arrangement);
      setAnim(null);
      return;
    }
    const total = MOVE_MS + TYPE_DELAY * (COLUMN_ORDER.length - 1);
    // Switched again mid-move: turn round from where the entries are.
    const from = running ? running.to : settled;
    const already = running ? total - running.elapsed : 0;
    const to = arrangement;
    const start = performance.now() - already;
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      if (elapsed >= total) {
        animRef.current = null;
        setAnim(null);
        setSettled(to);
        return;
      }
      animRef.current = { from, to, elapsed };
      setAnim(animRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // `settled` is read as the starting point only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrangement, reducedMotion]);

  /** How far each entry is towards the columns arrangement (0 = constellation, 1 = columns). */
  const progress = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of data.nodes) {
      if (!anim) {
        m.set(n.id, settled === 'columns' ? 1 : 0);
        continue;
      }
      const delay = COLUMN_ORDER.indexOf(n.type) * TYPE_DELAY;
      const e = easeInOut(clamp01((anim.elapsed - delay) / MOVE_MS));
      m.set(n.id, anim.to === 'columns' ? e : 1 - e);
    }
    return m;
  }, [data.nodes, anim, settled]);

  const pos = useMemo(() => {
    const out: Record<string, Position> = {};
    for (const n of data.nodes) {
      out[n.id] = lerpPosition(layout.positions.constellation[n.id], layout.positions.columns[n.id], progress.get(n.id) ?? 0);
    }
    return out;
  }, [data.nodes, layout, progress]);
  /** Where entries are going (or are): used for keyboard movement and panning. */
  const targetPos = layout.positions[arrangement];
  const columnsShown = anim ? [...progress.values()].reduce((a, b) => a + b, 0) / progress.size : settled === 'columns' ? 1 : 0;

  /* ------------------------------------------------------------------ */
  /* Visible entries                                                    */
  /* ------------------------------------------------------------------ */

  const visibleNodes = useMemo(
    () =>
      data.nodes
        .filter((n) => visibleTypes[n.type])
        .sort((a, b) => {
          const c = COLUMN_ORDER.indexOf(a.type) - COLUMN_ORDER.indexOf(b.type);
          return c || targetPos[a.id].y - targetPos[b.id].y;
        }),
    [data.nodes, visibleTypes, targetPos],
  );
  const visibleIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);
  const visibleLinks = useMemo(
    () => data.links.filter((l) => visibleIds.has(l.source) && visibleIds.has(l.target)),
    [data.links, visibleIds],
  );

  /* ------------------------------------------------------------------ */
  /* Pan and zoom                                                       */
  /* ------------------------------------------------------------------ */

  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [fitK, setFitK] = useState(1);
  const movedByUserRef = useRef(false);
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const transformRef = useRef(transform);
  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  const fitTransform = useCallback(
    (w: number, h: number) => {
      // On wide screens, leave room for the legend panel at the top left.
      // On wide screens, leave room for the legend panel at the top left, and
      // keep the top and bottom clear of the floating controls.
      const reserve = 0;
      const top = w >= 768 ? 44 : 52;
      const bottom = 56;
      const k = Math.min((w - reserve) / layout.width, (h - top - bottom) / layout.height) * 0.98;
      return zoomIdentity
        .translate(reserve + (w - reserve - layout.width * k) / 2, top + Math.max(0, (h - top - bottom - layout.height * k) / 2))
        .scale(k);
    },
    [layout],
  );

  /**
   * The opening view: like the original platform, close enough that names
   * read at a comfortable size (about 16px), centred on the network, or on a
   * narrow screen on the guide's project. The fit button shows everything.
   */
  const openingTransform = useCallback(
    (w: number, h: number) => {
      const fit = fitTransform(w, h);
      const k = Math.max(fit.k, w >= 768 ? 0.84 : 0.82);
      if (k === fit.k) return fit;
      if (w >= 768) {
        return zoomIdentity.translate(w / 2 - (layout.width / 2) * k, h / 2 + 10 - (layout.height / 2) * k).scale(k);
      }
      const focus = layout.positions.constellation[guideStartId] ?? { x: layout.width / 2, y: layout.height / 2 };
      return zoomIdentity.translate(w * 0.42 - focus.x * k, h * 0.36 - focus.y * k).scale(k);
    },
    [fitTransform, layout, guideStartId],
  );

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !mounted) return;
    const behaviour = d3zoom<SVGSVGElement, unknown>().on(
      'zoom',
      (event: { transform: ZoomTransform; sourceEvent: Event | null }) => {
        if (event.sourceEvent) movedByUserRef.current = true;
        setTransform(event.transform);
      },
    );
    zoomRef.current = behaviour;
    const sel = select(svg);
    sel.call(behaviour).on('dblclick.zoom', null);

    const apply = () => {
      const w = svg.clientWidth;
      const h = svg.clientHeight;
      if (!w || !h) return;
      setSize({ w, h });
      const fit = fitTransform(w, h);
      setFitK(fit.k);
      behaviour.scaleExtent([fit.k * 0.8, Math.max(4, fit.k * 8)]);
      if (!movedByUserRef.current) sel.call(behaviour.transform, openingTransform(w, h));
    };
    apply();
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(apply);
    ro?.observe(svg);
    return () => {
      ro?.disconnect();
      sel.on('.zoom', null);
    };
  }, [mounted, fitTransform, openingTransform]);

  const duration = reducedMotion ? 0 : 320;
  const zoomBy = (factor: number) => {
    const svg = svgRef.current;
    movedByUserRef.current = true;
    if (svg && zoomRef.current) select(svg).transition().duration(duration).call(zoomRef.current.scaleBy, factor);
  };
  const fitAll = () => {
    const svg = svgRef.current;
    movedByUserRef.current = true;
    if (svg && zoomRef.current && size)
      select(svg).transition().duration(duration).call(zoomRef.current.transform, fitTransform(size.w, size.h));
  };

  /** Pan an entry into view if it is outside the visible area (or, on a narrow screen with details open, hidden under them). */
  const ensureVisible = useCallback(
    (id: string, where: Record<string, Position> = targetPos) => {
      const svg = svgRef.current;
      const p = where[id];
      const n = index.byId.get(id);
      if (!svg || !p || !n || !zoomRef.current || !size) return;
      const t = transformRef.current;
      const [sx, sy] = t.apply([p.x, p.y]);
      const sheetOpen = !wide && !!selected;
      const bottomLimit = sheetOpen ? size.h * 0.4 - 48 : size.h - 40;
      const box = where === layout.positions.columns ? null : starBox(n.name);
      const right = sx + (box ? box.right : R + 8 + labelWidth(n.name)) * t.k;
      const lowest = sy + (box ? box.bottom : R) * t.k;
      const leftmost = sx + (box ? box.left : -R) * t.k;
      if (leftmost < 16 || right > size.w - 16 || sy < 24 || lowest > bottomLimit) {
        const anchor: [number, number] = sheetOpen
          ? [Math.min(size.w * 0.3, size.w - 200), size.h * 0.2]
          : [Math.min(size.w / 2, size.w - (box ? box.right : R + 8 + labelWidth(n.name)) * t.k - 24), size.h / 2];
        select(svg)
          .transition()
          .duration(duration)
          .call(zoomRef.current.translateTo, p.x, p.y, anchor);
      }
    },
    [targetPos, index, size, wide, selected, duration, layout],
  );
  /* ------------------------------------------------------------------ */
  /* Keyboard: roving tabindex                                          */
  /* ------------------------------------------------------------------ */

  const [activeId, setActiveId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const tabStop =
    activeId && visibleIds.has(activeId)
      ? activeId
      : selected && visibleIds.has(selected.id)
        ? selected.id
        : guide === 'select' && visibleIds.has(guideStartId)
          ? guideStartId
          : visibleNodes[0]?.id;

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
      const next = nearestInDirection(node.id, dir, targetPos, [...visibleIds]);
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

  // When the selection changes (from the map, the details panel, the path or
  // a URL), it becomes the tab stop...
  const [prevSelected, setPrevSelected] = useState(selected);
  if (selected !== prevSelected) {
    setPrevSelected(selected);
    if (selected) setActiveId(selected.id);
  }
  // ...and is panned into view, as is the focused entry after a rearrangement.
  useEffect(() => {
    if (selected && visibleIds.has(selected.id)) ensureVisible(selected.id);
    // Only when the selection itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);
  useEffect(() => {
    if (anim) return;
    const id = selected?.id ?? focusId;
    if (id && visibleIds.has(id)) ensureVisible(id, layout.positions[settled]);
    // After the move has finished.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled]);

  /* ------------------------------------------------------------------ */
  /* Emphasis                                                           */
  /* ------------------------------------------------------------------ */

  // Hover/focus shows an entry's neighbourhood; otherwise the selection
  // does; otherwise search matches do.
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

  const pathIds = useMemo(() => new Set(path.map((n) => n.id)), [path]);
  const pathEdges = useMemo(() => {
    const s = new Set<string>();
    for (let i = 1; i < path.length; i++) {
      s.add(`${path[i - 1].id}|${path[i].id}`);
      s.add(`${path[i].id}|${path[i - 1].id}`);
    }
    return s;
  }, [path]);

  const k = mounted ? transform.k : 1;
  const fewLabels = mounted && k < FEW_LABELS_BELOW;
  const labelScale = fewLabels ? 0.85 / k : 1;
  const counts = Object.fromEntries(COLUMN_ORDER.map((t) => [t, visibleNodes.filter((n) => n.type === t).length]));
  const startNode = index.byId.get(guideStartId);

  /* ------------------------------------------------------------------ */
  /* Render                                                             */
  /* ------------------------------------------------------------------ */

  const scene = (
    <>
      {/* Column headings: only in the columns arrangement. */}
      <g aria-hidden="true" style={{ opacity: columnsShown }} pointerEvents="none">
        {columnsShown > 0.01 &&
          layout.columns
            .filter((c) => visibleTypes[c.type])
            .map((c) => (
              <text key={c.type} x={c.x - 6} y={46} className="fill-ink-muted" style={{ font: '600 14px var(--font-display)' }}>
                {TYPE_META[c.type].plural} ({counts[c.type]})
              </text>
            ))}
      </g>

      {/* Edges */}
      <g aria-hidden="true" fill="none">
        {visibleLinks.map((l) => {
          const a = pos[l.source];
          const b = pos[l.target];
          // Order by column so the S-curve always runs left to right.
          const flip = layout.positions.columns[l.source].x > layout.positions.columns[l.target].x;
          const [s, e] = flip ? [b, a] : [a, b];
          const w = ((progress.get(l.source) ?? 0) + (progress.get(l.target) ?? 0)) / 2;
          // Constellation: a gentle arc, like the threads of a mycelium.
          // Columns: an S-curve. Both are written as cubic curves so one
          // blends into the other during the move.
          // Constellation: straight threads between names, as in the original.
          const qx = (s.x + e.x) / 2;
          const qy = (s.y + e.y) / 2;
          const arc1 = { x: s.x + ((qx - s.x) * 2) / 3, y: s.y + ((qy - s.y) * 2) / 3 };
          const arc2 = { x: e.x + ((qx - e.x) * 2) / 3, y: e.y + ((qy - e.y) * 2) / 3 };
          const mid = (s.x + e.x) / 2;
          const c1x = arc1.x + (mid - arc1.x) * w;
          const c1y = arc1.y + (s.y - arc1.y) * w;
          const c2x = arc2.x + (mid - arc2.x) * w;
          const c2y = arc2.y + (e.y - arc2.y) * w;
          const active = !!emphasisId && (l.source === emphasisId || l.target === emphasisId);
          const onPath = pathEdges.has(`${l.source}|${l.target}`);
          // With an entry emphasised, only its own edges stay; with a
          // search, edges between two matches stay.
          const dimmed = emphasisId
            ? !active && !onPath
            : !!emphasis && !(emphasis.has(l.source) && emphasis.has(l.target));
          return (
            <path
              key={`${l.source}-${l.target}`}
              d={`M${s.x},${s.y} C${c1x},${c1y} ${c2x},${c2y} ${e.x},${e.y}`}
              className="graph-edge"
              data-active={active || undefined}
              data-path={onPath || undefined}
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
          const isGuide = mounted && guide === 'select' && n.id === guideStartId;
          const emphasised =
            isSelected || isMatch || isGuide || pathIds.has(n.id) || (!!emphasis && emphasis.has(n.id));
          const showLabel = !fewLabels || emphasised;
          const scale = fewLabels && emphasised ? labelScale : 1;
          const pr = progress.get(n.id) ?? 0;
          const starOp = starOpacity(pr);
          const lines = wrapLabel(n.name);
          const box = starBox(n.name);
          const content = (
            <>
              {isGuide &&
                (starOp > 0.5 ? (
                  <rect x={box.left - 6} y={box.top - 6} width={box.right - box.left + 12} height={box.bottom - box.top + 12} rx={12} className="guide-pulse" />
                ) : (
                  <circle cx={0} cy={0} r={R + 9} className="guide-pulse" />
                ))}
              {starOp > 0.5 ? (
                <rect
                  x={(box.left - 4) * scale}
                  y={(box.top - 4) * scale}
                  width={(box.right - box.left + 8) * scale}
                  height={(box.bottom - box.top + 8) * scale}
                  rx={8}
                  className="focus-ring"
                />
              ) : (
                <circle cx={0} cy={0} r={R + 5} className="focus-ring" />
              )}
              {/* generous hit area: the mark and its label, in whichever arrangement is showing */}
              {starOp > 0.5 ? (
                <rect
                  x={box.left * scale - 4}
                  y={box.top * scale - 4}
                  width={(box.right - box.left) * scale + 8}
                  height={(box.bottom - box.top) * scale + 8}
                  fill="transparent"
                />
              ) : (
                <rect x={-R - 8} y={-16} width={R * 2 + 16 + labelWidth(n.name) * scale} height={32} fill="transparent" />
              )}
              {/* The type's shape: before the name in the constellation, the entry's point in columns. */}
              <path
                d={MARK_PATHS[n.type]}
                transform={(() => {
                  const t = 1 - starOp;
                  const mx = (-(lines[0].length * STAR_CHAR + 22) / 2 + 7) * scale * (1 - t);
                  const my = ((-(lines.length * STAR_LINE) / 2 + STAR_LINE * 0.5) * scale) * (1 - t);
                  const r = R * (0.8 * (1 - t) + t);
                  return `translate(${mx - r} ${my - r}) scale(${(r * 2) / 10})`;
                })()}
                fill={`var(--color-${meta.token})`}
              />
              {showLabel && starOp > 0 && (
                <text
                  className="star-label"
                  transform={scale !== 1 ? `scale(${scale})` : undefined}
                  style={{ opacity: starOp, fill: `var(--color-${meta.token}-text)` }}
                >
                  {lines.map((line, i) => (
                    <tspan key={i} x={i === 0 ? 11 : 0} y={-(lines.length * STAR_LINE) / 2 + STAR_LINE * (i + 0.74)}>
                      {line}
                    </tspan>
                  ))}
                </text>
              )}
              {showLabel && starOp < 1 && (
                <text
                  className="column-label"
                  x={R + 8}
                  y={4.5}
                  transform={scale !== 1 ? `scale(${scale})` : undefined}
                  style={{ opacity: 1 - starOp }}
                >
                  {shortLabel(n.name)}
                </text>
              )}
            </>
          );
          const common = {
            'data-id': n.id,
            'data-dimmed': dimmed || undefined,
            'data-match': isMatch || undefined,
            'data-selected': isSelected || undefined,
            'data-path': (pathIds.has(n.id) && !isSelected) || undefined,
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
              onPointerEnter={(e) => e.pointerType === 'mouse' && setHoverId(n.id)}
              onPointerLeave={() => setHoverId((h) => (h === n.id ? null : h))}
            >
              <title>{n.name}</title>
              {content}
            </g>
          );
        })}
      </g>
    </>
  );

  // Where the guide's first card sits: just below its project, inside the map.
  let guideCardStyle: React.CSSProperties | undefined;
  if (mounted && guide === 'select' && startNode && size && wide) {
    const [sx, sy0] = transform.apply([pos[guideStartId].x, pos[guideStartId].y]);
    // Below the entry's label (constellation labels sit under the mark).
    const sy = sy0 + (starOpacity(progress.get(guideStartId) ?? 0) > 0.5 ? starBox(startNode.name).bottom * transform.k : 0);
    const cardW = 372;
    const left = Math.max(12, Math.min(size.w - cardW - 12, sx - 28));
    // (The caret points up at the entry from 28px in.)
    const below = sy + 26 + 190 < size.h;
    guideCardStyle = below
      ? { left, top: sy + 16, width: cardW }
      : { left, top: sy0 - 26, width: cardW, transform: 'translateY(-100%)' };
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-paper">

      {mounted && (
        <fieldset className="absolute right-3 top-3 z-10 md:right-4 md:top-4">
          <legend className="sr-only">Arrange the map</legend>
          <div className="flex rounded-full bg-paper/95 p-0.5 shadow-[0_1px_2px_rgb(34_33_42/0.08),0_8px_24px_-12px_rgb(34_33_42/0.25)] ring-1 ring-rule backdrop-blur-sm">
            {(['constellation', 'columns'] as const).map((a) => (
              <label
                key={a}
                className="relative inline-flex min-h-10 cursor-pointer select-none items-center gap-2 rounded-full px-3 text-[0.875rem] font-medium text-ink-muted transition-colors hover:text-ink has-[:checked]:bg-ink has-[:checked]:text-paper has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent sm:px-3.5"
              >
                <input
                  type="radio"
                  name="arrangement"
                  value={a}
                  checked={arrangement === a}
                  onChange={() => {
                    setArrangement(a);
                    if (guide === 'arrange') setGuide('done');
                  }}
                  className="absolute inset-0 cursor-pointer appearance-none rounded-full focus:outline-none"
                />
                {a === 'constellation' ? <ConstellationIcon /> : <ColumnsIcon />}
                <span className="max-sm:sr-only">{ARRANGEMENT_LABEL[a]}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {mounted && guide === 'select' && startNode && visibleIds.has(guideStartId) && (
        <GuideCard
          step={1}
          className={wide ? 'absolute z-20' : 'absolute inset-x-3 bottom-[4.75rem] z-20'}
          style={guideCardStyle}
          caret={wide ? (guideCardStyle?.transform ? 'bottom' : 'top') : undefined}
          title={
            <span className="inline-flex items-center gap-2">
              <TypeMark type="Projects" size="0.7em" />
              {startNode.name}
            </span>
          }
          primary={{ label: `Open ${startNode.name}`, onClick: () => selectNode(startNode) }}
          onSkip={() => setGuide('done')}
        >
          Select a project to see the people, methods and partners connected to it. Try this one.
        </GuideCard>
      )}

      {mounted && guide === 'arrange' && (
        <GuideCard
          step={4}
          className="absolute right-3 top-[3.75rem] z-20 w-[min(19rem,calc(100%-1.5rem))] md:right-4"
          caret="top-right"
          title="Two ways to see it"
          primary={{
            label: 'Arrange by type',
            onClick: () => {
              setArrangement('columns');
              setGuide('done');
            },
          }}
          onSkip={() => setGuide('done')}
          skipLabel="Done"
        >
          The same entries can be sorted into columns of partners, people, projects and methods. Switch back at any time.
        </GuideCard>
      )}

      <svg
        ref={svgRef}
        viewBox={mounted ? undefined : `0 0 ${layout.width} ${layout.height}`}
        preserveAspectRatio="xMidYMin meet"
        className="block h-full w-full touch-none select-none"
        role="group"
        aria-labelledby="map-title"
        aria-describedby="map-instructions"
        data-labels={fewLabels ? 'few' : undefined}
      >
        <title id="map-title">Network map</title>
        <g transform={mounted ? transform.toString() : undefined}>{scene}</g>
      </svg>

      <p id="map-instructions" className="sr-only">
        {visibleNodes.length} entries,{' '}
        {arrangement === 'columns'
          ? 'arranged in four columns: partners, people, projects and methods.'
          : 'each placed near the entries it is connected to.'}{' '}
        Use the arrow keys to move between entries and Enter to open details. The table view lists the same data.
      </p>

      {mounted && (
        <div className="no-print absolute bottom-3 right-3 z-10 flex items-center gap-1 rounded-full bg-paper/95 p-1 shadow-[0_1px_2px_rgb(34_33_42/0.08),0_8px_24px_-12px_rgb(34_33_42/0.25)] ring-1 ring-rule md:bottom-4 md:right-4">
          <button type="button" onClick={() => zoomBy(1 / 1.4)} className="icon-btn shadow-none!" aria-label="Zoom out">
            <MinusIcon />
          </button>
          <span className="meta hidden w-12 text-center tabular-nums sm:inline" aria-hidden="true">
            {Math.round((transform.k / fitK) * 100)}%
          </span>
          <button type="button" onClick={() => zoomBy(1.4)} className="icon-btn shadow-none!" aria-label="Zoom in">
            <PlusIcon />
          </button>
          <button type="button" onClick={fitAll} className="icon-btn shadow-none!" aria-label="Fit the whole map">
            <FitIcon />
          </button>
          <span className="mx-0.5 h-6 w-px bg-rule" aria-hidden="true" />
          <button
            type="button"
            onClick={() => {
              selectNode(null);
              setGuide('select');
              if (startNode) ensureVisible(startNode.id, layout.positions[arrangement]);
            }}
            className="icon-btn shadow-none!"
            aria-label="Show the guide"
            title="Show the guide"
          >
            <GuideIcon />
          </button>
        </div>
      )}
    </div>
  );
}
