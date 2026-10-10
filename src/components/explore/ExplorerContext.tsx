'use client';

import { createContext, useContext } from 'react';
import type { GraphData, GraphNode, NodeType } from '@/lib/types';
import type { GraphIndex } from '@/lib/graph';
import type { Arrangement, Layout } from '@/lib/layout';

/**
 * Steps of the first-visit guide. It teaches by doing: each step waits for
 * the action it describes, and the guide never blocks the map.
 *
 * - `select`: one project is highlighted on the map; select it.
 * - `follow`: its connections are highlighted; select one of them.
 * - `path`: the entries you open form a path you can step back along.
 * - `arrange`: the same network can be arranged by type.
 * - `done`: finished or skipped (remembered in this browser).
 * - `off`: not shown (server HTML, or arriving at a specific entry).
 */
export type GuideStep = 'off' | 'select' | 'follow' | 'path' | 'arrange' | 'done';

export interface ExplorerState {
  data: GraphData;
  index: GraphIndex;
  layout: Layout;
  visibleTypes: Record<NodeType, boolean>;
  /** IDs matching the current search; empty when there is no search term. */
  matches: Set<string>;
  searchTerm: string;
  selected: GraphNode | null;
  select: (node: GraphNode | null, opts?: { returnFocusTo?: HTMLElement | null }) => void;
  /** How the map is arranged: freely, or sorted into columns by type. */
  arrangement: Arrangement;
  setArrangement: (a: Arrangement) => void;
  /** Entries opened so far, in order. Selecting an earlier one steps back to it. */
  path: GraphNode[];
  clearPath: () => void;
  guide: GuideStep;
  setGuide: (step: GuideStep) => void;
  /** The project the guide starts from. */
  guideStartId: string;
  announce: (message: string) => void;
}

export const ExplorerContext = createContext<ExplorerState | null>(null);

export function useExplorer(): ExplorerState {
  const ctx = useContext(ExplorerContext);
  if (!ctx) throw new Error('useExplorer must be used inside <NetworkExplorer>');
  return ctx;
}
