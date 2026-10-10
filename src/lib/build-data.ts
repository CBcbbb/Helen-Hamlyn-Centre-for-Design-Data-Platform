/**
 * Reads data/*.csv, converts them, and writes src/data/graphData.json and
 * reports/data-report.json. Shared by `npm run data:build` and the admin.
 */
import fs from 'node:fs';
import path from 'node:path';
import { convert, FILE_CONFIG, type ConvertOutput } from './convert';

export const ROOT = process.cwd();
export const DATA_DIR = path.join(ROOT, 'data');
export const OUTPUT_PATH = path.join(ROOT, 'src', 'data', 'graphData.json');
export const REPORT_PATH = path.join(ROOT, 'reports', 'data-report.json');

export function readDataFile(file: string): string | undefined {
  const p = path.join(DATA_DIR, file);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : undefined;
}

function writeJson(p: string, value: unknown) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `${JSON.stringify(value, null, 2)}\n`, 'utf-8');
}

export function buildData(): ConvertOutput {
  const files = Object.fromEntries(FILE_CONFIG.map(({ file }) => [file, readDataFile(file)]));
  const out = convert({ files, links: readDataFile('LINKS.csv') });
  writeJson(OUTPUT_PATH, out.data);
  writeJson(REPORT_PATH, out.report);
  return out;
}
