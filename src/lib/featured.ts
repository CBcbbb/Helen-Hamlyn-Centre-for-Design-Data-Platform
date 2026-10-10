import type { GraphNode, MethodNode, PersonNode, ProjectNode } from './types';
import { getFeaturedProject, index } from './data';
import { neighboursOf, twoStep, byName } from './graph';

export interface RelatedProject {
  project: ProjectNode;
  /** The featured project's people and methods that this project shares. */
  shared: GraphNode[];
}

export interface FeaturedNeighbourhood {
  project: ProjectNode;
  people: PersonNode[];
  methods: MethodNode[];
  /** Partner organisations linked to the project's people in the network. */
  partners: { node: GraphNode; via: GraphNode[] }[];
  /** Other projects reached through a shared person or method, most shared first. */
  related: RelatedProject[];
}

export function getFeaturedNeighbourhood(): FeaturedNeighbourhood {
  const project = getFeaturedProject();
  const people = neighboursOf(index, project.id, 'People') as PersonNode[];
  const methods = neighboursOf(index, project.id, 'Methods') as MethodNode[];
  const partners = twoStep(index, project.id, 'People', 'Partners');

  const related = new Map<string, RelatedProject>();
  for (const mid of [...people, ...methods]) {
    for (const p of neighboursOf(index, mid.id, 'Projects')) {
      if (p.id === project.id) continue;
      const entry = related.get(p.id) ?? { project: p as ProjectNode, shared: [] };
      entry.shared.push(mid);
      related.set(p.id, entry);
    }
  }
  const sorted = [...related.values()].sort(
    (a, b) => b.shared.length - a.shared.length || byName(a.project, b.project),
  );

  return { project, people, methods, partners, related: sorted };
}
