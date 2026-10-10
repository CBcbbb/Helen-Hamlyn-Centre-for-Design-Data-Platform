import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

vi.mock('server-only', () => ({}));
const { parseTable, serializeTable } = await import('./csv-store');

describe('admin CSV round trip', () => {
  it('rewrites every source CSV byte for byte when nothing changed', () => {
    for (const file of ['PEOPLE.csv', 'PROJECTS.csv', 'PARTNERS.csv', 'METHODS.csv', 'LINKS.csv']) {
      const content = fs.readFileSync(path.join(process.cwd(), 'data', file), 'utf-8');
      expect(serializeTable(parseTable(file, content)), file).toBe(content);
    }
  });

  it('quotes a cell containing a bare line break in a CRLF file', () => {
    const t = parseTable('X.csv', 'ID,Name\r\nA,one\r\n');
    t.rows[0].Name = 'line\nbreak';
    const out = serializeTable(t);
    expect(out).toBe('ID,Name\r\nA,"line\nbreak"\r\n');
    expect(parseTable('X.csv', out).rows[0].Name).toBe('line\nbreak');
  });
});
