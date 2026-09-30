// Fixture reference: analyze.py only hashes this file.
export function toCsv(rows: string[][]): string {
  return rows.map((row) => row.join(",")).join("\n");
}
