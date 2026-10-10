'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GraphData, GraphNode, NodeType } from '@/lib/types';
import { NODE_TYPES } from '@/lib/types';
import { TYPE_META } from '@/lib/types-meta';
import { countByType, indexGraph, searchNodes } from '@/lib/graph';
import { computeLayout, type Arrangement, type Layout } from '@/lib/layout';
import { FEATURED_PROJECT_ID } from '@/lib/data';
import { isMacLike, isTypingTarget, useMediaQuery, useMounted, WIDE_LAYOUT_QUERY } from '@/lib/hooks';
import { ExplorerContext, type ExplorerState, type GuideStep } from './ExplorerContext';
import { GraphView } from './GraphView';
import { TableView } from './TableView';
import { DetailsPanel } from './DetailsPanel';
import { KeyboardHelp } from './KeyboardHelp';
import { CloseIcon, SearchIcon } from './icons';

export type ExploreView = 'map' | 'table';

const VIEW_PATH: Record<ExploreView, string> = { map: '/', table: '/table' };
const PATH_MAX = 12;
const GUIDE_KEY = 'hhcd-guide';

/** Remember that the guide was finished or skipped. Storage can be unavailable (private windows, blocked storage). */
function guideSeen(): boolean {
  try {
    return window.localStorage.getItem(GUIDE_KEY) === 'done';
  } catch {
    return false;
  }
}
function rememberGuide() {
  try {
    window.localStorage.setItem(GUIDE_KEY, 'done');
  } catch {
    /* nothing to do */
  }
}

/**
 * The network, as a map or a table: the home page. Lives in the (network)
 * layout so switching view (a route change between / and /table) keeps the
 * search, filters, selection, arrangement and path.
 */
