import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="wrap py-20 md:py-28">
      <h1 className="display text-[clamp(2.25rem,1.6rem+3vw,3.75rem)]">This page isn&rsquo;t here</h1>
      <p className="lead mt-5 text-ink-muted">
        The address may be mistyped, or the entry may have been renamed. Try one of these instead.
      </p>
      <ul className="mt-8 flex flex-wrap gap-3">
        <li>
          <Link href="/" className="btn btn-primary">
            Go to the home page
          </Link>
        </li>
        <li>
          <Link href="/projects" className="btn btn-secondary">
            Browse projects
          </Link>
        </li>
        <li>
          <Link href="/explore/table" className="btn btn-secondary">
            See every entry in a table
          </Link>
        </li>
      </ul>
    </div>
  );
}
