import type { Metadata } from 'next';
import { graph } from '@/lib/data';

const description = `All ${graph.nodes.length} people, partners, projects and methods in the Helen Hamlyn Centre for Design Data Platform as accessible tables, with their connections.`;

export const metadata: Metadata = {
  title: 'Network table',
  description,
  alternates: { canonical: '/explore/table' },
  openGraph: { title: 'Network table', description, url: '/explore/table' },
};

export default function ExploreTablePage() {
  return null;
}