export function NetworkExplorer({ data, layout: givenLayout }: { data: GraphData; layout?: Layout }) {
  const pathname = usePathname();
  const router = useRouter();
  const view: ExploreView = pathname?.startsWith('/table') ? 'table' : 'map';
  const mounted = useMounted();
  const wide = useMediaQuery(WIDE_LAYOUT_QUERY, true);

  const index = useMemo(() => indexGraph(data), [data]);
  // The layout is computed at build time and passed in; tests may omit it.
  const layout = useMemo(() => givenLayout ?? computeLayout(data), [givenLayout, data]);
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

  const [arrangement, setArrangementState] = useState<Arrangement>('constellation');
  const [path, setPath] = useState<GraphNode[]>([]);
  const [guide, setGuideState] = useState<GuideStep>('off');
  const guideRef = useRef<GuideStep>('off');
  const selectedRef = useRef<GraphNode | null>(null);
  const guideStart = index.byId.get(FEATURED_PROJECT_ID);

  const setGuide = useCallback(
    (step: GuideStep) => {
      if (step === guideRef.current) return;
      guideRef.current = step;
      setGuideState(step);
      if (step === 'done') rememberGuide();
      if (step === 'select' && guideStart) {
        setAnnouncement(`Guide started. ${guideStart.name} is highlighted on the map.`);
      } else if (step === 'arrange') {
        setAnnouncement('Guide: the map can also be arranged by type. The control is at the top of the map.');
      }
    },
    [guideStart],
  );

  const setArrangement = useCallback((a: Arrangement) => {
    setArrangementState(a);
    setAnnouncement(
      a === 'columns'
        ? 'Arranged by type, in columns of partners, people, projects and methods.'
        : 'Arranged as a constellation, each entry near the entries it connects to.',
    );
  }, []);

  const select = useCallback<ExplorerState['select']>(
    (node, opts) => {
      if (node && opts?.returnFocusTo) returnFocusRef.current = opts.returnFocusTo;
      const previous = selectedRef.current;
      selectedRef.current = node;
      setSelected(node);
      if (!node) return;
      setPath((prev) => {
        const at = prev.findIndex((n) => n.id === node.id);
        if (at >= 0) return prev.slice(0, at + 1);
        return [...prev, node].slice(-PATH_MAX);
      });
      // The guide moves on when you do what it suggests.
      if (guideRef.current === 'select') setGuide('follow');
      else if (guideRef.current === 'follow' && previous && previous.id !== node.id) setGuide('path');
    },
    [setGuide],
  );

  const clearPath = useCallback(() => {
    setPath(selectedRef.current ? [selectedRef.current] : []);
    setAnnouncement('Path cleared.');
  }, []);

  const closeDetails = useCallback(() => {
    selectedRef.current = null;
    setSelected(null);
    // Closing the details mid-guide skips to its last card, on the map.
    if (guideRef.current === 'follow' || guideRef.current === 'path') setGuide('arrange');
    const el = returnFocusRef.current;
    returnFocusRef.current = null;
    // Return focus to whatever opened the panel, once it has unmounted.
    requestAnimationFrame(() => {
      if (el && el.isConnected) el.focus();
    });
  }, [setGuide]);

  // ?focus=ID (from an entity page's "See it in the network map" link).
  // Read once after hydration: the page is static, so the server HTML can't
  // know the query string, and useSearchParams would opt the whole explorer
  // out of static rendering.
  // The guide starts on a first visit to the map, unless you arrived to see
  // a particular entry. ?guide starts it again.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('focus');
    const node = id ? index.byId.get(id) : undefined;
    /* eslint-disable react-hooks/set-state-in-effect -- one-off decisions after hydration: they need the URL and storage */
    if (node) {
      select(node);
      return;
    }
    if (view === 'map' && guideStart && (params.has('guide') || !guideSeen())) {
      guideRef.current = 'select';
      setGuideState('select');
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    // Once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const mod = mounted && isMacLike() ? '⌘' : 'Ctrl';
  const searching = searchTerm.trim().length > 0;
  const statusText = searching
    ? visibleMatches === 0
      ? `No entries match “${searchTerm.trim()}”.`
      : `${visibleMatches} ${visibleMatches === 1 ? 'entry matches' : 'entries match'} “${searchTerm.trim()}”.`
    : `${visibleCount} of ${data.nodes.length} entries, ${data.links.length} connections.`;
  const ctx: ExplorerState = {
    data,
    index,
    layout,
    visibleTypes,
    matches,
    searchTerm,
    selected,
    select,
    arrangement,
    setArrangement,
    path,
    clearPath,
    guide,
    setGuide,
    guideStartId: FEATURED_PROJECT_ID,
    announce: setAnnouncement,
    filters: { totals, toggleType, statusText, wide, mounted },
  };


  return (
    <ExplorerContext.Provider value={ctx}>
      {/* Without JavaScript, hide the controls that need it rather than show
          a search box that does nothing. */}
      <noscript>
        <style>{'.js-only{display:none!important}'}</style>
      </noscript>
      <div className="flex h-[calc(100dvh-3.5rem)] min-h-[28rem] flex-col md:h-[calc(100dvh-4rem)] md:min-h-[32rem]">
        <div className="border-b border-rule bg-paper">
          <div className="flex items-center gap-2 px-3 py-2 md:gap-4 md:px-6">
            <h1 className="sr-only">Projects, methods, people and partners of the Helen Hamlyn Centre for Design</h1>
            <search className="js-only relative min-w-0 flex-1 md:max-w-md">
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
                placeholder={wide ? 'Search the network' : 'Search'}
                aria-describedby="search-status search-hint"
                className="h-10 w-full rounded-full border-0 bg-surface pl-11 pr-11 text-base text-ink ring-1 ring-control transition-shadow placeholder:text-ink-muted hover:ring-ink focus:bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:pr-20 [&::-webkit-search-cancel-button]:hidden"
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
            {/* Read with the search box; shown on screen in the legend or above the table. */}
            <p id="search-status" className="sr-only">
              {statusText}
            </p>

            <div className="ml-auto flex flex-none items-center gap-2">
              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                className="js-only hidden size-10 items-center justify-center rounded-full text-ink-muted hover:text-ink lg:inline-flex"
                aria-label="Keyboard shortcuts"
                title="Keyboard shortcuts (?)"
              >
                <kbd aria-hidden="true">?</kbd>
              </button>
              <nav aria-label="View">
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
                        className="inline-flex min-h-9 items-center rounded-full px-3.5 text-[0.9375rem] font-medium text-ink-muted no-underline transition-colors hover:text-ink aria-[current]:bg-paper aria-[current]:text-ink aria-[current]:shadow-[0_1px_2px_rgb(34_33_42/0.12)] aria-[current]:ring-1 aria-[current]:ring-rule-strong"
                      >
                        {v === 'map' ? 'Map' : 'Table'}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1">
          <section
            aria-label={view === 'map' ? 'Network map' : 'Table of all entries'}
            className={`min-w-0 flex-1 ${view === 'map' ? 'min-h-0' : 'overflow-y-auto'}`}
          >
            {view === 'map' ? <GraphView /> : <TableView />}
          </section>
          <DetailsPanel onClose={closeDetails} />
        </div>
      </div>

      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
      <KeyboardHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </ExplorerContext.Provider>
  );
}
