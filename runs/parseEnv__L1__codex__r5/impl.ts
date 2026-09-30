export function parseEnv(text: string): Record<string, string> {
  const entries: Array<[string, string]> = [];

  for (const line of text.split(/\r\n?|\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    if (!key) continue;

    let value = trimmed.slice(separator + 1).trim();
    if (
      value.length >= 2 &&
      (value[0] === '"' || value[0] === "'") &&
      value[value.length - 1] === value[0]
    ) {
      value = value.slice(1, -1);
    }

    entries.push([key, value]);
  }

  return Object.fromEntries(entries);
}
