#!/usr/bin/env python3
"""Score every run dir that holds a result.json.

Each run's impl.ts is evaluated over its function's corpus inside the
specdial-agent image with no network, so agent-written code never runs on the
host. Per run this writes
  runs/<id>/signature.json   evaluate.ts stdout, byte for byte (not written
                             when impl.ts is absent)
  runs/<id>/score.json       {"load", "hash", "agree_ref", "agree_frac",
                             "src_hash", "unsupported", "async_errors",
                             "late_async_errors"}
and per function tasks/<fn>/reference.signature.json. Existing files are kept
unless --rescore. A harness error (evaluate.ts exiting non-zero, a mount the
container cannot see) is reported naming the run and exits 1; it is never
written as a score.

src_hash is the sha256 of impl.ts after an esbuild transform that drops
comments and whitespace, so runs differing only in formatting share it. It is
null when impl.ts is absent or esbuild cannot parse it.

Usage: python3 score.py [--rescore] [--jobs N]
Env: RUNS_DIR, TASKS_DIR (defaults runs/ and tasks/, as in run.sh).
"""

import argparse
import hashlib
import json
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent
IMAGE = "specdial-agent"
DEFAULT_JOBS = 4
ENV = {**os.environ, "TZ": "UTC"}
# The minify script's exit code when esbuild rejects the source, as opposed to
# the script itself failing.
EXIT_UNPARSEABLE = 10

# A bind mount of a path the Colima VM cannot see is silently an empty
# directory, so every script first checks the files it needs are really there.
CHECK_VISIBLE = r"""
set -u
for path in "$@"; do
  test -r "$path" || { echo "scorer: $path is not visible inside the container" >&2; exit 3; }
done
work=$(mktemp -d)
ln -s /opt/deps/node_modules "$work/node_modules"
cd "$work" || exit 3
"""
EVALUATE_SCRIPT = CHECK_VISIBLE + 'exec npx --no tsx /repo/evaluate.ts "$2" "$3"\n'
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


def container(
    mounts: list[tuple[Path, str]], script: str, paths: list[str], env: dict[str, str] | None = None,
) -> subprocess.CompletedProcess:
    """Runs script in the image with paths as its arguments, each checked visible first."""
    for host, _ in mounts:
        if not host.is_dir():
            raise HarnessError(f"{host} is not a directory")
    cmd = [
        "docker", "run", "--rm", "--network", "none", "--user", "candidate",
        "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "-e", "TZ=UTC",
    ]
    for host, target in mounts:
        cmd += ["-v", f"{host}:{target}:ro"]
    for name, value in (env or {}).items():
        cmd += ["-e", f"{name}={value}"]
    cmd += [IMAGE, "sh", "-c", script, "sh", *paths]
    return subprocess.run(cmd, env=ENV, capture_output=True, text=True)


def evaluate(impl_dir: Path, impl_name: str, task_dir: Path) -> str:
    """evaluate.ts stdout for impl_dir/impl_name over task_dir/corpus.json."""
    impl = f"/impl/{impl_name}"
    proc = container(
        [(ROOT, "/repo"), (impl_dir, "/impl"), (task_dir, "/task")],
        EVALUATE_SCRIPT, ["/repo/evaluate.ts", impl, "/task/corpus.json"],
    )
    if proc.returncode != 0:
        raise HarnessError(f"evaluate.ts exited {proc.returncode}: {proc.stderr.strip()}")
    signature = json.loads(proc.stdout)
    if signature.get("load") not in ("ok", "noload"):
        raise HarnessError(f"evaluate.ts printed no load status: {proc.stdout.strip()}")
    return proc.stdout


def source_hash(run_dir: Path) -> str | None:
    proc = container([(run_dir, "/impl")], MINIFY_SCRIPT, ["/impl/impl.ts"], {"MINIFY_JS": MINIFY_JS})
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


