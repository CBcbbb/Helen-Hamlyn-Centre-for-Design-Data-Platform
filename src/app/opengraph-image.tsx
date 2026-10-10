import { OG_SIZE, renderOgImage } from '@/lib/og';
import { SITE_NAME } from '@/lib/site';

export const alt = SITE_NAME;
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
  return renderOgImage({ title: 'Start with one project, then follow where it leads.' });
}
