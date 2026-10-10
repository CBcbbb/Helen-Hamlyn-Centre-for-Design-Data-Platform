import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { FILE_CONFIG } from '../convert';
import { buildData, DATA_DIR } from '../build-data';
import type { NodeType } from '../types';

/**
 * Edits the spreadsheet exports in data/ directly. They are the single
 * source of truth; after every change the JSON and report are rebuilt.
 *
 * Writing only works where the file system is writable: local development
 * or a self-hosted server. Serverless hosts such as Vercel have a read-only
 * deployment, so changes could not be saved there (the original app's save
 * endpoint had the same limit). See canWrite().
 */

/** Prefixes used by the existing IDs in each file. */
const ID_PREFIX: Record<NodeType, string> = { People: 'P', Partners: 'I', Projects: 'PR', Methods: 'M' };

/** Fields edited as one URL per line, stored as a|b in the spreadsheet. */
export const LINK_FIELDS = new Set(['websites', 'social', 'website']);

interface Table {
  file: string;
  columns: string[];
  rows: Record<string, string>[];
  lineEnding: '\r\n' | '\n';
  trailingNewline: boolean;
}

function configFor(type: NodeType) {
  const c = FILE_CONFIG.find((f) => f.type === type);
  if (!c) throw new Error(`Unknown type ${type}`);
  return c;
}


/** Serialise a table back to CSV text, keeping the file's conventions. */
export function serializeTable(t: Pick<Table, 'columns' | 'rows' | 'lineEnding' | 'trailingNewline'>): string {
  const out = stringify([t.columns, ...t.rows.map((r) => t.columns.map((c) => r[c] ?? ''))], {
    record_delimiter: t.lineEnding === '\r\n' ? 'windows' : 'unix',
    // A cell with any line break must be quoted. By default csv-stringify
    // only quotes cells containing the record delimiter, so a bare "\n"
    // inside a CRLF file would be written unquoted and split the row.
    quoted_match: /[\r\n]/,
  });
  return t.trailingNewline ? out : out.replace(/\r?\n$/, '');
}

/** Parse CSV text into a table (columns, rows keyed by header). */
export function parseTable(file: string, content: string): Table {
  const records = parse(content, { bom: true, relax_column_count: true, skip_empty_lines: true }) as string[][];
  const [columns, ...data] = records;
  const rows = data.map((r) => Object.fromEntries(columns.map((c, i) => [c, r[i] ?? ''])));
  return {
    file,
    columns,
    rows,
    lineEnding: content.includes('\r\n') ? '\r\n' : '\n',
    trailingNewline: /\r?\n$/.test(content),
  };
}

function readTable(file: string): Table {
  return parseTable(file, fs.readFileSync(path.join(DATA_DIR, file), 'utf-8'));
}

function writeTable(t: Table) {
  fs.writeFileSync(path.join(DATA_DIR, t.file), serializeTable(t), 'utf-8');
}

export function canWrite(): boolean {
  try {
    fs.accessSync(DATA_DIR, fs.constants.W_OK);
    for (const { file } of FILE_CONFIG) fs.accessSync(path.join(DATA_DIR, file), fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

export interface EditableField {
  key: string;
  header: string;
  value: string;
  multiline: boolean;
  isLink: boolean;
}

/** The raw spreadsheet cells for one entity, keyed by app field. */
export function readRecord(type: NodeType, id: string): EditableField[] | null {
  const { file, headers } = configFor(type);
  const t = readTable(file);
  const row = t.rows.find((r) => r.ID.trim() === id);
  if (!row) return null;
  return Object.entries(headers)
    .filter(([, key]) => key !== 'id')
    .map(([header, key]) => {
      const isLink = LINK_FIELDS.has(key);
      return {
        key,
        header,
        value: cellToForm(row[header] ?? '', key),
        multiline: key !== 'name',
        isLink,
      };
    });
}

/** Spreadsheet cell → the text shown in the form (see readRecord). */
function cellToForm(raw: string, key: string): string {
  const v = raw.replace(/\r\n?/g, '\n');
  return LINK_FIELDS.has(key) ? v.split(/\s*[|;]\s*/).filter(Boolean).join('\n') : v;
}

export function updateRecord(type: NodeType, id: string, values: Record<string, string>) {
  const { file, headers } = configFor(type);
  const t = readTable(file);
  const row = t.rows.find((r) => r.ID.trim() === id);
  if (!row) throw new Error(`No ${type} with ID ${id}`);
  for (const [header, key] of Object.entries(headers)) {
    if (key === 'id' || !(key in values)) continue;
    const submitted = values[key].replace(/\r\n?/g, '\n');
    // Leave a cell exactly as it was unless its content actually changed,
    // so a save doesn't rewrite whitespace in fields nobody touched.
    if (submitted.trim() === cellToForm(row[header] ?? '', key).trim()) continue;
    let v = submitted.trim();
    if (LINK_FIELDS.has(key)) v = v.split('\n').map((s) => s.trim()).filter(Boolean).join('|');
    row[header] = t.lineEnding === '\r\n' ? v.replace(/\n/g, '\r\n') : v;
  }
  if (!row['Name [text]']?.trim()) throw new Error('Name is required.');
  writeTable(t);
  return buildData();
}

export function createRecord(type: NodeType, name: string): string {
  const { file } = configFor(type);
  const t = readTable(file);
  const prefix = ID_PREFIX[type];
  const allIds = FILE_CONFIG.flatMap((c) => readTable(c.file).rows.map((r) => r.ID.trim()));
  const nums = allIds
    .filter((id) => id.startsWith(prefix) && /^\d+$/.test(id.slice(prefix.length)))
    .map((id) => Number(id.slice(prefix.length)));
  let n = (nums.length ? Math.max(...nums) : 0) + 1;
  let id = `${prefix}${String(n).padStart(3, '0')}`;
  while (allIds.includes(id)) id = `${prefix}${String(++n).padStart(3, '0')}`;
  const row = Object.fromEntries(t.columns.map((c) => [c, '']));
  row.ID = id;
  row['Name [text]'] = name.trim();
  t.rows.push(row);
  writeTable(t);
  buildData();
  return id;
}

/** Delete an entity and every link that mentions it. */
export function deleteRecord(type: NodeType, id: string) {
  const { file } = configFor(type);
  const t = readTable(file);
  const before = t.rows.length;
  t.rows = t.rows.filter((r) => r.ID.trim() !== id);
  if (t.rows.length === before) throw new Error(`No ${type} with ID ${id}`);
  writeTable(t);
  const linksPath = path.join(DATA_DIR, 'LINKS.csv');
  if (fs.existsSync(linksPath)) {
    const links = readTable('LINKS.csv');
    links.rows = links.rows.filter((r) => r.SourceID?.trim() !== id && r.TargetID?.trim() !== id);
    writeTable(links);
  }
  return buildData();
}
