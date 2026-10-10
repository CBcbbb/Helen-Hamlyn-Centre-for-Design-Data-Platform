import Image from 'next/image';
import Link from 'next/link';
import { NavLinks } from './NavLinks';

export function SiteHeader() {
  return (
    <header className="border-b border-rule bg-paper">
      <div className="wrap flex flex-col gap-x-8 gap-y-3 py-3 md:flex-row md:items-center md:justify-between md:py-4">
        <Link
          href="/"
          className="group flex min-w-0 items-center gap-3 self-start text-ink no-underline md:self-auto"
        >
          <Image
            src="/hhcd-logo.png"
            alt=""
            width={854}
            height={509}
            priority
            className="h-9 w-auto flex-none md:h-10"
          />
          <span className="heading text-[0.9375rem] leading-tight md:text-base">
            <span className="block">Helen Hamlyn Centre for Design</span>
            <span className="block text-ink-muted">Data Platform</span>
          </span>
        </Link>
        <NavLinks />
      </div>
    </header>
  );
}
