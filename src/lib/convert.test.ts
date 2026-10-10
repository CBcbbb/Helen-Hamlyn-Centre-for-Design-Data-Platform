import { describe, expect, it } from 'vitest';
import { convert, DuplicateIdError, processValue } from './convert';

const PEOPLE = `ID,Name [text],Bio [text],Website [link],Social [link],Connections to institution [text]
P1,Ada Example ,"Line one.

Line two.",https://a.example/|https://b.example/,,
P2,,No name here,,,
`;
const PROJECTS = `ID,Name [text],Description [text],Who was involved (eg. creatives/communities) - who is being acted upon [text],Legacy / Impacts [text],Challenges the project faced [text],What kind of budget was it? [text],What methods were used? [text],Website / Links to videos [link],Who was involved (Partners: funded / presented / supported ) [text]
PR1,A Project,Desc,,,,"£1\r\n£2",interviews,https://x.example/ ;  https://y.example/doc.pdf,
`;
const METHODS = `ID,Name [text],Description [text],Step-by-step guide [Numbered list text ],Challenges of this method [text],What conditions / materials are needed? [text],Links to reports / publications [link],Downloadable Templates you might need [link],Category [text]
M1,A Method,Desc,,,,,/,
`;
const PARTNERS = `ID,Name [text],Bio [text],Website [link],Social [link]
I1,A Partner,,,
`;
const LINKS = `SourceType,SourceID,TargetType,TargetID,Strength
Institutions,I1,People,P1,1
People,P1,Projects,PR1,1
Projects,PR1,Methods,M1,
Projects,PR9,Methods,M1,1
People,PR1,Projects,P1,1
`;

const files = { 'PEOPLE.csv': PEOPLE, 'PROJECTS.csv': PROJECTS, 'METHODS.csv': METHODS, 'PARTNERS.csv': PARTNERS };

describe('processValue', () => {
  it('treats empty and placeholder cells as missing', () => {
    expect(processValue('', 'bio').value).toBeUndefined();
    expect(processValue('  ', 'bio').value).toBeUndefined();
    expect(processValue('/', 'templates')).toEqual({ value: undefined, placeholder: '/' });
  });
  it('splits pipes into arrays and always returns arrays for link fields', () => {
    expect(processValue('a|b', 'bio').value).toEqual(['a', 'b']);
    expect(processValue('https://a', 'websites').value).toEqual(['https://a']);
    expect(processValue('https://a ; https://b', 'website').value).toEqual(['https://a', 'https://b']);
  });
  it('normalises Windows line endings', () => {
    expect(processValue('a\r\nb', 'budget').value).toBe('a\nb');
  });
});

describe('convert', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  const { data, report } = convert({ files, links: LINKS, now });

  it('builds typed nodes with slugs and trims names', () => {
    const ada = data.nodes.find((n) => n.id === 'P1');
    expect(ada).toMatchObject({ type: 'People', name: 'Ada Example', slug: 'ada-example' });
    expect(ada && 'websites' in ada && ada.websites).toEqual(['https://a.example/', 'https://b.example/']);
  });

  it('skips and reports rows missing a required field', () => {
    expect(data.nodes.find((n) => n.id === 'P2')).toBeUndefined();
    expect(report.missing_required_fields).toEqual([{ file: 'PEOPLE.csv', row: 5, missing: ['name'] }]);
    expect(report.counts['PEOPLE.csv']).toEqual({ total: 2, parsed: 1, skipped: 1 });
  });

  it('merges valid links, defaults strength to 1 and reports the rest', () => {
    expect(data.links).toEqual([
      { source: 'I1', target: 'P1', strength: 1 },
      { source: 'P1', target: 'PR1', strength: 1 },
      { source: 'PR1', target: 'M1', strength: 1 },
    ]);
    expect(report.dangling_links).toEqual([{ row: 5, source: 'PR9', target: 'M1', missing: ['PR9'] }]);
    // Row 6 declares the wrong types and duplicates row 3.
    expect(report.link_type_mismatches.map((m) => m.id)).toEqual(['PR1', 'P1']);
    expect(report.duplicate_links).toEqual([{ row: 6, source: 'PR1', target: 'P1' }]);
  });

  it('reports placeholders and records when it ran', () => {
    expect(report.placeholder_values).toEqual([{ id: 'M1', field: 'templates', value: '/' }]);
    expect(report.generated_at).toBe('2026-01-01T00:00:00.000Z');
    expect(report.unconnected_nodes).toEqual([]);
  });

  it('fails on duplicate IDs across files', () => {
    const dup = { ...files, 'PARTNERS.csv': `ID,Name [text],Bio [text],Website [link],Social [link]\nP1,Clash,,,\n` };
    expect(() => convert({ files: dup, links: '' })).toThrow(DuplicateIdError);
  });

  it('disambiguates slug collisions within a type with the stable ID', () => {
    const twins = {
      ...files,
      'METHODS.csv': `${METHODS.trim()}\nM2,A Method!,Other,,,,,,\n`,
    };
    const out = convert({ files: twins, links: '' });
    const slugs = out.data.nodes.filter((n) => n.type === 'Methods').map((n) => n.slug);
    expect(slugs).toEqual(['a-method-m1', 'a-method-m2']);
    expect(out.report.slug_collisions).toEqual([{ type: 'Methods', slug: 'a-method', ids: ['M1', 'M2'] }]);
  });
});
