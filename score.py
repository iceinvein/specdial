#!/usr/bin/env python3
"""Score every run dir that holds a result.json.

Each run's impl.ts is evaluated over its function's corpus inside the
specdial-agent image with no network, so agent-written code never runs on the
host. It is loaded the way the agent's work dir loads it: as src/<fn>.ts in a
package with "type": "module". Per run this writes
  runs/<id>/signature.json   evaluate.ts stdout, byte for byte (not written
                             when impl.ts is absent)
  runs/<id>/score.json       {"load", "hash", "agree_ref", "agree_frac",
                             "src_hash", "unsupported", "async_errors",
                             "late_async_errors", "timeouts"} plus provenance
and per function tasks/<fn>/reference.signature.json (evaluate.ts stdout)
with its provenance in tasks/<fn>/reference.provenance.json.

Provenance is {"corpus_sha", "ref_src_sha", "evaluator_sha", "image_id"}: the
sha256 of corpus.json, reference.ts and evaluate.ts, and the id of the image
the evaluation ran in. Existing scores are kept unless --rescore, but only
while their provenance matches the current files and image. Any mismatch
fails the whole invocation, naming every stale run and reference, before
anything is evaluated, so fresh and stale scores are never mixed.

A harness error (evaluate.ts exiting non-zero, a mount the container cannot
see, an evaluation outlasting --timeout) is reported naming the run and exits
1; it is never written as a score.

src_hash is the sha256 of impl.ts after esbuild's TypeScript strip and
whitespace minify, so it is identical for runs whose code is identical after
that transform (comments, formatting and type annotations do not count). It
is null when impl.ts is absent or esbuild cannot parse it.

Usage: python3 score.py [--rescore] [--jobs N] [--timeout SECONDS]
Env: RUNS_DIR, TASKS_DIR (defaults runs/ and tasks/, as in run.sh);
AGENT_MEMORY, AGENT_CPUS (container limits, run.sh's defaults);
SCORE_PIDS_LIMIT (process and thread cap per container).
"""

import argparse
import hashlib
import json
import os
import subprocess
import sys
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent
EVALUATOR = ROOT / "evaluate.ts"
IMAGE = "specdial-agent"
DEFAULT_JOBS = 4
# A corpus of about 600 inputs where every input hits evaluate.ts's 1 s
# timeout, plus a worker reload after each, takes well over 600 s; this leaves
# room for that worst case so such a run still gets a score.
DEFAULT_TIMEOUT_S = 1800
MEMORY = os.environ.get("AGENT_MEMORY", "4g")
CPUS = os.environ.get("AGENT_CPUS", "2")
# Counts threads as well as processes: node, tsx's esbuild service and one
# worker thread pool per evaluation stay far below it.
PIDS_LIMIT = os.environ.get("SCORE_PIDS_LIMIT", "512")
CONTAINER_PREFIX = "specdial-score-"
ENV = {**os.environ, "TZ": "UTC"}
# The minify script's exit code when esbuild rejects the source, as opposed to
# the script itself failing.
EXIT_UNPARSEABLE = 10
PROVENANCE_KEYS = ["corpus_sha", "ref_src_sha", "evaluator_sha", "image_id"]
STALE = "stale, rerun with --rescore"

# A bind mount of a path the Colima VM cannot see silently becomes an empty
# directory, so every script first checks the files it needs are really files.
CHECK_VISIBLE = r"""
set -u
for path in "$@"; do
  test -f "$path" || { echo "scorer: $path is not visible inside the container" >&2; exit 3; }
done
work=$(mktemp -d)
ln -s /opt/deps/node_modules "$work/node_modules"
cd "$work" || exit 3
"""
# Arguments: evaluate.ts, impl, corpus. The work dir mirrors the agent's.
EVALUATE_SCRIPT = CHECK_VISIBLE + r"""
printf '{"type": "module"}\n' > package.json
mkdir src && cp "$2" "src/$FN.ts" && cp "$1" evaluate.ts || exit 3
exec npx --no tsx evaluate.ts "src/$FN.ts" "$3"
"""
MINIFY_JS = f"""
const {{ transformSync }} = require("esbuild");
const source = require("node:fs").readFileSync(process.argv[1], "utf8");
let code;
try {{
  code = transformSync(source, {{ loader: "ts", minifyWhitespace: true, legalComments: "none" }}).code;
}} catch (error) {{
  if (Array.isArray(error.errors)) process.exit({EXIT_UNPARSEABLE});
  throw error;
}}
process.stdout.write(code);
"""
MINIFY_SCRIPT = CHECK_VISIBLE + 'exec node -e "$MINIFY_JS" "$1"\n'


