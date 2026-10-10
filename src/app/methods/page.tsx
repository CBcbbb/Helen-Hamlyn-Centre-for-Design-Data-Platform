import type { Metadata } from 'next';
import { TypeIndex, indexMetadata } from '@/components/TypeIndex';

export const metadata: Metadata = indexMetadata('Methods');

export default function Page() {
  return <TypeIndex type="Methods" />;
}
