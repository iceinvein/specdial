import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { formatDuration } from "./formatDuration";

const options = { seed: 1, numRuns: 200 };
// Slack for binary floating point when comparing a printed value to ms / 1000.
const EPSILON = 1e-9;

describe("formatDuration properties", () => {
  it("returns the en dash for null and undefined", () => {
    fc.assert(
      fc.property(fc.constantFrom(null, undefined), (ms) => {
        expect(formatDuration(ms)).toBe("–");
      }),
      options,
    );
  });

  it("prints anything under 1000 ms as String(ms) followed by ms", () => {
    fc.assert(
      fc.property(fc.double({ max: 1000, maxExcluded: true, noNaN: true }), (ms) => {
        expect(formatDuration(ms)).toBe(`${String(ms)}ms`);
      }),
      options,
    );
  });

  it("prints 1000 ms up to under 10 s as seconds with one decimal within 0.05 of the exact value", () => {
    fc.assert(
      fc.property(fc.double({ min: 1000, max: 10000, maxExcluded: true, noNaN: true }), (ms) => {
        const out = formatDuration(ms);
        expect(out).toMatch(/^\d{1,2}\.\ds$/);
        const shown = Number.parseFloat(out);
        expect(shown).toBeGreaterThanOrEqual(1);
        expect(shown).toBeLessThanOrEqual(10);
        expect(Math.abs(shown - ms / 1000)).toBeLessThanOrEqual(0.05 + EPSILON);
      }),
      options,
    );
  });

  it("picks the one-decimal format on the unrounded value, so just under 10 s shows 10.0s", () => {
    fc.assert(
      fc.property(fc.integer({ min: 9951, max: 9999 }), (ms) => {
        expect(formatDuration(ms)).toBe("10.0s");
      }),
      options,
    );
  });

  it("prints 10 s up to under 60 s as whole seconds within 0.5 of the exact value", () => {
    fc.assert(
      fc.property(fc.double({ min: 10000, max: 60000, maxExcluded: true, noNaN: true }), (ms) => {
        const out = formatDuration(ms);
        expect(out).toMatch(/^\d{2}s$/);
        const shown = Number.parseInt(out, 10);
        expect(shown).toBeGreaterThanOrEqual(10);
        expect(shown).toBeLessThanOrEqual(60);
        expect(Math.abs(shown - ms / 1000)).toBeLessThanOrEqual(0.5 + EPSILON);
      }),
      options,
    );
  });

  it("rounds half seconds up in the whole-seconds range", () => {
    fc.assert(
      fc.property(fc.integer({ min: 10, max: 59 }), (whole) => {
        expect(formatDuration(whole * 1000 + 500)).toBe(`${whole + 1}s`);
      }),
      options,
    );
  });

  it("prints whole minute-and-second durations from 60 s on as minutes, a space and seconds", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100000 }), fc.integer({ min: 0, max: 59 }), (minutes, seconds) => {
        expect(formatDuration((minutes * 60 + seconds) * 1000)).toBe(`${minutes}m ${seconds}s`);
      }),
      options,
    );
  });

  it("from 60 s on shows at least one minute and a seconds remainder of 0 to 60 within 0.5 of the exact value", () => {
    fc.assert(
      fc.property(fc.double({ min: 60000, max: 1e12, noNaN: true }), (ms) => {
        const match = /^(\d+)m (\d+)s$/.exec(formatDuration(ms));
        expect(match).not.toBeNull();
        const minutes = Number(match?.[1]);
        const seconds = Number(match?.[2]);
        expect(minutes).toBeGreaterThanOrEqual(1);
        expect(seconds).toBeLessThanOrEqual(60);
        expect(Math.abs(minutes * 60 + seconds - ms / 1000)).toBeLessThanOrEqual(0.5 + 1e-6);
      }),
      options,
    );
  });

  it("rounds the remainder after taking whole minutes, so a remainder near 60 s shows 60s", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10000 }), (minutes) => {
        expect(formatDuration(minutes * 60000 + 59600)).toBe(`${minutes}m 60s`);
      }),
      options,
    );
  });
});
