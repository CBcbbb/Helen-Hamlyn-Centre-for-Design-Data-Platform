import type { NodeType } from './types';

/**
 * Presentation metadata per entity type. The one place that maps a type to
 * its URL segment, labels and CSS token name. Colour values themselves live
 * only in src/app/globals.css as custom properties.
 */
export interface TypeMeta {
  type: NodeType;
  /** URL segment, e.g. /projects/... */
  segment: string;
  singular: string;
  plural: string;
  /** Lower-case forms for running text. */
  singularLower: string;
  pluralLower: string;
  /** Suffix used in CSS custom property names: --color-<token>. */
  token: string;
  /** Short description, from the original README's node type definitions. */
  blurb: string;
}

export const TYPE_META: Record<NodeType, TypeMeta> = {
  Projects: {
    type: 'Projects',
    segment: 'projects',
    singular: 'Project',
    plural: 'Projects',
    singularLower: 'project',
    pluralLower: 'projects',
    token: 'projects',
    blurb: 'Research projects and initiatives the Centre has run or contributed to.',
  },
  Methods: {
    type: 'Methods',
    segment: 'methods',
    singular: 'Method',
    plural: 'Methods',
    singularLower: 'method',
    pluralLower: 'methods',
    token: 'methods',
    blurb: 'Techniques and approaches used in the projects, some with step-by-step guides.',
  },
  People: {
    type: 'People',
    segment: 'people',
    singular: 'Person',
    plural: 'People',
    singularLower: 'person',
    pluralLower: 'people',
    token: 'people',
    blurb: 'Researchers and practitioners who led or worked on the projects.',
  },
  Partners: {
    type: 'Partners',
    segment: 'partners',
    singular: 'Partner',
    plural: 'Partners',
    singularLower: 'partner',
    pluralLower: 'partners',
    token: 'partners',
    blurb: 'Universities and organisations connected to the people in the network.',
  },
};

/** Order used for browsing: start from projects and methods, as learners do. */
export const BROWSE_ORDER: NodeType[] = ['Projects', 'Methods', 'People', 'Partners'];

export const SEGMENT_TO_TYPE: Record<string, NodeType> = Object.fromEntries(
  Object.values(TYPE_META).map((m) => [m.segment, m.type]),
) as Record<string, NodeType>;

export function countLabel(n: number, type: NodeType): string {
  const m = TYPE_META[type];
  return `${n} ${n === 1 ? m.singularLower : m.pluralLower}`;
}
