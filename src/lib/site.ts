export const SITE_NAME = 'Helen Hamlyn Centre for Design Data Platform';
export const SITE_SHORT = 'HHCD Data Platform';

/** From the original README, the platform's own description of itself. */
export const SITE_DESCRIPTION =
  'A public resource from the Helen Hamlyn Centre for Design for artists, researchers, the public and funders: discover, follow and adapt inclusive design methods through the projects, people and partners that used them.';

/**
 * Absolute base URL for canonical links, Open Graph and the sitemap.
 * Set NEXT_PUBLIC_SITE_URL in production. On Vercel the production domain is
 * picked up automatically if it is not set.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000')
).replace(/\/$/, '');

export const HHCD_URL = 'https://www.rca.ac.uk/research-innovation/research-centres/helen-hamlyn-centre/';
