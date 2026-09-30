import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { parseEnv } from "./parseEnv";

const RUNS = { seed: 1, numRuns: 200 };

// "__proto__" is left out: assigning a string to it on a plain object does not
// create a key, which is a JavaScript quirk rather than a rule of the spec.
const key = fc.stringMatching(/^[A-Za-z_][A-Za-z0-9_.]{0,11}$/).filter((k) => k !== "__proto__");

const valueChar = fc.constantFrom(
  ..."abcXYZ019_-./:@,;".split(""),
  "=",
  "#",
  " ",
  "\t",
  '"',
  "'",
  "\\",
  "é",
);

// A value that parseEnv returns unchanged: nothing to trim and no outer pair of
// matching quotes.
const plainValue = fc
  .string({ unit: valueChar, maxLength: 16 })
  .filter((v) => v.trim() === v && !isQuoted(v));

// Any single-line text, including leading and trailing whitespace and quotes.
const lineText = fc.string({ unit: valueChar, maxLength: 16 });

const whitespace = fc.string({ unit: fc.constantFrom(" ", "\t", "\r"), maxLength: 3 });

const entry = fc.tuple(key, plainValue);

function isQuoted(v: string): boolean {
  return v.length >= 2 && (v[0] === '"' || v[0] === "'") && v[0] === v[v.length - 1];
}

function toLines(entries: [string, string][]): string[] {
  return entries.map(([k, v]) => `${k}=${v}`);
}

function lastWins(entries: [string, string][]): Record<string, string> {
  const expected: Record<string, string> = {};
  for (const [k, v] of entries) expected[k] = v;
  return expected;
}

describe("parseEnv properties", () => {
  test("each key=value line maps its key to its value, the last occurrence of a key winning", () => {
    fc.assert(
      fc.property(fc.array(entry, { maxLength: 8 }), (entries) => {
        expect(parseEnv(toLines(entries).join("\n"))).toEqual(lastWins(entries));
      }),
      RUNS,
    );
  });

  test("the key ends at the first = and the value keeps any later = characters", () => {
    fc.assert(
      fc.property(key, plainValue, plainValue, (k, left, right) => {
        const value = `${left}=${right}`.trim();
        fc.pre(!isQuoted(value));
        expect(parseEnv(`${k}=${value}`)).toEqual({ [k]: value });
      }),
      RUNS,
    );
  });

  test("whitespace around the line, the key and the value is ignored", () => {
    fc.assert(
      fc.property(key, plainValue, fc.array(whitespace, { minLength: 5, maxLength: 5 }), (k, v, ws) => {
        const padded = `${ws[0]}${k}${ws[1]}=${ws[2]}${v}${ws[3]}${ws[4]}`;
        expect(parseEnv(padded)).toEqual({ [k]: v });
      }),
      RUNS,
    );
  });

  test("an empty value yields the empty string", () => {
    fc.assert(
      fc.property(key, whitespace, (k, ws) => {
        expect(parseEnv(`${k}=${ws}`)).toEqual({ [k]: "" });
      }),
      RUNS,
    );
  });

  test("blank lines, comment lines and lines without = do not change the result", () => {
    const noise = fc.oneof(
      whitespace,
      fc.tuple(whitespace, lineText).map(([ws, text]) => `${ws}#${text}`),
      fc.string({ unit: fc.constantFrom("a", "B", "_", " ", "#", '"'), maxLength: 10 }),
    );
    fc.assert(
      fc.property(fc.array(entry, { maxLength: 5 }), fc.array(noise, { maxLength: 5 }), fc.nat(), (entries, extra, at) => {
        const lines = toLines(entries);
        const noisy = [...lines];
        for (const line of extra) noisy.splice(at % (noisy.length + 1), 0, line);
        expect(parseEnv(noisy.join("\n"))).toEqual(parseEnv(lines.join("\n")));
      }),
      RUNS,
    );
  });

  test("a leading export prefix is removed", () => {
    fc.assert(
      fc.property(key, plainValue, whitespace, (k, v, ws) => {
        expect(parseEnv(`${ws}export ${k}=${v}`)).toEqual({ [k]: v });
      }),
      RUNS,
    );
  });

  test("one outer pair of matching double or single quotes is removed and the inside kept verbatim", () => {
    fc.assert(
      fc.property(key, fc.constantFrom('"', "'"), lineText, (k, quote, inner) => {
        expect(parseEnv(`${k}=${quote}${inner}${quote}`)).toEqual({ [k]: inner });
      }),
      RUNS,
    );
  });

  test("a value without a matching outer pair of quotes is returned as written, comments and escapes included", () => {
    fc.assert(
      fc.property(key, lineText, (k, v) => {
        const value = v.trim();
        fc.pre(!isQuoted(value));
        expect(parseEnv(`${k}=${value}`)).toEqual({ [k]: value });
      }),
      RUNS,
    );
  });
});
