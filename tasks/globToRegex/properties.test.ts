import fc from "fast-check";
import { describe, it } from "vitest";
import { globToRegex } from "./globToRegex";

const OPTIONS = { seed: 1, numRuns: 200 };

// Characters that carry no glob meaning, so a string of them is a literal pattern.
const literalChar = fc.constantFrom(
  ..."abcXYZ019-_/.+()[]{}|^$\\,!".split(""),
);
const literal = fc.string({ unit: literalChar, maxLength: 12 });
const segmentChar = fc.constantFrom(..."abcXYZ019-_.+()[]{}|^$\\,!".split(""));
// A run of characters with no slash, which is what a single star may consume.
const segment = fc.string({ unit: segmentChar, maxLength: 8 });
const anyPath = fc.string({ unit: literalChar, maxLength: 16 });

describe("globToRegex properties", () => {
  it("a pattern with no wildcards matches only itself", () => {
    fc.assert(
      fc.property(literal, (pattern) => {
        const re = globToRegex(pattern);
        return re.test(pattern) && !re.test(`${pattern}x`) && !re.test(`x${pattern}`);
      }),
      OPTIONS,
    );
  });

  it("matching is case-sensitive", () => {
    fc.assert(
      fc.property(literal, fc.constantFrom("a", "b", "c"), (pattern, letter) => {
        return !globToRegex(pattern + letter).test(pattern + letter.toUpperCase());
      }),
      OPTIONS,
    );
  });

  it("a single star matches any run of characters without a slash, including none", () => {
    fc.assert(
      fc.property(literal, literal, segment, (before, after, run) => {
        return globToRegex(`${before}*${after}`).test(before + run + after);
      }),
      OPTIONS,
    );
  });

  it("a single star never matches a slash", () => {
    fc.assert(
      fc.property(literal, literal, segment, segment, (before, after, left, right) => {
        return !globToRegex(`${before}*${after}`).test(`${before}${left}/${right}${after}`);
      }),
      OPTIONS,
    );
  });

  it("a question mark matches exactly one character that is not a slash", () => {
    fc.assert(
      fc.property(literal, literal, segmentChar, (before, after, ch) => {
        const re = globToRegex(`${before}?${after}`);
        return (
          re.test(before + ch + after) &&
          !re.test(before + after) &&
          !re.test(before + ch + ch + after) &&
          !re.test(`${before}/${after}`)
        );
      }),
      OPTIONS,
    );
  });

  it("a double star matches any run of characters, slashes included", () => {
    fc.assert(
      fc.property(
        literal,
        literal.filter((s) => !s.startsWith("/")),
        anyPath,
        (before, after, run) => globToRegex(`${before}**${after}`).test(before + run + after),
      ),
      OPTIONS,
    );
  });

  it("a double star followed by a slash also matches no directory at all", () => {
    fc.assert(
      fc.property(literal, literal, fc.array(segment, { maxLength: 3 }), (before, after, dirs) => {
        const re = globToRegex(`${before}**/${after}`);
        const nested = dirs.map((d) => `${d}/`).join("");
        return re.test(before + after) && re.test(before + nested + after);
      }),
      OPTIONS,
    );
  });

  it("braces are literal text, not alternation", () => {
    fc.assert(
      fc.property(segment, segment, (left, right) => {
        const re = globToRegex(`{${left},${right}}`);
        return re.test(`{${left},${right}}`) && !re.test(left) && !re.test(right);
      }),
      OPTIONS,
    );
  });
});
