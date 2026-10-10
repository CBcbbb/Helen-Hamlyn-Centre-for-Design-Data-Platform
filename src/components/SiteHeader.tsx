import Image from 'next/image';
import Link from 'next/link';
import { NavLinks } from './NavLinks';

/**
 * One slim row on every screen size (56px, 64px from tablet up), so the map
 * below keeps as much of the screen as possible. On narrow screens the site
 * name is visually hidden next to the logo and the navigation scrolls.
 */
export function SiteHeader() {
  return (
    <header className="h-14 border-b border-rule bg-paper md:h-16">
      <div className="wrap flex h-full items-center gap-3 md:gap-8">
        <Link href="/" className="group flex flex-none items-center gap-3 text-ink no-underline">
          <Image src="/hhcd-logo.png" alt="" width={854} height={509} priority className="h-8 w-auto flex-none md:h-9" />
          <span className="heading text-[0.9375rem] leading-tight max-lg:sr-only">
            <span className="block">Helen Hamlyn Centre for Design</span>
            <span className="block text-ink-muted">Data Platform</span>
          </span>
        </Link>
        <div className="min-w-0 flex-1 md:flex md:justify-end">
          <NavLinks />
        </div>
      </div>
    </header>
  );
}
