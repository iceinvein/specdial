#!/usr/bin/env python3
"""Summarise the scored runs: how many distinct behaviours each cell produced.

A run's behaviour class is its signature hash when its impl loads, and the
single classes NOLOAD and ABSENT otherwise. Per (fn, level, agent) cell, per
(fn, level) pooled over agents, and per level across functions, this prints
  N              runs counted
  loaded         runs whose impl loaded
  k              distinct behaviour classes (NOLOAD and ABSENT one each)
  eff            effective behaviours, exp of the Shannon entropy of the classes
  modal          share of runs in the largest class
  ref, ref/N     runs whose signature equals the reference's, as a count and
                 as a share of N
  frac           mean agree_frac over the runs that loaded
  src            distinct src_hash values
  err            runs with is_error kept because they left an impl
  tout           runs whose agent session timed out (kept: the impl it left is
                 still what the agent produced)
  tmo            runs with an input that timed out; a flaky TIMEOUT adds a class
  crash          runs with an input whose evaluator worker crashed (a CRASH
                 output in signature.json)
  unsup, async   runs with unsupported > 0 and with async_errors > 0; an
                 $unsupported output can make different behaviours share a hash
and, per cell, the corpus categories on which loaded runs disagree with the
number of distinct outputs each category saw. A run with contamination or
external fetches, or one that errored without leaving an impl, is excluded
from every number and listed with its reason. A run whose impl was refused on
copy-back (a link out of the work dir, not a regular file) is kept as ABSENT
and listed with the reason. The per-level row takes median k and mean eff
only over pooled rows with a loaded run, and says how many it left out. Cost is totalled per agent over
every run, excluded ones included, since the money was spent either way.

Every score must come from the current tasks/<fn>/corpus.json and
tasks/<fn>/reference.ts (its corpus_sha and ref_src_sha), the current
evaluate.ts (its evaluator_sha) and one image; otherwise this fails naming the
runs.

--include-excluded computes every number with the excluded runs kept, to show
how much the exclusions move them; the excluded runs are still listed.

Usage: python3 analyze.py [--json out.json] [--include-excluded]
Env: RUNS_DIR, TASKS_DIR, EVALUATOR (defaults runs/, tasks/ and evaluate.ts,
as in score.py).
"""

import argparse
import hashlib
import json
import math
import os
import statistics
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent
FUNCTIONS = ["parseEnv", "toCsv", "globToRegex", "safeFilename", "formatDuration"]
LEVELS = ["L0", "L1", "L2", "L3"]
AGENTS = ["sonnet", "opus", "codex"]
PROVENANCE_KEYS = ["corpus_sha", "ref_src_sha", "evaluator_sha", "image_id"]


class AnalysisError(Exception):
    pass


def read_json(path: Path):
    try:
        return json.loads(path.read_text())
    except FileNotFoundError:
        raise AnalysisError(f"{path} is missing") from None
    except json.JSONDecodeError as error:
        raise AnalysisError(f"{path} is not JSON: {error}") from None


def refusal(result: dict) -> str | None:
    """Why run.sh refused to copy back an impl that was there; None when there was none to copy."""
    reason = result["impl_refused"]
    return None if reason == f"src/{result['fn']}.ts does not exist" else reason


def exclusion_reason(result: dict) -> str | None:
    if result["contamination"]:
        return "contamination: " + ", ".join(result["contamination"])
    if result["external_fetches"]:
        return "external_fetches: " + ", ".join(result["external_fetches"])
    if result["is_error"] and not result["impl_present"] and refusal(result) is None:
        return "is_error with no impl"
    return None


