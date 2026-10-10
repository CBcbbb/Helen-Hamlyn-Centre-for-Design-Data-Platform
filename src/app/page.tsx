import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { GraphNode, MethodNode, PersonNode } from '@/lib/types';
import { getFeaturedNeighbourhood } from '@/lib/featured';
import { hrefFor, nodesOfType, graph } from '@/lib/data';
import { countByType, primaryText } from '@/lib/graph';
import { excerpt, isHttpUrl, paragraphs, toPlain, urlLabel } from '@/lib/text';
import { TYPE_META, countLabel } from '@/lib/types-meta';
import { TypeMark } from '@/components/TypeMark';
import { Paragraphs } from '@/components/RichText';
import { EntityLinkList } from '@/components/ConnectionList';
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: { absolute: SITE_NAME },
  description: SITE_DESCRIPTION,
};

/**
 * The homepage walks outwards from one project instead of opening on the
 * whole network: the project itself, then its people and methods, then the
 * projects and partners they lead to, then everything. Each step is a
 * section; the rail on the left marks how far out you are.
 */
export default function Home() {
  const { project, people, methods, partners, related } = getFeaturedNeighbourhood();
  const counts = countByType(graph.nodes);
  const allProjects = nodesOfType('Projects');
  const allMethods = nodesOfType('Methods');
  const legacy = paragraphs(project.legacy_impacts);
  const namedPartners = toPlain(project.involved_institutions);
  const relatedShown = related.slice(0, 6);
  const budget = toPlain(project.budget);
  const website = project.website?.find(isHttpUrl);

  return (
    <div className="pb-8">
      {/* Intro */}
      <section className="wrap pb-16 pt-12 md:pb-24 md:pt-20" aria-labelledby="intro-heading">
        <h1 id="intro-heading" className="display max-w-[15ch] text-[clamp(2.75rem,1.6rem+5vw,5.75rem)]">
          Start with one project, then follow where it leads.
        </h1>
        <p className="lead mt-8 text-ink md:mt-10">
          This platform maps research from the Helen Hamlyn Centre for Design at the Royal College of Art:{' '}
          {countLabel(counts.Projects, 'Projects')}, the {countLabel(counts.Methods, 'Methods')} they used, and the{' '}
          {countLabel(counts.People, 'People')} and {counts.Partners} partner organisations around them. It is for
          artists, researchers, the public and funders looking for methods to adapt to their own work.
        </p>
        <p className="meta mt-5 max-w-[56ch] text-[0.9375rem]">
          Below is one project, then the people and methods behind it, then where they lead. Every name has its own
          page, so you can start from any of them.
        </p>
      </section>

      <ol className="wrap" aria-label="From one project outwards">
        {/* Step 1: the project */}
        <Step label="Start here" id="featured" heading={project.name} headingStyle="project" kicker={
            <span className="inline-flex items-center gap-2 text-projects">
              <TypeMark type="Projects" size="0.7em" />
              Project
            </span>
          }>
          <div className="grid gap-x-14 gap-y-10 xl:grid-cols-[minmax(0,1fr)_17rem]">
            <div className="min-w-0">
              <Paragraphs value={project.description} className="text-ink" />
              <p className="mt-8">
                <Link href={hrefFor(project)} className="btn btn-secondary">
                  Read the full project record
                </Link>
              </p>
            </div>
            {(legacy.length > 0 || namedPartners || budget || website) && (
              <dl className="space-y-5 border-t border-rule pt-5 text-[0.9375rem] xl:border-l xl:border-t-0 xl:pl-8 xl:pt-1">
                {legacy.length > 0 && (
                  <div>
                    <dt className="meta">Legacy and impact</dt>
                    <dd className="mt-1 leading-snug first-letter:uppercase">{legacy.join(' ')}</dd>
                  </div>
                )}
                {budget && (
                  <div>
                    <dt className="meta">Budget</dt>
                    <dd className="mt-1 leading-snug">{budget}</dd>
                  </div>
                )}
                {namedPartners && (
                  <div>
                    <dt className="meta">Partners named in the record</dt>
                    <dd className="mt-1 leading-snug">{namedPartners}</dd>
                  </div>
                )}
                {website && (
                  <div>
                    <dt className="meta">Project archive</dt>
                    <dd className="mt-1 leading-snug">
                      <a href={website} className="link" rel="noopener noreferrer">
                        {urlLabel(website)}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </div>
        </Step>

        {/* Step 2: people and methods */}
        <Step label="One step out" heading="Who worked on it, and how" id="people-methods">
          <div className="grid gap-x-12 gap-y-12 md:grid-cols-2">
            <ConnectedGroup
              title={`The ${countLabel(methods.length, 'Methods')} it used`}
              items={methods.map((m) => ({ node: m, text: excerpt(primaryText(m), 140) }))}
            />
            <ConnectedGroup
              title={`The ${countLabel(people.length, 'People')} involved`}
              items={people.map((p) => ({ node: p, text: excerpt(primaryText(p), 140) }))}
            />
          </div>
        </Step>

        {/* Step 3: where they lead */}
        {(relatedShown.length > 0 || partners.length > 0) && (
          <Step label="Two steps out" heading="Where those people and methods lead" id="further">
            <div className="grid gap-x-12 gap-y-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
              {relatedShown.length > 0 && (
                <section aria-labelledby="related-heading">
                  <h3 id="related-heading" className="heading mb-1 text-[1.0625rem]">
                    Other projects that share them
                  </h3>
                  <p className="meta mb-4">
                    {related.length > relatedShown.length
                      ? `The ${relatedShown.length} with most in common, of ${related.length}.`
                      : `${countLabel(related.length, 'Projects')}.`}
                  </p>
                  <ul className="border-t border-rule">
                    {relatedShown.map(({ project: p, shared }) => (
                      <li key={p.id} className="border-b border-rule py-4">
                        <Link href={hrefFor(p)} className="entity-link inline-flex items-baseline gap-2 text-[1.0625rem]">
                          <TypeMark type="Projects" size="0.62em" />
                          <span>{p.name}</span>
                        </Link>
                        <p className="meta mt-1 pl-[1.15rem]">Shares {joinNames(shared.map((s) => s.name))}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {partners.length > 0 && (
                <section aria-labelledby="partners-heading">
                  <h3 id="partners-heading" className="heading mb-1 text-[1.0625rem]">
                    Partner organisations around them
                  </h3>
                  <p className="meta mb-4">Linked to the project&rsquo;s people in the network.</p>
                  <ul className="border-t border-rule">
                    {partners.map(({ node, via }) => (
                      <li key={node.id} className="border-b border-rule py-3">
                        <Link href={hrefFor(node)} className="entity-link inline-flex items-baseline gap-2">
                          <TypeMark type="Partners" size="0.62em" />
                          <span>{node.name}</span>
                        </Link>
                        <p className="meta mt-0.5 pl-[1.15rem]">via {joinNames(via.map((v) => v.name))}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </Step>
        )}

        {/* Step 4: browse */}
        <Step label="Browse" heading="Every project and method" id="browse">
          <div className="grid gap-x-12 gap-y-12 md:grid-cols-2">
            <BrowseColumn type="Projects" nodes={allProjects} />
            <BrowseColumn type="Methods" nodes={allMethods} />
          </div>
          <p className="mt-10 text-[1.0625rem]">
            Or start from the{' '}
            <Link href="/people" className="link">
              {countLabel(counts.People, 'People')}
            </Link>{' '}
            or the{' '}
            <Link href="/partners" className="link">
              {countLabel(counts.Partners, 'Partners')}
            </Link>
            .
          </p>
        </Step>

        {/* Step 5: the network */}
        <Step label="Everything" heading="The whole network" id="network" last>
          <div className="max-w-[60ch]">
            <p className="lead text-ink">
              Once you know your way around one corner, the full map shows all {graph.nodes.length} entries and the{' '}
              {graph.links.length} connections between them. A table view holds the same data as a list you can
              read and navigate by keyboard.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/explore" className="btn btn-primary">
                Open the network map
              </Link>
              <Link href="/explore/table" className="btn btn-secondary">
                Open the table view
              </Link>
            </div>
          </div>
        </Step>
      </ol>
    </div>
  );
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

/**
 * One step on the walk outwards. The left column holds the step's name and a
 * rail joining it to the next step; the heading is the section's real h2.
 */
function Step({
  label,
  heading,
  headingStyle = 'step',
  kicker,
  id,
  last = false,
  children,
}: {
  label: string;
  heading: string;
  /** 'project' sets the heading as a large display title. */
  headingStyle?: 'step' | 'project';
  kicker?: ReactNode;
  id: string;
  last?: boolean;
  children: ReactNode;
}) {
  return (
    <li className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-4 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-x-10">
      <div className="relative" aria-hidden="true">
        <span className="absolute left-[0.3125rem] top-[0.5rem] size-2.5 rounded-full bg-ink md:left-auto md:right-[-1.3125rem]" />
        {!last && (
          <span className="absolute bottom-0 left-[0.59rem] top-[1.5rem] w-px bg-rule-strong md:left-auto md:right-[-0.9875rem]" />
        )}
        <span className="meta hidden pr-6 text-right md:block">{label}</span>
      </div>
      <section aria-labelledby={`${id}-heading`} className={`min-w-0 md:pl-10 ${last ? 'pb-6' : 'pb-16 md:pb-24'}`}>
        <p className="meta mb-1 md:hidden">{label}</p>
        {kicker && <p className="heading mb-3 text-[0.9375rem]">{kicker}</p>}
        <h2
          id={`${id}-heading`}
          className={
            headingStyle === 'project'
              ? 'display mb-8 text-[clamp(2.25rem,1.5rem+3vw,3.75rem)]'
              : 'heading mb-8 text-[1.5rem] md:text-[1.75rem]'
          }
        >
          {heading}
        </h2>
        {children}
      </section>
    </li>
  );
}

function ConnectedGroup({
  title,
  items,
}: {
  title: string;
  items: { node: PersonNode | MethodNode; text: string }[];
}) {
  return (
    <section aria-label={title}>
      <h3 className="heading mb-4 text-[1.0625rem]">{title}</h3>
      <ul className="border-t border-rule">
        {items.map(({ node, text }) => (
          <li key={node.id} className="border-b border-rule py-4">
            <Link
              href={hrefFor(node)}
              className={`heading inline-flex items-baseline gap-2 text-[1.1875rem] no-underline hover:underline decoration-1 underline-offset-[0.2em] text-${TYPE_META[node.type].token}`}
            >
              <TypeMark type={node.type} size="0.6em" />
              <span>{node.name}</span>
            </Link>
            {text && <p className="mt-1.5 pl-[1.15rem] font-serif leading-relaxed text-ink">{text}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

function BrowseColumn({ type, nodes }: { type: 'Projects' | 'Methods'; nodes: GraphNode[] }) {
  const m = TYPE_META[type];
  return (
    <section aria-labelledby={`browse-${m.segment}`}>
      <div className="mb-3 flex items-baseline justify-between gap-4 border-b border-rule pb-3">
        <h3 id={`browse-${m.segment}`} className="heading text-[1.0625rem]">
          {nodes.length} {m.pluralLower}
        </h3>
        <Link href={`/${m.segment}`} className="link text-[0.9375rem]">
          All {m.pluralLower} with summaries
        </Link>
      </div>
      <EntityLinkList nodes={nodes} />
    </section>
  );
}
