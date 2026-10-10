import Link from 'next/link';
import { connection } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import { isAdmin } from '@/lib/admin/auth';
import { canWrite, readRecord } from '@/lib/admin/csv-store';
import { currentGraph } from '@/lib/admin/current';
import { TYPE_META } from '@/lib/types-meta';
import { DeleteForm, EditForm } from '../../forms';

export default async function EditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  await connection();
  if (!(await isAdmin())) redirect('/admin');
  const { id } = await params;
  const { created } = await searchParams;
  const node = currentGraph().data.nodes.find((n) => n.id === id);
  if (!node) notFound();
  const fields = readRecord(node.type, id);
  if (!fields) notFound();
  const writable = canWrite();

  return (
    <div className="max-w-[48rem]">
      <p className="meta mb-6">
        <Link href="/admin" className="link">
          Back to all entries
        </Link>
      </p>
      <p className={`heading mb-2 text-[0.9375rem] text-${TYPE_META[node.type].token}`}>
        {TYPE_META[node.type].singular} {id}
      </p>
      <h1 className="display mb-3 text-4xl">{node.name}</h1>
      {created && (
        <p role="status" className="meta mb-6">
          Created. Add its details below. Links to other entries are edited in data/LINKS.csv.
        </p>
      )}
      <p className="meta mb-10">
        Connections are stored in <code>data/LINKS.csv</code> and are not edited here.
      </p>
      {writable ? (
        <>
          <EditForm type={node.type} id={id} fields={fields} />
          <section className="mt-16 border-t border-rule pt-8" aria-labelledby="delete-heading">
            <h2 id="delete-heading" className="heading mb-4 text-xl">
              Delete this {TYPE_META[node.type].singularLower}
            </h2>
            <DeleteForm type={node.type} id={id} name={node.name} />
          </section>
        </>
      ) : (
        <p className="lead">The data folder is read-only on this server, so this entry cannot be edited here.</p>
      )}
    </div>
  );
}
