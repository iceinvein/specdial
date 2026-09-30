"""Scores fixture run dirs under test/fixtures/runs/<case>/{tasks,runs}, copied
into a scratch dir the Docker VM can see, through the real specdial-agent image.

scored/ holds one parseEnv run per behaviour: r1 a copy of reference.ts, r2 a
copy of buggy.ts, r3 no impl.ts, r4 reference.ts with only comments and
whitespace changed, r5 a syntax error. harness-error/ holds a run whose impl
makes evaluate.ts itself fail.

Usage: python3 -m unittest test_score
"""

import contextlib
import io
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
        self.assertEqual(
            self.score_of(3),
            {"load": "absent", "hash": None, "agree_ref": False, "agree_frac": None, "src_hash": None,
             "unsupported": None, "async_errors": None, "late_async_errors": None},
        )

    def test_impl_that_fails_to_parse_scores_noload(self):
        self.assertEqual(
            self.score_of(5),
            {"load": "noload", "hash": None, "agree_ref": False, "agree_frac": None, "src_hash": None,
             "unsupported": None, "async_errors": None, "late_async_errors": None},
        )

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
        self.assertEqual((s["unsupported"], s["async_errors"], s["late_async_errors"]), (0, 0, 0))


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
