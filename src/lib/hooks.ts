'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

/** Breakpoint at which the details panel sits beside the map instead of over it. */
export const WIDE_LAYOUT_QUERY = '(min-width: 768px)';
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Subscribe to a media query. Returns `serverValue` during server rendering
 * and hydration, then the real value.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      window.addEventListener('resize', onChange);
      return () => {
        mql.removeEventListener('change', onChange);
        window.removeEventListener('resize', onChange);
      };
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

/** True once mounted in the browser; false in server HTML. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/** Debounce a fast-changing value (used for screen reader announcements). */
export function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function isMacLike(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
}

/** True when a keyboard event happened inside a text field. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
}
