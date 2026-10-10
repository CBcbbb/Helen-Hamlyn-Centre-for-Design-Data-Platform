import Link from 'next/link';
import type { GraphNode, NodeType } from '@/lib/types';
import { BROWSE_ORDER, TYPE_META } from '@/lib/types-meta';
import { hrefFor } from '@/lib/data';
import { TypeMark } from './TypeMark';

/** A list of entity links, each with its type mark. */
export function EntityLinkList({
  nodes,
  className = '',
  columns = false,
}: {
  nodes: GraphNode[];
  className?: string;
  columns?: boolean;
}) {
  return (
    <ul className={`${columns ? 'sm:columns-2 sm:gap-8' : ''} space-y-1 ${className}`}>
      {nodes.map((n) => (
        <li key={n.id} className="break-inside-avoid">
          <Link href={hrefFor(n)} className="entity-link inline-flex items-baseline gap-2 py-1">
            <TypeMark type={n.type} size="0.62em" className="translate-y-[-0.05em]" />
            <span>{n.name}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * All direct connections of an entity, grouped by type, as plain links.
 * This is the crawlable, no-JavaScript route through the network.
 */
export function ConnectionGroups({
  groups,
  headingLevel = 2,
}: {
  groups: Partial<Record<NodeType, GraphNode[]>>;
  headingLevel?: 2 | 3;
}) {
  const H = headingLevel === 2 ? 'h3' : 'h4';
  const present = BROWSE_ORDER.filter((t) => (groups[t]?.length ?? 0) > 0);
  if (!present.length) {
    return <p className="meta">No connections are recorded for this entry yet.</p>;
  }
  return (
    <div className="space-y-7">
      {present.map((t) => (
        <section key={t}>
          <H className="meta mb-1.5">
            {TYPE_META[t].plural} <span className="tabular-nums">({groups[t]!.length})</span>
          </H>
          <EntityLinkList nodes={groups[t]!} />
        </section>
      ))}
    </div>
  );
}
