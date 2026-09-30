# specdial

Is a coding agent becoming a compiler? A compiler turns one source into one
behaviour, every time. This experiment asks the same coding agent for the same
small function many times, in fresh sessions, and counts how many
behaviourally distinct programs come back. It then turns the request up one
notch at a time (a ticket, then example tests, then a precise prose spec, then
property tests) and measures how that count falls, whether different agents
converge on the same behaviour, and which decisions are still open at the top.

This is the harness and data behind
[the write-up](https://dikrana.dev/blog/compiler-analogy-spec-dial/).

## Result

Three agents, 300 runs each: `claude-sonnet-5-5` and `claude-opus-5-5` on
Claude Code 2.1.285, and Codex (`gpt-6.1-sol`, effort high) on codex-cli
0.159.2. Claude cost $6.66 for Sonnet and $17.18 for Opus, API-priced; Codex
cost is unknown, since it ran on the operator's plan and reports none.

Per level, pooled over agents, across the five functions:

| Level | The agent is given | Runs | Median k | Mean effective behaviours | Runs matching the reference |
|---|---|---|---|---|---|
| L0 | a ticket | 225 | 26.00 | 18.08 | 0 |
| L1 | + example tests | 221 | 10.00 | 6.69 | 0 |
| L2 | + prose spec | 224 | 2.00 | 1.56 | 70 |
| L3 | + property tests | 225 | 2.00 | 1.65 | 136 |

Per cell, k is the number of distinct behaviours among one agent's 15 runs (a
compiler scores 1); pooled is the same count over all three agents' runs.
Distinct sources counts different implementation texts per agent.

| Function | Level | k Sonnet | k Opus | k Codex | k pooled | Pooled runs matching the reference | Distinct sources (Sonnet / Opus / Codex) |
|---|---|---|---|---|---|---|---|
| `parseEnv` | L0 | 7 | 13 | 9 | 29 | 0/45 | 11 / 15 / 15 |
| `parseEnv` | L1 | 2 | 1 | 3 | 5 | 0/45 | 2 / 5 / 9 |
| `parseEnv` | L2 | 2 | 1 | 1 | 2 | 9/45 | 6 / 5 / 5 |
| `parseEnv` | L3 | 2 | 2 | 1 | 3 | 25/45 | 10 / 4 / 7 |
| `toCsv` | L0 | 4 | 4 | 2 | 6 | 0/45 | 7 / 9 / 12 |
| `toCsv` | L1 | 2 | 2 | 1 | 2 | 0/45 | 7 / 9 / 9 |
| `toCsv` | L2 | 2 | 2 | 2 | 2 | 13/45 | 9 / 13 / 6 |
| `toCsv` | L3 | 1 | 1 | 1 | 1 | 45/45 | 9 / 13 / 6 |
| `globToRegex` | L0 | 7 | 12 | 7 | 26 | 0/45 | 14 / 15 / 15 |
| `globToRegex` | L1 | 1 | 7 | 3 | 10 | 0/42 | 4 / 11 / 12 |
| `globToRegex` | L2 | 2 | 3 | 1 | 4 | 0/45 | 12 / 11 / 11 |
| `globToRegex` | L3 | 3 | 3 | 1 | 5 | 0/45 | 13 / 11 / 12 |
| `safeFilename` | L0 | 7 | 12 | 13 | 32 | 0/45 | 15 / 15 / 15 |
| `safeFilename` | L1 | 7 | 13 | 4 | 24 | 0/45 | 12 / 15 / 7 |
| `safeFilename` | L2 | 1 | 1 | 1 | 1 | 45/45 | 3 / 3 / 4 |
| `safeFilename` | L3 | 1 | 1 | 1 | 1 | 45/45 | 4 / 9 / 1 |
| `formatDuration` | L0 | 11 | 6 | 4 | 21 | 0/45 | 13 / 15 / 10 |
| `formatDuration` | L1 | 5 | 3 | 4 | 11 | 0/44 | 9 / 14 / 5 |
| `formatDuration` | L2 | 1 | 1 | 2 | 2 | 3/44 | 7 / 13 / 8 |
| `formatDuration` | L3 | 2 | 2 | 2 | 2 | 21/45 | 7 / 14 / 9 |

The Opus cells for `globToRegex` L1 and `formatDuration` L1 and L2 hold 12, 14
and 14 runs, because the excluded runs below are left out of every number.

