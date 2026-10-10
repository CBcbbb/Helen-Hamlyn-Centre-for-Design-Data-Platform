/**
 * Pure CSV → graph conversion. No file system access here, so it can be
 * unit-tested; scripts/convert.ts does the reading and writing.
 *
 * Ported from the original scripts/convert.js. Behaviour kept:
 *  - explicit per-file header mapping (exact CSV header → app key)
 *  - `a|b|c` cells become arrays; link fields are always arrays
 *  - rows missing id or name are skipped and reported
 *  - duplicate IDs across files fail the build
 * Added:
 *  - links are merged in at build time (previously parsed in the browser)
 *  - "/" placeholder cells are treated as empty and reported
 *  - dangling links, type mismatches, duplicate links, unconnected nodes and
 *    slug collisions are reported
 *  - every node gets a URL slug for its static page
 */
import { parse } from 'csv-parse/sync';
import type { DataReport, GraphData, GraphLink, GraphNode, NodeType } from './types';
import { slugify } from './slug';

type HeaderMap = Record<string, string>;

export const PEOPLE_HEADERS: HeaderMap = {
  ID: 'id',
  'Name [text]': 'name',
  'Bio [text]': 'bio',
  'Website [link]': 'websites',
  'Social [link]': 'social',
  'Connections to institution [text]': 'connections',
};

export const PROJECTS_HEADERS: HeaderMap = {
  ID: 'id',
  'Name [text]': 'name',
  'Description [text]': 'description',
  'Who was involved (eg. creatives/communities) - who is being acted upon [text]': 'who_involved',
  'Legacy / Impacts [text]': 'legacy_impacts',
  'Challenges the project faced [text]': 'challenges',
  'What kind of budget was it? [text]': 'budget',
  'What methods were used? [text]': 'methods',
  'Website / Links to videos [link]': 'website',
  'Who was involved (Partners: funded / presented / supported ) [text]': 'involved_institutions',
};

export const PARTNERS_HEADERS: HeaderMap = {
  ID: 'id',
  'Name [text]': 'name',
  'Bio [text]': 'bio',
  'Website [link]': 'websites',
  'Social [link]': 'social',
};

export const METHODS_HEADERS: HeaderMap = {
  ID: 'id',
  'Name [text]': 'name',
  'Description [text]': 'description',
  'Step-by-step guide [Numbered list text ]': 'steps',
  'Challenges of this method [text]': 'challenges',
  'What conditions / materials are needed? [text]': 'conditions',
  'Links to reports / publications [link]': 'publications',
  'Downloadable Templates you might need [link]': 'templates',
  'Category [text]': 'category',
};

export const FILE_CONFIG: { file: string; type: NodeType; headers: HeaderMap }[] = [
  { file: 'PEOPLE.csv', type: 'People', headers: PEOPLE_HEADERS },
  { file: 'PROJECTS.csv', type: 'Projects', headers: PROJECTS_HEADERS },
  { file: 'PARTNERS.csv', type: 'Partners', headers: PARTNERS_HEADERS },
  { file: 'METHODS.csv', type: 'Methods', headers: METHODS_HEADERS },
];

/** Keys that hold one or more URLs and are always arrays. */
const LINK_KEYS = new Set(['websites', 'social', 'website']);

/** Cell values that mean "nothing here". */
const PLACEHOLDERS = new Set(['/', '-', 'n/a', 'N/A']);

/** LINKS.csv still uses the spreadsheet's original word for partners. */
const LINK_TYPE_ALIASES: Record<string, NodeType> = { Institutions: 'Partners' };

export interface CsvRow {
  record: Record<string, string>;
  /** Line in the file where the record starts (header is line 1). */
  line: number;
}

/**
 * Parse CSV text into records, each with the file line it starts on. Cells
 * often contain line breaks, so "index + 2" would point at the wrong line.
 */
export function parseCsvWithLines(content: string): CsvRow[] {
  const rows = parse(content, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
    bom: true,
    info: true,
  }) as unknown as { record: Record<string, string>; info: { lines: number } }[];
  let prevEnd = 1; // header line
  return rows.map(({ record, info }) => {
    const line = prevEnd + 1;
    prevEnd = info.lines;
    return { record, line };
  });
}

export function parseCsv(content: string): Record<string, string>[] {
  return parseCsvWithLines(content).map((r) => r.record);
}

