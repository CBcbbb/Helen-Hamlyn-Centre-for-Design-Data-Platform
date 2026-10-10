import type { Metadata } from 'next';
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: { absolute: SITE_NAME },
  description: SITE_DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: { title: SITE_NAME, description: SITE_DESCRIPTION, url: '/' },
};

/** The map itself is rendered by the (network) layout. */
export default function HomePage() {
  return null;
}
