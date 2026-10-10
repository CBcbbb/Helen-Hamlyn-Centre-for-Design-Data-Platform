import 'server-only';
import { convert, FILE_CONFIG } from '../convert';
import { readDataFile } from '../build-data';

/** The data as it is in the CSVs right now (the public pages show the last build). */
export function currentGraph() {
  const files = Object.fromEntries(FILE_CONFIG.map(({ file }) => [file, readDataFile(file)]));
  return convert({ files, links: readDataFile('LINKS.csv') });
}
