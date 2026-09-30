// Top-level await only works when the file is loaded as an ES module.
const separator = await Promise.resolve("=");

export function parseEnv(text: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const at = line.indexOf(separator);
    if (at > 0) env[line.slice(0, at)] = line.slice(at + 1);
  }
  return env;
}
