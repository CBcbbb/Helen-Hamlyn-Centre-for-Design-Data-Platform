import { OG_SIZE, renderOgImage } from '@/lib/og';
import { getBySlug, nodesOfType } from '@/lib/data';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Entry in the Helen Hamlyn Centre for Design Data Platform';

export function generateStaticParams() {
  return nodesOfType('People').map((n) => ({ slug: n.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const node = getBySlug('People', slug);
  return renderOgImage({ title: node?.name ?? '', type: 'People' });
}
