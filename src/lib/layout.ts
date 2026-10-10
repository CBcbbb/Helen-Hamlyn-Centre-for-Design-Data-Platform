/**
 * Network map layouts.
 *
 * The map has two arrangements of the same entries:
 *
 * - **Constellation** (the default): a free, non-hierarchical arrangement in
 *   which entries settle near the ones they are connected to, whatever their
 *   type. This is the platform's rhizomatic map: no type sits above or
 *   before another, and clusters emerge from the connections themselves.
 * - **Columns**: the same entries sorted by type into four columns
 *   (partners, people, projects, methods), for reading the network's
 *   structure at a glance.
 *
 * Both are computed with d3-force, which seeds its own random source, so
 * the result is deterministic: the server and the browser compute identical
 * positions, the map renders before JavaScript loads, and it never jumps on
 * hydration or between visits.
 */
import { forceLink, forceManyBody, forceSimulation, forceX, forceY, forceCollide } from 'd3-force';
import type { SimulationLinkDatum, SimulationNodeDatum } from 'd3-force';
import type { GraphData, NodeType } from './types';

export const LAYOUT_WIDTH = 1200;
export const COLUMN_ORDER: NodeType[] = ['Partners', 'People', 'Projects', 'Methods'];
/** Column positions as fractions of the map width. */
export const COLUMN_X = [0.01, 0.27, 0.53, 0.78];
/** Every entry is drawn at the same size: none is more important than another. */
export const NODE_RADIUS = 7;
/** Labels longer than this are shortened on the map (the full name is on hover, focus and in the details). */
export const LABEL_MAX = 34;

export type Arrangement = 'constellation' | 'columns';
export const ARRANGEMENTS: Arrangement[] = ['constellation', 'columns'];

export interface Position {
  x: number;
  y: number;
}

export interface Layout {
  width: number;
  height: number;
  /** Column headings, used by the columns arrangement. */
  columns: { type: NodeType; x: number }[];
  positions: Record<Arrangement, Record<string, Position>>;
}

interface SimNode extends SimulationNodeDatum {
  id: string;
  type: NodeType;
  /** Estimated label width, used to keep labels apart. */
  lw: number;
}

