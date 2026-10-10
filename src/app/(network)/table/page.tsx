import type { Metadata } from 'next';
import { graph } from '@/lib/data';

const description = `All ${graph.nodes.length} people, partners, projects and methods in the Helen Hamlyn Centre for Design Data Platform as accessible tables, with their connections.`;

export const metadata: Metadata = {
  title: 'Network table',
  description,
  alternates: { canonical: '/table' },
  openGraph: { title: 'Network table', description, url: '/table' },
};

/** The table itself is rendered by the (network) layout. */
export default function TablePage() {
  return null;
}
