/**
 * Network map layout.
 *
 * The data has a natural order: partners connect to people, people to
 * projects, projects to methods. Instead of a free-floating force layout
 * (a "hairball"), each type is pulled towards its own column and the force
 * simulation only arranges entries vertically within it. The result reads
 * left to right and stays the same between visits.
 *
 * d3-force seeds its own random source, so the layout is deterministic: the
 * server and the browser compute identical positions, which means the map
 * renders before JavaScript loads and never jumps on hydration.
 */
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from 'd3-force';
import type { SimulationLinkDatum, SimulationNodeDatum } from 'd3-force';
import type { GraphData, NodeType } from './types';

export const LAYOUT_WIDTH = 1200;
export const COLUMN_ORDER: NodeType[] = ['Partners', 'People', 'Projects', 'Methods'];
/** Column centres as fractions of the map width. */
export const COLUMN_X = [0.05, 0.31, 0.57, 0.83];

export interface Position {
  x: number;
  y: number;
}

export interface Layout {
  width: number;
  height: number;
  positions: Record<string, Position>;
  columns: { type: NodeType; x: number }[];
}

interface SimNode extends SimulationNodeDatum {
  id: string;
  type: NodeType;
}

export function computeLayout(data: GraphData): Layout {
  const perColumn = Math.max(1, ...COLUMN_ORDER.map((t) => data.nodes.filter((n) => n.type === t).length));
  const height = Math.max(640, perColumn * 44 + 160);
  const columnX = (t: NodeType) => COLUMN_X[COLUMN_ORDER.indexOf(t)] * LAYOUT_WIDTH;

  // Initial positions: in column, spread vertically in name order, so the
  // simulation starts from something sensible and settles quickly.
  const nodes: SimNode[] = COLUMN_ORDER.flatMap((t) => {
    const list = data.nodes
      .filter((n) => n.type === t)
      .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
    return list.map((n, i) => ({
      id: n.id,
      type: n.type,
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

  // Snap x exactly to the column (the x force gets close, not exact) and
  // keep everything inside the canvas.
  const positions: Record<string, Position> = {};
  const ys = nodes.map((n) => n.y ?? 0);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const span = Math.max(1, maxY - minY);
  const top = 96;
  const usable = height - top - 48;
  for (const n of nodes) {
    positions[n.id] = {
      x: Math.round(columnX(n.type)),
      y: Math.round(top + (((n.y ?? 0) - minY) / span) * usable),
    };
  }

  return {
    width: LAYOUT_WIDTH,
    height,
    positions,
    columns: COLUMN_ORDER.map((type) => ({ type, x: columnX(type) })),
  };
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