def load_run(run_dir: Path) -> dict:
    result = read_json(run_dir / "result.json")
    score = read_json(run_dir / "score.json")
    try:
        run = {
            "id": run_dir.name, "fn": result["fn"], "level": result["level"], "agent": result["agent"],
            "cost_usd": result["cost_usd"], "is_error": result["is_error"], "reason": exclusion_reason(result),
            "timed_out": result["timed_out"],
            "refused": refusal(result),
            "load": score["load"], "hash": score["hash"], "agree_ref": score["agree_ref"],
            "agree_frac": score["agree_frac"], "src_hash": score["src_hash"],
            "unsupported": score["unsupported"], "async_errors": score["async_errors"],
            "late_async_errors": score["late_async_errors"], "timeouts": score["timeouts"],
            **{key: score[key] for key in PROVENANCE_KEYS},
        }
    except KeyError as error:
        raise AnalysisError(f"{run_dir.name}: result.json or score.json has no {error}") from None
    for field, allowed in (("fn", FUNCTIONS), ("level", LEVELS), ("agent", AGENTS), ("load", ["ok", "noload", "absent"])):
        if run[field] not in allowed:
            raise AnalysisError(f"{run_dir.name}: unknown {field} {run[field]!r}")
    run["outputs"] = read_json(run_dir / "signature.json")["outputs"] if run["load"] == "ok" else None
    return run


def sha256_of(path: Path) -> str:
    if not path.is_file():
        raise AnalysisError(f"{path} is missing")
    return hashlib.sha256(path.read_bytes()).hexdigest()


def provenance_problems(runs: list[dict], tasks_dir: Path, evaluator: Path) -> list[str]:
    problems = []
    fns = sorted({r["fn"] for r in runs})
    for key, filename in (("corpus_sha", "corpus.json"), ("ref_src_sha", "reference.ts")):
        current = {fn: sha256_of(tasks_dir / fn / filename) for fn in fns}
        stale = [r["id"] for r in runs if r[key] != current[r["fn"]]]
        if stale:
            problems.append(f"{key} differs from the current {filename} for {', '.join(stale)}")
    evaluator_sha = sha256_of(evaluator)
    stale = [r["id"] for r in runs if r["evaluator_sha"] != evaluator_sha]
    if stale:
        problems.append(f"evaluator_sha differs from the current {evaluator.name} for {', '.join(stale)}")
    by_image: dict[str, list[str]] = {}
    for r in runs:
        by_image.setdefault(r["image_id"], []).append(r["id"])
    if len(by_image) > 1:
        groups = "; ".join(f"{value}: {', '.join(ids)}" for value, ids in by_image.items())
        problems.append(f"image_id differs across runs, {groups}")
    return problems


def behaviour(run: dict) -> str:
    return run["hash"] if run["load"] == "ok" else run["load"].upper()


def category_outputs(runs: list[dict], categories: list[str]) -> dict[str, int]:
    """Distinct outputs per category, in corpus order, counting a run's outputs over the category's inputs as one."""
    seen: dict[str, set[str]] = {c: set() for c in categories}
    for run in runs:
        if run["outputs"] is None:
            continue
        if len(run["outputs"]) != len(categories):
            raise AnalysisError(f"{run['id']}: {len(run['outputs'])} outputs but the corpus has {len(categories)} inputs")
        by_category: dict[str, list] = {c: [] for c in categories}
        for category, output in zip(categories, run["outputs"]):
            by_category[category].append(output)
        for category, outputs in by_category.items():
            # Compared as JSON text: in Python True == 1, in the signature they differ.
            seen[category].add(json.dumps(outputs, sort_keys=True))
    return {c: len(s) for c, s in seen.items()}


def summarise(runs: list[dict], categories: list[str]) -> dict:
    n = len(runs)
    classes = Counter(behaviour(r) for r in runs)
    entropy = -sum(count / n * math.log(count / n) for count in classes.values())
    loaded_fracs = [r["agree_frac"] for r in runs if r["load"] == "ok"]
    per_category = category_outputs(runs, categories)
    return {
        "n": n,
        "loaded": len(loaded_fracs),
        "k": len(classes),
        "noload": classes["NOLOAD"],
        "absent": classes["ABSENT"],
        "effective": math.exp(entropy),
        "modal_share": max(classes.values()) / n,
        "agree_ref": sum(1 for r in runs if r["agree_ref"]),
        "agree_ref_share": sum(1 for r in runs if r["agree_ref"]) / n,
        "mean_agree_frac": statistics.fmean(loaded_fracs) if loaded_fracs else None,
        "distinct_src": len({r["src_hash"] for r in runs if r["src_hash"] is not None}),
        "is_error": sum(1 for r in runs if r["is_error"]),
        "timed_out": sum(1 for r in runs if r["timed_out"]),
        "timeout_runs": sum(1 for r in runs if r["timeouts"]),
        "crash_runs": sum(1 for r in runs if r["outputs"] is not None and "CRASH" in r["outputs"]),
        "late_async_runs": sum(1 for r in runs if r["late_async_errors"]),
        "unsupported_runs": sum(1 for r in runs if r["unsupported"]),
        "async_error_runs": sum(1 for r in runs if r["async_errors"]),
        "disagreeing": [c for c, count in per_category.items() if count > 1],
        "categories": per_category,
    }


