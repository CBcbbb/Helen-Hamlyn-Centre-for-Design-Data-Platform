'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GraphData, GraphNode, NodeType } from '@/lib/types';
import { NODE_TYPES } from '@/lib/types';
import { BROWSE_ORDER, TYPE_META } from '@/lib/types-meta';
import { countByType, indexGraph, searchNodes } from '@/lib/graph';
import { isMacLike, isTypingTarget, useMediaQuery, useMounted, WIDE_LAYOUT_QUERY } from '@/lib/hooks';
import { ExplorerContext, type ExplorerState } from './ExplorerContext';
import { GraphView } from './GraphView';
import { TableView } from './TableView';
import { DetailsPanel } from './DetailsPanel';
import { KeyboardHelp } from './KeyboardHelp';
import { CloseIcon, SearchIcon } from './icons';

export type ExploreView = 'map' | 'table';

const VIEW_PATH: Record<ExploreView, string> = { map: '/explore', table: '/explore/table' };

/**
 * The full network, as a map or a table. Lives in the /explore layout so
 * switching view (a route change between /explore and /explore/table) keeps
 * the search, filters and selection.
 */
export function NetworkExplorer({ data }: { data: GraphData }) {
  const pathname = usePathname();
  const router = useRouter();
  const view: ExploreView = pathname?.startsWith('/explore/table') ? 'table' : 'map';
  const mounted = useMounted();
  const wide = useMediaQuery(WIDE_LAYOUT_QUERY, true);

  const index = useMemo(() => indexGraph(data), [data]);
  const totals = useMemo(() => countByType(data.nodes), [data.nodes]);

  const [searchTerm, setSearchTerm] = useState('');
  const [visibleTypes, setVisibleTypes] = useState<Record<NodeType, boolean>>(
    () => Object.fromEntries(NODE_TYPES.map((t) => [t, true])) as Record<NodeType, boolean>,
  );
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => searchNodes(data.nodes, searchTerm), [data.nodes, searchTerm]);
  const visibleMatches = useMemo(
    () => [...matches].filter((id) => visibleTypes[index.byId.get(id)!.type]).length,
    [matches, visibleTypes, index],
  );
  const visibleCount = data.nodes.filter((n) => visibleTypes[n.type]).length;

  const select = useCallback<ExplorerState['select']>((node, opts) => {
    if (node && opts?.returnFocusTo) returnFocusRef.current = opts.returnFocusTo;
    setSelected(node);
  }, []);

  const closeDetails = useCallback(() => {
    setSelected(null);
    const el = returnFocusRef.current;
    returnFocusRef.current = null;
    // Return focus to whatever opened the panel, once it has unmounted.
    requestAnimationFrame(() => {
      if (el && el.isConnected) el.focus();
    });
  }, []);

  // ?focus=ID (from an entity page's "See it in the network map" link).
  // Read once after hydration: the page is static, so the server HTML can't
  // know the query string, and useSearchParams would opt the whole explorer
  // out of static rendering.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('focus');
    const node = id ? index.byId.get(id) : undefined;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off sync from the URL on mount
    if (node) setSelected(node);
  }, [index]);

  const switchView = useCallback(
    (next: ExploreView) => {
      if (next === view) return;
      router.push(VIEW_PATH[next], { scroll: false });
      setAnnouncement(next === 'map' ? 'Showing the network map' : 'Showing the table view');
    },
    [router, view],
  );

  const toggleType = (type: NodeType) => {
    setVisibleTypes((prev) => {
      const next = { ...prev, [type]: !prev[type] };
      const shown = data.nodes.filter((n) => next[n.type]).length;
      setAnnouncement(
        `${TYPE_META[type].plural} ${next[type] ? 'shown' : 'hidden'}. ${shown} of ${data.nodes.length} entries shown.`,
      );
      return next;
    });
  };

  // Search result announcements, debounced so screen readers aren't flooded
  // while typing. Scheduled from the input's change handler.
  const announceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const visibleTypesRef = useRef(visibleTypes);
  useEffect(() => {
    visibleTypesRef.current = visibleTypes;
  }, [visibleTypes]);
  useEffect(() => () => clearTimeout(announceTimer.current), []);

  const onSearchChange = (term: string) => {
    setSearchTerm(term);
    clearTimeout(announceTimer.current);
    const q = term.trim();
    if (!q) return;
    announceTimer.current = setTimeout(() => {
      const n = [...searchNodes(data.nodes, q)].filter((id) => visibleTypesRef.current[index.byId.get(id)!.type]).length;
      setAnnouncement(
        n === 0 ? `No entries match “${q}”.` : `${n} ${n === 1 ? 'entry matches' : 'entries match'} “${q}”.`,
      );
    }, 450);
  };

  // Global shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (mod && !e.shiftKey && !e.altKey && (key === 'k' || e.code === 'KeyK')) {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }
      if (mod && !e.shiftKey && !e.altKey && (key === 'e' || e.code === 'KeyE')) {
        e.preventDefault();
        switchView(view === 'map' ? 'table' : 'map');
        return;
      }
      if (e.key === '?' && !mod && !e.altKey && !isTypingTarget(e.target) && !document.querySelector('dialog[open]')) {
        e.preventDefault();
        setHelpOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [switchView, view]);

  const ctx: ExplorerState = { data, index, visibleTypes, matches, searchTerm, selected, select };
  const mod = mounted && isMacLike() ? '⌘' : 'Ctrl';
  const searching = searchTerm.trim().length > 0;

  return (
    <ExplorerContext.Provider value={ctx}>
      <div className="flex h-[calc(100dvh-7.25rem)] min-h-[34rem] flex-col md:h-[calc(100dvh-4.75rem)]">
        <div className="border-b border-rule bg-paper">
          <div className="flex flex-col gap-3 px-4 py-3 md:px-6 lg:flex-row lg:items-center lg:gap-6">
            <div className="flex items-center justify-between gap-4 lg:contents">
              <h1 className="heading text-lg lg:min-w-[9rem] lg:text-xl">The network</h1>
              <nav aria-label="View" className="lg:order-last">
                <ul className="flex rounded-full bg-surface p-0.5 ring-1 ring-rule">
                  {(['map', 'table'] as const).map((v) => (
                    <li key={v}>
                      <Link
                        href={VIEW_PATH[v]}
                        scroll={false}
                        aria-current={view === v ? 'page' : undefined}
                        onClick={(e) => {
                          if (e.metaKey || e.ctrlKey || e.shiftKey) return;
                          e.preventDefault();
                          switchView(v);
                        }}
                        className="inline-flex min-h-10 items-center rounded-full px-4 text-[0.9375rem] font-medium text-ink-muted no-underline transition-colors hover:text-ink aria-[current]:bg-paper aria-[current]:text-ink aria-[current]:shadow-[0_1px_2px_rgb(34_33_42/0.12)] aria-[current]:ring-1 aria-[current]:ring-rule-strong"
                      >
                        {v === 'map' ? 'Map' : 'Table'}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>

            <search className="relative flex-1 lg:max-w-md">
              <label htmlFor="network-search" className="sr-only">
                Search names, descriptions and methods
              </label>
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted">
                <SearchIcon />
              </span>
              <input
                ref={searchRef}
                id="network-search"
                type="search"
                autoComplete="off"
                spellCheck={false}
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape' && searchTerm) {
                    e.stopPropagation();
                    onSearchChange('');
                  }
                }}
                placeholder="Search names, descriptions, methods"
                aria-describedby="search-status search-hint"
                className="h-11 w-full rounded-full border-0 bg-surface pl-11 pr-20 text-base text-ink ring-1 ring-rule transition-shadow placeholder:text-ink-muted hover:ring-rule-strong focus:bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-accent [&::-webkit-search-cancel-button]:hidden"
              />
              <span id="search-hint" className="sr-only">
                Shortcut: {mod} K.
              </span>
              {searching ? (
                <button
                  type="button"
                  onClick={() => {
                    onSearchChange('');
                    setAnnouncement('Search cleared.');
                    searchRef.current?.focus();
                  }}
                  className="absolute right-1 top-1/2 inline-grid size-9 -translate-y-1/2 place-items-center rounded-full text-ink-muted hover:text-ink"
                  aria-label="Clear search"
                >
                  <CloseIcon />
                </button>
              ) : (
                <kbd aria-hidden="true" className="absolute right-3 top-1/2 hidden -translate-y-1/2 sm:inline">
                  {mod} K
                </kbd>
              )}
            </search>

            <fieldset className="min-w-0">
              <legend className="sr-only">Show entity types</legend>
              <div className="-mx-1 flex flex-wrap gap-1">
                {BROWSE_ORDER.map((t) => (
                  <label
                    key={t}
                    className="group relative inline-flex min-h-10 cursor-pointer select-none items-center gap-2 rounded-full px-3 text-[0.9375rem] text-ink ring-1 ring-transparent transition-colors hover:bg-surface has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent"
                  >
                    <input
                      type="checkbox"
                      checked={visibleTypes[t]}
                      onChange={() => toggleType(t)}
                      className="peer absolute inset-0 cursor-pointer appearance-none rounded-full focus:outline-none"
                    />
                    <span
                      aria-hidden="true"
                      className="grid size-4 place-items-center rounded-[4px] ring-1 ring-rule-strong peer-checked:ring-0"
                      style={{ background: visibleTypes[t] ? `var(--color-${TYPE_META[t].token})` : 'transparent' }}
                    >
                      {visibleTypes[t] && (
                        <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
                          <path d="M2.5 6.2l2.3 2.3 4.7-5" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span className="peer-[:not(:checked)]:text-ink-muted peer-[:not(:checked)]:line-through decoration-1">
                      {TYPE_META[t].plural}
                    </span>
                    <span className="meta tabular-nums">{totals[t]}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="hidden min-h-10 items-center gap-2 rounded-full px-3 text-[0.9375rem] text-ink-muted hover:text-ink lg:inline-flex"
              aria-label="Keyboard shortcuts"
              title="Keyboard shortcuts (?)"
            >
              <kbd aria-hidden="true">?</kbd>
            </button>
          </div>

          <div className="flex min-h-9 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-rule px-4 py-1.5 md:px-6">
            <p id="search-status" className="meta">
              {searching
                ? visibleMatches === 0
                  ? `No entries match “${searchTerm.trim()}”.`
                  : `${visibleMatches} ${visibleMatches === 1 ? 'entry matches' : 'entries match'} “${searchTerm.trim()}”.`
                : `${visibleCount} of ${data.nodes.length} entries, ${data.links.length} connections.`}
            </p>
            {view === 'map' && (
              <p className="meta">
                {mounted ? (
                  wide ? (
                    <>
                      Arrow keys move between entries. Prefer a list?{' '}
                      <Link href="/explore/table" className="link" onClick={(e) => { e.preventDefault(); switchView('table'); }}>
                        Use the table
                      </Link>
                      .
                    </>
                  ) : (
                    <>
                      Pinch or drag to move around.{' '}
                      <Link href="/explore/table" className="link" onClick={(e) => { e.preventDefault(); switchView('table'); }}>
                        The table
                      </Link>{' '}
                      is easier on a small screen.
                    </>
                  )
                ) : (
                  <>
                    Each entry links to its page. The{' '}
                    <Link href="/explore/table" className="link">
                      table view
                    </Link>{' '}
                    lists them all.
                  </>
                )}
              </p>
            )}
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1">
          <section aria-label={view === 'map' ? 'Network map' : 'Table of all entries'} className="min-w-0 flex-1">
            {view === 'map' ? <GraphView /> : <TableView />}
          </section>
          <DetailsPanel onClose={closeDetails} />
        </div>
      </div>

      <noscript>
        <p className="wrap meta py-4">Search and filters need JavaScript. Every entry still links to its own page.</p>
      </noscript>

      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
      <KeyboardHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </ExplorerContext.Provider>
  );
}
