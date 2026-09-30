import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { safeFilename } from "./safeFilename";

const FORBIDDEN = ["\\", "/", ":", "*", "?", '"', "<", ">", "|"];
const OPTIONS = { seed: 1, numRuns: 200 };

// Mixes ordinary text with strings built mostly from the characters the
// clauses treat specially, so every clause is exercised often.
const raw = fc.oneof(
  fc.string(),
  fc.string({ unit: "grapheme" }),
  fc.string({
    unit: fc.constantFrom(...FORBIDDEN, " ", "\t", "\n", " ", "-", ".", "a", "Z", "7", "é"),
    maxLength: 16,
  }),
);
const bareExtension = fc.string({ unit: fc.constantFrom("a", "Z", "3", "_", "-", "."), maxLength: 6 })
  .filter((s) => !s.startsWith("."));
const extension = fc.oneof(bareExtension, bareExtension.map((s) => `.${s}`));

function withDot(ext: string): string {
  return ext.startsWith(".") ? ext : `.${ext}`;
}

function baseOf(result: string, ext: string): string {
  const suffix = withDot(ext);
  expect(result.endsWith(suffix)).toBe(true);
  return result.slice(0, result.length - suffix.length);
}

describe("safeFilename properties", () => {
  it("ends with the extension, adding a dot only when it has none", () => {
    fc.assert(
      fc.property(raw, extension, (r, ext) => {
        expect(safeFilename(r, ext).endsWith(withDot(ext))).toBe(true);
      }),
      OPTIONS,
    );
  });

  it("gives the same result for an extension with or without its dot", () => {
    fc.assert(
      fc.property(raw, bareExtension, (r, ext) => {
        expect(safeFilename(r, `.${ext}`)).toBe(safeFilename(r, ext));
      }),
      OPTIONS,
    );
  });

  it("uses a dotted extension exactly as given", () => {
    fc.assert(
      fc.property(bareExtension, (ext) => {
        expect(safeFilename("x", `.${ext}`)).toBe(`x.${ext}`);
      }),
      OPTIONS,
    );
  });

  it("never leaves a forbidden character or whitespace in the base name", () => {
    fc.assert(
      fc.property(raw, extension, (r, ext) => {
        const base = baseOf(safeFilename(r, ext), ext);
        for (const ch of FORBIDDEN) expect(base.includes(ch)).toBe(false);
        expect(/\s/.test(base)).toBe(false);
      }),
      OPTIONS,
    );
  });

  it("never leaves two dashes in a row in the base name", () => {
    fc.assert(
      fc.property(raw, extension, (r, ext) => {
        expect(baseOf(safeFilename(r, ext), ext).includes("--")).toBe(false);
      }),
      OPTIONS,
    );
  });

  it("never starts or ends the base name with a dash or a dot", () => {
    fc.assert(
      fc.property(raw, extension, (r, ext) => {
        const base = baseOf(safeFilename(r, ext), ext);
        expect(/^[-.]|[-.]$/.test(base)).toBe(false);
      }),
      OPTIONS,
    );
  });

  it("keeps every other character of the input, in order and in its case", () => {
    fc.assert(
      fc.property(raw, extension, (r, ext) => {
        const kept = r
          .split("")
          .filter((ch) => !FORBIDDEN.includes(ch) && !/\s/.test(ch) && ch !== "-")
          .join("")
          .replace(/^\.+|\.+$/g, "");
        const base = baseOf(safeFilename(r, ext), ext);
        expect(base.replaceAll("-", "")).toBe(kept === "" ? "resume" : kept);
      }),
      OPTIONS,
    );
  });

  it("uses the fallback name when the input has nothing but removable characters", () => {
    const removable = fc.string({ unit: fc.constantFrom(...FORBIDDEN, " ", "\t", "-", "."), maxLength: 12 });
    fc.assert(
      fc.property(removable, extension, (r, ext) => {
        expect(safeFilename(r, ext)).toBe(`resume${withDot(ext)}`);
      }),
      OPTIONS,
    );
  });

  it("leaves an already safe base name unchanged", () => {
    fc.assert(
      fc.property(raw, extension, (r, ext) => {
        const base = baseOf(safeFilename(r, ext), ext);
        expect(safeFilename(base, ext)).toBe(safeFilename(r, ext));
      }),
      OPTIONS,
    );
  });
});