class HarnessError(Exception):
    pass


def sha256_of(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_atomic(path: Path, text: str) -> None:
    tmp = path.with_name(f"{path.name}.tmp")
    tmp.write_text(text)
    os.replace(tmp, path)


def image_id() -> str:
    proc = subprocess.run(
        ["docker", "image", "inspect", "--format", "{{.Id}}", IMAGE], env=ENV, capture_output=True, text=True,
    )
    if proc.returncode != 0:
        raise HarnessError(f"cannot inspect image {IMAGE}: {proc.stderr.strip()}")
    return proc.stdout.strip()


def container(
    image: str, timeout_s: float, mounts: list[tuple[Path, str]], script: str, paths: list[str],
    env: dict[str, str],
) -> subprocess.CompletedProcess:
    """Runs script in the image with paths as its arguments, each checked visible first."""
    for host, _ in mounts:
        if not host.is_file():
            raise HarnessError(f"{host} is not a file")
    name = f"{CONTAINER_PREFIX}{uuid.uuid4().hex[:12]}"
    cmd = [
        "docker", "run", "--rm", "--name", name, "--network", "none", "--user", "candidate",
        "--cap-drop", "ALL", "--security-opt", "no-new-privileges",
        "--memory", MEMORY, "--cpus", CPUS, "--pids-limit", PIDS_LIMIT, "-e", "TZ=UTC",
    ]
    for host, target in mounts:
        cmd += ["-v", f"{host}:{target}:ro"]
    for key, value in env.items():
        cmd += ["-e", f"{key}={value}"]
    cmd += [image, "sh", "-c", script, "sh", *paths]
    try:
        return subprocess.run(cmd, env=ENV, capture_output=True, text=True, timeout=timeout_s)
    except subprocess.TimeoutExpired:
        # Killing the docker client leaves the container running.
        kill = subprocess.run(["docker", "rm", "-f", name], env=ENV, capture_output=True, text=True)
        stopped = kill.returncode == 0 or "No such container" in kill.stderr
        raise HarnessError(
            f"timed out after {timeout_s} s" + ("" if stopped else f"; could not remove {name}: {kill.stderr.strip()}")
        ) from None


def evaluate(image: str, timeout_s: float, fn: str, impl: Path, corpus: Path) -> str:
    """evaluate.ts stdout for impl over corpus."""
    proc = container(
        image, timeout_s,
        [(EVALUATOR, "/harness/evaluate.ts"), (impl, "/impl/impl.ts"), (corpus, "/task/corpus.json")],
        EVALUATE_SCRIPT, ["/harness/evaluate.ts", "/impl/impl.ts", "/task/corpus.json"], {"FN": fn},
    )
    if proc.returncode != 0:
        raise HarnessError(f"evaluate.ts exited {proc.returncode}: {proc.stderr.strip()}")
    signature = json.loads(proc.stdout)
    if signature.get("load") not in ("ok", "noload"):
        raise HarnessError(f"evaluate.ts printed no load status: {proc.stdout.strip()}")
    return proc.stdout


def source_hash(image: str, timeout_s: float, impl: Path) -> str | None:
    proc = container(
        image, timeout_s, [(impl, "/impl/impl.ts")], MINIFY_SCRIPT, ["/impl/impl.ts"], {"MINIFY_JS": MINIFY_JS},
    )
    if proc.returncode == EXIT_UNPARSEABLE:
        return None
    if proc.returncode != 0:
        raise HarnessError(f"esbuild transform exited {proc.returncode}: {proc.stderr.strip()}")
    return hashlib.sha256(proc.stdout.encode("utf-8")).hexdigest()


def has_unsupported(value) -> bool:
    if isinstance(value, dict):
        return "$unsupported" in value or any(has_unsupported(v) for v in value.values())
    if isinstance(value, list):
        return any(has_unsupported(v) for v in value)
    return False


def same_output(a, b) -> bool:
    # Compared as JSON text: in Python True == 1, in the signature they differ.
    return json.dumps(a, sort_keys=True) == json.dumps(b, sort_keys=True)


def not_evaluated(load: str) -> dict:
    return {"load": load, "hash": None, "agree_ref": False, "agree_frac": None, "src_hash": None,
            "unsupported": None, "async_errors": None, "late_async_errors": None, "timeouts": None}


def score_of(signature: dict, reference: dict, src_hash: str | None) -> dict:
    if signature["load"] == "noload":
        return {**not_evaluated("noload"), "src_hash": src_hash}
    outputs, ref_outputs = signature["outputs"], reference["outputs"]
    if len(outputs) != len(ref_outputs):
        raise HarnessError(f"{len(outputs)} outputs but the reference has {len(ref_outputs)}")
    agreeing = sum(same_output(a, b) for a, b in zip(outputs, ref_outputs))
    return {
        "load": "ok",
        "hash": signature["hash"],
        "agree_ref": signature["hash"] == reference["hash"],
        "agree_frac": agreeing / len(outputs),
        "src_hash": src_hash,
        "unsupported": sum(has_unsupported(o) for o in outputs),
        "async_errors": len(signature["async_errors"]),
        "late_async_errors": signature["late_async_errors"],
        "timeouts": sum(o == "TIMEOUT" for o in outputs),
    }


def current_provenance(task_dir: Path, image: str, evaluator_sha: str) -> dict:
    for name in ("corpus.json", "reference.ts"):
        if not (task_dir / name).is_file():
            raise HarnessError(f"{task_dir / name} is missing")
    return {
        "corpus_sha": sha256_of(task_dir / "corpus.json"),
        "ref_src_sha": sha256_of(task_dir / "reference.ts"),
        "evaluator_sha": evaluator_sha,
        "image_id": image,
    }


def stale_fields(recorded: dict, current: dict) -> list[str]:
    return [k for k in PROVENANCE_KEYS if recorded.get(k) != current[k]]


def reference_staleness(task_dir: Path, current: dict) -> list[str]:
    """Provenance fields a cached reference signature differs in; [] when fresh or not cached."""
    if not (task_dir / "reference.signature.json").exists():
        return []
    sidecar = task_dir / "reference.provenance.json"
    if not sidecar.exists():
        return ["no reference.provenance.json"]
    return stale_fields(json.loads(sidecar.read_text()), current)


def reference_signature(image: str, timeout_s: float, fn: str, task_dir: Path, provenance: dict,
                        rescore: bool) -> dict:
    path = task_dir / "reference.signature.json"
    if rescore or not path.exists():
        write_atomic(path, evaluate(image, timeout_s, fn, task_dir / "reference.ts", task_dir / "corpus.json"))
        write_atomic(task_dir / "reference.provenance.json", json.dumps(provenance) + "\n")
    signature = json.loads(path.read_text())
    if signature["load"] != "ok":
        raise HarnessError(f"{task_dir / 'reference.ts'} does not load")
    return signature


def score_run(image: str, timeout_s: float, fn: str, run_dir: Path, task_dir: Path, reference: dict,
              provenance: dict) -> str:
    signature_path = run_dir / "signature.json"
    impl = run_dir / "impl.ts"
    if not impl.exists():
        # A signature left from an earlier impl.ts would contradict the score.
        signature_path.unlink(missing_ok=True)
        score = not_evaluated("absent")
    else:
        stdout = evaluate(image, timeout_s, fn, impl, task_dir / "corpus.json")
        score = score_of(json.loads(stdout), reference, source_hash(image, timeout_s, impl))
        write_atomic(signature_path, stdout)
    # Written last: its presence is what marks a run as scored.
    write_atomic(run_dir / "score.json", json.dumps({**score, **provenance}) + "\n")
    return score["load"]


def run_function(run_dir: Path) -> str:
    result_path = run_dir / "result.json"
    fn = json.loads(result_path.read_text()).get("fn")
    if not isinstance(fn, str):
        raise HarnessError(f"{result_path} has no \"fn\"")
    return fn


def score_all(args: argparse.Namespace, runs_dir: Path, tasks_dir: Path, failures: list[str]) -> None:
    image = image_id()
    evaluator_sha = sha256_of(EVALUATOR)
    run_dirs = sorted(d for d in runs_dir.iterdir() if (d / "result.json").exists())
    fn_of: dict[Path, str] = {}
    for run_dir in run_dirs:
        try:
            fn_of[run_dir] = run_function(run_dir)
        except (HarnessError, json.JSONDecodeError) as error:
            failures.append(f"FAIL {run_dir.name}: {error}")

    provenance: dict[str, dict] = {}
    for fn in sorted(set(fn_of.values())):
        try:
            provenance[fn] = current_provenance(tasks_dir / fn, image, evaluator_sha)
        except HarnessError as error:
            failures.append(f"FAIL {fn}: {error}")
    fn_of = {d: fn for d, fn in fn_of.items() if fn in provenance}

    if not args.rescore:
        stale: list[str] = []
        for fn, current in provenance.items():
            fields = reference_staleness(tasks_dir / fn, current)
            if fields:
                stale.append(f"FAIL {fn} reference: {STALE} ({', '.join(fields)} changed)")
        for run_dir, fn in fn_of.items():
            if (run_dir / "score.json").exists():
                fields = stale_fields(json.loads((run_dir / "score.json").read_text()), provenance[fn])
                if fields:
                    stale.append(f"FAIL {run_dir.name}: {STALE} ({', '.join(fields)} changed)")
        if stale:
            failures.extend(stale)
            return

    pending = {d: fn for d, fn in fn_of.items() if args.rescore or not (d / "score.json").exists()}
    with ThreadPoolExecutor(max_workers=args.jobs) as pool:
        ref_futures = {
            fn: pool.submit(reference_signature, image, args.timeout, fn, tasks_dir / fn, provenance[fn], args.rescore)
            for fn in sorted(set(pending.values()))
        }
        references: dict[str, dict] = {}
        for fn, future in ref_futures.items():
            try:
                references[fn] = future.result()
            except (HarnessError, json.JSONDecodeError) as error:
                failures.append(f"FAIL {fn} reference: {error}")

        run_futures = {
            run_dir: pool.submit(score_run, image, args.timeout, fn, run_dir, tasks_dir / fn, references[fn],
                                 provenance[fn])
            for run_dir, fn in pending.items() if fn in references
        }
        for run_dir, future in run_futures.items():
            try:
                print(f"{future.result()} {run_dir.name}")
            except (HarnessError, json.JSONDecodeError) as error:
                failures.append(f"FAIL {run_dir.name}: {error}")
    print(f"{len(pending)} to score, {len(run_dirs) - len(pending)} cached")


def main(argv: list[str], runs_dir: Path, tasks_dir: Path) -> int:
    parser = argparse.ArgumentParser(description="Score every run dir that holds a result.json.")
    parser.add_argument("--rescore", action="store_true", help="evaluate again even where scores exist")
    parser.add_argument("--jobs", type=int, default=DEFAULT_JOBS, help="evaluations in parallel")
    parser.add_argument("--timeout", type=float, default=DEFAULT_TIMEOUT_S,
                        help="seconds one container may run before the run fails")
    args = parser.parse_args(argv)
    if not runs_dir.is_dir():
        print(f"FAIL {runs_dir} is not a directory", file=sys.stderr)
        return 1

    failures: list[str] = []
    try:
        score_all(args, runs_dir, tasks_dir, failures)
    except HarnessError as error:
        failures.append(f"FAIL {error}")
    finally:
        # Also reached when an unexpected exception aborts, which then propagates.
        for failure in failures:
            print(failure, file=sys.stderr)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main(
        sys.argv[1:],
        Path(os.environ.get("RUNS_DIR", ROOT / "runs")),
        Path(os.environ.get("TASKS_DIR", ROOT / "tasks")),
    ))
