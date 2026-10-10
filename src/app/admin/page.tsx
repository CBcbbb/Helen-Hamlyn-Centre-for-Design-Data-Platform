import Link from 'next/link';
import { connection } from 'next/server';
import { adminConfig, isAdmin } from '@/lib/admin/auth';
import { canWrite } from '@/lib/admin/csv-store';
import { currentGraph } from '@/lib/admin/current';
import { BROWSE_ORDER, TYPE_META } from '@/lib/types-meta';
import { TypeMark } from '@/components/TypeMark';
import { AddForm, LoginForm } from './forms';
import { logout } from './actions';

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  // Always render per request: auth and file state can't be known at build time.
  await connection();
  if (!adminConfig()) {
    return (
      <section className="max-w-[60ch]">
        <h1 className="display text-4xl">Admin is switched off</h1>
        <p className="lead mt-5">
          Set <code>ADMIN_PASSWORD</code> and <code>ADMIN_SESSION_SECRET</code> (at least 32 characters) in the
          environment to use the editor. See the README.
        </p>
      </section>
    );
  }
  if (!(await isAdmin())) {
    return (
      <section className="max-w-md">
        <h1 className="display mb-8 text-4xl">Admin sign in</h1>
        <LoginForm />
      </section>
    );
  }

  const { deleted } = await searchParams;
  const { data, report } = currentGraph();
  const writable = canWrite();
  const issues =
    report.dangling_links.length + report.duplicate_links.length + report.link_type_mismatches.length + report.slug_collisions.length;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="display text-4xl">Edit the data</h1>
          <p className="lead mt-4 max-w-[60ch] text-ink-muted">
            Changes are written to the CSV files in <code>data/</code> and the JSON is rebuilt. Rebuild or redeploy the
            site to publish them, and commit the CSVs.
          </p>
        </div>
        <form action={logout}>
          <button type="submit" className="btn btn-secondary">
            Sign out
          </button>
        </form>
      </div>

      <div role="status" className="mt-6 space-y-2">
        {deleted && <p className="meta">Deleted.</p>}
        {!writable && (
          <p className="rounded-md bg-[var(--color-projects-tint)] px-4 py-3 text-[var(--color-projects-text)]">
            The data folder is read-only on this server, so you can look but not save. Edit locally instead.
          </p>
        )}
        {issues > 0 && (
          <p className="meta">
            The data-quality report has {issues} link or slug issue{issues === 1 ? '' : 's'}. See{' '}
            <code>reports/data-report.json</code>.
          </p>
        )}
      </div>

      <div className="mt-12 grid gap-x-12 gap-y-14 lg:grid-cols-2">
        {BROWSE_ORDER.map((type) => {
          const nodes = data.nodes.filter((n) => n.type === type).sort((a, b) => a.name.localeCompare(b.name));
          return (
            <section key={type} aria-labelledby={`admin-${type}`}>
              <h2 id={`admin-${type}`} className="heading mb-4 inline-flex items-center gap-2 text-xl">
                <TypeMark type={type} size="0.6em" />
                {TYPE_META[type].plural} <span className="meta text-base">{nodes.length}</span>
              </h2>
              <ul className="mb-5 border-t border-rule">
                {nodes.map((n) => (
                  <li key={n.id} className="flex items-baseline justify-between gap-4 border-b border-rule py-2.5">
                    <Link href={`/admin/edit/${n.id}`} className="entity-link">
                      {n.name}
                    </Link>
                    <span className="meta tabular-nums">{n.id}</span>
                  </li>
                ))}
              </ul>
              {writable && <AddForm type={type} />}
            </section>
          );
        })}
      </div>
    </div>
  );
}
