import type { Metadata } from 'next';
import { TypeIndex, indexMetadata } from '@/components/TypeIndex';

export const metadata: Metadata = indexMetadata('Projects');

export default function Page() {
  return <TypeIndex type="Projects" />;
}
