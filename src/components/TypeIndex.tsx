import type { Metadata } from 'next';
import Link from 'next/link';
import type { NodeType } from '@/lib/types';
import { BROWSE_ORDER, TYPE_META, countLabel } from '@/lib/types-meta';
import { hrefFor, index, nodesOfType } from '@/lib/data';
import { neighboursOf, primaryText } from '@/lib/graph';
import { excerpt } from '@/lib/text';
import { TypeMark } from './TypeMark';

export function indexMetadata(type: NodeType): Metadata {
  const m = TYPE_META[type];
  const count = nodesOfType(type).length;
  const description = `${count} ${m.pluralLower} in the Helen Hamlyn Centre for Design Data Platform. ${m.blurb}`;
  return {
    title: m.plural,
    description,
    alternates: { canonical: `/${m.segment}` },
    openGraph: { title: m.plural, description, url: `/${m.segment}` },
  };
}

/** What each row shows beside the excerpt: the most useful connection type. */
const SECONDARY: Record<NodeType, NodeType> = {
  Projects: 'Methods',
  Methods: 'Projects',
  People: 'Projects',
  Partners: 'People',
};

export function TypeIndex({ type }: { type: NodeType }) {
  const m = TYPE_META[type];
  const nodes = nodesOfType(type);
  const secondary = SECONDARY[type];

  return (
    <div className="wrap pb-20 pt-10 md:pt-16">
      <header className="max-w-[48rem]">
        <p className={`heading mb-4 inline-flex items-center gap-2 text-[0.9375rem] text-${m.token}`}>
          <TypeMark type={type} size="0.7em" />
          {countLabel(nodes.length, type)}
        </p>
        <h1 className="display text-[clamp(2.5rem,1.8rem+3vw,4.25rem)]">{m.plural}</h1>
        <p className="lead mt-5 text-ink-muted">{m.blurb}</p>
      </header>

      <nav aria-label="Other entity types" className="mt-8">
        <ul className="flex flex-wrap gap-2">
          {BROWSE_ORDER.filter((t) => t !== type).map((t) => (
            <li key={t}>
              <Link href={`/${TYPE_META[t].segment}`} className="btn btn-secondary min-h-10 py-2">
                <TypeMark type={t} size="0.6em" />
                {TYPE_META[t].plural}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <ol className="mt-12 border-t border-rule md:mt-16">
        {nodes.map((node) => {
          const text = excerpt(primaryText(node), 200);
          const related = neighboursOf(index, node.id, secondary);
          return (
            <li key={node.id} className="border-b border-rule">
              <div className="group relative grid gap-x-10 gap-y-2 py-6 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] md:py-7">
                <h2 className="heading text-[1.25rem] md:text-[1.375rem]">
                  <Link
                    href={hrefFor(node)}
                    className="text-ink no-underline decoration-1 underline-offset-[0.2em] after:absolute after:inset-0 group-hover:underline"
                  >
                    {node.name}
                  </Link>
                </h2>
                <div className="min-w-0">
                  {text && <p className="font-serif text-[1.0625rem] leading-relaxed text-ink">{text}</p>}
                  {related.length > 0 && (
                    <p className="meta mt-2">
                      <span className="sr-only">{TYPE_META[secondary].plural}: </span>
                      {related.length > 5
                        ? `${related
                            .slice(0, 4)
                            .map((r) => r.name)
                            .join(', ')} and ${related.length - 4} more`
                        : related.map((r) => r.name).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
