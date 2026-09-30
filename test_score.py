"""Scores fixture run dirs under test/fixtures/runs/<case>/{tasks,runs}, copied
into a scratch dir the Docker VM can see, through the real specdial-agent image.

scored/ holds one parseEnv run per behaviour: r1 a copy of reference.ts, r2 a
copy of buggy.ts, r3 no impl.ts, r4 reference.ts with only comments and
whitespace changed, r5 a syntax error, r6 top-level await, r7 require().
harness-error/ holds a run whose impl makes evaluate.ts itself fail. slow/
holds a run whose every input times out.

Usage: python3 -m unittest test_score
"""

import contextlib
import hashlib
import io
import subprocess
import json
import os
import shutil
import tempfile
import unittest
from pathlib import Path

import score

FIXTURES = Path(__file__).resolve().parent / "test" / "fixtures" / "runs"
# Colima shares only HOME with its VM, so the copies must live under it.
SCRATCH_DIR = Path(os.environ.get("SCRATCH_DIR", Path.home() / ".cache" / "specdial" / "scratch"))
RUN = "parseEnv__L0__sonnet__r"


def copy_case(case: str) -> Path:
    SCRATCH_DIR.mkdir(parents=True, exist_ok=True)
    root = Path(tempfile.mkdtemp(prefix="test_score-", dir=SCRATCH_DIR))
    shutil.copytree(FIXTURES / case, root / case)
    return root / case


def run_score(case_dir: Path, *argv: str) -> tuple[int, str]:
    err = io.StringIO()
    with contextlib.redirect_stderr(err), contextlib.redirect_stdout(io.StringIO()):
        status = score.main(list(argv), case_dir / "runs", case_dir / "tasks")
    return status, err.getvalue()


def read_json(path: Path) -> dict:
    return json.loads(path.read_text())