def absent_or_noload(load: str, src_hash: str | None) -> dict:
    return {"load": load, "hash": None, "agree_ref": False, "agree_frac": None, "src_hash": src_hash,
            "unsupported": None, "async_errors": None, "late_async_errors": None}


def score_of(signature: dict, reference: dict, src_hash: str | None) -> dict:
    if signature["load"] == "noload":
        return absent_or_noload("noload", src_hash)
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
    }


def reference_signature(task_dir: Path, rescore: bool) -> dict:
    path = task_dir / "reference.signature.json"
    if rescore or not path.exists():
        path.write_text(evaluate(task_dir, "reference.ts", task_dir))
    signature = json.loads(path.read_text())
    if signature["load"] != "ok":
        raise HarnessError(f"{task_dir / 'reference.ts'} does not load")
    return signature


def score_run(run_dir: Path, task_dir: Path, reference: dict) -> str:
    signature_path = run_dir / "signature.json"
    if not (run_dir / "impl.ts").exists():
        # A signature left from an earlier impl.ts would contradict the score.
        signature_path.unlink(missing_ok=True)
        score = absent_or_noload("absent", None)
    else:
        stdout = evaluate(run_dir, "impl.ts", task_dir)
        score = score_of(json.loads(stdout), reference, source_hash(run_dir))
        signature_path.write_text(stdout)
    # Written last: its presence is what marks a run as scored.
    (run_dir / "score.json").write_text(json.dumps(score) + "\n")
    return score["load"]


def run_function(run_dir: Path) -> str:
    result_path = run_dir / "result.json"
    fn = json.loads(result_path.read_text()).get("fn")
    if not isinstance(fn, str):
        raise HarnessError(f"{result_path} has no \"fn\"")
    return fn


def main(argv: list[str], runs_dir: Path, tasks_dir: Path) -> int:
    parser = argparse.ArgumentParser(description="Score every run dir that holds a result.json.")
    parser.add_argument("--rescore", action="store_true", help="evaluate again even where scores exist")
    parser.add_argument("--jobs", type=int, default=DEFAULT_JOBS, help="evaluations in parallel")
    args = parser.parse_args(argv)
    if not runs_dir.is_dir():
        print(f"FAIL {runs_dir} is not a directory", file=sys.stderr)
        return 1

    run_dirs = sorted(d for d in runs_dir.iterdir() if (d / "result.json").exists())
    pending = [d for d in run_dirs if args.rescore or not (d / "score.json").exists()]
    failures: list[str] = []
    fn_of: dict[Path, str] = {}
    for run_dir in pending:
        try:
            fn_of[run_dir] = run_function(run_dir)
        except (HarnessError, json.JSONDecodeError) as error:
            failures.append(f"FAIL {run_dir.name}: {error}")

    with ThreadPoolExecutor(max_workers=args.jobs) as pool:
        fns = sorted(set(fn_of.values()))
        ref_futures = {fn: pool.submit(reference_signature, tasks_dir / fn, args.rescore) for fn in fns}
        references: dict[str, dict] = {}
        for fn, future in ref_futures.items():
            try:
                references[fn] = future.result()
            except (HarnessError, json.JSONDecodeError) as error:
                failures.append(f"FAIL {fn} reference: {error}")

        run_futures = {
            run_dir: pool.submit(score_run, run_dir, tasks_dir / fn, references[fn])
            for run_dir, fn in fn_of.items() if fn in references
        }
        for run_dir, future in run_futures.items():
            try:
                print(f"{future.result()} {run_dir.name}")
            except (HarnessError, json.JSONDecodeError) as error:
                failures.append(f"FAIL {run_dir.name}: {error}")

    for failure in failures:
        print(failure, file=sys.stderr)
    print(f"{len(pending)} to score, {len(run_dirs) - len(pending)} cached, {len(failures)} failed")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main(
        sys.argv[1:],
        Path(os.environ.get("RUNS_DIR", ROOT / "runs")),
        Path(os.environ.get("TASKS_DIR", ROOT / "tasks")),
    ))
