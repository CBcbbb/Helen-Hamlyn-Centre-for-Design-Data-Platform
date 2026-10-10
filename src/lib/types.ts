/**
 * Typed data model for the platform.
 *
 * Four equal-weight entity types. The original spreadsheet was collected
 * person-first; it was re-modelled into these four profile types so that a
 * method or a partner organisation is as much a starting point as a person.
 */

export const NODE_TYPES = ['People', 'Partners', 'Projects', 'Methods'] as const;
export type NodeType = (typeof NODE_TYPES)[number];

/** A text field from the CSV. `a|b|c` in a cell becomes an array. */
export type Text = string | string[];

interface BaseNode {
  /** Stable ID from the spreadsheet, e.g. `PR004`. */
  id: string;
  /** URL-safe, unique within its type, derived from the name. */
  slug: string;
  name: string;
  type: NodeType;
}

export interface PersonNode extends BaseNode {
  type: 'People';
  bio?: Text;
  websites?: string[];
  social?: string[];
  /** Free text: institutions this person is connected to. */
  connections?: Text;
}

export interface PartnerNode extends BaseNode {
  type: 'Partners';
  bio?: Text;
  websites?: string[];
  social?: string[];
}

export interface ProjectNode extends BaseNode {
  type: 'Projects';
  description?: Text;
  who_involved?: Text;
  legacy_impacts?: Text;
  challenges?: Text;
  budget?: Text;
  /** Free text: methods as recorded in the spreadsheet. */
  methods?: Text;
  website?: string[];
  /** Free text: partners who funded, presented or supported the project. */
  involved_institutions?: Text;
}

export interface MethodNode extends BaseNode {
  type: 'Methods';
  description?: Text;
  steps?: Text;
  challenges?: Text;
  conditions?: Text;
  publications?: Text;
  templates?: Text;
  category?: Text;
}

export type GraphNode = PersonNode | PartnerNode | ProjectNode | MethodNode;

export interface GraphLink {
  source: string;
  target: string;
  strength: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface DataReport {
  generated_at: string;
  counts: Record<string, { total: number; parsed: number; skipped: number }>;
  skipped_rows: { file: string; row: number; reason: string }[];
  duplicate_ids: string[];
  missing_required_fields: { file: string; row: number; missing: string[] }[];
  /** Cells that held only a placeholder such as "/" and were treated as empty. */
  placeholder_values: { id: string; field: string; value: string }[];
  /** Links whose source or target ID does not exist. Excluded from the output. */
  dangling_links: { row: number; source: string; target: string; missing: string[] }[];
  /** Links whose declared Source/TargetType disagrees with the node's actual type. */
  link_type_mismatches: { row: number; id: string; declared: string; actual: string }[];
  duplicate_links: { row: number; source: string; target: string }[];
  /** Entities with no links at all. */
  unconnected_nodes: string[];
  slug_collisions: { type: string; slug: string; ids: string[] }[];
}