def sha256_of(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


# The scoring fields; provenance fields are checked by the Staleness tests.
SCORE_KEYS = ["load", "hash", "agree_ref", "agree_frac", "src_hash", "unsupported", "async_errors",
              "late_async_errors", "timeouts"]
NOT_EVALUATED = dict.fromkeys(SCORE_KEYS)


def scoring_fields(score: dict) -> dict:
    return {k: score[k] for k in SCORE_KEYS}


class ScoredRuns(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.case = copy_case("scored")
        cls.status, cls.stderr = run_score(cls.case)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.case.parent)

    def score_of(self, rep: int) -> dict:
        return read_json(self.case / "runs" / f"{RUN}{rep}" / "score.json")

    def test_scoring_succeeds(self):
        self.assertEqual(self.status, 0, self.stderr)

    def test_copy_of_reference_agrees_on_every_input(self):
        s = self.score_of(1)
        self.assertEqual((s["load"], s["agree_ref"], s["agree_frac"]), ("ok", True, 1.0))

    def test_copy_of_buggy_disagrees_on_the_inputs_whose_value_holds_an_equals_sign(self):
        s = self.score_of(2)
        # h003 and h006 of the seven fixture inputs put "=" inside the value.
        self.assertEqual((s["load"], s["agree_ref"], s["agree_frac"]), ("ok", False, 5 / 7))

    def test_run_without_impl_scores_absent(self):
        self.assertEqual(scoring_fields(self.score_of(3)), {**NOT_EVALUATED, "load": "absent", "agree_ref": False})

    def test_impl_that_fails_to_parse_scores_noload(self):
        self.assertEqual(scoring_fields(self.score_of(5)), {**NOT_EVALUATED, "load": "noload", "agree_ref": False})

    def test_impl_using_top_level_await_loads_as_an_es_module(self):
        self.assertEqual(self.score_of(6)["load"], "ok")

    def test_impl_using_require_does_not_load(self):
        self.assertEqual(self.score_of(7)["load"], "noload")

    def test_comment_and_whitespace_changes_keep_the_source_hash(self):
        self.assertEqual(self.score_of(4)["src_hash"], self.score_of(1)["src_hash"])

    def test_different_code_gets_a_different_source_hash(self):
        self.assertNotEqual(self.score_of(2)["src_hash"], self.score_of(1)["src_hash"])

    def test_signature_json_is_the_evaluator_output(self):
        sig = read_json(self.case / "runs" / f"{RUN}2" / "signature.json")
        self.assertEqual(sig["outputs"][2], {"ok": {"URL=a": "b"}})
        self.assertEqual(sig["outputs"][6], "THROW")
        self.assertEqual(sig["hash"], self.score_of(2)["hash"])

    def test_reference_signature_is_written_beside_the_reference(self):
        ref = read_json(self.case / "tasks" / "parseEnv" / "reference.signature.json")
        self.assertEqual(ref["outputs"][2], {"ok": {"URL": "a=b"}})
        self.assertEqual(ref["hash"], self.score_of(1)["hash"])

    def test_counts_are_recorded_for_a_loaded_run(self):
        s = self.score_of(1)
        self.assertEqual((s["unsupported"], s["async_errors"], s["late_async_errors"], s["timeouts"]), (0, 0, 0, 0))

    def test_score_records_what_it_was_computed_from(self):
        s = self.score_of(1)
        task = self.case / "tasks" / "parseEnv"
        image_id = subprocess.run(
            ["docker", "image", "inspect", "--format", "{{.Id}}", "specdial-agent"],
            capture_output=True, text=True, check=True,
        ).stdout.strip()
        self.assertEqual(
            (s["corpus_sha"], s["ref_src_sha"], s["evaluator_sha"], s["image_id"]),
            (sha256_of(task / "corpus.json"), sha256_of(task / "reference.ts"),
             sha256_of(Path(score.__file__).parent / "evaluate.ts"), image_id),
        )


class Caching(unittest.TestCase):
    def setUp(self):
        self.case = copy_case("scored")
        self.run_dir = self.case / "runs" / f"{RUN}1"
        status, stderr = run_score(self.case)
        self.assertEqual(status, 0, stderr)
        shutil.copy(FIXTURES / "scored" / "runs" / f"{RUN}2" / "impl.ts", self.run_dir / "impl.ts")

    def tearDown(self):
        shutil.rmtree(self.case.parent)

    def test_existing_score_is_kept_without_rescore(self):
        self.assertEqual(run_score(self.case)[0], 0)
        self.assertTrue(read_json(self.run_dir / "score.json")["agree_ref"])

    def test_rescore_evaluates_again(self):
        self.assertEqual(run_score(self.case, "--rescore")[0], 0)
        self.assertFalse(read_json(self.run_dir / "score.json")["agree_ref"])


class Staleness(unittest.TestCase):
    def setUp(self):
        self.case = copy_case("scored")
        self.corpus = self.case / "tasks" / "parseEnv" / "corpus.json"
        status, stderr = run_score(self.case)
        self.assertEqual(status, 0, stderr)
        corpus = read_json(self.corpus)
        corpus["inputs"][0]["args"] = ["A=changed"]
        self.corpus.write_text(json.dumps(corpus))

    def tearDown(self):
        shutil.rmtree(self.case.parent)

    def test_changed_corpus_fails_naming_the_stale_runs(self):
        status, stderr = run_score(self.case)
        self.assertEqual(status, 1)
        self.assertIn("stale, rerun with --rescore", stderr)
        self.assertIn(f"{RUN}1", stderr)
        self.assertIn("parseEnv reference", stderr)

    def test_stale_scores_are_left_untouched(self):
        before = (self.case / "runs" / f"{RUN}1" / "score.json").read_text()
        run_score(self.case)
        self.assertEqual((self.case / "runs" / f"{RUN}1" / "score.json").read_text(), before)

    def test_new_run_is_not_scored_beside_stale_ones(self):
        new_run = self.case / "runs" / f"{RUN}8"
        shutil.copytree(self.case / "runs" / f"{RUN}1", new_run)
        for name in ("score.json", "signature.json"):
            (new_run / name).unlink()
        self.assertEqual(run_score(self.case)[0], 1)
        self.assertFalse((new_run / "score.json").exists())

    def test_rescore_scores_against_the_changed_corpus(self):
        status, stderr = run_score(self.case, "--rescore")
        self.assertEqual(status, 0, stderr)
        s = read_json(self.case / "runs" / f"{RUN}1" / "score.json")
        ref = read_json(self.case / "tasks" / "parseEnv" / "reference.signature.json")
        self.assertEqual((s["corpus_sha"], s["agree_ref"]), (sha256_of(self.corpus), True))
        self.assertEqual(ref["outputs"][0], {"ok": {"A": "changed"}})


class Timeouts(unittest.TestCase):
    def setUp(self):
        self.case = copy_case("slow")
        self.run_dir = self.case / "runs" / "parseEnv__L2__codex__r1"

    def tearDown(self):
        shutil.rmtree(self.case.parent)

    def test_timed_out_inputs_are_counted(self):
        status, stderr = run_score(self.case)
        self.assertEqual(status, 0, stderr)
        self.assertEqual(read_json(self.run_dir / "score.json")["timeouts"], 8)

    def test_evaluation_outlasting_the_scorer_timeout_fails_naming_the_run(self):
        # Eight one-second input timeouts cannot finish inside six seconds.
        status, stderr = run_score(self.case, "--timeout", "6")
        self.assertEqual(status, 1)
        self.assertIn("parseEnv__L2__codex__r1", stderr)
        self.assertIn("timed out", stderr)
        self.assertFalse((self.run_dir / "score.json").exists())

    def test_timed_out_container_is_stopped(self):
        run_score(self.case, "--timeout", "6")
        running = subprocess.run(
            ["docker", "ps", "--filter", "name=specdial-score-", "--format", "{{.Names}}"],
            capture_output=True, text=True, check=True,
        ).stdout
        self.assertEqual(running, "")


class HarnessError(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.case = copy_case("harness-error")
        cls.status, cls.stderr = run_score(cls.case)
        cls.run_dir = cls.case / "runs" / "parseEnv__L1__opus__r1"

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.case.parent)

    def test_scoring_fails(self):
        self.assertEqual(self.status, 1)

    def test_failure_names_the_run(self):
        self.assertIn("parseEnv__L1__opus__r1", self.stderr)

    def test_no_score_is_written(self):
        self.assertFalse((self.run_dir / "score.json").exists())
        self.assertFalse((self.run_dir / "signature.json").exists())


if __name__ == "__main__":
    unittest.main()
