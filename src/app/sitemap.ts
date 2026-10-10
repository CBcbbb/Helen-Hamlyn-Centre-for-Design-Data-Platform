import type { MetadataRoute } from 'next';
import { graph, hrefFor } from '@/lib/data';
import { TYPE_META, BROWSE_ORDER } from '@/lib/types-meta';
import { SITE_URL } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const url = (path: string) => `${SITE_URL}${path}`;
  return [
    { url: url('/'), changeFrequency: 'monthly', priority: 1 },
    ...BROWSE_ORDER.map((t) => ({
      url: url(`/${TYPE_META[t].segment}`),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    { url: url('/table'), changeFrequency: 'monthly', priority: 0.6 },
    { url: url('/about'), changeFrequency: 'yearly', priority: 0.4 },
    ...graph.nodes.map((n) => ({
      url: url(hrefFor(n)),
      changeFrequency: 'monthly' as const,
      priority: n.type === 'Projects' || n.type === 'Methods' ? 0.7 : 0.5,
    })),
  ];
}
