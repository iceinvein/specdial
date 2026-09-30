// Fixture reference: analyze.py only hashes this file.
export function parseEnv(text: string): Record<string, string> {
  return Object.fromEntries(text.split("\n").map((line) => line.split("=")));
}
