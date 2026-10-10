import { describe, expect, it } from 'vitest';
import { slugify } from './slug';
import { excerpt, linkify, numberedSteps, paragraphs, urlLabel } from './text';
import { filterByType, indexGraph, neighboursOf, searchNodes, twoStep } from './graph';
import { computeLayout, nearestInDirection, shortLabel, starBox, wrapLabel, NODE_RADIUS } from './layout';
import { graph, getBySlug, getFeaturedProject, hrefFor, index, nodesOfType } from './data';
import type { GraphData } from './types';

describe('slugify', () => {
  it('makes readable, URL-safe slugs', () => {
    expect(slugify('DOME: Design Out Medical Error')).toBe('dome-design-out-medical-error');
    expect(slugify('i~design Programme')).toBe('i-design-programme');
    expect(slugify('Heart n Soul @ The Hub')).toBe('heart-n-soul-the-hub');
    expect(slugify('Believe in Us - Heart & Soul')).toBe('believe-in-us-heart-and-soul');
    expect(slugify('Crohns’ & Colitis')).toBe('crohns-and-colitis');
  });
});

describe('text helpers', () => {
  it('splits paragraphs on blank lines', () => {
    expect(paragraphs('a\n\nb')).toEqual(['a', 'b']);
    expect(paragraphs(undefined)).toEqual([]);
  });
  it('parses numbered steps and ignores non-lists', () => {
    expect(numberedSteps('1. First\n2. Second thing\n')).toEqual(['First', 'Second thing']);
    expect(numberedSteps('Just prose')).toEqual([]);
  });
  it('shortens at a word boundary without inventing text', () => {
    const out = excerpt('one two three four five six seven', 20);
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(20);
    expect('one two three four five six seven'.startsWith(out.slice(0, -1))).toBe(true);
    expect(excerpt('short', 20)).toBe('short');
  });
  it('finds URLs without swallowing trailing punctuation', () => {
    expect(linkify('See https://ex.ample/a. Done')).toEqual([
      { kind: 'text', value: 'See ' },
      { kind: 'link', value: 'https://ex.ample/a', href: 'https://ex.ample/a' },
      { kind: 'text', value: '. Done' },
    ]);
  });
  it('labels URLs by host and short path', () => {
    expect(urlLabel('https://www.rca.ac.uk/')).toBe('rca.ac.uk');
    expect(urlLabel('not a url')).toBe('not a url');
  });
});

const fixture: GraphData = {
  nodes: [
    { id: 'P1', slug: 'p1', name: 'Pat', type: 'People', bio: 'Works on inclusive design' },
    { id: 'I1', slug: 'i1', name: 'Uni', type: 'Partners' },
    { id: 'PR1', slug: 'pr1', name: 'Alpha', type: 'Projects', methods: 'interviews' },
    { id: 'PR2', slug: 'pr2', name: 'Beta', type: 'Projects' },
    { id: 'M1', slug: 'm1', name: 'Interviews', type: 'Methods', category: 'Research' },
  ],
  links: [
    { source: 'I1', target: 'P1', strength: 1 },
    { source: 'P1', target: 'PR1', strength: 1 },
    { source: 'P1', target: 'PR2', strength: 1 },
    { source: 'PR1', target: 'M1', strength: 1 },
  ],
};

describe('graph helpers', () => {
  const index = indexGraph(fixture);
  it('lists neighbours by type, sorted by name', () => {
    expect(neighboursOf(index, 'P1').map((n) => n.id)).toEqual(['PR1', 'PR2', 'I1']);
    expect(neighboursOf(index, 'P1', 'Projects').map((n) => n.name)).toEqual(['Alpha', 'Beta']);
  });
  it('finds two-step connections with their intermediates', () => {
    expect(twoStep(index, 'PR1', 'People', 'Partners')).toEqual([{ node: fixture.nodes[1], via: [fixture.nodes[0]] }]);
  });
  it('searches name, bio, methods and category, case-insensitively', () => {
    expect([...searchNodes(fixture.nodes, 'INCLUSIVE')]).toEqual(['P1']);
    expect([...searchNodes(fixture.nodes, 'interview')].sort()).toEqual(['M1', 'PR1']);
    expect([...searchNodes(fixture.nodes, 'research')]).toEqual(['M1']);
    expect(searchNodes(fixture.nodes, '   ').size).toBe(0);
  });
  it('filters by type and drops links to hidden nodes', () => {
    const out = filterByType(fixture, { People: true, Partners: false, Projects: true, Methods: true });
    expect(out.nodes.map((n) => n.id)).not.toContain('I1');
    expect(out.links.some((l) => l.source === 'I1' || l.target === 'I1')).toBe(false);
  });
});

