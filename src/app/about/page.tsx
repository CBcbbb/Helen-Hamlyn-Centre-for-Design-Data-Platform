import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { HHCD_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'About the platform',
  description:
    'What the Helen Hamlyn Centre for Design Data Platform is, how to use it, its accessibility features, and how to translate it.',
  alternates: { canonical: '/about' },
};

const SECTIONS = [
  { id: 'about', title: 'About this website' },
  { id: 'how-to-use', title: 'How to use it' },
  { id: 'accessibility', title: 'Accessibility' },
  { id: 'translation', title: 'Translation help' },
  { id: 'credits', title: 'Credits' },
];

/**
 * Content ported from the original app's sidebar dialogs (Introduction, How to
 * use it, Accessibility, Translation Help), updated where the rebuild changed
 * how things work.
 */
export default function AboutPage() {
  return (
    <div className="wrap pb-24 pt-10 md:pt-16">
      <header className="max-w-[48rem]">
        <h1 className="display text-[clamp(2.5rem,1.8rem+3vw,4.25rem)]">About the platform</h1>
        <p className="lead mt-5 text-ink-muted">
          A map of projects, methods, people and organisations from the Helen Hamlyn Centre for Design.
        </p>
      </header>

      <div className="mt-12 grid gap-x-16 gap-y-10 md:mt-16 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <nav aria-label="On this page" className="lg:sticky lg:top-8 lg:self-start">
          <ul className="space-y-1.5 border-l border-rule pl-4 text-[0.9375rem]">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="entity-link">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="max-w-[66ch] space-y-16">
          <Section id="about" title="About this website">
            <p>
              Welcome to the Helen Hamlyn Centre for Design Data Platform: a rhizomatic map of projects, methods,
              people and organisations.
            </p>
            <p>
              We use a rhizomatic mapping method, inspired by mycelium and constellations of stars, to showcase the
              emerging knowledge from the Helen Hamlyn Centre for Design. There is no centre and no hierarchy: people,
              partners, projects and methods are equals, and any of them can be where you start. Explore the entries
              across this constellation to learn about the organisations and methods we have worked with, and the
              projects we have worked on.
            </p>
            <p>
              The platform is a publicly accessible resource for artists, researchers, the public and funders, to
              discover, follow and adapt methods for their own contexts and creative practice.
            </p>
            <h3 className="heading mt-8 text-lg">About the Helen Hamlyn Centre for Design</h3>
            <p>
              The Helen Hamlyn Centre for Design is a global leader in inclusive design and works with government,
              business, academia and the third sector to conduct research and knowledge exchange projects.{' '}
              <a href={HHCD_URL} className="link">
                Learn more about the Helen Hamlyn Centre for Design
              </a>
              .
            </p>
          </Section>

          <Section id="how-to-use" title="How to use it">
            <p>
              <strong className="font-sans font-semibold">The map.</strong> The{' '}
              <Link href="/" className="link">
                map
              </Link>{' '}
              shows every entry and every connection. Each entry sits near the ones it is connected to. Hover over or
              focus an entry to see its connections, and select it to open its details.
            </p>
            <p>
              <strong className="font-sans font-semibold">Follow connections.</strong> In the details, every
              connection can be selected in turn. The entries you open form a path at the top of the details, so you
              can always step back. On a first visit, a short guide shows how; you can{' '}
              <Link href="/?guide" className="link">
                show the guide again
              </Link>{' '}
              at any time.
            </p>
            <p>
              <strong className="font-sans font-semibold">Two arrangements.</strong> Constellation places entries by
              their connections. By type sorts the same entries into columns of partners, people, projects and
              methods. Switch between them with the control at the top of the map.
            </p>
            <p>
              <strong className="font-sans font-semibold">Search, filter or read it as a table.</strong> Search and the
              type filters narrow the map down. The{' '}
              <Link href="/table" className="link">
                table view
              </Link>{' '}
              holds the same data as lists, which many people find easier to read. Every entry also has its own page,
              and the{' '}
              <Link href="/projects" className="link">
                projects
              </Link>
              ,{' '}
              <Link href="/methods" className="link">
                methods
              </Link>
              ,{' '}
              <Link href="/people" className="link">
                people
              </Link>{' '}
              and{' '}
              <Link href="/partners" className="link">
                partners
              </Link>{' '}
              lists give a short summary of each.
            </p>
          </Section>

          <Section id="accessibility" title="Accessibility">
            <p>
              This site aims to meet WCAG 2.2 level AA. It has been checked with an automated tool (axe) at desktop and
              mobile widths, and by keyboard. It has not had a formal conformance audit or testing with disabled users,
              so it does not claim conformance, and some problems may remain. If something doesn&rsquo;t work for you,
              please let the Helen Hamlyn Centre for Design know.
            </p>
            <h3 className="heading mt-8 text-lg">Keyboard</h3>
            <ul className="list-disc space-y-1.5 pl-5 marker:text-ink-muted">
              <li>
                <kbd>Tab</kbd> moves through links and controls. A skip link at the top of every page goes straight to
                the content.
              </li>
              <li>
                The map is one stop in the tab order. Inside it, the <kbd>arrow keys</kbd> move to the nearest entry in
                that direction, in either arrangement, and <kbd>Enter</kbd> or <kbd>Space</kbd> opens its details.
                From the details, each connection is a button, so you can follow connections from entry to entry.
              </li>
              <li>
                <kbd>Escape</kbd> closes the details panel and dialogs, and focus goes back to where you were.
              </li>
              <li>
                <kbd>Ctrl/⌘ K</kbd> goes to search, <kbd>Ctrl/⌘ E</kbd> switches between map and table, and{' '}
                <kbd>?</kbd> lists all shortcuts.
              </li>
              <li>
                <kbd>Ctrl/⌘ ← →</kbd> makes the details panel wider or narrower.
              </li>
            </ul>
            <h3 className="heading mt-8 text-lg">Screen readers</h3>
            <p>
              Pages use landmarks and headings in a logical order. Each entry on the map is announced with its type and
              number of connections. Search results, filter changes and switching arrangement are announced. The guide
              never moves your focus: its cards sit just before what they point at, and can be skipped. The table view
              is the recommended way to explore the whole network with a screen reader: each entity type is a table with
              a caption and row headers.
            </p>
            <h3 className="heading mt-8 text-lg">Seeing and reading</h3>
            <ul className="list-disc space-y-1.5 pl-5 marker:text-ink-muted">
              <li>Text colours meet WCAG AA contrast against their backgrounds.</li>
              <li>Each entity type has a shape as well as a colour, so type never depends on colour alone.</li>
              <li>Every entry on the map is drawn at the same size: none is shown as more important than another.</li>
              <li>Text resizes with your browser settings, and pages reflow on screens down to 320 pixels wide.</li>
              <li>
                Animation (the guide&rsquo;s pulse and the move between arrangements) is switched off if your system
                asks for reduced motion.
              </li>
              <li>Every page works without JavaScript, apart from search, filters and the details panel.</li>
            </ul>
          </Section>

          <Section id="translation" title="Translation help">
            <p>This site is in English. To read it in another language, use your browser&rsquo;s translation tools.</p>
            <h3 className="heading mt-8 text-lg">Step 1: choose a translation tool</h3>
            <ul className="list-disc space-y-1.5 pl-5 marker:text-ink-muted">
              <li>
                <a href="https://chromewebstore.google.com/detail/google-translate/aapbdbdomjkkjkaonfhkkikfgjllcleb" className="link">
                  Google Translate extension (for Chrome)
                </a>
              </li>
              <li>
                <a href="https://microsoftedge.microsoft.com/addons/detail/microsoft-translator-bui/fbhhdpcmomckhopgphnkegobjdggdfhe" className="link">
                  Microsoft Translator (for Edge)
                </a>
              </li>
              <li>
                <a href="https://addons.mozilla.org/en-US/firefox/addon/to-google-translate/" className="link">
                  To Google Translate (for Firefox)
                </a>
              </li>
              <li>
                <a href="https://support.apple.com/en-lb/guide/safari/ibrw646b2ca2/mac" className="link">
                  Safari built-in translation (for Safari)
                </a>
              </li>
            </ul>
            <h3 className="heading mt-8 text-lg">Step 2: install or enable the tool</h3>
            <p>
              Chrome, Edge and Firefox: follow the link above, then choose Add to browser or Install. Safari on macOS
              Big Sur or later needs no installation: open the page, click the Translate button in the address bar and
              choose your language.
            </p>
            <h3 className="heading mt-8 text-lg">Step 3: translate this website</h3>
            <p>Open the extension or browser feature, select your language, and the page translates in place.</p>
          </Section>

          <Section id="credits" title="Credits">
            <p>
              Helen Hamlyn Centre for Design Data Platform. Research content from the Helen Hamlyn Centre for Design,
              Royal College of Art. Designed and built by Chongbo Ning.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-8">
      <h2 id={`${id}-heading`} className="heading mb-5 text-[1.625rem]">
        {title}
      </h2>
      <div className="prose-serif space-y-4">{children}</div>
    </section>
  );
}
