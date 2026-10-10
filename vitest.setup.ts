import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => cleanup());

// next/navigation needs the App Router context; tests render components on
// their own, so give them a minimal router whose path can be set per test.
const nav = vi.hoisted(() => ({ pathname: '/explore', push: vi.fn() }));
vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ push: nav.push, replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
(globalThis as unknown as { __nav: typeof nav }).__nav = nav;

// jsdom gaps.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: query.includes('min-width') ? true : false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
}
if (!window.requestAnimationFrame) {
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0) as unknown as number;
}
if (!globalThis.CSS?.escape) {
  (globalThis as unknown as { CSS: { escape: (s: string) => string } }).CSS = { escape: (s: string) => s };
}