describe('layout', () => {
  const layout = computeLayout(graph);

  it('is deterministic (server and browser agree)', () => {
    expect(computeLayout(graph).positions).toEqual(layout.positions);
  });

  it('has a position for every entry in both arrangements, inside the shared frame', () => {
    for (const arrangement of ['constellation', 'columns'] as const) {
      for (const n of graph.nodes) {
        const p = layout.positions[arrangement][n.id];
        expect(p, `${arrangement} ${n.id}`).toBeDefined();
        const box =
          arrangement === 'constellation'
            ? starBox(n.name)
            : { left: -NODE_RADIUS, right: NODE_RADIUS + 8 + shortLabel(n.name).length * 7.7, top: -NODE_RADIUS, bottom: NODE_RADIUS };
        expect(p.x + box.left).toBeGreaterThanOrEqual(0);
        expect(p.x + box.right).toBeLessThanOrEqual(layout.width);
        expect(p.y + box.top).toBeGreaterThanOrEqual(0);
        expect(p.y + box.bottom).toBeLessThanOrEqual(layout.height);
      }
    }
  });

  it('columns: puts each type in its own column, labels at least 30 units apart', () => {
    const { columns: positions } = layout.positions;
    const xs = new Map<string, Set<number>>();
    for (const n of graph.nodes) {
      const set = xs.get(n.type) ?? new Set();
      set.add(positions[n.id].x);
      xs.set(n.type, set);
    }
    for (const set of xs.values()) expect(set.size).toBe(1);
    for (const t of ['People', 'Partners', 'Projects', 'Methods'] as const) {
      const ys = graph.nodes
        .filter((n) => n.type === t)
        .map((n) => positions[n.id].y)
        .sort((x, y) => x - y);
      for (let i = 1; i < ys.length; i++) expect(ys[i] - ys[i - 1]).toBeGreaterThanOrEqual(29);
    }
  });

  it('constellation: no type is given its own place, and no two labels overlap', () => {
    const { constellation: positions } = layout.positions;
    // Types are mixed, not separated into bands.
    const meanX = (t: string) => {
      const list = graph.nodes.filter((n) => n.type === t).map((n) => positions[n.id].x);
      return list.reduce((a, b) => a + b, 0) / list.length;
    };
    const means = ['People', 'Partners', 'Projects', 'Methods'].map(meanX);
    expect(Math.max(...means) - Math.min(...means)).toBeLessThan(layout.width * 0.4);
    // Label boxes (mark plus label) don't overlap.
    const boxes = graph.nodes.map((n) => {
      const p = positions[n.id];
      const b = starBox(n.name);
      return { l: p.x + b.left, r: p.x + b.right, t: p.y + b.top, b: p.y + b.bottom };
    });
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        const overlap = a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
        expect(overlap, `${graph.nodes[i].name} / ${graph.nodes[j].name}`).toBe(false);
      }
    }
  });

  it('wraps constellation labels onto at most three lines', () => {
    expect(wrapLabel('PACES')).toEqual(['PACES']);
    const lines = wrapLabel('Enhancing Future Community Connectivity for Ageing Well in Place');
    expect(lines.length).toBe(3);
    expect(lines.at(-1)!.endsWith('…')).toBe(true);
  });

  it('shortens long labels at a word boundary', () => {
    expect(shortLabel('Short name')).toBe('Short name');
    const long = shortLabel('Enhancing Future Community Connectivity for Ageing Well in Place');
    expect(long.length).toBeLessThanOrEqual(34);
    expect(long.endsWith('…')).toBe(true);
  });

  it('arrow navigation picks the nearest node in that direction', () => {
    const pos = { a: { x: 0, y: 0 }, below: { x: 5, y: 50 }, far: { x: 0, y: 200 }, right: { x: 100, y: 10 } };
    const ids = Object.keys(pos);
    expect(nearestInDirection('a', 'down', pos, ids)).toBe('below');
    expect(nearestInDirection('a', 'right', pos, ids)).toBe('right');
    expect(nearestInDirection('a', 'up', pos, ids)).toBeUndefined();
  });
});

describe('dataset', () => {
  it('has the four types, unique slugs per type, and links to real nodes', () => {
    expect(nodesOfType('Projects')).toHaveLength(17);
    expect(nodesOfType('Methods')).toHaveLength(12);
    expect(nodesOfType('People')).toHaveLength(10);
    expect(nodesOfType('Partners')).toHaveLength(9);
    const ids = new Set(graph.nodes.map((n) => n.id));
    for (const l of graph.links) {
      expect(ids.has(l.source)).toBe(true);
      expect(ids.has(l.target)).toBe(true);
    }
    for (const n of graph.nodes) expect(getBySlug(n.type, n.slug)).toBe(n);
  });
  it('starts the guide from a real project with connections to follow', () => {
    const p = getFeaturedProject();
    expect(hrefFor(p)).toBe('/projects/design-bugs-out');
    expect(index.neighbours.get(p.id)!.size).toBeGreaterThan(2);
  });
});
