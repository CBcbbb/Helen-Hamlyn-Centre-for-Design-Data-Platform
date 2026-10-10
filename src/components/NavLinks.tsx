'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/projects', label: 'Projects' },
  { href: '/methods', label: 'Methods' },
  { href: '/people', label: 'People' },
  { href: '/partners', label: 'Partners' },
  { href: '/explore', label: 'Network' },
  { href: '/about', label: 'About' },
];

export function NavLinks() {
  const pathname = usePathname() ?? '/';
  return (
    <nav aria-label="Main">
      <ul className="-mx-2 flex flex-wrap items-center gap-x-1 gap-y-0 text-[0.9375rem]">
        {LINKS.map(({ href, label }) => {
          const current = pathname === href ? 'page' : pathname.startsWith(`${href}/`) ? 'true' : undefined;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current}
                className="relative inline-flex min-h-11 items-center px-2 text-ink-muted no-underline transition-colors hover:text-ink aria-[current]:text-ink aria-[current]:after:absolute aria-[current]:after:inset-x-2 aria-[current]:after:bottom-2 aria-[current]:after:h-px aria-[current]:after:bg-ink"
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
