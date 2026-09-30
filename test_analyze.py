"""Analyses the hand-built runs under test/fixtures/analyze/{runs,tasks}.

toCsv L0 sonnet: r1-r4 share hash H1 (the reference; r2 is_error with its impl
kept, r3 with async errors), r5 hash H2 (differs from H1 on the one "quoted"
input, with an $unsupported output), r6 does not load. r7 is contaminated and
r8 errored without an impl, so both are excluded; r7's outputs also differ on
a "plain" input, which must not show up anywhere.
toCsv L0 opus: r1, r2 both H2.
parseEnv L0: sonnet r1 hash P1, codex r1 hash P2 (differs on the "comment"
input), codex r2 excluded for fetching a URL. Codex reports no cost.
toCsv L1 codex: r1 is kept with a late async error; r2's one fetch is
`npx tsc`, and any recorded fetch excludes a run.
toCsv L1 opus: r1 hash H1T, one output a TIMEOUT, one late async error, and
its session timed out (is_error) but left an impl, so it is kept.
parseEnv L1 sonnet: r1 does not load, r2 left no impl and did not error, so
it is kept as ABSENT; r2 also has no cost. parseEnv L1 opus: r1's impl was a
link outside the work dir, a refused copy-back kept as ABSENT. No parseEnv L1
run loads, so that pooled row stays out of the L1 median and mean.
Every score carries provenance matching the fixture corpora.

Every expected value below is worked out by hand from those runs.

Usage: python3 -m unittest test_analyze
"""

import contextlib
import io
import json
import math
import re
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
        self.assertEqual((level["functions"], level["left_out"], level["n"], level["median_k"]), (2, 0, 10, 2.5))
        self.assertAlmostEqual(level["mean_effective"], (to_csv + 2) / 2)

    def test_level_row_sums_reference_agreement_noload_and_absent_across_functions(self):
        level = next(r for r in self.report["levels"] if r["level"] == "L1")
        # parseEnv L1: 1 noload, 2 absent; toCsv L1: codex r1 agrees with the reference.
        self.assertEqual((level["n"], level["agree_ref"], level["noload"], level["absent"]), (5, 1, 1, 2))

    def test_level_row_leaves_out_pooled_rows_with_no_loaded_run(self):
        level = next(r for r in self.report["levels"] if r["level"] == "L1")
        # Only toCsv L1 (H1 and H1T, one each) counts; parseEnv L1 would pull the mean to 1.94.
        self.assertEqual((level["functions"], level["left_out"], level["median_k"]), (1, 1, 2.0))
        self.assertAlmostEqual(level["mean_effective"], 2.0)

    def test_kept_absent_run_is_its_own_class_apart_from_noload(self):
        c = self.cell("parseEnv", "L1", "sonnet")
        self.assertEqual((c["n"], c["loaded"], c["k"], c["noload"], c["absent"]), (2, 0, 2, 1, 1))

    def test_mean_agree_frac_is_none_when_no_run_loaded(self):
        self.assertIsNone(self.cell("parseEnv", "L1", "sonnet")["mean_agree_frac"])

    def test_null_source_hash_is_not_counted_as_a_distinct_source(self):
        self.assertEqual(self.cell("parseEnv", "L1", "sonnet")["distinct_src"], 1)

    def test_loaded_counts_runs_whose_impl_loaded(self):
        self.assertEqual(self.cell("toCsv", "L0", "sonnet")["loaded"], 5)

    def test_reference_agreement_is_also_reported_as_a_share_of_n(self):
        self.assertAlmostEqual(self.pooled("toCsv", "L0")["agree_ref_share"], 4 / 8)

    def test_pooled_categories_for_parse_env_l0_show_the_comment_input_split(self):
        p = self.pooled("parseEnv", "L0")
        self.assertEqual((p["categories"], p["disagreeing"]), ({"basic": 1, "comment": 2}, ["comment"]))

    def test_runs_with_timed_out_inputs_late_async_errors_and_timed_out_sessions_are_flagged(self):
        c = self.cell("toCsv", "L1", "opus")
        self.assertEqual((c["n"], c["timeout_runs"], c["late_async_runs"], c["timed_out"], c["is_error"]),
                         (1, 1, 1, 1, 1))

    def test_timed_out_inputs_and_late_async_errors_are_counted_apart(self):
        p = self.pooled("toCsv", "L1")
        self.assertEqual((p["timeout_runs"], p["late_async_runs"]), (1, 2))

    def test_refused_copy_back_is_kept_as_absent_and_listed_with_its_reason(self):
        c = self.cell("parseEnv", "L1", "opus")
        self.assertEqual((c["n"], c["absent"]), (1, 1))
        self.assertEqual(self.report["refused"], [
            {"run": "parseEnv__L1__opus__r1", "reason": "src/parseEnv.ts resolves outside the work dir, to /etc/passwd"},
        ])

    def printed_row(self, header_start: str, row_start: str) -> dict[str, str]:
        lines = self.stdout.splitlines()
        header = next(line for line in lines if line.startswith(header_start))
        row = next(line for line in lines if line.startswith(row_start))
        # Headers may hold one space ("median k"); columns are two or more apart.
        return dict(zip(re.split(r"\s{2,}", header), row.split()))

    def test_printed_table_row_puts_each_value_under_its_header(self):
        self.assertEqual(self.printed_row("fn ", "toCsv     L0     sonnet"), {
            "fn": "toCsv", "level": "L0", "agent": "sonnet", "N": "6", "loaded": "5", "k": "3", "noload": "1",
            "absent": "0", "eff": "2.38", "modal": "0.67", "ref": "4", "ref/N": "0.67", "frac": "0.93", "src": "4",
            "err": "1", "tout": "0", "tmo": "0", "unsup": "1", "async": "1",
        })

    def test_printed_level_row_shows_median_k_with_two_decimals(self):
        row = self.printed_row("level ", "L1 ")
        self.assertEqual((row["median k"], row["left out"]), ("2.00", "1"))

    def test_contaminated_fetching_and_implless_errored_runs_are_excluded_with_reasons(self):
        self.assertEqual(self.report["excluded"], [
            {"run": "parseEnv__L0__codex__r2", "reason": "external_fetches: https://example.com"},
            {"run": "toCsv__L0__sonnet__r7", "reason": "contamination: reference.ts"},
            {"run": "toCsv__L0__sonnet__r8", "reason": "is_error with no impl"},
            {"run": "toCsv__L1__codex__r2", "reason": "external_fetches: npx tsc"},
        ])

    def test_printed_report_names_each_excluded_run(self):
        for run in ("parseEnv__L0__codex__r2", "toCsv__L0__sonnet__r7", "toCsv__L0__sonnet__r8"):
            self.assertIn(run, self.stdout)

    def test_cost_is_totalled_per_agent_over_every_run(self):
        cost = {row["agent"]: row for row in self.report["cost"]}
        self.assertAlmostEqual(cost["opus"]["total_usd"], 1.90)
        self.assertEqual(cost["opus"]["runs_without_cost"], 0)

    def test_agent_with_some_unknown_costs_totals_the_known_ones_and_counts_the_rest(self):
        sonnet = next(row for row in self.report["cost"] if row["agent"] == "sonnet")
        self.assertAlmostEqual(sonnet["total_usd"], 1.35)
        self.assertEqual((sonnet["runs"], sonnet["runs_without_cost"]), (11, 1))

    def test_agent_that_reports_no_cost_has_no_total(self):
        codex = next(row for row in self.report["cost"] if row["agent"] == "codex")
        self.assertEqual((codex["total_usd"], codex["runs_without_cost"]), (None, 4))

    def test_cells_are_ordered_by_function_level_then_agent(self):
        order = [(c["fn"], c["level"], c["agent"]) for c in self.report["cells"]]
        self.assertEqual(order, [
            ("parseEnv", "L0", "sonnet"), ("parseEnv", "L0", "codex"), ("parseEnv", "L1", "sonnet"),
            ("parseEnv", "L1", "opus"), ("toCsv", "L0", "sonnet"), ("toCsv", "L0", "opus"),
            ("toCsv", "L1", "opus"), ("toCsv", "L1", "codex"),
        ])


