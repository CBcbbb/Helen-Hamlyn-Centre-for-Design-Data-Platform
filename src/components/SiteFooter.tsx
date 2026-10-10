import Link from 'next/link';
import { HHCD_URL, SITE_NAME } from '@/lib/site';

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-rule bg-surface">
      <div className="wrap grid gap-8 py-10 text-[0.9375rem] md:grid-cols-[1.4fr_1fr_1fr] md:py-12">
        <div className="max-w-[38ch]">
          <p className="heading text-base">{SITE_NAME}</p>
          <p className="meta mt-2">
            Designed and built by Chongbo Ning. Content from the{' '}
            <a href={HHCD_URL} className="link">
              Helen Hamlyn Centre for Design
            </a>
            , Royal College of Art.
          </p>
        </div>
        <nav aria-label="Browse">
          <p className="meta mb-2">Browse</p>
          <ul className="space-y-1.5">
            <li>
              <Link href="/projects" className="entity-link">
                Projects
              </Link>
            </li>
            <li>
              <Link href="/methods" className="entity-link">
                Methods
              </Link>
            </li>
            <li>
              <Link href="/people" className="entity-link">
                People
              </Link>
            </li>
            <li>
              <Link href="/partners" className="entity-link">
                Partners
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="About this site">
          <p className="meta mb-2">This site</p>
          <ul className="space-y-1.5">
            <li>
              <Link href="/table" className="entity-link">
                The network as a table
              </Link>
            </li>
            <li>
              <Link href="/about" className="entity-link">
                About the platform
              </Link>
            </li>
            <li>
              <Link href="/about#accessibility" className="entity-link">
                Accessibility
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
