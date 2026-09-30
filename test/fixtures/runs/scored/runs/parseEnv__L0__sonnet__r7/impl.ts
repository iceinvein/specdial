// require() does not exist in an ES module, so this file cannot load.
const { EOL } = require("node:os");

export function parseEnv(text: string): Record<string, string> {
  return Object.fromEntries(text.split(EOL).map((line: string) => line.split("=")));
}