export function shortLabel(name: string): string {
  const clean = name.trim();
  if (clean.length <= LABEL_MAX) return clean;
  const cut = clean.slice(0, LABEL_MAX - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > 20 ? cut.slice(0, space) : cut).replace(/[\s,:;/–-]+$/, '')}…`;
}

/** Rough rendered width of a map label at 14px Archivo. Good enough to keep labels from colliding. */
function labelWidth(name: string): number {
  return shortLabel(name).length * 7.2 + 4;
}

export function computeLayout(data: GraphData): Layout {
  const perColumn = Math.max(1, ...COLUMN_ORDER.map((t) => data.nodes.filter((n) => n.type === t).length));
  const height = Math.max(640, perColumn * 38 + 140);
  return {
    width: LAYOUT_WIDTH,
    height,
    columns: COLUMN_ORDER.map((type) => ({ type, x: columnX(type) })),
    positions: {
      constellation: computeConstellation(data, LAYOUT_WIDTH, height),
      columns: computeColumns(data, height),
    },
  };
}

function columnX(t: NodeType): number {
  return COLUMN_X[COLUMN_ORDER.indexOf(t)] * LAYOUT_WIDTH + NODE_RADIUS + 12;
}

/**
 * Free arrangement. Connected entries attract, all entries repel, and a
 * collision force treats each entry and its label as a box, so labels don't
 * sit on top of each other. Entries are kept inside the frame (with room for
 * their label on the right), so both arrangements share one frame and the
 * switch between them is a pure movement of the same entries.
 */
function computeConstellation(data: GraphData, width: number, height: number): Record<string, Position> {
  const R = NODE_RADIUS;
  const top = 36;
  const bottom = 28;
  // Start from a sunflower spiral in name order: deterministic and even.
  const sorted = [...data.nodes].sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
  const golden = Math.PI * (3 - Math.sqrt(5));
  const nodes: SimNode[] = sorted.map((n, i) => {
    const r = 28 * Math.sqrt(i + 0.5);
    return {
      id: n.id,
      type: n.type,
      lw: labelWidth(n.name),
      x: width / 2 + r * Math.cos(i * golden) * 1.5,
      y: height / 2 + r * Math.sin(i * golden),
    };
  });
  const links: SimulationLinkDatum<SimNode>[] = data.links.map((l) => ({ source: l.source, target: l.target }));

  // Each entry's box: the mark plus its label to the right.
  const box = (n: SimNode) => {
    const left = (n.x ?? 0) - R - 6;
    const right = (n.x ?? 0) + R + 8 + n.lw + 6;
    return { cx: (left + right) / 2, cy: n.y ?? 0, hw: (right - left) / 2, hh: 15 };
  };

  const boxCollide = () => {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const A = box(a);
        const B = box(b);
        const dx = B.cx - A.cx;
        const dy = B.cy - A.cy;
        const ox = A.hw + B.hw - Math.abs(dx);
        const oy = A.hh + B.hh + 6 - Math.abs(dy);
        if (ox <= 0 || oy <= 0) continue;
        // Separate along the axis that needs the smaller move. Moving
        // vertically is cheaper for wide labels, so prefer it.
        if (oy < ox * 1.6) {
          const s = (oy / 2) * 0.7 * (dy === 0 ? (i % 2 ? 1 : -1) : Math.sign(dy));
          a.y! -= s;
          b.y! += s;
        } else {
          const s = (ox / 2) * 0.7 * (dx === 0 ? (i % 2 ? 1 : -1) : Math.sign(dx));
          a.x! -= s;
          b.x! += s;
        }
      }
    }
  };

  const clamp = () => {
    for (const n of nodes) {
      const minX = R + 14;
      const maxX = width - (R + 8 + n.lw + 14);
      n.x = Math.max(minX, Math.min(maxX, n.x ?? 0));
      n.y = Math.max(top, Math.min(height - bottom, n.y ?? 0));
    }
  };

  const sim = forceSimulation(nodes)
    .force(
      'link',
      forceLink<SimNode, SimulationLinkDatum<SimNode>>(links)
        .id((d) => d.id)
        .distance(110)
        .strength(0.25),
    )
    .force('charge', forceManyBody<SimNode>().strength(-340).distanceMax(500))
    .force('x', forceX<SimNode>(width / 2 - 110).strength(0.018))
    .force('y', forceY<SimNode>(height / 2).strength(0.06))
    .force('collide', forceCollide<SimNode>(R + 22))
    .stop();

  for (let i = 0; i < 500; i++) {
    sim.tick();
    if (i > 120) boxCollide();
    clamp();
  }
  // A few passes with the forces off to settle any remaining overlaps.
  for (let i = 0; i < 60; i++) {
    boxCollide();
    clamp();
  }

  // Centre the drawing (marks and labels) in the frame.
  const left = Math.min(...nodes.map((n) => (n.x ?? 0) - R));
  const right = Math.max(...nodes.map((n) => (n.x ?? 0) + R + 8 + n.lw));
  const upper = Math.min(...nodes.map((n) => (n.y ?? 0) - R));
  const lower = Math.max(...nodes.map((n) => (n.y ?? 0) + R));
  const dx = (width - (left + right)) / 2;
  const dy = (height - (upper + lower)) / 2;

  const positions: Record<string, Position> = {};
  for (const n of nodes) positions[n.id] = { x: Math.round((n.x ?? 0) + dx), y: Math.round((n.y ?? 0) + dy) };
  return positions;
}

/**
 * Sorted arrangement. Each type is pulled into its own column and the force
 * simulation only arranges entries vertically within it, ordering them to
 * reduce crossing lines.
 */
function computeColumns(data: GraphData, height: number): Record<string, Position> {
  // Initial positions: in column, spread vertically in name order, so the
  // simulation starts from something sensible and settles quickly.
  const nodes: SimNode[] = COLUMN_ORDER.flatMap((t) => {
    const list = data.nodes
      .filter((n) => n.type === t)
      .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
    return list.map((n, i) => ({
      id: n.id,
      type: n.type,
      lw: 0,
      x: columnX(t),
      y: 100 + ((i + 0.5) / list.length) * (height - 200),
    }));
  });
  const links: SimulationLinkDatum<SimNode>[] = data.links.map((l) => ({ source: l.source, target: l.target }));

  const sim = forceSimulation(nodes)
    .force(
      'link',
      forceLink<SimNode, SimulationLinkDatum<SimNode>>(links)
        .id((d) => d.id)
        .strength(0.04),
    )
    .force('charge', forceManyBody<SimNode>().strength(-60).distanceMax(220))
    .force('x', forceX<SimNode>((d) => columnX(d.type)).strength(1))
    .force('y', forceY<SimNode>(height / 2).strength(0.02))
    .force('collide', forceCollide<SimNode>(19).strength(1).iterations(2))
    .stop();

  for (let i = 0; i < 400; i++) sim.tick();

  // Snap x exactly to the column, then within each column keep the
  // simulated order but enforce a minimum gap so labels never overlap, and
  // fit the result to the frame.
  const MIN_GAP = 30;
  const top = 84;
  const bottom = 40;
  const positions: Record<string, Position> = {};
  const columnYs = new Map<NodeType, { id: string; y: number }[]>();
  for (const t of COLUMN_ORDER) {
    const list = nodes
      .filter((n) => n.type === t)
      .map((n) => ({ id: n.id, y: n.y ?? 0 }))
      .sort((a, b) => a.y - b.y);
    if (!list.length) continue;
    const minY = list[0].y;
    const maxY = list[list.length - 1].y;
    const span = Math.max(1, maxY - minY);
    const usable = height - top - bottom;
    for (const item of list) item.y = top + ((item.y - minY) / span) * usable;
    for (let i = 1; i < list.length; i++) list[i].y = Math.max(list[i].y, list[i - 1].y + MIN_GAP);
    const limit = height - bottom;
    if (list[list.length - 1].y > limit) {
      list[list.length - 1].y = limit;
      for (let i = list.length - 2; i >= 0; i--) list[i].y = Math.min(list[i].y, list[i + 1].y - MIN_GAP);
    }
    columnYs.set(t, list);
  }
  const shift = Math.min(0, ...[...columnYs.values()].map((l) => l[0].y - top));
  for (const [t, list] of columnYs) {
    for (const item of list) positions[item.id] = { x: Math.round(columnX(t)), y: Math.round(item.y - shift) };
  }
  return positions;
}

/** Linear interpolation between two positions. */
export function lerpPosition(a: Position, b: Position, t: number): Position {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Smooth in-out easing for the switch between arrangements. */
export function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/**
 * Spatial keyboard navigation: from `fromId`, find the nearest visible node
 * in the arrow's direction. Candidates must lie within a 60° cone either side
 * of the direction; distance off-axis is penalised so ↓ prefers the node
 * directly below over one diagonally below.
 */
export function nearestInDirection(
  fromId: string,
  direction: 'up' | 'down' | 'left' | 'right',
  positions: Record<string, Position>,
  candidates: string[],
): string | undefined {
  const from = positions[fromId];
  if (!from) return undefined;
  const [dx, dy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[direction];
  let best: string | undefined;
  let bestScore = Infinity;
  for (const id of candidates) {
    if (id === fromId) continue;
    const p = positions[id];
    if (!p) continue;
    const vx = p.x - from.x;
    const vy = p.y - from.y;
    const along = vx * dx + vy * dy;
    if (along <= 0) continue;
    const across = Math.abs(vx * dy - vy * dx);
    if (across > along * Math.tan(Math.PI / 3)) continue;
    const score = along + across * 2;
    if (score < bestScore) {
      bestScore = score;
      best = id;
    }
  }
  return best;
}
