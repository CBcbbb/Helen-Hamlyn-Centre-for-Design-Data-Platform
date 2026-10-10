import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/source-serif-4/opsz.css';
import '@fontsource-variable/source-serif-4/opsz-italic.css';
import './globals.css';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: 'Chongbo Ning' }],
  creator: 'Chongbo Ning',
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    locale: 'en_GB',
    url: '/',
  },
  twitter: { card: 'summary_large_image' },
  alternates: { canonical: '/' },
  icons: { icon: '/icon.svg' },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body className="flex min-h-dvh flex-col">
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        <SiteHeader />
        <main id="main" tabIndex={-1} className="flex flex-1 flex-col outline-none">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
