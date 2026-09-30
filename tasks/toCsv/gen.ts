// Usage: npx tsx tasks/toCsv/gen.ts
// Writes corpus.json beside this file. Inputs only: no output is computed here.
import { writeFileSync } from "node:fs";
import fc from "fast-check";

type Row = Record<string, string | number>;
type Input = { id: string; category: string; args: [Row[]] };

// Each category names the spec.md clause or open decision the input probes.
const handWritten: [string, Row[]][] = [
  ["empty-array", []],

  ["header-first-row-keys", [{ sku: "B-17", stock: 4 }]],
  ["header-first-row-keys", [{ city: "Oslo" }, { city: "Lima" }]],
  ["header-key-order", [{ zeta: 1, alpha: 2, mid: 3 }]],
  ["header-key-order", [{ b: "second", a: "first" }, { a: "third", b: "fourth" }]],
  ["header-integer-like-keys", [{ q: "x", "10": "y", "2": "z" }]],
  ["header-first-row-no-keys", [{}]],
  ["header-first-row-no-keys", [{}, { orphan: "dropped" }]],
  ["header-unquoted", [{ "unit, cost": 5 }]],
  ["header-unquoted", [{ 'the "best"': "gold" }]],
  ["header-unquoted", [{ "two\nlines": "v" }]],

  ["row-header-order", [{ first: "Kim", last: "Oh" }, { last: "Diaz", first: "Rosa" }]],
  ["row-header-order", [{ x: 1, y: 2, z: 3 }, { z: 30, x: 10, y: 20 }]],
  ["row-one-line-each", [{ n: 1 }, { n: 2 }, { n: 3 }, { n: 4 }]],

  ["missing-key-empty-field", [{ id: 1, colour: "teal" }, { id: 2 }]],
  ["missing-key-empty-field", [{ a: "p", b: "q", c: "r" }, { b: "only-b" }]],
  ["missing-key-empty-field", [{ a: "p", b: "q" }, {}]],
  ["missing-key-all-missing", [{ k: "v" }, { other: "w" }, { k: "back" }]],
  ["extra-key-ignored", [{ id: 7 }, { id: 8, surplus: "hidden" }]],
  ["extra-key-ignored", [{ id: 7 }, { surplus: "hidden", id: 9, more: 3 }]],
  ["extra-and-missing-key", [{ p: 1, q: 2 }, { q: 5, r: 6 }]],

  ["number-integer", [{ total: 1024, neg: -58 }]],
  ["number-zero", [{ zero: 0, text: "0" }]],
  ["number-decimal", [{ ratio: 0.125, tax: 19.99 }]],
  ["number-float-repr", [{ sum: 0.30000000000000004 }]],
  ["number-large-integer", [{ max: 9007199254740991, min: -9007199254740991 }]],
  ["number-negative-decimal", [{ delta: -3.75 }]],

  ["quote-comma", [{ addr: "12 High St, Leeds" }]],
  ["quote-comma", [{ only: "," }]],
  ["quote-comma", [{ lead: ",start", trail: "end," }]],
  ["quote-double-quote-escaped", [{ quip: 'she said "no"' }]],
  ["quote-double-quote-escaped", [{ q: '"' }]],
  ["quote-double-quote-escaped", [{ q: '""' }]],
  ["quote-double-quote-escaped", [{ q: 'a"b"c"d' }]],
  ["quote-double-quote-escaped", [{ q: '"wrapped already"' }]],
  ["quote-newline", [{ memo: "line one\nline two" }]],
  ["quote-newline", [{ memo: "\n" }]],
  ["quote-newline", [{ memo: "trailing\n" }]],
  ["quote-comma-and-quote", [{ mix: 'x, "y", z' }]],
  ["quote-all-three", [{ mix: 'a,\n"b"' }]],
  ["quote-crlf", [{ memo: "win\r\nstyle" }]],

  ["carriage-return-unquoted", [{ memo: "cr\ronly" }]],
  ["tab-unquoted", [{ memo: "tab\there" }]],
  ["whitespace-unquoted", [{ pad: "  spaced  " }]],
  ["whitespace-unquoted", [{ pad: " " }]],
  ["single-quote-unquoted", [{ q: "it's fine" }]],
  ["unicode-unquoted", [{ name: "Zoë Łukasz 東京" }]],
  ["empty-string-value", [{ a: "", b: "filled" }]],
  ["empty-string-value", [{ a: "" }, { a: "" }]],
  ["plain-unchanged", [{ status: "shipped", code: "A1-B2" }]],

  ["line-join-lf-trailing-newline", [{ solo: "one" }]],
  ["line-join-lf-trailing-newline", [{ r: "a" }, { r: "b" }]],
  ["quoted-fields-many-rows", [{ t: "a,b", u: 'c"d' }, { t: "e\nf", u: "plain" }]],
];

const keyPool = ["id", "name", "note", "qty", "price", "a,b", "tag"];
const textUnits = ["a", "b", "x", "1", " ", ",", ",", '"', '"', "\n", "\n", "\r"];

const text = fc.string({ unit: fc.constantFrom(...textUnits), maxLength: 12 });
const number = fc.oneof(
  fc.integer({ min: -100000, max: 100000 }),
  fc.double({ noNaN: true, noDefaultInfinity: true, min: -1e6, max: 1e6 }).filter((n) => !Object.is(n, -0)),
);
const row = fc.dictionary(fc.constantFrom(...keyPool), fc.oneof(text, number), { maxKeys: 5 });
const rows = fc.oneof(
  { weight: 1, arbitrary: fc.constant([] as Row[]) },
  { weight: 9, arbitrary: fc.array(row, { minLength: 1, maxLength: 6 }) },
);

// Keys sorted, matching how check_tasks.py compares args.
function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, v) =>
    v !== null && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : v,
  );
}

// Distinct from each other and from every hand-written input, because
// check_tasks.py refuses a corpus with two equal args.
function generatedRows(): Row[][] {
  const seen = new Set(handWritten.map(([, args]) => canonical([args])));
  const out: Row[][] = [];
  for (const args of fc.sample(rows, { seed: 20260930, numRuns: 5000 })) {
    const key = canonical([args]);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(args);
    if (out.length === 500) return out;
  }
  throw new Error(`only ${out.length} distinct generated inputs`);
}

const generated = generatedRows();

const inputs: Input[] = [
  ...handWritten.map(([category, args], i): Input => ({
    id: `h${String(i + 1).padStart(3, "0")}`,
    category,
    args: [args],
  })),
  ...generated.map((args, i): Input => ({
    id: `g${String(i + 1).padStart(4, "0")}`,
    category: "generated",
    args: [args],
  })),
];

const lines = inputs.map((input) => `  ${JSON.stringify(input)}`);
const body = `{"function": "toCsv",\n "inputs": [\n${lines.join(",\n")}\n]}\n`;
writeFileSync(new URL("./corpus.json", import.meta.url), body);