def corpus_categories(tasks_dir: Path, fn: str) -> list[str]:
    corpus = read_json(tasks_dir / fn / "corpus.json")
    return [entry["category"] for entry in corpus["inputs"]]


def analyse(runs: list[dict], tasks_dir: Path, include_excluded: bool) -> dict:
    included = runs if include_excluded else [r for r in runs if r["reason"] is None]
    cells, pooled, levels = [], [], []
    for fn in FUNCTIONS:
        fn_runs = [r for r in included if r["fn"] == fn]
        if not fn_runs:
            continue
        categories = corpus_categories(tasks_dir, fn)
        for level in LEVELS:
            level_runs = [r for r in fn_runs if r["level"] == level]
            if not level_runs:
                continue
            for agent in AGENTS:
                cell_runs = [r for r in level_runs if r["agent"] == agent]
                if cell_runs:
                    cells.append({"fn": fn, "level": level, "agent": agent, **summarise(cell_runs, categories)})
            pooled.append({"fn": fn, "level": level, **summarise(level_runs, categories)})
    for level in LEVELS:
        rows = [p for p in pooled if p["level"] == level]
        # A row with no loaded run reads as k=1 or 2 whatever the agents wrote.
        measured = [p for p in rows if p["loaded"] > 0]
        if rows:
            levels.append({
                "level": level,
                "functions": len(measured),
                "left_out": len(rows) - len(measured),
                "n": sum(p["n"] for p in rows),
                "median_k": float(statistics.median(p["k"] for p in measured)) if measured else None,
                "mean_effective": statistics.fmean(p["effective"] for p in measured) if measured else None,
                "agree_ref": sum(p["agree_ref"] for p in rows),
                "noload": sum(p["noload"] for p in rows),
                "absent": sum(p["absent"] for p in rows),
            })
    cost = []
    for agent in AGENTS:
        agent_runs = [r for r in runs if r["agent"] == agent]
        if not agent_runs:
            continue
        known = [r["cost_usd"] for r in agent_runs if r["cost_usd"] is not None]
        cost.append({
            "agent": agent,
            "runs": len(agent_runs),
            "total_usd": sum(known) if known else None,
            "runs_without_cost": len(agent_runs) - len(known),
        })
    excluded = [{"run": r["id"], "reason": r["reason"]} for r in runs if r["reason"] is not None]
    refused = [{"run": r["id"], "reason": r["refused"]} for r in included if r["refused"] is not None]
    return {"include_excluded": include_excluded, "cells": cells, "pooled": pooled, "levels": levels,
            "excluded": excluded, "refused": refused, "cost": cost}


def fmt(value, digits: int = 2) -> str:
    if value is None:
        return "-"
    if isinstance(value, float):
        return f"{value:.{digits}f}"
    return str(value)


COLUMNS = ["n", "loaded", "k", "noload", "absent", "effective", "modal_share", "agree_ref", "agree_ref_share",
           "mean_agree_frac", "distinct_src", "is_error", "timed_out", "timeout_runs", "crash_runs",
           "unsupported_runs", "async_error_runs"]
HEADERS = ["N", "loaded", "k", "noload", "absent", "eff", "modal", "ref", "ref/N", "frac", "src", "err", "tout",
           "tmo", "crash", "unsup", "async"]


