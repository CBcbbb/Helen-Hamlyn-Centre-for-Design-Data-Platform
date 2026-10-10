import Link from 'next/link';
import type { GraphNode, NodeType } from '@/lib/types';
import { BROWSE_ORDER, TYPE_META, countLabel } from '@/lib/types-meta';
import { index, hrefFor } from '@/lib/data';
import { neighboursOf, primaryText, twoStep } from '@/lib/graph';
import { paragraphs } from '@/lib/text';
import { EntityFields } from './EntityFields';
import { ConnectionGroups } from './ConnectionList';
import { Paragraphs } from './RichText';
import { TypeMark } from './TypeMark';

/** Summary sentence of connections, e.g. "Connected to 3 people and 4 methods." */
function connectionSummary(groups: Partial<Record<NodeType, GraphNode[]>>): string {
  const parts = BROWSE_ORDER.filter((t) => groups[t]?.length).map((t) => countLabel(groups[t]!.length, t));
  if (!parts.length) return '';
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0];
  return `Connected to ${list}.`;
}

export function EntityPage({ node }: { node: GraphNode }) {
  const meta = TYPE_META[node.type];
  const groups: Partial<Record<NodeType, GraphNode[]>> = {};
  for (const t of BROWSE_ORDER) {
    const list = neighboursOf(index, node.id, t);
    if (list.length) groups[t] = list;
  }
  const summary = connectionSummary(groups);
  const hasPrimary = paragraphs(primaryText(node)).length > 0;

  // One step further, where it adds something the data supports:
  // partners reached through a project's people.
  const partnersVia = node.type === 'Projects' ? twoStep(index, node.id, 'People', 'Partners') : [];

  return (
    <article className="wrap pb-20 pt-8 md:pt-12">
      <nav aria-label="Breadcrumb" className="meta mb-8 md:mb-12">
        <ol className="flex flex-wrap items-center gap-x-2">
          <li>
            <Link href="/" className="entity-link text-ink-muted">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={`/${meta.segment}`} className="entity-link text-ink-muted">
              {meta.plural}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <span aria-current="page" className="text-ink">
              {node.name}
            </span>
          </li>
        </ol>
      </nav>

      <header className="max-w-[52rem]">
        <p className={`heading mb-4 inline-flex items-center gap-2 text-[0.9375rem] text-${meta.token}`}>
          <TypeMark type={node.type} size="0.7em" />
          {meta.singular}
        </p>
        <h1 className="display text-[clamp(2.25rem,1.6rem+3vw,4rem)]">{node.name}</h1>
        {summary && (
          <p className="meta mt-5 text-base">
            {summary}{' '}
            <a href="#connections-heading" className="link lg:hidden">
              Jump to connections
            </a>
          </p>
        )}
      </header>

      <div className="mt-10 grid gap-x-16 gap-y-14 md:mt-14 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          {hasPrimary && (
            <div className="mb-12">
              <Paragraphs value={primaryText(node)} className="lead max-w-[64ch]! text-ink" />
            </div>
          )}
          <EntityFields node={node} skipPrimary />
          {!hasPrimary && !summary && (
            <p className="meta">No further details are recorded for this entry yet.</p>
          )}
        </div>

        <aside aria-labelledby="connections-heading" className="scroll-mt-6 border-t border-rule pt-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
          <h2 id="connections-heading" className="heading mb-5 text-[1.0625rem]">
            Connections
          </h2>
          <ConnectionGroups groups={groups} />

          {partnersVia.length > 0 && (
            <section className="mt-10 border-t border-rule pt-6" aria-labelledby="via-heading">
              <h3 id="via-heading" className="meta mb-1.5">
                Partners connected through these people
              </h3>
              <ul className="space-y-2">
                {partnersVia.map(({ node: p, via }) => (
                  <li key={p.id}>
                    <Link href={hrefFor(p)} className="entity-link inline-flex items-baseline gap-2">
                      <TypeMark type="Partners" size="0.62em" />
                      <span>{p.name}</span>
                    </Link>
                    <span className="meta block pl-[1.1rem]">via {via.map((v) => v.name).join(', ')}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="mt-10 border-t border-rule pt-6 text-[0.9375rem]">
            <Link href={`/explore?focus=${encodeURIComponent(node.id)}`} className="link">
              See {node.name.length > 40 ? `this ${meta.singularLower}` : node.name} in the network map
            </Link>
          </p>
        </aside>
      </div>
    </article>
  );
}