/** Normalise line endings and collapse runs of blank lines. */
function cleanText(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export interface ProcessedValue {
  value: string | string[] | undefined;
  placeholder?: string;
}

/**
 * empty → undefined, "/" → undefined (flagged), "a|b|c" → ["a","b","c"].
 * Link keys are split on `|` or `;` and always become arrays.
 */
export function processValue(raw: unknown, appKey: string): ProcessedValue {
  if (raw === null || raw === undefined) return { value: undefined };
  const str = cleanText(String(raw));
  if (str === '') return { value: undefined };
  if (PLACEHOLDERS.has(str)) return { value: undefined, placeholder: str };

  if (LINK_KEYS.has(appKey)) {
    const parts = str
      .split(/\s*[|;]\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
    return { value: parts };
  }
  if (str.includes('|')) {
    return {
      value: str
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean),
    };
  }
  return { value: str };
}

export function rowToNode(
  row: Record<string, string>,
  type: NodeType,
  headerMap: HeaderMap,
  onPlaceholder?: (field: string, value: string) => void,
): Partial<GraphNode> & Record<string, unknown> {
  const node: Record<string, unknown> = { type };

  for (const [csvHeader, appKey] of Object.entries(headerMap)) {
    const { value, placeholder } = processValue(row[csvHeader], appKey);
    if (placeholder && onPlaceholder) onPlaceholder(appKey, placeholder);
    if (value === undefined) continue;

    if (appKey === 'id' || appKey === 'name') {
      node[appKey] = String(Array.isArray(value) ? value.join(' ') : value).trim();
    } else if (node[appKey] !== undefined) {
      const existing = node[appKey];
      const prev = Array.isArray(existing) ? existing : [existing as string];
      const add = Array.isArray(value) ? value : [value];
      node[appKey] = [...prev, ...add];
    } else {
      node[appKey] = value;
    }
  }
  return node as Partial<GraphNode> & Record<string, unknown>;
}

export interface ConvertInput {
  /** Map of file name (e.g. PEOPLE.csv) → raw CSV text. Missing files are allowed. */
  files: Record<string, string | undefined>;
  links?: string;
  now?: Date;
}

export interface ConvertOutput {
  data: GraphData;
  report: DataReport;
  warnings: string[];
}

export class DuplicateIdError extends Error {
  constructor(public ids: string[]) {
    super(`Duplicate node IDs found: ${ids.join(', ')}. IDs must be unique across all files.`);
  }
}

export function convert({ files, links, now = new Date() }: ConvertInput): ConvertOutput {
  const warnings: string[] = [];
  const nodes: GraphNode[] = [];
  const seenIds = new Map<string, { file: string; row: number }>();
  const report: DataReport = {
    generated_at: now.toISOString(),
    counts: {},
    skipped_rows: [],
    duplicate_ids: [],
    missing_required_fields: [],
    placeholder_values: [],
    dangling_links: [],
    link_type_mismatches: [],
    duplicate_links: [],
    unconnected_nodes: [],
    slug_collisions: [],
  };

  for (const { file, type, headers } of FILE_CONFIG) {
    const content = files[file];
    if (content === undefined) warnings.push(`${file} not found`);
    const rows = content ? parseCsvWithLines(content) : [];
    const count = { total: rows.length, parsed: 0, skipped: 0 };
    report.counts[file] = count;

    rows.forEach(({ record: row, line: csvRow }) => {
      const placeholders: { field: string; value: string }[] = [];
      const node = rowToNode(row, type, headers, (field, value) => placeholders.push({ field, value }));

      const missing: string[] = [];
      if (!node.id) missing.push('id');
      if (!node.name) missing.push('name');
      if (missing.length) {
        count.skipped++;
        report.skipped_rows.push({ file, row: csvRow, reason: `missing: ${missing.join(', ')}` });
        report.missing_required_fields.push({ file, row: csvRow, missing });
        return;
      }

      const id = node.id as string;
      const first = seenIds.get(id);
      if (first) {
        if (!report.duplicate_ids.includes(id)) report.duplicate_ids.push(id);
        count.skipped++;
        report.skipped_rows.push({
          file,
          row: csvRow,
          reason: `duplicate id "${id}" (first seen in ${first.file} row ${first.row})`,
        });
        return;
      }
      seenIds.set(id, { file, row: csvRow });
      for (const p of placeholders) report.placeholder_values.push({ id, ...p });

      nodes.push({ ...node, slug: '' } as GraphNode);
      count.parsed++;
    });
  }

  if (report.duplicate_ids.length) throw new DuplicateIdError(report.duplicate_ids);

  assignSlugs(nodes, report);

  const parsedLinks = links ? parseLinks(links, nodes, report) : [];

  const degree = new Map<string, number>();
  for (const l of parsedLinks) {
    degree.set(l.source, (degree.get(l.source) ?? 0) + 1);
    degree.set(l.target, (degree.get(l.target) ?? 0) + 1);
  }
  report.unconnected_nodes = nodes.filter((n) => !degree.has(n.id)).map((n) => n.id);

  return { data: { nodes, links: parsedLinks }, report, warnings };
}

function assignSlugs(nodes: GraphNode[], report: DataReport) {
  const byKey = new Map<string, GraphNode[]>();
  for (const n of nodes) {
    const base = slugify(n.name) || n.id.toLowerCase();
    const key = `${n.type}/${base}`;
    const list = byKey.get(key) ?? [];
    list.push(n);
    byKey.set(key, list);
    n.slug = base;
  }
  for (const [key, list] of byKey) {
    if (list.length < 2) continue;
    const [type, slug] = key.split('/');
    report.slug_collisions.push({ type, slug, ids: list.map((n) => n.id) });
    // Disambiguate deterministically with the stable ID.
    for (const n of list) n.slug = `${slug}-${n.id.toLowerCase()}`;
  }
}

function parseLinks(content: string, nodes: GraphNode[], report: DataReport): GraphLink[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const rows = parseCsvWithLines(content);
  const seen = new Set<string>();
  const out: GraphLink[] = [];

  rows.forEach(({ record: row, line: csvRow }) => {
    const source = (row.SourceID ?? '').trim();
    const target = (row.TargetID ?? '').trim();
    if (!source || !target) return;

    const missing = [source, target].filter((id) => !byId.has(id));
    if (missing.length) {
      report.dangling_links.push({ row: csvRow, source, target, missing });
      return;
    }

    for (const [id, declaredRaw] of [
      [source, row.SourceType],
      [target, row.TargetType],
    ] as const) {
      const declared = declaredRaw?.trim();
      if (!declared) continue;
      const normalised = LINK_TYPE_ALIASES[declared] ?? declared;
      const actual = byId.get(id)!.type;
      if (normalised !== actual) {
        report.link_type_mismatches.push({ row: csvRow, id, declared, actual });
      }
    }

    const key = [source, target].sort().join('::');
    if (seen.has(key)) {
      report.duplicate_links.push({ row: csvRow, source, target });
      return;
    }
    seen.add(key);

    const strength = Number(row.Strength);
    out.push({ source, target, strength: Number.isFinite(strength) && strength > 0 ? strength : 1 });
  });

  return out;
}
