'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { GraphNode } from '@/lib/types';
import { BROWSE_ORDER, TYPE_META } from '@/lib/types-meta';
import { hrefFor } from '@/lib/data';
import { primaryText } from '@/lib/graph';
import { excerpt } from '@/lib/text';
import { useMounted } from '@/lib/hooks';
import { TypeMark } from '../TypeMark';
import { useExplorer } from './ExplorerContext';
import { TypeFilters } from './TypeFilters';

type SortKey = 'type' | 'name';

const byName = (a: GraphNode, b: GraphNode) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });

/**
 * The accessible equivalent of the map: every entry in one table, with its
 * name, type and a short summary. The same filters and search apply, and it
 * can be sorted by type or by name. Each name links to the entry's page;
 * with JavaScript it opens the details panel instead.
 */
export function TableView() {
  const { data, visibleTypes, matches, searchTerm, select, selected, announce } = useExplorer();
  const mounted = useMounted();
  const [sort, setSort] = useState<SortKey>('type');
  const searching = searchTerm.trim().length > 0;

  const rows = data.nodes
    .filter((n) => visibleTypes[n.type] && (!searching || matches.has(n.id)))
    .sort((a, b) =>
      sort === 'name' ? byName(a, b) : BROWSE_ORDER.indexOf(a.type) - BROWSE_ORDER.indexOf(b.type) || byName(a, b),
    );

  const sortButton = (key: SortKey, label: string) => (
    <button
      type="button"
      onClick={() => {
        setSort(key);
        announce(`Sorted by ${label.toLowerCase()}.`);
      }}
      className="inline-flex min-h-9 items-center gap-1 font-medium text-ink-muted hover:text-ink aria-[pressed=true]:text-ink"
      aria-pressed={sort === key}
    >
      {label}
      <span aria-hidden="true" className={sort === key ? '' : 'opacity-0'}>
        ↓
      </span>
    </button>
  );

  return (
    <div className="mx-auto max-w-[78rem] px-4 pb-20 pt-4 md:px-6">
      <TypeFilters variant="row" />
      {rows.length === 0 ? (
        <p className="lead mt-10">
          {searching ? `No entries match “${searchTerm.trim()}”.` : 'All entity types are filtered out. Turn one back on to see entries.'}
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-left text-[0.9375rem]">
            <caption className="sr-only">
              All entries: name, type and summary, sorted by {sort}. {rows.length} row{rows.length === 1 ? '' : 's'}.
            </caption>
            <thead>
              <tr className="border-y border-rule-strong text-[0.875rem]">
                <th scope="col" aria-sort={sort === 'name' ? 'ascending' : 'none'} className="w-[38%] py-1 pr-4 sm:w-[32%] sm:pr-6">
                  {mounted ? sortButton('name', 'Name') : 'Name'}
                </th>
                <th scope="col" aria-sort={sort === 'type' ? 'ascending' : 'none'} className="hidden w-[9rem] py-1 pr-6 sm:table-cell">
                  {mounted ? sortButton('type', 'Type') : 'Type'}
                </th>
                <th scope="col" className="meta py-1 font-medium">
                  Summary
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((node) => (
                <Row
                  key={node.id}
                  node={node}
                  interactive={mounted}
                  selected={selected?.id === node.id}
                  onOpen={(el) => select(node, { returnFocusTo: el })}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Row({
  node,
  interactive,
  selected,
  onOpen,
}: {
  node: GraphNode;
  interactive: boolean;
  selected: boolean;
  onOpen: (el: HTMLElement) => void;
}) {
  const meta = TYPE_META[node.type];
  return (
    <tr className={`border-b border-rule align-top ${selected ? 'bg-surface' : ''}`}>
      <th scope="row" className="py-3 pr-4 font-normal sm:pr-6">
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
        {/* On narrow screens the Type column folds into the name cell. */}
        <span className={`mt-1 flex items-center gap-1.5 text-[0.8125rem] font-medium sm:hidden text-${meta.token}`}>
          <TypeMark type={node.type} size="0.7em" />
          {meta.singular}
        </span>
      </th>
      <td className={`hidden py-3 pr-6 sm:table-cell text-${meta.token}`}>
        <span className="inline-flex items-center gap-2 whitespace-nowrap text-[0.875rem] font-medium">
          <TypeMark type={node.type} size="0.7em" />
          {meta.singular}
        </span>
      </td>
      <td className="py-3 font-serif text-[0.9375rem] leading-relaxed text-ink sm:text-base">{excerpt(primaryText(node), 160)}</td>
    </tr>
  );
}