- No run at L0 or L1 matches the reference, for any function or agent. At L0,
  in every function but `toCsv`, the pooled k equals the three agents' k added
  together: no behaviour from one agent was also produced by another.
- `safeFilename` reaches one behaviour, the reference's, for every agent from
  L2. `toCsv` gets there only at L3: at L2 every agent still splits on
  `carriage-return-unquoted`, which the property tests settle. That split is
  a spec ambiguity: the spec quotes a field that contains "a newline" and
  cites RFC 4180, whose line break is CRLF, so a field holding a lone `\r`
  can be read either way.
- What still diverges at L3: `parseEnv` on `prototype-key` (Sonnet and Opus)
  and `export-as-key` (Opus); `globToRegex` on `**` (Sonnet and Opus, see
  the two `globToRegex` sections below); `formatDuration` on
  `under-10s-one-decimal-half-rounding`, for every agent.
- Different code, same behaviour: `formatDuration` L2 Opus has 13 distinct
  sources and k 1.

`TZ=UTC python3 analyze.py` prints every number above from the committed
results, including the categories each cell disagrees on; `--json out.json`
writes them as JSON. The model and CLI versions are the exception: they come
from each run's `result.json`.

### Pre-registered expectations

Written into the design before the pilot.

1. **Distinct behaviours fall monotonically from L0 to L3 in most cells.**
   The level medians fall (26.00, 10.00, 2.00, 2.00), but mean effective
   behaviours rises from 1.56 at L2 to 1.65 at L3. Per agent, these cells
   rise somewhere on the ladder: `parseEnv` Opus (13, 1, 1, 2), `toCsv` Codex
   (2, 1, 2, 1), `globToRegex` Sonnet (7, 1, 2, 3), `safeFilename` Opus (12,
   13, 1, 1), and `formatDuration` Sonnet (11, 5, 1, 2) and Opus (6, 3, 1, 2).
   The rest never rise. Held for the direction, not everywhere.
2. **Not every cell reaches 1 at L3.** Held. `toCsv` and `safeFilename` reach
   1 for every agent, as do `parseEnv` and `globToRegex` for Codex; the other
   L3 cells sit at 2 or 3.
3. **Distinct source texts stay close to N at every level.** Did not hold. At
   L0 most cells are at or near 15 distinct sources, but source text converges
   too: `safeFilename` L2 has 3, 3 and 4, `safeFilename` L3 Codex has 1, and
   `parseEnv` L1 Sonnet has 2.
4. **At L0, agents agree with the reference on under half of runs.** Held:
   0 of 225.
5. **Pooled across agents, L3 converges less than within one agent.** Held
   for `parseEnv` (pooled 3 against 2, 2 and 1) and `globToRegex` (pooled 5
   against 3, 3 and 1). Did not hold for `toCsv` and `safeFilename`, where
   every agent and the pool are at 1, or for `formatDuration`, where all
   three agents split the same 2 ways.

### Two places the spec misdescribes its reference

The corpus records what the reference does, and the reference was kept as it
is where its own spec describes it wrongly. A spec that misdescribes the code
it documents is a real case of the thing being measured, so these count as
disagreement with the reference, not as agent error.

- `formatDuration`: the spec says the under-10-seconds value is written with
  one decimal by "standard rounding". The reference uses `toFixed(1)` on a
  binary float, so 9950 ms gives `9.9s`. Runs that implement the spec's
  rounding return `10.0s` there and differ from the reference, in the
  `under-10s-one-decimal-half-rounding` category. At L2, Sonnet and Opus are
  each at k 1 with no run matching the reference; the L3 property tests move
  some runs onto the reference's reading and leave the rest, which is why
  those cells go from 1 to 2.
- `globToRegex`: the spec says `**` matches "any run of characters at all".
  The reference compiles `**` to `.*`, which does not match a newline
  (`open-globstar-newline`). At L2 and L3, 73 of the 90 runs depart from the
  reference there, but it is not the main reason no `globToRegex` run
  matches the reference; the next section is.

### `globToRegex`: the runs follow glob convention, not the spec

