"""Analyses the hand-built runs under test/fixtures/analyze/{runs,tasks}.

toCsv L0 sonnet: r1-r4 share hash H1 (the reference; r2 is_error with its impl
kept, r3 with async errors), r5 hash H2 (differs from H1 on the one "quoted"
input, with an $unsupported output), r6 does not load. r7 is contaminated and
r8 errored without an impl, so both are excluded; r7's outputs also differ on
a "plain" input, which must not show up anywhere.
toCsv L0 opus: r1, r2 both H2.
parseEnv L0: sonnet r1 hash P1, codex r1 hash P2 (differs on the "comment"
input), codex r2 excluded for fetching a URL. Codex reports no cost.

Every expected value below is worked out by hand from those runs.

Usage: python3 -m unittest test_analyze
"""

import contextlib
import io
import json
import math
import shutil
import tempfile
import unittest
from pathlib import Path

import analyze

FIXTURE = Path(__file__).resolve().parent / "test" / "fixtures" / "analyze"


def run_analyze(runs_dir: Path, tasks_dir: Path) -> tuple[int, str, str, dict | None]:
    out, err = io.StringIO(), io.StringIO()
    with tempfile.TemporaryDirectory() as tmp:
        json_path = Path(tmp) / "out.json"
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            status = analyze.main(["--json", str(json_path)], runs_dir, tasks_dir)
        report = json.loads(json_path.read_text()) if json_path.exists() else None
    return status, out.getvalue(), err.getvalue(), report


class FixtureAnalysis(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.status, cls.stdout, cls.stderr, cls.report = run_analyze(FIXTURE / "runs", FIXTURE / "tasks")

    def cell(self, fn: str, level: str, agent: str) -> dict:
        return next(c for c in self.report["cells"] if (c["fn"], c["level"], c["agent"]) == (fn, level, agent))

    def pooled(self, fn: str, level: str) -> dict:
        return next(c for c in self.report["pooled"] if (c["fn"], c["level"]) == (fn, level))

    def test_analysis_succeeds(self):
        self.assertEqual(self.status, 0, self.stderr)

    def test_cell_counts_the_runs_left_after_exclusion(self):
        self.assertEqual(self.cell("toCsv", "L0", "sonnet")["n"], 6)

    def test_distinct_behaviours_count_noload_as_one_class(self):
        c = self.cell("toCsv", "L0", "sonnet")
        self.assertEqual((c["k"], c["noload"], c["absent"]), (3, 1, 0))

    def test_effective_behaviours_is_exp_of_the_shannon_entropy(self):
        expected = math.exp(-(4 / 6 * math.log(4 / 6) + 2 * (1 / 6 * math.log(1 / 6))))
        self.assertAlmostEqual(self.cell("toCsv", "L0", "sonnet")["effective"], expected)

    def test_modal_share_is_the_largest_class_over_n(self):
        self.assertAlmostEqual(self.cell("toCsv", "L0", "sonnet")["modal_share"], 4 / 6)

    def test_agreement_with_reference_counts_runs_and_averages_loaded_runs(self):
        c = self.cell("toCsv", "L0", "sonnet")
        self.assertEqual(c["agree_ref"], 4)
        self.assertAlmostEqual(c["mean_agree_frac"], (4 + 2 / 3) / 5)

    def test_distinct_source_hashes_include_the_run_that_did_not_load(self):
        self.assertEqual(self.cell("toCsv", "L0", "sonnet")["distinct_src"], 4)

    def test_errored_run_with_an_impl_is_kept_and_counted(self):
        self.assertEqual(self.cell("toCsv", "L0", "sonnet")["is_error"], 1)

    def test_runs_with_unsupported_outputs_and_async_errors_are_flagged(self):
        c = self.cell("toCsv", "L0", "sonnet")
        self.assertEqual((c["unsupported_runs"], c["async_error_runs"]), (1, 1))

    def test_disagreeing_categories_are_those_where_loaded_runs_differ(self):
        self.assertEqual(self.cell("toCsv", "L0", "sonnet")["disagreeing"], ["quoted"])

    def test_distinct_outputs_are_reported_per_category(self):
        self.assertEqual(self.cell("toCsv", "L0", "sonnet")["categories"], {"plain": 1, "quoted": 2})

    def test_cell_where_every_run_agrees_has_no_disagreeing_category(self):
        c = self.cell("toCsv", "L0", "opus")
        self.assertEqual((c["n"], c["k"], c["effective"], c["disagreeing"]), (2, 1, 1.0, []))

    def test_pooled_row_combines_every_agent_for_the_function_and_level(self):
        p = self.pooled("toCsv", "L0")
        expected = math.exp(-(4 / 8 * math.log(4 / 8) + 3 / 8 * math.log(3 / 8) + 1 / 8 * math.log(1 / 8)))
        self.assertEqual((p["n"], p["k"], p["distinct_src"]), (8, 3, 5))
        self.assertAlmostEqual(p["effective"], expected)
        self.assertAlmostEqual(p["modal_share"], 4 / 8)

    def test_level_row_takes_median_k_and_mean_effective_across_functions(self):
        to_csv = math.exp(-(4 / 8 * math.log(4 / 8) + 3 / 8 * math.log(3 / 8) + 1 / 8 * math.log(1 / 8)))
        level = next(r for r in self.report["levels"] if r["level"] == "L0")
        self.assertEqual((level["functions"], level["n"], level["median_k"]), (2, 10, 2.5))
        self.assertAlmostEqual(level["mean_effective"], (to_csv + 2) / 2)

    def test_contaminated_fetching_and_implless_errored_runs_are_excluded_with_reasons(self):
        self.assertEqual(self.report["excluded"], [
            {"run": "parseEnv__L0__codex__r2", "reason": "external_fetches: https://example.com"},
            {"run": "toCsv__L0__sonnet__r7", "reason": "contamination: reference.ts"},
            {"run": "toCsv__L0__sonnet__r8", "reason": "is_error with no impl"},
        ])

    def test_printed_report_names_each_excluded_run(self):
        for run in ("parseEnv__L0__codex__r2", "toCsv__L0__sonnet__r7", "toCsv__L0__sonnet__r8"):
            self.assertIn(run, self.stdout)

    def test_cost_is_totalled_per_agent_over_every_run(self):
        cost = {row["agent"]: row for row in self.report["cost"]}
        self.assertAlmostEqual(cost["sonnet"]["total_usd"], 1.15)
        self.assertAlmostEqual(cost["opus"]["total_usd"], 1.0)

    def test_agent_that_reports_no_cost_has_no_total(self):
        codex = next(row for row in self.report["cost"] if row["agent"] == "codex")
        self.assertEqual((codex["total_usd"], codex["runs_without_cost"]), (None, 2))

    def test_cells_are_ordered_by_function_level_then_agent(self):
        order = [(c["fn"], c["agent"]) for c in self.report["cells"]]
        self.assertEqual(order, [("parseEnv", "sonnet"), ("parseEnv", "codex"), ("toCsv", "sonnet"), ("toCsv", "opus")])


class UnscoredRun(unittest.TestCase):
    def test_run_without_a_score_fails_naming_it(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "analyze"
            shutil.copytree(FIXTURE, root)
            (root / "runs" / "toCsv__L0__opus__r1" / "score.json").unlink()
            status, _, stderr, report = run_analyze(root / "runs", root / "tasks")
        self.assertEqual(status, 1)
        self.assertIn("toCsv__L0__opus__r1", stderr)
        self.assertIsNone(report)


if __name__ == "__main__":
    unittest.main()
