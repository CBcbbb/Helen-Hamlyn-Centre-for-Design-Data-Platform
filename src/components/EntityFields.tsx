import type { ReactNode } from 'react';
import type { GraphNode, MethodNode, PartnerNode, PersonNode, ProjectNode, Text } from '@/lib/types';
import { numberedSteps, paragraphs, toPlain, urlLabel, isHttpUrl } from '@/lib/text';
import { Lines, Linkified, Paragraphs } from './RichText';

/**
 * The descriptive fields for an entity, rendered as headed sections.
 * Used on the static entity pages and in the network view's details panel.
 * Empty fields render nothing: no placeholders, no invented text.
 *
 * `headingLevel` lets the caller fit these into its own outline.
 */
export function EntityFields({
  node,
  headingLevel = 2,
  skipPrimary = false,
}: {
  node: GraphNode;
  headingLevel?: 2 | 3;
  /** Skip the main description/bio when the caller has already shown it. */
  skipPrimary?: boolean;
}) {
  const H = headingLevel;
  switch (node.type) {
    case 'Projects':
      return <ProjectFields node={node} h={H} skipPrimary={skipPrimary} />;
    case 'Methods':
      return <MethodFields node={node} h={H} skipPrimary={skipPrimary} />;
    case 'People':
      return <PersonFields node={node} h={H} skipPrimary={skipPrimary} />;
    case 'Partners':
      return <PartnerFields node={node} h={H} skipPrimary={skipPrimary} />;
  }
}

function Field({ title, h, children }: { title: string; h: 2 | 3; children: ReactNode }) {
  const Tag = h === 2 ? 'h2' : 'h3';
  return (
    <section className="field">
      <Tag className="heading mb-2.5 text-[1.0625rem]">{title}</Tag>
      {children}
    </section>
  );
}

function has(value: Text | string[] | undefined): boolean {
  return paragraphs(value).length > 0;
}

function ExternalLinks({ urls }: { urls: string[] }) {
  const valid = urls.filter(isHttpUrl);
  const other = urls.filter((u) => !isHttpUrl(u));
  return (
    <ul className="space-y-1.5">
      {valid.map((href) => (
        <li key={href}>
          <a href={href} className="link" rel="noopener noreferrer">
            {urlLabel(href)}
          </a>
        </li>
      ))}
      {other.map((text) => (
        <li key={text} className="prose-serif">
          <Linkified text={text} />
        </li>
      ))}
    </ul>
  );
}

function ProjectFields({ node, h, skipPrimary }: { node: ProjectNode; h: 2 | 3; skipPrimary: boolean }) {
  return (
    <div className="space-y-9">
      {!skipPrimary && has(node.description) && (
        <Field title="About the project" h={h}>
          <Paragraphs value={node.description} />
        </Field>
      )}
      {has(node.who_involved) && (
        <Field title="Who it was for and with" h={h}>
          <Paragraphs value={node.who_involved} />
        </Field>
      )}
      {has(node.involved_institutions) && (
        <Field title="Partners named in the project record" h={h}>
          <Paragraphs value={node.involved_institutions} />
        </Field>
      )}
      {has(node.methods) && (
        <Field title="Methods, as recorded" h={h}>
          <Paragraphs value={node.methods} />
        </Field>
      )}
      {has(node.legacy_impacts) && (
        <Field title="Legacy and impact" h={h}>
          <Lines value={node.legacy_impacts} />
        </Field>
      )}
      {has(node.challenges) && (
        <Field title="Challenges the project faced" h={h}>
          <Lines value={node.challenges} />
        </Field>
      )}
      {has(node.budget) && (
        <Field title="Budget" h={h}>
          <Lines value={node.budget} />
        </Field>
      )}
      {node.website && node.website.length > 0 && (
        <Field title="Website and videos" h={h}>
          <ExternalLinks urls={node.website} />
        </Field>
      )}
    </div>
  );
}

function MethodFields({ node, h, skipPrimary }: { node: MethodNode; h: 2 | 3; skipPrimary: boolean }) {
  const steps = numberedSteps(node.steps);
  return (
    <div className="space-y-9">
      {!skipPrimary && has(node.description) && (
        <Field title="About the method" h={h}>
          <Paragraphs value={node.description} />
        </Field>
      )}
      {(steps.length > 0 || has(node.steps)) && (
        <Field title="Step by step" h={h}>
          {steps.length > 0 ? (
            <ol className="prose-serif list-decimal space-y-2 pl-6 marker:font-sans marker:text-[0.9375rem] marker:font-semibold marker:text-ink-muted">
              {steps.map((s, i) => (
                <li key={i} className="pl-1">
                  <Linkified text={s} />
                </li>
              ))}
            </ol>
          ) : (
            <Paragraphs value={node.steps} />
          )}
        </Field>
      )}
      {has(node.conditions) && (
        <Field title="What you need" h={h}>
          <Lines value={node.conditions} />
        </Field>
      )}
      {has(node.challenges) && (
        <Field title="Challenges of this method" h={h}>
          <Lines value={node.challenges} />
        </Field>
      )}
      {has(node.publications) && (
        <Field title="Reports and publications" h={h}>
          <Lines value={node.publications} />
        </Field>
      )}
      {has(node.templates) && (
        <Field title="Templates" h={h}>
          <Lines value={node.templates} />
        </Field>
      )}
      {has(node.category) && (
        <Field title="Category" h={h}>
          <p className="prose-serif">{toPlain(node.category)}</p>
        </Field>
      )}
    </div>
  );
}

function ProfileLinks({ websites, social, h }: { websites?: string[]; social?: string[]; h: 2 | 3 }) {
  return (
    <>
      {websites && websites.length > 0 && (
        <Field title={websites.length > 1 ? 'Websites' : 'Website'} h={h}>
          <ExternalLinks urls={websites} />
        </Field>
      )}
      {social && social.length > 0 && (
        <Field title="Social" h={h}>
          <ExternalLinks urls={social} />
        </Field>
      )}
    </>
  );
}

function PersonFields({ node, h, skipPrimary }: { node: PersonNode; h: 2 | 3; skipPrimary: boolean }) {
  return (
    <div className="space-y-9">
      {!skipPrimary && has(node.bio) && (
        <Field title="Biography" h={h}>
          <Paragraphs value={node.bio} />
        </Field>
      )}
      {has(node.connections) && (
        <Field title="Other institutions and organisations" h={h}>
          <Paragraphs value={node.connections} />
        </Field>
      )}
      <ProfileLinks websites={node.websites} social={node.social} h={h} />
    </div>
  );
}

function PartnerFields({ node, h, skipPrimary }: { node: PartnerNode; h: 2 | 3; skipPrimary: boolean }) {
  return (
    <div className="space-y-9">
      {!skipPrimary && has(node.bio) && (
        <Field title="About" h={h}>
          <Paragraphs value={node.bio} />
        </Field>
      )}
      <ProfileLinks websites={node.websites} social={node.social} h={h} />
    </div>
  );
}
