/**
 * Converts the spreadsheet exports in data/*.csv into src/data/graphData.json
 * and writes a data-quality report to reports/data-report.json.
 *
 * Run: npm run data:build
 *
 * The JSON is imported at build time by the Next.js app, so every entity page
 * is generated statically. Never hand-edit the JSON: edit the CSVs and rebuild.
 */
import path from 'node:path';
import { buildData, OUTPUT_PATH, REPORT_PATH, ROOT } from '../src/lib/build-data';

function main() {
  console.log('Converting CSVs to graphData.json…\n');

  const { data, report, warnings } = buildData();

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

  console.log(`\nDone. Output: ${path.relative(ROOT, OUTPUT_PATH)}`);
  console.log(`Report: ${path.relative(ROOT, REPORT_PATH)}`);
}

main();
