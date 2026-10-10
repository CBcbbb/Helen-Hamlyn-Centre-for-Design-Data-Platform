import { OG_SIZE, renderOgImage } from '@/lib/og';
import { getBySlug, nodesOfType } from '@/lib/data';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Entry in the Helen Hamlyn Centre for Design Data Platform';

export function generateStaticParams() {
  return nodesOfType('Partners').map((n) => ({ slug: n.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const node = getBySlug('Partners', slug);
  return renderOgImage({ title: node?.name ?? '', type: 'Partners' });
}
