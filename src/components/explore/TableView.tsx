'use client';

import Link from 'next/link';
import type { GraphNode } from '@/lib/types';
import { BROWSE_ORDER, TYPE_META } from '@/lib/types-meta';
import { hrefFor } from '@/lib/data';
import { neighboursOf, primaryText } from '@/lib/graph';
import { excerpt } from '@/lib/text';
import { useMounted } from '@/lib/hooks';
import { TypeMark } from '../TypeMark';
import { useExplorer } from './ExplorerContext';

/**
 * The accessible equivalent of the map: one real table per entity type,
 * with the same filters and search applied. Each name links to the entry's
 * page; with JavaScript it opens the details panel instead (and the link's
 * page is one click away from there).
 */
export function TableView() {
  const { data, index, visibleTypes, matches, searchTerm, select, selected } = useExplorer();
  const mounted = useMounted();
  const searching = searchTerm.trim().length > 0;

  const types = BROWSE_ORDER.filter((t) => visibleTypes[t]);
  if (!types.length) {
    return (
      <div className="wrap py-16">
        <p className="lead">All entity types are filtered out. Turn one back on to see entries.</p>
      </div>
    );
  }

  return (
    <div className="md:h-full md:overflow-y-auto">
      <div className="wrap space-y-14 pb-20 pt-8">
        {types.map((type) => {
          const meta = TYPE_META[type];
          const rows = data.nodes
            .filter((n) => n.type === type && (!searching || matches.has(n.id)))
            .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
          const total = data.nodes.filter((n) => n.type === type).length;
          return (
            <section key={type} aria-labelledby={`table-${meta.segment}`}>
              <h2 id={`table-${meta.segment}`} className="heading mb-4 inline-flex items-center gap-2 text-[1.25rem]">
                <TypeMark type={type} size="0.6em" />
                {meta.plural}{' '}
                <span className="meta text-base font-normal tabular-nums">
                  {searching ? `${rows.length} of ${total} match` : `${total}`}
                </span>
              </h2>
              {rows.length === 0 ? (
                <p className="meta border-t border-rule py-4">No {meta.pluralLower} match &ldquo;{searchTerm.trim()}&rdquo;.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[36rem] border-collapse text-left text-[0.9375rem]">
                    <caption className="sr-only">
                      {meta.plural}: name, summary and connections. {rows.length} row{rows.length === 1 ? '' : 's'}.
                    </caption>
                    <thead>
                      <tr className="border-y border-rule-strong">
                        <th scope="col" className="meta w-[30%] py-2 pr-6 font-medium">
                          Name
                        </th>
                        <th scope="col" className="meta py-2 pr-6 font-medium">
                          Summary
                        </th>
                        <th scope="col" className="meta w-[22%] py-2 font-medium">
                          Connections
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((node) => (
                        <Row
                          key={node.id}
                          node={node}
                          summary={excerpt(primaryText(node), 150)}
                          connections={connectionText(neighboursOf(index, node.id))}
                          interactive={mounted}
                          selected={selected?.id === node.id}
                          onOpen={(el) => select(node, { returnFocusTo: el })}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function connectionText(nodes: GraphNode[]): string {
  return BROWSE_ORDER.map((t) => [t, nodes.filter((n) => n.type === t).length] as const)
    .filter(([, n]) => n > 0)
    .map(([t, n]) => `${n} ${n === 1 ? TYPE_META[t].singularLower : TYPE_META[t].pluralLower}`)
    .join(', ');
}

function Row({
  node,
  summary,
  connections,
  interactive,
  selected,
  onOpen,
}: {
  node: GraphNode;
  summary: string;
  connections: string;
  interactive: boolean;
  selected: boolean;
  onOpen: (el: HTMLElement) => void;
}) {
  return (
    <tr className={`border-b border-rule align-top ${selected ? 'bg-surface' : ''}`}>
      <th scope="row" className="py-3 pr-6 font-normal">
        {interactive ? (
          <button
            type="button"
            onClick={(e) => onOpen(e.currentTarget)}
            aria-pressed={selected}
            className="entity-link heading text-left text-base"
          >
            {node.name}
          </button>
        ) : (
          <Link href={hrefFor(node)} className="entity-link heading text-base">
            {node.name}
          </Link>
        )}
      </th>
      <td className="py-3 pr-6 font-serif text-base leading-relaxed text-ink">{summary}</td>
      <td className="meta py-3">{connections || 'None recorded'}</td>
    </tr>
  );
}