class Provenance(unittest.TestCase):
    def analyse_with(self, run: str, field: str, value: str) -> tuple[int, str, dict | None]:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "analyze"
            shutil.copytree(FIXTURE, root)
            score_path = root / "runs" / run / "score.json"
            score = json.loads(score_path.read_text())
            score_path.write_text(json.dumps({**score, field: value}) + "\n")
            status, _, stderr, report = run_analyze(root / "runs", root / "tasks")
        return status, stderr, report

    def test_score_of_a_different_corpus_fails_naming_the_run(self):
        status, stderr, report = self.analyse_with("toCsv__L0__opus__r2", "corpus_sha", "0" * 64)
        self.assertEqual((status, report), (1, None))
        self.assertIn("toCsv__L0__opus__r2", stderr)
        self.assertIn("corpus_sha", stderr)

    def test_scores_from_different_evaluators_fail_naming_the_run(self):
        status, stderr, report = self.analyse_with("parseEnv__L1__sonnet__r1", "evaluator_sha", "evaluator-2")
        self.assertEqual((status, report), (1, None))
        self.assertIn("parseEnv__L1__sonnet__r1", stderr)
        self.assertIn("evaluator_sha", stderr)

    def test_scores_from_different_images_fail_naming_the_run(self):
        status, stderr, report = self.analyse_with("toCsv__L1__opus__r1", "image_id", "sha256:image-2")
        self.assertEqual((status, report), (1, None))
        self.assertIn("toCsv__L1__opus__r1", stderr)
        self.assertIn("image_id", stderr)


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
