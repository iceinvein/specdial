# Run record: specdial

## Pre-flight (2026-09-30)

- **Review: tier 3 + measurement code.** Reviewer dispatches at T11
  (isolation boundary), T13 (the flip), and T4, T12, T14 (evaluator, scorer,
  analysis), because every number in the post is computed by those three. The
  rest get a commit-stat read; the final review covers the whole plan. Chosen
  by the operator from three options.
- **Effort: plan marks taken.** T1 and T3 at low effort: fixed file lists and
  byte copies. The other 14 at session effort.
- **Workspace: worktree per concurrent implementer.** The graph allows three
  at once (T1 to T3 after the base commit) and five in the corpus wave
  (T6 to T10). The repo was empty, so T1 runs alone on master to create the
  base commit; later waves get `git worktree add` trees under
  `../specdial-worktrees/`, agents commit their own task there, and the
  controller merges into master. The harness's worktree tool is bound to the
  session's primary repo (the blog), so implementer worktrees are cut by hand.

## Decisions and deviations

- Design decision 4 (container isolation instead of temp dirs) was added by
  the controller after design sign-off and surfaced to the operator at
  pre-flight; the operator said go without objecting.
- T2 goes to a fresh agent with no access to mutgap, so the tickets are blind
  to the specs. The controller had already read the specs and could not write
  them blind.

## T4

- The implementer made unsupported return types and worker crashes harness
  errors (exit 2). Sent back: those are behaviours of agent code, so they are
  recorded per input as `{"ok": {"$unsupported": <name>}}` and `"CRASH"`, and
  exit 2 is kept for genuine harness failures. Also kept: a 10 s load timeout
  giving `noload`, which the plan did not specify.
- Integer-like object keys serialise in numeric order (a JSON property of JS
  objects). Accepted: canonicalisation is identical for every implementation,
  so hashes stay comparable.

## Scheduling

- T11 dispatched early, in parallel with T5, because only its final dry check
  needs the T6 to T10 files. It verifies with an L0 dry run instead; the
  controller runs the plan's L3 dry check once parseEnv's files are merged.
- T5 started from master with T4 merged while T4's review is out; any review
  fix to evaluate.ts merges afterwards (the Offers contract is fixed).
- Review (fresh reviewer): nothing blocking for synchronous code. Fixes sent
  back: leftover async errors are caught in the worker and reported outside
  the hash (`async_errors`, `late_async_errors`), so timers cannot make one
  file hash two ways; tests pinning key order, the 1000 ms limit and nested
  RegExp; a hang on one harness-error path.
- Accepted without a code change: module-level state carries across inputs in
  one worker (a fresh worker per input would cost one tsx load for each of
  about 486,000 evaluations). Goes in the README limitations. Async
  implementations all encode as `$unsupported: Promise`; T12 must flag any
  signature containing `$unsupported` so such collisions are visible.

## T11

- Implementer deviations accepted: `set -euo pipefail` kept from
  interview-signal (the isolation checks rely on `-e`); extra `result.json`
  fields for auditing; Claude `effort` null (the transcript does not report
  it); Codex pinned to `gpt-6.1-sol`, effort high, from the operator's current
  Codex config; token file path shared with interview-signal.
- Controller ran a Codex L0 dry run (rep 0, deleted): impl present, 139 s,
  8 steps, no contamination or external fetches.
- Review (fresh reviewer, isolation): nothing blocking; mounts, env, work-dir
  contents and prompts exact. Fixes sent back: wider fetch detection (bare
  hosts, script payloads, npm/npx of other packages), refuse a symlinked
  copy-back, pin image deps to the root lockfile with `npm ci` (Touches grows
  by `docker/package-lock.json`, approved by the controller).
- Accepted risks: a run can read its own credential (Claude token env var,
  Codex auth.json) and reach the public internet; detection is by transcript.
  Codex token refresh under JOBS > 1 may fail mid-grid; if Codex `is_error`
  bursts appear, rerun Codex at JOBS=1.
- Analysis must report and exclude any run with non-empty `contamination` or
  `external_fetches` from headline numbers (to carry into T14's brief).

## Corpus wave

- T9 safeFilename: 58 hand-written + 500 generated; buggy differs on 259
  outputs. Extension sanitising is unspecified by the spec and pinned by no
  visible test; expect it among the L3 residual categories.
- T10 formatDuration: 67 + 500, numbers only. Known spec/reference gap: the
  spec says "standard rounding" but the reference uses `toFixed(1)` on binary
  floats, so 9950 ms gives `9.9s` (1050 gives `1.1s`). Kept deliberately: the
  corpus records the reference, and a spec that misdescribes its own
  reference is a real case of the thing being measured. Report it as such in
  the post, not as agent error. NaN, Infinity and -0 are not in the corpus.
- T7 toCsv: 54 + 500; buggy differs on 276. Its agent's scratch helper was
  overwritten by the parseEnv agent (shared scratchpad name); it moved to its
  own dir and reran every check. No repo effect.
- T6 parseEnv: 65 + 500 (7 generated duplicates); buggy differs on 333.
  `__proto__=x` returns `{}` in the reference, recorded as h059 with no claim
  about correctness. Side effect: `npx vitest run` at the repo root now picks
  up `tasks/*/*.test.ts`, which only run inside a work dir. The controller adds
  a root `vitest.config.ts` limiting include to root-level `*.test.ts`.
- T8 globToRegex: 67 + 500, 18 to 30 probe paths each; buggy differs on 19.
  Second spec/reference gap: the reference's `**` is `.*`, which does not
  match `\n`, against the spec's "any run of characters at all". Recorded
  under `open-*-newline`; same treatment as formatDuration's rounding.
- Review fixes landed (80e13d3); probe clean after the image rebuild.
  Controller L3 dry check (parseEnv, sonnet, rep 0, deleted afterwards):
  $0.042, 9 turns, 14 s, clean; its implementation's signature hash equals the
  reference's (35db7a14...), so the run, copy-back and evaluator agree end to
  end.

## T13 pilot

- Run by the controller rather than dispatched: it is a fixed sequence of
  commands whose output is the deliverable, and the numbers belong in this
  record. Agent runs start while T12's review is out (a read; the runs do not
  depend on the scorer); scoring waits for the review to clear.

## T12 review

- Fresh reviewer: agreement maths and container parity hold (host and
  container outputs byte-identical; globToRegex buggy 548/567 recomputed
  independently). Sent back: stale caches were served silently after a corpus
  edit (now provenance hashes and a loud failure); impls loaded as CommonJS
  while the agent work dir is ESM; no memory/CPU/pids limits, which under
  --jobs 4 could produce false TIMEOUTs counted as disagreement; repo mounted
  whole into a container running agent code; non-atomic writes; src_hash
  docstring overstated.
- T14 merged (a8b4565); its review waits for real pilot scores so the reviewer
  can check numbers on real data.

## Pilot results (runs only; scoring waits on the T12 fixes)

- 36/36 runs, probe clean, no is_error, every run left an impl, no
  contamination. Claude cost $1.135 total: sonnet $0.0299 per run (mean wall
  14.5 s), opus $0.0647 (24.8 s); codex reports no cost (72.6 s mean).
- Projection for the full grid, Claude only: 300 x 0.0299 + 300 x 0.0647 =
  about $28, well under the design's $115 estimate.
- One external fetch: formatDuration L0 opus r3 ran `npx tsc`, which pulls
  typescript from npm to type-check. Not a reference leak. Decision: the
  analysis ignores type-checker fetches (tsc/typescript only) when excluding
  runs and prints how many runs that rule kept. The raw result.json keeps the
  flag.