def table(rows: list[list[str]]) -> str:
    widths = [max(len(row[i]) for row in rows) for i in range(len(rows[0]))]
    return "\n".join("  ".join(cell.ljust(w) for cell, w in zip(row, widths)).rstrip() for row in rows)


def ordered_rows(report: dict):
    """Each (fn, level)'s cells followed by its pooled row, as (fn, level, agent label, row)."""
    for fn in FUNCTIONS:
        for level in LEVELS:
            for c in report["cells"]:
                if (c["fn"], c["level"]) == (fn, level):
                    yield fn, level, c["agent"], c
            for p in report["pooled"]:
                if (p["fn"], p["level"]) == (fn, level):
                    yield fn, level, "pooled", p


def print_report(report: dict) -> None:
    rows = [["fn", "level", "agent", *HEADERS]]
    rows += [[fn, level, agent, *(fmt(c[k]) for k in COLUMNS)] for fn, level, agent, c in ordered_rows(report)]
    print(table(rows))

    print("\nPer level, across functions")
    print("median k and mean eff over the pooled rows with a loaded run; left out: rows with none")
    level_rows = [["level", "functions", "left out", "N", "median k", "mean eff", "ref", "noload", "absent"]]
    for row in report["levels"]:
        level_rows.append([row["level"], *(fmt(row[k]) for k in ("functions", "left_out", "n", "median_k",
                           "mean_effective", "agree_ref", "noload", "absent"))])
    print(table(level_rows))

    print("\nCategories where loaded runs disagree (distinct outputs)")
    for fn, level, agent, c in ordered_rows(report):
        listed = ", ".join(f"{cat} ({c['categories'][cat]})" for cat in c["disagreeing"]) or "none"
        print(f"  {fn} {level} {agent}: {listed}")

    print("\nExcluded runs, kept by --include-excluded" if report["include_excluded"] else "\nExcluded runs")
    for row in report["excluded"]:
        print(f"  {row['run']}: {row['reason']}")
    if not report["excluded"]:
        print("  none")

    print("\nRefused copy-back (kept as ABSENT)")
    for row in report["refused"]:
        print(f"  {row['run']}: {row['reason']}")
    if not report["refused"]:
        print("  none")

    print("\nCost by agent")
    for row in report["cost"]:
        total = f"${row['total_usd']:.2f}" if row["total_usd"] is not None else "unknown"
        print(f"  {row['agent']}: {total} over {row['runs']} runs, {row['runs_without_cost']} without a cost")


def main(argv: list[str], runs_dir: Path, tasks_dir: Path, evaluator: Path) -> int:
    parser = argparse.ArgumentParser(description="Summarise the scored runs.")
    parser.add_argument("--json", type=Path, help="also write the numbers as JSON to this path")
    parser.add_argument("--include-excluded", action="store_true",
                        help="keep the excluded runs in every number, to see what the exclusions change")
    args = parser.parse_args(argv)
    if not runs_dir.is_dir():
        print(f"FAIL {runs_dir} is not a directory", file=sys.stderr)
        return 1

    run_dirs = sorted(d for d in runs_dir.iterdir() if (d / "result.json").exists())
    unscored = [d.name for d in run_dirs if not (d / "score.json").exists()]
    if unscored:
        print(f"FAIL {len(unscored)} runs have no score.json, run score.py first: {', '.join(unscored)}",
              file=sys.stderr)
        return 1
    try:
        runs = [load_run(d) for d in run_dirs]
        problems = provenance_problems(runs, tasks_dir, evaluator)
        if problems:
            for problem in problems:
                print(f"FAIL {problem}", file=sys.stderr)
            return 1
        report = analyse(runs, tasks_dir, args.include_excluded)
    except AnalysisError as error:
        print(f"FAIL {error}", file=sys.stderr)
        return 1

    print_report(report)
    if args.json:
        args.json.write_text(json.dumps(report, indent=2) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main(
        sys.argv[1:],
        Path(os.environ.get("RUNS_DIR", ROOT / "runs")),
        Path(os.environ.get("TASKS_DIR", ROOT / "tasks")),
        Path(os.environ.get("EVALUATOR", ROOT / "evaluate.ts")),
    ))
