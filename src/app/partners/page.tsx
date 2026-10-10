import type { Metadata } from 'next';
import { TypeIndex, indexMetadata } from '@/components/TypeIndex';

export const metadata: Metadata = indexMetadata('Partners');

export default function Page() {
  return <TypeIndex type="Partners" />;
}
