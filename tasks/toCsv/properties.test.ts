import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { toCsv } from "./toCsv";

const RUNS = { seed: 1, numRuns: 200 };

// RFC 4180 reader, used to check that every value survives quoting and escaping.
function readCsv(text: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let i = 0;
  while (i < text.length) {
    if (text[i] === '"') {
      i++;
      while (true) {
        if (i >= text.length) throw new Error("unterminated quoted field");
        if (text[i] === '"' && text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else if (text[i] === '"') {
          i++;
          break;
        } else {
          field += text[i];
          i++;
        }
      }
    } else if (text[i] === ",") {
      record.push(field);
      field = "";
      i++;
    } else if (text[i] === "\n") {
      record.push(field);
      records.push(record);
      record = [];
      field = "";
      i++;
    } else {
      field += text[i];
      i++;
    }
  }
  return records;
}

const special = (s: string) => s.includes(",") || s.includes('"') || s.includes("\n");

const plainKey = fc.constantFrom("id", "label", "count", "when", "who", "tag");
const anyText = fc.string({ unit: fc.constantFrom("q", "z", " ", ",", '"', "\n", "\r", "é") });
const plainText = anyText.filter((s) => !special(s));
const specialText = anyText.filter(special);
const finiteNumber = fc.oneof(fc.integer(), fc.double({ noNaN: true, noDefaultInfinity: true }));
const value = fc.oneof(anyText, finiteNumber);
const row = fc.dictionary(plainKey, value, { maxKeys: 6 });
const rows = fc.array(row, { maxLength: 6 });
const nonEmptyRows = fc.array(row, { minLength: 1, maxLength: 6 });

describe("toCsv properties", () => {
  it("returns an empty string exactly when there are no rows", () => {
    fc.assert(
      fc.property(rows, (input) => {
        expect(toCsv(input) === "").toBe(input.length === 0);
      }),
      RUNS,
    );
  });

  it("starts with the first row's keys, in order, joined with commas and written unquoted", () => {
    const anyKey = fc.string().filter((k) => k !== "__proto__");
    fc.assert(
      fc.property(fc.dictionary(anyKey, value), rows, (first, rest) => {
        expect(toCsv([first, ...rest]).startsWith(`${Object.keys(first).join(",")}\n`)).toBe(true);
      }),
      RUNS,
    );
  });

  it("gives each row one record of its values in header order, empty for missing keys, ignoring extra keys", () => {
    fc.assert(
      fc.property(nonEmptyRows, (input) => {
        const header = Object.keys(input[0]);
        const expected = input.map((r) => header.map((k) => (k in r ? String(r[k]) : "")));
        const [readHeader, ...records] = readCsv(toCsv(input));
        expect(readHeader).toEqual(header.length === 0 ? [""] : header);
        expect(records).toEqual(expected.map((fields) => (fields.length === 0 ? [""] : fields)));
      }),
      RUNS,
    );
  });

  it("writes a value without a comma, double quote or newline unchanged", () => {
    fc.assert(
      fc.property(fc.array(plainText, { minLength: 1 }), (values) => {
        const input = values.map((v) => ({ note: v }));
        expect(toCsv(input)).toBe(`note\n${values.join("\n")}\n`);
      }),
      RUNS,
    );
  });

  it("wraps a value with a comma, double quote or newline in double quotes and doubles its quotes", () => {
    fc.assert(
      fc.property(specialText, (v) => {
        expect(toCsv([{ note: v }])).toBe(`note\n"${v.split('"').join('""')}"\n`);
      }),
      RUNS,
    );
  });

  it("writes numbers with String()", () => {
    fc.assert(
      fc.property(fc.array(finiteNumber, { minLength: 1 }), (values) => {
        const input = values.map((n) => ({ amount: n }));
        expect(toCsv(input)).toBe(`amount\n${values.map((n) => String(n)).join("\n")}\n`);
      }),
      RUNS,
    );
  });

  it("joins lines with a newline and ends with one", () => {
    fc.assert(
      fc.property(fc.array(fc.dictionary(plainKey, fc.oneof(plainText, finiteNumber)), { minLength: 1 }), (input) => {
        const lines = toCsv(input).split("\n");
        expect(lines.length).toBe(input.length + 2);
        expect(lines[lines.length - 1]).toBe("");
      }),
      RUNS,
    );
  });
});
