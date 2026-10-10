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
    <nav aria-label="Main" className="-mx-4 overflow-x-auto px-2 [scrollbar-width:none] md:mx-0 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
      <ul className="flex items-center whitespace-nowrap text-[0.875rem] sm:text-[0.9375rem] md:-mx-2 md:gap-x-1">
        {LINKS.map(({ href, label }) => {
          const current = pathname === href ? 'page' : pathname.startsWith(`${href}/`) ? 'true' : undefined;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current}
                className="relative inline-flex min-h-11 items-center px-[0.45rem] text-ink-muted sm:px-2 no-underline transition-colors hover:text-ink aria-[current]:text-ink aria-[current]:after:absolute aria-[current]:after:inset-x-[0.45rem] sm:aria-[current]:after:inset-x-2 aria-[current]:after:bottom-2 aria-[current]:after:h-px aria-[current]:after:bg-ink"
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
