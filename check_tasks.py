#!/usr/bin/env python3
"""Refuse any task that breaks the rules before an agent is paid to attempt it.

A task passes when:
  - it has every file the runner and scorer read
  - the corpus has at least 40 hand-written and 500 generated inputs, and no
    hand-written input is labelled "generated"
  - no corpus string of 6 or more characters appears verbatim in a file an
    agent can see, so no visible file hands out a scored input
  - the reference loads, passes every visible test, and the stub passes none
  - buggy.ts and reference.ts produce different signature hashes over the
    corpus, so the planted bug is observable

Each task reports its first broken rule, cheapest checks first.

Usage: python3 check_tasks.py [<fn> ...]   (default: every task)
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
FILES = [
    "reference.ts", "buggy.ts", "stub.ts", "spec.md", "meta.json", "ticket.md",
    "examples.test.ts", "properties.test.ts", "gen.ts", "corpus.json",
]
VISIBLE = ["ticket.md", "examples.test.ts", "spec.md", "properties.test.ts"]
MIN_HAND_WRITTEN = 40
MIN_GENERATED = 500
MIN_LEAK_LENGTH = 6
ENV = {**os.environ, "TZ": "UTC"}


def strings_in(value) -> list[str]:
    if isinstance(value, str):
        return [value]
    if isinstance(value, list):
        return [s for v in value for s in strings_in(v)]
    if isinstance(value, dict):
        return [s for v in value.values() for s in strings_in(v)]
    return []


def evaluate(impl: Path, corpus: Path) -> dict:
    result = subprocess.run(
        ["npx", "tsx", "evaluate.ts", str(impl), str(corpus)],
        cwd=ROOT, env=ENV, capture_output=True, text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"evaluate.ts failed on {impl}: {result.stderr.strip()}")
    return json.loads(result.stdout)


def visible_test_outcomes(fn: str, task: Path, impl: Path) -> list[tuple[str, str, bool]]:
    """(task file, test name, passed) for every visible test, run as the L3 work dir lays them out."""
    as_run = {f"{fn}.test.ts": "examples.test.ts", f"{fn}.properties.test.ts": "properties.test.ts"}
    d = Path(tempfile.mkdtemp(prefix="check_tasks-"))
    try:
        (d / "node_modules").symlink_to(ROOT / "node_modules")
        (d / "package.json").write_text('{"type": "module"}\n')
        (d / "src").mkdir()
        shutil.copy(impl, d / "src" / f"{fn}.ts")
        for run_name, task_name in as_run.items():
            shutil.copy(task / task_name, d / "src" / run_name)
        report = d / "report.json"
        result = subprocess.run(
            ["npx", "vitest", "run", "--reporter=json", f"--outputFile={report}"],
            cwd=d, env=ENV, capture_output=True, text=True,
        )
        if not report.exists():
            raise RuntimeError(f"vitest wrote no report for {impl}: {result.stderr.strip()}")
        outcomes = []
        for file_result in json.loads(report.read_text())["testResults"]:
            task_name = as_run[Path(file_result["name"]).name]
            tests = file_result["assertionResults"]
            if not tests:
                # The file itself failed (for example an import error), so none of its tests ran.
                first_line = file_result.get("message", "").strip().splitlines()[:1]
                outcomes.append((task_name, f"file did not run ({''.join(first_line)})", False))
            for t in tests:
                outcomes.append((task_name, t["fullName"], t["status"] == "passed"))
        return outcomes
    finally:
        shutil.rmtree(d, ignore_errors=True)


def check(task: Path) -> str | None:
    fn = task.name
    missing = [f for f in FILES if not (task / f).exists()]
    if missing:
        return f"missing {', '.join(missing)}"

    inputs = json.loads((task / "corpus.json").read_text())["inputs"]
    hand_written = [i for i in inputs if i["id"].startswith("h")]
    for i in hand_written:
        if i["category"] == "generated":
            return f"hand-written input {i['id']} has category generated"
    generated = sum(i["category"] == "generated" for i in inputs)
    if generated < MIN_GENERATED:
        return f"corpus has {generated} generated inputs, needs {MIN_GENERATED}"
    if len(hand_written) < MIN_HAND_WRITTEN:
        return f"corpus has {len(hand_written)} hand-written inputs, needs {MIN_HAND_WRITTEN}"

    visible = {name: (task / name).read_text() for name in VISIBLE}
    for i in inputs:
        for s in strings_in(i["args"]):
            if len(s) < MIN_LEAK_LENGTH:
                continue
            for name, text in visible.items():
                if s in text:
                    return f"corpus input {i['id']} string {json.dumps(s)} appears in {name}"

    reference = evaluate(task / "reference.ts", task / "corpus.json")
    if reference["load"] != "ok":
        return "reference does not load"

    for name, test, passed in visible_test_outcomes(fn, task, task / "reference.ts"):
        if not passed:
            return f"reference fails {name}: {test}"
    for name, test, passed in visible_test_outcomes(fn, task, task / "stub.ts"):
        if passed:
            return f"stub passes {name}: {test}"

    if evaluate(task / "buggy.ts", task / "corpus.json")["hash"] == reference["hash"]:
        return "buggy and reference have the same signature hash"
    return None


def main(argv: list[str], tasks_root: Path) -> int:
    tasks = argv or sorted(p.name for p in tasks_root.iterdir() if p.is_dir())
    failed = False
    for task in tasks:
        reason = check(tasks_root / task)
        failed |= reason is not None
        print(f"FAIL {task}: {reason}" if reason else f"ok {task}", flush=True)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:], ROOT / "tasks"))
