// Usage: npx tsx tasks/formatDuration/gen.ts
// Writes corpus.json beside this file: hand-written inputs, each tagged with
// the spec.md clause or open decision it probes, then 500 generated inputs.
import { writeFileSync } from "node:fs";
import fc from "fast-check";

type Ms = number | null | undefined;

const SEED = 20260930;
const GENERATED_COUNT = 500;

const handWritten: Array<[category: string, ms: Ms]> = [
  ["null-returns-dash", null],
  ["undefined-returns-dash", undefined],

  ["under-1000-as-string-ms", 0],
  ["under-1000-as-string-ms", 1],
  ["under-1000-as-string-ms", 7],
  ["under-1000-as-string-ms", 480],
  ["under-1000-as-string-ms", 998],
  ["under-1000-fractional-printed-by-string", 0.25],
  ["under-1000-fractional-printed-by-string", 12.3456],
  ["under-1000-fractional-printed-by-string", 999.5],
  ["under-1000-fractional-printed-by-string", 999.999],
  ["under-1000-exponent-printed-by-string", 1e-7],
  ["under-1000-exponent-printed-by-string", 3.5e-9],

  ["open-negative-durations", -1],
  ["open-negative-durations", -0.5],
  ["open-negative-durations", -2750],
  ["open-negative-durations", -61000],
  ["open-negative-durations", -1e15],

  ["boundary-1000-starts-seconds", 1000],
  ["boundary-1000-starts-seconds", 1000.001],

  ["under-10s-one-decimal", 1234],
  ["under-10s-one-decimal", 2000],
  ["under-10s-one-decimal", 3333],
  ["under-10s-one-decimal", 7777.7],
  ["under-10s-one-decimal", 9900],
  ["under-10s-one-decimal-half-rounding", 1050],
  ["under-10s-one-decimal-half-rounding", 1250],
  ["under-10s-one-decimal-half-rounding", 4450],
  ["under-10s-one-decimal-half-rounding", 9949],
  ["under-10s-one-decimal-half-rounding", 9950],

  ["format-chosen-on-unrounded-under-10s", 9951],
  ["format-chosen-on-unrounded-under-10s", 9980],
  ["format-chosen-on-unrounded-under-10s", 9999.99],

  ["boundary-10000-starts-whole-seconds", 10000],
  ["boundary-10000-starts-whole-seconds", 10000.01],
  ["boundary-10000-starts-whole-seconds", 10001],

  ["10s-to-60s-whole-seconds", 12345],
  ["10s-to-60s-whole-seconds", 23001],
  ["10s-to-60s-whole-seconds", 37900],
  ["10s-to-60s-whole-seconds", 58888.8],
  ["10s-to-60s-halves-round-up", 10500],
  ["10s-to-60s-halves-round-up", 10499.9],
  ["10s-to-60s-halves-round-up", 33500],
  ["10s-to-60s-halves-round-up", 59499],

  ["format-chosen-on-unrounded-under-60s", 59500],
  ["format-chosen-on-unrounded-under-60s", 59700],
  ["format-chosen-on-unrounded-under-60s", 59999.999],

  ["boundary-60000-starts-minutes", 60000],
  ["boundary-60000-starts-minutes", 60000.4],
  ["boundary-60000-starts-minutes", 60001],

  ["minutes-floor-and-remainder-seconds", 61000],
  ["minutes-floor-and-remainder-seconds", 75300],
  ["minutes-floor-and-remainder-seconds", 184000],
  ["minutes-floor-and-remainder-seconds", 60499],
  ["minutes-remainder-halves-round-up", 60500],
  ["minutes-remainder-halves-round-up", 150500],

  ["remainder-rounded-after-minutes", 119500],
  ["remainder-rounded-after-minutes", 119700],
  ["remainder-rounded-after-minutes", 179999],
  ["remainder-rounded-after-minutes", 239600.5],

  ["open-no-hour-unit", 3600000],
  ["open-no-hour-unit", 5025000],
  ["open-no-hour-unit", 86400000],

  ["open-very-large", 1e10],
  ["open-very-large", 9007199254740991],
  ["open-very-large", 1e21],
  ["open-very-large", 1.5e300],
];

const nearAnchor = fc
  .tuple(
    fc.constantFrom(1000, 9950, 10000, 59500, 60000, 119500),
    fc.oneof(fc.integer({ min: -60, max: 60 }), fc.double({ min: -60, max: 60, noNaN: true })),
  )
  .map(([anchor, offset]) => anchor + offset);

const fractional = fc.double({ min: 0, max: 200000, noNaN: true });
const negative = fc.oneof(fc.integer({ min: -200000, max: -1 }), fc.double({ min: -1e12, max: -1e-6, noNaN: true }));
const veryLarge = fc.oneof(fc.integer({ min: 1e9, max: Number.MAX_SAFE_INTEGER }), fc.double({ min: 1e12, max: 1e300, noNaN: true }));
const missing = fc.constantFrom<Ms>(null, undefined);

const generatedArbitrary: fc.Arbitrary<Ms> = fc.oneof(
  { arbitrary: nearAnchor, weight: 60 },
  { arbitrary: fractional, weight: 20 },
  { arbitrary: negative, weight: 10 },
  { arbitrary: veryLarge, weight: 10 },
  { arbitrary: missing, weight: 1 },
);

function encode(ms: Ms): unknown {
  return ms === undefined ? { $undefined: true } : ms;
}

const inputs = [
  ...handWritten.map(([category, ms], i) => ({
    id: `h${String(i + 1).padStart(3, "0")}`,
    category,
    args: [encode(ms)],
  })),
  ...fc.sample(generatedArbitrary, { seed: SEED, numRuns: GENERATED_COUNT }).map((ms, i) => ({
    id: `g${String(i + 1).padStart(4, "0")}`,
    category: "generated",
    args: [encode(ms)],
  })),
];

const corpus = { function: "formatDuration", inputs };
writeFileSync(new URL("./corpus.json", import.meta.url), `${JSON.stringify(corpus, null, 2)}\n`);