No `globToRegex` run matches the reference at any level. The spec says the
`/` after `**` is consumed as part of the `**`, so read as written,
`**/Dockerfile` is `.*Dockerfile` and matches `xDockerfile`, and `a**/b`
matches `axb`. The reference does exactly that. The runs instead read `**/` the
way common glob tools do, as zero or more whole directories, so neither of
those paths matches. At L2 and L3, 89 of the 90 runs depart from both the spec
and the reference on `globstar-slash-root-literal` (`**/Dockerfile`) and
`open-globstar-mid-segment-slash` (`a**/b`): all 45 at L2 and 44 at L3, the
exception being `globToRegex__L3__sonnet__r10`. The same reading shows in
`open-double-slash-after-globstar` (`**//x`, 89 of 90) and
`open-globstar-trailing-slash` (`**/`). The newline gap cannot explain the
miss on its own: 17 of those 90 runs match the reference on the newline input
and still differ on `**/`, and the one run that reads `**/` as the reference
does differs on the newline.

## How a run works

Each run is a fresh Docker container from one pinned image (both CLIs at the
host's versions, vitest, fast-check, tsx and typescript preinstalled), running
as a non-root user with only the run's work dir mounted, on a network that
reaches the public internet but not the host or the LAN. The agents' web
tools, web search and connectors are off, and every transcript is scanned for
fetches: any run with one is excluded (see below). `probe.sh` checks the
isolation before any paid run: no operator instructions in context, no GitHub
or SSH identity, no host filesystem, no Codex web search or app connectors.

The work dir grows by one artifact per level:

| Level | The agent sees |
|---|---|
| L0 | `package.json`, `src/<fn>.ts` (a stub with the signature that throws), `TICKET.md` |
| L1 | + `src/<fn>.test.ts`, example-based vitest tests |
| L2 | + `SPEC.md`, the precise plain-English spec |
| L3 | + `src/<fn>.properties.test.ts`, fast-check property tests |

The prompt is one sentence naming the function, the file and whatever the
level provides, plus `npx vitest run` when tests are visible. The exact prompt
is recorded in each run's `result.json`. The agent never sees the reference,
the corpus or other runs. Claude runs as `claude -p --setting-sources project`
with web tools disallowed and no MCP; Codex runs with a scratch `CODEX_HOME`
holding only its login and a config pinning model and effort. The CLIs expose
no temperature setting, so each tool's default sampling is what is measured.

When the session ends, `src/<fn>.ts` is copied out to
`runs/<fn>__<level>__<agent>__r<rep>/impl.ts`. Nothing else leaves the work
dir.

## Scoring

`score.py` loads each `impl.ts` inside the same image with no network, as
`src/<fn>.ts` in an ESM package like the agent's work dir, and `evaluate.ts`
calls the function on every input of the function's held-out corpus, each
under a per-input time limit.

- **Behaviour signature**: the canonical outputs over the corpus. A returned
  value is recorded as JSON with sorted keys, `undefined`, `-0` and non-finite
  numbers kept distinct; a throw is `THROW` whatever its message; a hang is
  `TIMEOUT`. For `globToRegex` the returned RegExp is recorded as its match
  results over a fixed list of probe paths per pattern, not its source. The
  signature hash is the sha256 of that output array.
- **k**: distinct behaviour classes in a cell. A run whose code does not load
  is the class `NOLOAD`; a run that left no implementation is `ABSENT`. The
  grid has neither.
- **Effective behaviours**: exp of the Shannon entropy of the class
  frequencies, so one stray run reads differently from an even split.
- **Modal share**, **runs matching the reference** (signature equal to the
  reference's) and **agree_frac** (share of inputs matching the reference).
  Agreement is agreement with the author's intent, not correctness: at L0
  many behaviours are defensible readings of the ticket.
- **Distinct sources**: `src_hash` is the sha256 of `impl.ts` after esbuild's
  TypeScript strip and whitespace minify, so it is identical for runs whose
  code is identical after that transform. Comments, formatting and type
  annotations do not count; identifier names still do, so two runs that
  differ only in a variable name are two sources.
- **Where divergence survives**: every hand-written corpus input carries a
  category naming the spec clause or open decision it probes. Per cell,
  `analyze.py` lists the categories on which loaded runs disagree.

Every score carries provenance (the sha256 of the corpus, reference and
evaluator, and the image id). `score.py` refuses to mix fresh and stale
scores, and `analyze.py` fails unless every score comes from the current
corpus, reference and evaluator and from one image.

A run with contamination or an external fetch in its transcript is excluded
from every number and listed with its reason. Cost counts every run,
excluded ones included, since the money was spent either way.

### Excluded runs and reruns

Excluded, by that rule, because they ran `npx vite-node`, which fetches
vite-node from npm: `globToRegex__L1__opus__r10`, `globToRegex__L1__opus__r11`,
`globToRegex__L1__opus__r14`, `formatDuration__L1__opus__r11` and
`formatDuration__L2__opus__r5`. It is a tool fetch, not a reference leak, but
the rule has no exceptions. No run had contamination. With the 5 runs kept
(`TZ=UTC python3 analyze.py --include-excluded`), L1 median k is 11.00
instead of 10.00 and mean effective behaviours 6.86 instead of 6.69, and
`globToRegex` L1 is k 9 instead of 7 for Opus and 12 instead of 10 pooled.

Rerun for infrastructure failures, not agent behaviour:
`safeFilename__L0__codex__r1` to `r3` (killed when the first grid invocation
hit the shell's time cap), `formatDuration__L0__codex__r5` (ended on "Selected
model is at capacity"), and `formatDuration__L0__opus__r1` and `r12` (flagged
by a fetch-detector bug that read the `2>` of `npm install --silent 2>&1` as a
package name). The detector was fixed in `run.sh` and those two runs were then
resampled, run again from scratch, not re-scanned: their committed results
are new sessions.

## The task set

Five pure functions from the [mutgap](https://github.com/iceinvein/mutgap)
corpus, each with a real-world reference implementation and a precise spec.
All sources are repositories under `github.com/iceinvein`.

| Function | Decisions a request leaves open | Source |
|---|---|---|
| `parseEnv` | comments, `export ` prefix, first vs last `=`, quote stripping, duplicates, blank values | `agent-skills@e0ba96c:skills/migrate/scripts/leaks.ts:9` |
| `toCsv` | header source, missing keys, quoting rules, escaping, trailing newline | `token-usage-cost@803506b:src/export.ts:11` |
| `globToRegex` | `*` vs `**`, `**/` at root, metacharacter escaping, anchoring, braces | `agent-skills@e0ba96c:skills/magpie/scripts/path-filter.ts:59` |
| `safeFilename` | forbidden characters, whitespace, dot handling, empty fallback, extension dot | `resume-builder@dd259b9:src/ui/shell/filename.ts:12` |
| `formatDuration` | unit thresholds, rounding, null input, the minute boundary | `code_intelligence_mcp_server@42194dd:ui/src/lib/format.ts:30` |

The L1 examples settle some of those decisions and leave the rest open:

- `parseEnv`: comments (skipped, as are blank lines) and quote stripping
  (double quotes), plus whitespace trimming and empty input. Open: the
  `export ` prefix, first vs last `=`, duplicates, blank values.
- `toCsv`: a header line from the row keys (every example row has the same
  keys, so first row vs all rows stays open), the trailing newline, and
  quoting a field with a comma. Open: missing keys, escaping, quoting for any
  other character.
- `globToRegex`: `*` vs `**`, `**/` at root and anchoring. Open:
  metacharacter escaping, braces.
- `safeFilename`: whitespace, forbidden characters (`:`, `/` and `?` are
  shown dropped), the empty fallback (`resume`) and the extension dot. Open:
  dot handling.
- `formatDuration`: null input (an en dash) and the minute boundary (`60000`
  is `1m 0s`), with one value per unit. Open: where the thresholds fall,
  rounding.

The plan asked for the common case plus at most two edge cases per file. The
`toCsv` and `formatDuration` files keep to that; the `parseEnv`,
`globToRegex` and `safeFilename` files go beyond it, which makes their L1
more specified than intended.

Each `tasks/<fn>/` holds:

| File | Purpose |
|---|---|
| `reference.ts` | the real function, from mutgap |
| `buggy.ts`, `meta.json` | mutgap's planted bug and its source commit; used here only to prove the corpus can tell two behaviours apart |
| `stub.ts` | same export, body throws; the agent's starting file |
| `ticket.md` | the L0 request, one to three sentences, written without access to the specs or references and frozen before the first run |
| `examples.test.ts` | the L1 example tests |
| `spec.md` | the L2 spec, mutgap's plain-English description of the reference |
| `properties.test.ts` | the L3 property tests |
| `gen.ts`, `corpus.json` | the corpus, held out apart from the four inputs below: hand-written inputs tagged by category, plus generated inputs from a fixed-seed fast-check sample, all distinct |

`check_tasks.py` refuses a task before any agent is paid to attempt it unless
the reference passes every visible test and the stub none, no corpus string
of 6 or more characters appears in a visible file, no two inputs are equal, no
number is beyond `Number.MAX_SAFE_INTEGER`, and `buggy.ts` and `reference.ts`
produce different signatures. The leak rule covers only strings of 6 or more
characters, so the corpus is held out except for four inputs that are also
visible example inputs: `formatDuration` `null` (`h001`) and `60000` (`h048`),
`parseEnv` `""` (`h064`) and `toCsv` `[]` (`h001`).

## Running it

Requires macOS with Colima as the Docker runtime (`run.sh` writes and checks
its firewall through `colima ssh`, and the scratch dir sits under your home
so the VM can see it), Node 24, Python 3, a Claude token made with
`claude setup-token` in `~/.config/interview-signal/claude-oauth-token` (mode
0600), and a Codex login in `~/.codex/auth.json`. Runs draw on those accounts.

```sh
npm install
python3 check_tasks.py                  # validate every task
./run.sh --build-image                  # image with the host's CLI versions
./run.sh --setup-network                # runs network and its firewall
./probe.sh                              # isolation check, one session per agent
TZ=UTC REPS=15 JOBS=4 ./run.sh          # agent runs, skips any already in runs/
TZ=UTC python3 score.py                 # evaluate every impl.ts, cached in runs/*/score.json
TZ=UTC python3 analyze.py               # the numbers
```

`run.sh` takes `FNS`, `LEVELS`, `AGENTS`, `REPS`, `JOBS`, `BUDGET` (USD cap
per Claude run) and `WALL_S` (wall-clock cap per run) from the environment;
its header has the defaults. `./run.sh --one <fn> <level> <agent> <rep>` runs
exactly one. A run whose `result.json` exists is skipped; delete the run dir
to rerun it.

On a clone, `score.py` reports every committed score as stale, because the
image built locally has a different id from the one recorded, so
re-evaluating needs `TZ=UTC python3 score.py --rescore`. `analyze.py` needs no
image and reproduces every number from the committed data as it is.

## What is committed

`runs/<fn>__<level>__<agent>__r<rep>/` keeps each run's `impl.ts` (the code
the agent left), `result.json` (prompt, model, CLI version, cost, turns, wall
time, contamination and fetch flags), `signature.json` (the evaluator's
output) and `score.json`. `tasks/<fn>/` also keeps the reference's signature
and its provenance. That is everything `score.py` and `analyze.py` read, so
every number can be recomputed from a clone.

The session transcripts, stderr, closing messages and Codex session rollouts
are not published. They are kept locally because they carry machine paths and
account ids.

## Limitations

- **k is a lower bound.** Two implementations can differ on an input the
  corpus lacks. Every spec clause and open decision has hand-written inputs
  and there are generated ones besides, but agreement on the corpus is not
  equivalence.
- **Module state carries across inputs.** Each run is evaluated in one
  worker, so an implementation that keeps state at module level could answer
  an input differently depending on what ran before it. A fresh worker per
  input would cost one tsx load per evaluation.
- **Source text repeats.** From L1 up, every agent returns the same code in
  more than one run of a cell: `parseEnv` L1 Sonnet has 2 distinct sources
  in 15 runs and `safeFilename` L3 Codex has 1. Summed over the 20 cells,
  Sonnet has 174 distinct sources in 300 runs, Opus 219 in 295 and Codex 178
  in 300. A low k partly measures each tool's sampling, not only the
  request.
- **Small pure functions.** Five of them, single-file and stateless, which
  gives the cleanest behaviour signature and says little about multi-file or
  stateful work.
- **Public source repositories.** An agent reproducing a reference from
  memory would inflate convergence. No run at L0 or L1 matches a reference,
  which argues against it, but it cannot be ruled out at L2 and L3.
- **Author-written tickets and examples.** The ticket sets how far L0
  diverges and the examples set L1. Both were written for this experiment,
  not taken from a real tracker or test suite.
- **No temperature control.** Neither CLI exposes one, so every run uses the
  tool's default sampling, which is what a user gets.

## License

MIT
