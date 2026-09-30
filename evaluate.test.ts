import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { describe, expect, test } from "vitest";

const FIXTURES = "test/fixtures/evaluate";

function evaluate(impl: string, corpus: string) {
  const result = spawnSync(
    "npx",
    ["tsx", "evaluate.ts", `${FIXTURES}/${impl}`, `${FIXTURES}/${corpus}`],
    { encoding: "utf8", env: { ...process.env, TZ: "UTC" } },
  );
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function evaluateOk(impl: string, corpus: string) {
  const result = evaluate(impl, corpus);
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout);
}

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

describe("evaluate.ts", { timeout: 30_000 }, () => {
  test("returned objects are written as ok entries with keys sorted", () => {
    const result = evaluateOk("objects.ts", "objects.corpus.json");
    expect(result.load).toBe("ok");
    expect(JSON.stringify(result.outputs)).toBe(
      '[{"ok":{"alpha":"ab","mid":{"x":null,"y":["ab"]},"zeta":2}},' +
        '{"ok":{"alpha":"","mid":{"x":null,"y":[""]},"zeta":0}}]',
    );
  });

  test("an input that throws is recorded as THROW and later inputs still run", () => {
    const result = evaluateOk("throws.ts", "throws.corpus.json");
    expect(result.outputs).toEqual([{ ok: 3 }, "THROW", { ok: 4 }]);
  });

  test("an input that never returns is recorded as TIMEOUT and later inputs still run", () => {
    const result = evaluateOk("loops.ts", "loops.corpus.json");
    expect(result.load).toBe("ok");
    expect(result.outputs).toEqual([{ ok: 2 }, "TIMEOUT", { ok: 6 }, { ok: 8 }]);
  });

  test("a file with a syntax error does not load", () => {
    const result = evaluateOk("syntax-error.ts", "numbers.corpus.json");
    expect(result).toEqual({ load: "noload", outputs: null, hash: null });
  });

  test("a file without the corpus's export does not load", () => {
    const result = evaluateOk("missing-export.ts", "numbers.corpus.json");
    expect(result).toEqual({ load: "noload", outputs: null, hash: null });
  });

  test("-0, NaN, infinities and undefined are encoded as tagged values", () => {
    const result = evaluateOk("special-values.ts", "special-values.corpus.json");
    expect(JSON.stringify(result.outputs)).toBe(
      "[" +
        [
          '{"ok":{"$num":"-0"}}',
          '{"ok":{"$num":"NaN"}}',
          '{"ok":{"$num":"Infinity"}}',
          '{"ok":{"$num":"-Infinity"}}',
          '{"ok":{"$undefined":true}}',
          '{"ok":{"list":[{"$num":"NaN"},{"$num":"-0"},0],"value":{"$undefined":true}}}',
          '{"ok":"got undefined"}',
        ].join(",") +
        "]",
    );
  });

  test("a RegExp is written as probe results when the input has a probe, else as source and flags", () => {
    const result = evaluateOk("regex.ts", "regex.corpus.json");
    expect(result.outputs).toEqual([
      { ok: [true, true, false, false] },
      { ok: { $regex: "^[^/]*\\.md$", flags: "g" } },
    ]);
  });

  test("values the canonical rules do not cover are recorded as $unsupported at their position", () => {
    const result = evaluateOk("unsupported.ts", "unsupported.corpus.json");
    expect(JSON.stringify(result.outputs)).toBe(
      "[" +
        [
          '{"ok":{"$unsupported":"Map"}}',
          '{"ok":{"$unsupported":"bigint"}}',
          '{"ok":{"$unsupported":"Function"}}',
          '{"ok":{"$unsupported":"symbol"}}',
          '{"ok":{"$unsupported":"Point"}}',
          '{"ok":{"tags":[{"$unsupported":"Set"},1],"when":{"$unsupported":"Date"}}}',
        ].join(",") +
        "]",
    );
  });

  test("a returned Promise is recorded as unsupported without being awaited", () => {
    const result = evaluateOk("promise.ts", "promise.corpus.json");
    expect(result.outputs).toEqual([
      { ok: { $unsupported: "Promise" } },
      { ok: { $unsupported: "Promise" } },
      { ok: 6 },
    ]);
  });

  test("a worker that exits during an input is recorded as CRASH and later inputs still run", () => {
    const result = evaluateOk("exits.ts", "exits.corpus.json");
    expect(result.load).toBe("ok");
    expect(result.outputs).toEqual([{ ok: 2 }, "CRASH", { ok: 6 }]);
  });

  test("the hash is the sha256 of the outputs and ignores source formatting", () => {
    const expectedHash = sha256('[{"ok":2},{"ok":10}]');
    const a = evaluateOk("format-a.ts", "numbers.corpus.json");
    const b = evaluateOk("format-b.ts", "numbers.corpus.json");
    expect(a.hash).toBe(expectedHash);
    expect(b.hash).toBe(expectedHash);
  });

  test("an unreadable corpus is a harness error with a non-zero exit", () => {
    const result = evaluate("format-a.ts", "does-not-exist.json");
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
  });
});
