import { Fragment } from 'react';
import type { Text } from '@/lib/types';
import { linkify, paragraphs, lines } from '@/lib/text';

/** Inline text with bare URLs turned into links. */
export function Linkified({ text }: { text: string }) {
  return (
    <>
      {linkify(text).map((seg, i) =>
        seg.kind === 'link' ? (
          <a key={i} href={seg.href} className="link" rel="noopener noreferrer">
            {seg.value}
          </a>
        ) : (
          <Fragment key={i}>{seg.value}</Fragment>
        ),
      )}
    </>
  );
}

/** Paragraphs of serif body text. Renders nothing when the field is empty. */
export function Paragraphs({ value, className = '' }: { value: Text | undefined; className?: string }) {
  const paras = paragraphs(value);
  if (!paras.length) return null;
  return (
    <div className={`prose-serif ${className}`}>
      {paras.map((p, i) => (
        <p key={i} className="whitespace-pre-line">
          <Linkified text={p} />
        </p>
      ))}
    </div>
  );
}

/**
 * Line-separated items (challenges, conditions). One line → a paragraph,
 * several → a list. Renders nothing when empty.
 */
export function Lines({ value }: { value: Text | undefined }) {
  const items = lines(value);
  if (!items.length) return null;
  if (items.length === 1) return <Paragraphs value={items[0]} />;
  return (
    <ul className="prose-serif list-disc space-y-1.5 pl-5 marker:text-ink-muted">
      {items.map((item, i) => (
        <li key={i}>
          <Linkified text={item} />
        </li>
      ))}
    </ul>
  );
}
