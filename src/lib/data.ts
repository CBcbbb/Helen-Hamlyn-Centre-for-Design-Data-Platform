/**
 * The dataset, typed and indexed. Imported at build time, so every page that
 * uses it is statically generated and no data is fetched at runtime.
 */
import raw from '@/data/graphData.json';
import type { GraphData, GraphNode, NodeType, ProjectNode } from './types';
import { indexGraph, byName } from './graph';
import { TYPE_META } from './types-meta';

export const graph: GraphData = raw as GraphData;
export const index = indexGraph(graph);

/**
 * The project the first-visit guide highlights on the map. Chosen for being
 * one concrete, well-documented example with a spread of connections: three
 * people, four methods, a stated legacy, and a public archive link. Changing
 * this ID is the only thing needed to start the guide somewhere else.
 */
export const FEATURED_PROJECT_ID = 'PR004';

export function getNode(id: string): GraphNode | undefined {
  return index.byId.get(id);
}

export function nodesOfType<T extends NodeType>(type: T): Extract<GraphNode, { type: T }>[] {
  return graph.nodes.filter((n) => n.type === type).sort(byName) as Extract<GraphNode, { type: T }>[];
}

export function getBySlug(type: NodeType, slug: string): GraphNode | undefined {
  return graph.nodes.find((n) => n.type === type && n.slug === slug);
}

export function hrefFor(node: Pick<GraphNode, 'type' | 'slug'>): string {
  return `/${TYPE_META[node.type].segment}/${node.slug}`;
}

export function getFeaturedProject(): ProjectNode {
  const node = getNode(FEATURED_PROJECT_ID);
  if (!node || node.type !== 'Projects') {
    throw new Error(`Featured project ${FEATURED_PROJECT_ID} is missing or not a project`);
  }
  return node;
}
