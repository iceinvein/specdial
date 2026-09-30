export function parseEnv(text: string): Record<string, string> {
  const env: Record<string, string> = {};

  for (const line of text.split(/\r\n|\n|\r/)) {
    const entry = line.trim();
    if (!entry || entry.startsWith('#')) continue;

    const separator = entry.indexOf('=');
    if (separator === -1) continue;

    const key = entry.slice(0, separator).trim();
    if (!key) continue;

    let value = entry.slice(separator + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }

    Object.defineProperty(env, key, {
      value,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }

  return env;
}
