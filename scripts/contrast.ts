/**
 * WCAG contrast check for every text/background and mark/background pairing
 * the site uses. Reads colour values from src/app/globals.css, so it checks
 * what actually ships.
 *
 * Run: npm run contrast            (prints a table, exits 1 on any failure)
 *      npm run contrast -- --md    (prints a Markdown table for REPORT.md)
 *
 * Thresholds (WCAG 2.2): 4.5:1 for body text (1.4.3), 3:1 for large text
 * and for non-text marks such as type shapes and focus rings (1.4.11).
 */
import fs from 'node:fs';
import path from 'node:path';

const css = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'app', 'globals.css'), 'utf-8');

/** Resolve a custom property from :root, following var() references. */
export function resolve(name: string, depth = 0): string {
  if (depth > 10) throw new Error(`Cycle resolving ${name}`);
  const rootBlock = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')));
  const m = rootBlock.match(new RegExp(`${name.replace(/[-]/g, '\\-')}:\\s*([^;]+);`));
  if (!m) throw new Error(`${name} not found in globals.css`);
  const value = m[1].trim();
  const ref = value.match(/^var\((--[\w-]+)\)$/);
  return ref ? resolve(ref[1], depth + 1) : value;
}

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

function luminance([r, g, b]: [number, number, number]): number {
  const [R, G, B] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function contrast(a: string, b: string): number {
  const la = luminance(hexToRgb(a));
  const lb = luminance(hexToRgb(b));
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

type Kind = 'text' | 'large' | 'mark';
const THRESHOLD: Record<Kind, number> = { text: 4.5, large: 3, mark: 3 };
const KIND_LABEL: Record<Kind, string> = { text: 'Text', large: 'Large text', mark: 'Non-text mark' };

const pairs: [fg: string, bg: string, kind: Kind, where: string][] = [
  // Neutrals
  ['--color-ink', '--color-paper', 'text', 'Body text, headings'],
  ['--color-ink', '--color-surface', 'text', 'Text on footer and search field'],
  ['--color-ink-muted', '--color-paper', 'text', 'Secondary text, metadata, nav'],
  ['--color-ink-muted', '--color-surface', 'text', 'Secondary text on footer, placeholder'],
  ['--color-paper', '--color-ink', 'text', 'Primary button, skip link'],
  // Links and accent
  ['--color-accent-text', '--color-paper', 'text', 'Body links'],
  ['--color-accent-text', '--color-surface', 'text', 'Links in footer'],
  ['--color-focus-ring', '--color-paper', 'mark', 'Focus outline'],
  ['--color-focus-ring', '--color-surface', 'mark', 'Focus outline on surface'],
  ['--color-control', '--color-paper', 'mark', 'Control borders: buttons, checkboxes, search field'],
  ['--color-control', '--color-surface', 'mark', 'Search field border on its surface fill'],
  // Type colour as text
  ['--color-people-text', '--color-paper', 'text', 'People label and links'],
  ['--color-partners-text', '--color-paper', 'text', 'Partners label'],
  ['--color-projects-text', '--color-paper', 'text', 'Projects label'],
  ['--color-methods-text', '--color-paper', 'text', 'Methods label and links'],
  ['--color-people-text', '--color-people-tint', 'text', 'People text on its tint'],
  ['--color-partners-hover', '--color-partners-tint', 'text', 'Admin error text on the partners tint'],
  ['--color-projects-text', '--color-projects-tint', 'text', 'Projects text on its tint'],
  ['--color-methods-text', '--color-methods-tint', 'text', 'Methods text on its tint'],
  // Brand swatches as marks (shapes in lists and in the map; filter checkboxes)
  ['--color-people', '--color-paper', 'mark', 'People shape'],
  ['--color-partners', '--color-paper', 'mark', 'Partners shape'],
  ['--color-projects', '--color-paper', 'mark', 'Projects shape'],
  ['--color-methods', '--color-paper', 'mark', 'Methods shape'],
  ['--color-paper', '--color-people', 'mark', 'Tick on People checkbox'],
  ['--color-paper', '--color-partners', 'mark', 'Tick on Partners checkbox'],
  ['--color-paper', '--color-projects', 'mark', 'Tick on Projects checkbox'],
  ['--color-paper', '--color-methods', 'mark', 'Tick on Methods checkbox'],
];

/**
 * Pairings deliberately NOT used, recorded so nobody reintroduces them:
 * the brand swatches as small text on white.
 */
const avoided: [string, string][] = [
  ['--color-projects', '--color-paper'],
  ['--color-methods', '--color-paper'],
  ['--color-partners', '--color-partners-tint'],
  ['--color-accent', '--color-surface'],
];

function main() {
  const md = process.argv.includes('--md');
  const rows = pairs.map(([fg, bg, kind, where]) => {
    const f = resolve(fg);
    const b = resolve(bg);
    const ratio = contrast(f, b);
    return { fg, bg, f, b, kind, where, ratio, pass: ratio >= THRESHOLD[kind] };
  });

  if (md) {
    console.log('| Foreground | Background | Used for | Ratio | Needs | Result |');
    console.log('|---|---|---|---|---|---|');
    for (const r of rows) {
      console.log(
        `| \`${r.fg}\` ${r.f.toUpperCase()} | \`${r.bg}\` ${r.b.toUpperCase()} | ${r.where} | ${r.ratio.toFixed(2)}:1 | ${THRESHOLD[r.kind]}:1 (${KIND_LABEL[r.kind].toLowerCase()}) | ${r.pass ? 'Pass' : '**Fail**'} |`,
      );
    }
    console.log('\nNot used for text (fail 4.5:1):');
    for (const [fg, bg] of avoided) {
      console.log(`- \`${fg}\` on \`${bg}\`: ${contrast(resolve(fg), resolve(bg)).toFixed(2)}:1`);
    }
  } else {
    for (const r of rows) {
      console.log(
        `${r.pass ? 'PASS' : 'FAIL'}  ${r.ratio.toFixed(2).padStart(5)}:1  (needs ${THRESHOLD[r.kind]})  ${r.fg} on ${r.bg}  ${r.where}`,
      );
    }
  }
  const failed = rows.filter((r) => !r.pass);
  if (failed.length) {
    console.error(`\n${failed.length} pairing(s) fail.`);
    process.exit(1);
  }
  if (!md) console.log(`\nAll ${rows.length} pairings pass.`);
}

main();
