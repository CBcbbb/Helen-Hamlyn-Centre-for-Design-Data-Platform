import type { Metadata } from 'next';
import { graph } from '@/lib/data';

const description = `All ${graph.nodes.length} people, partners, projects and methods in the Helen Hamlyn Centre for Design Data Platform, and the ${graph.links.length} connections between them, as a map.`;

export const metadata: Metadata = {
  title: 'Network map',
  description,
  alternates: { canonical: '/explore' },
  openGraph: { title: 'Network map', description, url: '/explore' },
};

export default function ExploreMapPage() {
  return null;
}
