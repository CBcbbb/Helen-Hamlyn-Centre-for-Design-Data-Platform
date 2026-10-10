import type { Text } from './types';

/** Flatten a Text field to a single string ('' when absent). */
export function toPlain(value: Text | undefined): string {
  if (!value) return '';
  return Array.isArray(value) ? value.join('\n\n') : value;
}

/** Split a Text field into display paragraphs, dropping empties. */
export function paragraphs(value: Text | undefined): string[] {
  if (!value) return [];
  const parts = Array.isArray(value) ? value : [value];
  return parts
    .flatMap((p) => p.split(/\n{2,}/))
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Split a Text field into list items on line breaks. */
export function lines(value: Text | undefined): string[] {
  if (!value) return [];
  const parts = Array.isArray(value) ? value : [value];
  return parts
    .flatMap((p) => p.split(/\n+/))
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * Parse a numbered step list ("1. Do this\n2. Do that") into items without
 * their numbers. Returns [] when the text isn't a numbered list.
 */
export function numberedSteps(value: Text | undefined): string[] {
  const text = toPlain(value);
  if (!/^\s*1[.)]\s/.test(text)) return [];
  return text
    .split(/(?:^|\n)\s*\d+[.)]\s+/)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/**
 * Shorten text to at most `max` characters at a word boundary, for
 * descriptions and table summaries. Never adds words that aren't there.
 */
export function excerpt(value: Text | undefined, max = 160): string {
  const text = toPlain(value).replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.–-]+$/, '')}…`;
}

export type Segment = { kind: 'text'; value: string } | { kind: 'link'; value: string; href: string };

const URL_RE = /(https?:\/\/[^\s<>"')\]]+[^\s<>"')\].,;:])/g;

/** Split text into plain and URL segments so URLs can be rendered as links. */
export function linkify(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_RE)) {
    const i = match.index ?? 0;
    if (i > last) out.push({ kind: 'text', value: text.slice(last, i) });
    out.push({ kind: 'link', value: match[0], href: match[0] });
    last = i + match[0].length;
  }
  if (last < text.length) out.push({ kind: 'text', value: text.slice(last) });
  return out;
}

/** A readable label for an external URL: host plus a short path. */
export function urlLabel(href: string): string {
  try {
    const u = new URL(href);
    const host = u.hostname.replace(/^www\./, '');
    const path = u.pathname.replace(/\/$/, '');
    if (!path) return host;
    const short = path.length > 32 ? `${path.slice(0, 31)}…` : path;
    return `${host}${short}`;
  } catch {
    return href;
  }
}

export function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}
