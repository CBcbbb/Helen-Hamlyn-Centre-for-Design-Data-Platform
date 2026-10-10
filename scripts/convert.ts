/**
 * Converts the spreadsheet exports in data/*.csv into src/data/graphData.json
 * and writes a data-quality report to reports/data-report.json.
 *
 * Run: npm run data:build
 *
 * The JSON is imported at build time by the Next.js app, so every entity page
 * is generated statically. Never hand-edit the JSON: edit the CSVs and rebuild.
 */
import fs from 'node:fs';
import path from 'node:path';
import { convert, FILE_CONFIG } from '../src/lib/convert';

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const OUTPUT_PATH = path.join(ROOT, 'src', 'data', 'graphData.json');
const REPORT_PATH = path.join(ROOT, 'reports', 'data-report.json');

function read(file: string): string | undefined {
  const p = path.join(DATA_DIR, file);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : undefined;
}

function write(p: string, value: unknown) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `${JSON.stringify(value, null, 2)}\n`, 'utf-8');
}

function main() {
  console.log('Converting CSVs to graphData.json…\n');

  const files = Object.fromEntries(FILE_CONFIG.map(({ file }) => [file, read(file)]));
  const { data, report, warnings } = convert({ files, links: read('LINKS.csv') });

  for (const w of warnings) console.warn(`  Warning: ${w}`);
  for (const [file, c] of Object.entries(report.counts)) {
    console.log(`  ${file}: ${c.parsed} nodes (${c.skipped} skipped)`);
  }
  console.log(`  LINKS.csv: ${data.links.length} links`);

  const issues: [string, number][] = [
    ['dangling links (excluded)', report.dangling_links.length],
    ['link type mismatches', report.link_type_mismatches.length],
    ['duplicate links', report.duplicate_links.length],
    ['placeholder cells treated as empty', report.placeholder_values.length],
    ['unconnected entities', report.unconnected_nodes.length],
    ['slug collisions', report.slug_collisions.length],
  ];
  const flagged = issues.filter(([, n]) => n > 0);
  if (flagged.length) {
    console.log('\nData-quality notes (details in reports/data-report.json):');
    for (const [label, n] of flagged) console.log(`  - ${n} ${label}`);
  }

  write(OUTPUT_PATH, data);
  write(REPORT_PATH, report);
  console.log(`\nDone. Output: ${path.relative(ROOT, OUTPUT_PATH)}`);
  console.log(`Report: ${path.relative(ROOT, REPORT_PATH)}`);
}

main();
