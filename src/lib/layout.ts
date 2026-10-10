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
/** Labels longer than this are shortened in the columns arrangement (the full name is on hover, focus and in the details). */
export const LABEL_MAX = 34;

/**
 * Constellation labels follow the original platform's look: the name itself,
 * bold and in its type's colour, centred under the entry's mark and wrapped
 * onto up to three lines.
 */
export const STAR_FONT = 17;
export const STAR_LINE = 20;
const STAR_CHAR = 9.4;
const STAR_WRAP = 18;
const STAR_MAX_LINES = 3;

/** Split a name into up to three centred lines for the constellation. */
export function wrapLabel(name: string): string[] {
  const words = name.trim().split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length > STAR_WRAP && line) {
      lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  if (lines.length > STAR_MAX_LINES) {
    const kept = lines.slice(0, STAR_MAX_LINES);
    kept[STAR_MAX_LINES - 1] = `${kept[STAR_MAX_LINES - 1].replace(/[\s,:;/–-]+$/, '')}…`;
    return kept;
  }
  return lines;
}

/** The extent of a constellation entry (mark plus wrapped label) relative to its point. */
export function starBox(name: string): { left: number; right: number; top: number; bottom: number } {
  const lines = wrapLabel(name);
  const w = Math.max(NODE_RADIUS * 2, ...lines.map((l) => l.length * STAR_CHAR)) + 8;
  return { left: -w / 2, right: w / 2, top: -NODE_RADIUS - 4, bottom: NODE_RADIUS + 6 + lines.length * STAR_LINE };
}

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
  /** Extent of the mark and label around the point, used to keep labels apart. */
  box: { left: number; right: number; top: number; bottom: number };
}

export function shortLabel(name: string): string {
  const clean = name.trim();
  if (clean.length <= LABEL_MAX) return clean;
  const cut = clean.slice(0, LABEL_MAX - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > 20 ? cut.slice(0, space) : cut).replace(/[\s,:;/–-]+$/, '')}…`;
}

export function computeLayout(data: GraphData): Layout {
  const perColumn = Math.max(1, ...COLUMN_ORDER.map((t) => data.nodes.filter((n) => n.type === t).length));
  // Tall enough for the columns, and for the constellation's larger labels.
  const constellation = computeConstellation(
    data,
    LAYOUT_WIDTH,
    Math.max(perColumn * 38 + 140, Math.round(Math.sqrt(data.nodes.length) * 132)),
  );
  const height = constellation.height;
  return {
    width: LAYOUT_WIDTH,
    height,
    columns: COLUMN_ORDER.map((type) => ({ type, x: columnX(type) })),
    positions: {
      constellation: constellation.positions,
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
function computeConstellation(data: GraphData, width: number, height: number): { positions: Record<string, Position>; height: number } {
  const R = NODE_RADIUS;
  const margin = 16;
  // Start from a sunflower spiral in name order: deterministic and even.
  const sorted = [...data.nodes].sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
  const golden = Math.PI * (3 - Math.sqrt(5));
  const nodes: SimNode[] = sorted.map((n, i) => {
    const r = 30 * Math.sqrt(i + 0.5);
    return {
      id: n.id,
      type: n.type,
      box: starBox(n.name),
      x: width / 2 + r * Math.cos(i * golden) * 1.4,
      y: height / 2 + r * Math.sin(i * golden),
    };
  });
  const links: SimulationLinkDatum<SimNode>[] = data.links.map((l) => ({ source: l.source, target: l.target }));

  const PAD_X = 10;
  const PAD_Y = 8;
  const boxCollide = (strength = 0.7) => {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const acx = a.x! + (a.box.left + a.box.right) / 2;
        const acy = a.y! + (a.box.top + a.box.bottom) / 2;
        const bcx = b.x! + (b.box.left + b.box.right) / 2;
        const bcy = b.y! + (b.box.top + b.box.bottom) / 2;
        const dx = bcx - acx;
        const dy = bcy - acy;
        const ox = (a.box.right - a.box.left + b.box.right - b.box.left) / 2 + PAD_X - Math.abs(dx);
        const oy = (a.box.bottom - a.box.top + b.box.bottom - b.box.top) / 2 + PAD_Y - Math.abs(dy);
        if (ox <= 0 || oy <= 0) continue;
        // Separate along the axis that needs the smaller move.
        if (oy < ox) {
          const s = (oy / 2) * strength * (dy === 0 ? (i % 2 ? 1 : -1) : Math.sign(dy));
          a.y! -= s;
          b.y! += s;
        } else {
          const s = (ox / 2) * strength * (dx === 0 ? (i % 2 ? 1 : -1) : Math.sign(dx));
          a.x! -= s;
          b.x! += s;
        }
      }
    }
  };

  const clamp = () => {
    for (const n of nodes) {
      n.x = Math.max(margin - n.box.left, Math.min(width - margin - n.box.right, n.x ?? 0));
      n.y = Math.max(margin - n.box.top, Math.min(height - margin - n.box.bottom, n.y ?? 0));
    }
  };

  const sim = forceSimulation(nodes)
    .force(
      'link',
      forceLink<SimNode, SimulationLinkDatum<SimNode>>(links)
        .id((d) => d.id)
        .distance(120)
        .strength(0.22),
    )
    .force('charge', forceManyBody<SimNode>().strength(-420).distanceMax(520))
    .force('x', forceX<SimNode>(width / 2).strength(0.03))
    .force('y', forceY<SimNode>(height / 2).strength(0.045))
    .force('collide', forceCollide<SimNode>(R + 34))
    .stop();

  for (let i = 0; i < 500; i++) {
    sim.tick();
    if (i > 120) boxCollide();
    clamp();
  }
  // Then separate any remaining overlaps fully, with the forces off.
  for (let i = 0; i < 200; i++) {
    boxCollide(0.4);
    clamp();
  }
  // Finally, a sweep from top to bottom that moves any entry still touching
  // one above it straight down. This guarantees no label overlaps another;
  // the frame grows to fit if needed.
  const byTop = [...nodes].sort((a, b) => a.y! + a.box.top - (b.y! + b.box.top));
  for (let i = 0; i < byTop.length; i++) {
    const n = byTop[i];
    for (let pass = 0; pass < 2; pass++) {
      for (let j = 0; j < i; j++) {
        const m = byTop[j];
        const xOverlap = n.x! + n.box.left < m.x! + m.box.right + 2 && m.x! + m.box.left < n.x! + n.box.right + 2;
        const yOverlap = n.y! + n.box.top < m.y! + m.box.bottom + 2 && m.y! + m.box.top < n.y! + n.box.bottom + 2;
        if (xOverlap && yOverlap) n.y = m.y! + m.box.bottom + 2 - n.box.top;
      }
    }
  }

  // Centre the drawing (marks and labels) in the frame, growing it if the sweep needed more room.
  const left = Math.min(...nodes.map((n) => n.x! + n.box.left));
  const right = Math.max(...nodes.map((n) => n.x! + n.box.right));
  const upper = Math.min(...nodes.map((n) => n.y! + n.box.top));
  const lower = Math.max(...nodes.map((n) => n.y! + n.box.bottom));
  const finalHeight = Math.max(height, Math.ceil(lower - upper + margin * 2));
  const dx = (width - (left + right)) / 2;
  const dy = (finalHeight - (upper + lower)) / 2;

  const positions: Record<string, Position> = {};
  for (const n of nodes) positions[n.id] = { x: Math.round(n.x! + dx), y: Math.round(n.y! + dy) };
  return { positions, height: finalHeight };
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
      box: { left: 0, right: 0, top: 0, bottom: 0 },
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
