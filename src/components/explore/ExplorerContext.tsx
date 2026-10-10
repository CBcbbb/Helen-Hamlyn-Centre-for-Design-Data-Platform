'use client';

import { createContext, useContext } from 'react';
import type { GraphData, GraphNode, NodeType } from '@/lib/types';
import type { GraphIndex } from '@/lib/graph';

export interface ExplorerState {
  data: GraphData;
  index: GraphIndex;
  visibleTypes: Record<NodeType, boolean>;
  /** IDs matching the current search; empty when there is no search term. */
  matches: Set<string>;
  searchTerm: string;
  selected: GraphNode | null;
  select: (node: GraphNode | null, opts?: { returnFocusTo?: HTMLElement | null }) => void;
}

export const ExplorerContext = createContext<ExplorerState | null>(null);

export function useExplorer(): ExplorerState {
  const ctx = useContext(ExplorerContext);
  if (!ctx) throw new Error('useExplorer must be used inside <NetworkExplorer>');
  return ctx;
}
