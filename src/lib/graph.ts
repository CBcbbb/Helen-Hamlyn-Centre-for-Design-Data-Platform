/**
 * Pure graph helpers. No data import here, so they work with any GraphData
 * (the real dataset, a filtered view in the browser, or a test fixture).
 */
import type { GraphData, GraphLink, GraphNode, NodeType } from './types';
import { NODE_TYPES } from './types';
import { toPlain } from './text';

export interface GraphIndex {
  data: GraphData;
  byId: Map<string, GraphNode>;
  neighbours: Map<string, Set<string>>;
}

export function indexGraph(data: GraphData): GraphIndex {
  const byId = new Map(data.nodes.map((n) => [n.id, n]));
  const neighbours = new Map<string, Set<string>>(data.nodes.map((n) => [n.id, new Set()]));
  for (const l of data.links) {
    neighbours.get(l.source)?.add(l.target);
    neighbours.get(l.target)?.add(l.source);
  }
  return { data, byId, neighbours };
}

/** Direct neighbours of a node, optionally filtered by type, sorted by name. */
export function neighboursOf(index: GraphIndex, id: string, type?: NodeType): GraphNode[] {
  const ids = index.neighbours.get(id) ?? new Set<string>();
  return [...ids]
    .map((nid) => index.byId.get(nid))
    .filter((n): n is GraphNode => !!n && (!type || n.type === type))
    .sort(byName);
}

/**
 * Nodes two steps away through an intermediate type, e.g. partners reached
 * through a project's people. Each result lists which intermediates lead to it.
 */
export function twoStep(
  index: GraphIndex,
  id: string,
  via: NodeType,
  target: NodeType,
): { node: GraphNode; via: GraphNode[] }[] {
  const result = new Map<string, { node: GraphNode; via: GraphNode[] }>();
  for (const mid of neighboursOf(index, id, via)) {
    for (const end of neighboursOf(index, mid.id, target)) {
      if (end.id === id) continue;
      const entry = result.get(end.id) ?? { node: end, via: [] };
      entry.via.push(mid);
      result.set(end.id, entry);
    }
  }
  return [...result.values()].sort((a, b) => b.via.length - a.via.length || byName(a.node, b.node));
}

export function degree(index: GraphIndex, id: string): number {
  return index.neighbours.get(id)?.size ?? 0;
}

export function byName(a: GraphNode, b: GraphNode): number {
  return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
}

export function countByType(nodes: GraphNode[]): Record<NodeType, number> {
  const counts = Object.fromEntries(NODE_TYPES.map((t) => [t, 0])) as Record<NodeType, number>;
  for (const n of nodes) counts[n.type]++;
  return counts;
}

/** Keep only nodes of visible types, and links whose ends are both kept. */
export function filterByType(data: GraphData, visible: Record<NodeType, boolean>): GraphData {
  const nodes = data.nodes.filter((n) => visible[n.type]);
  const ids = new Set(nodes.map((n) => n.id));
  const links: GraphLink[] = data.links.filter((l) => ids.has(l.source) && ids.has(l.target));
  return { nodes, links };
}

/** The main descriptive text for any node type. */
export function primaryText(node: GraphNode): string {
  switch (node.type) {
    case 'People':
    case 'Partners':
      return toPlain(node.bio);
    case 'Projects':
    case 'Methods':
      return toPlain(node.description);
  }
}

/**
 * Case-insensitive search across the fields the original app searched:
 * name, bio, description, methods (free text) and category.
 */
export function searchNodes(nodes: GraphNode[], term: string): Set<string> {
  const q = term.trim().toLowerCase();
  const matches = new Set<string>();
  if (!q) return matches;
  for (const node of nodes) {
    const fields: string[] = [node.name, primaryText(node)];
    if (node.type === 'Projects') fields.push(toPlain(node.methods));
    if (node.type === 'Methods') fields.push(toPlain(node.category));
    if (fields.some((f) => f.toLowerCase().includes(q))) matches.add(node.id);
  }
  return matches;
}
