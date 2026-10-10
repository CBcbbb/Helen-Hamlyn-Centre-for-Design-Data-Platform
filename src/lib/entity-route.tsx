/**
 * Shared implementation for the four entity routes:
 * /projects/[slug], /methods/[slug], /people/[slug], /partners/[slug].
 * Each route file is a thin wrapper so URLs stay explicit and every page is
 * generated at build time.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EntityPage } from '@/components/EntityPage';
import { getBySlug, hrefFor, nodesOfType, index } from './data';
import { neighboursOf, primaryText } from './graph';
import { excerpt } from './text';
import { TYPE_META, countLabel, BROWSE_ORDER } from './types-meta';
import type { NodeType } from './types';
import { SITE_NAME } from './site';

type Params = Promise<{ slug: string }>;

export function staticParamsFor(type: NodeType) {
  return () => nodesOfType(type).map((n) => ({ slug: n.slug }));
}

export function describe(type: NodeType, slug: string): string {
  const node = getBySlug(type, slug);
  if (!node) return '';
  const text = excerpt(primaryText(node), 155);
  if (text) return text;
  // No description in the data: describe the record by its connections only.
  const parts = BROWSE_ORDER.map((t) => [t, neighboursOf(index, node.id, t).length] as const)
    .filter(([, n]) => n > 0)
    .map(([t, n]) => countLabel(n, t));
  return `${TYPE_META[type].singular} in the ${SITE_NAME}${parts.length ? `, connected to ${parts.join(', ')}` : ''}.`;
}

export function metadataFor(type: NodeType) {
  return async ({ params }: { params: Params }): Promise<Metadata> => {
    const { slug } = await params;
    const node = getBySlug(type, slug);
    if (!node) return {};
    const description = describe(type, slug);
    const url = hrefFor(node);
    const title = `${node.name} (${TYPE_META[type].singular})`;
    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        type: 'article',
        title: node.name,
        description,
        url,
        siteName: SITE_NAME,
        locale: 'en_GB',
      },
      twitter: { card: 'summary_large_image', title: node.name, description },
    };
  };
}

export function pageFor(type: NodeType) {
  return async function Page({ params }: { params: Params }) {
    const { slug } = await params;
    const node = getBySlug(type, slug);
    if (!node) notFound();
    return <EntityPage node={node} />;
  };
}
