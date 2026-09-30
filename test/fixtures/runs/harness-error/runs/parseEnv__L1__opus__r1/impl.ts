// Loads once, then refuses to load again, so the evaluator's reload after a
// timeout fails: the harness error the scorer must not record as a score.
import { existsSync, writeFileSync } from "node:fs";

const marker = "/tmp/scorer-fixture-loaded";
if (existsSync(marker)) throw new Error("second load");
writeFileSync(marker, "");

export function parseEnv(text: string): Record<string, string> {
  while (text === "loop") {}
  return {};
}
