"""Each fixture under test/fixtures/check_tasks/<case>/shout/ breaks one rule,
except valid/, which breaks none.

Usage: python3 -m unittest test_check_tasks
"""

import contextlib
import io
import unittest
from pathlib import Path

import check_tasks

FIXTURES = Path(__file__).resolve().parent / "test" / "fixtures" / "check_tasks"


def run(*tasks: str) -> tuple[int, str]:
    out = io.StringIO()
    with contextlib.redirect_stdout(out):
        status = check_tasks.main([f"{t}/shout" for t in tasks], FIXTURES)
    return status, out.getvalue()


class CheckTasks(unittest.TestCase):
    def assert_fails(self, case: str, reason: str) -> None:
        status, out = run(case)
        self.assertEqual(out, f"FAIL {case}/shout: {reason}\n")
        self.assertEqual(status, 1)

    def test_valid_task_passes(self):
        self.assertEqual(run("valid"), (0, "ok valid/shout\n"))

    def test_missing_file_is_named(self):
        self.assert_fails("missing-file", "missing properties.test.ts")

    def test_reference_failing_a_visible_test_fails(self):
        self.assert_fails(
            "reference-fails-visible",
            "reference fails examples.test.ts: upper-cases and appends a question mark",
        )

    def test_stub_passing_a_visible_test_fails(self):
        self.assert_fails("stub-passes-visible", "stub passes examples.test.ts: is exported as a function")

    def test_buggy_behaving_like_reference_fails(self):
        self.assert_fails("equal-hash", "buggy and reference have the same signature hash")

    def test_corpus_string_in_ticket_fails(self):
        self.assert_fails("leak-ticket", 'corpus input h007 string "hand 007 text" appears in ticket.md')

    def test_corpus_string_in_examples_fails(self):
        self.assert_fails("leak-examples", 'corpus input h020 string "louder" appears in examples.test.ts')

    def test_corpus_string_in_spec_fails(self):
        self.assert_fails("leak-spec", 'corpus input h012 string "hand 012 text" appears in spec.md')

    def test_corpus_string_in_properties_fails(self):
        self.assert_fails("leak-properties", 'corpus input h030 string "hand 030 text" appears in properties.test.ts')

    def test_fewer_than_500_generated_inputs_fails(self):
        self.assert_fails("too-few-generated", "corpus has 499 generated inputs, needs 500")

    def test_fewer_than_40_hand_written_inputs_fails(self):
        self.assert_fails("too-few-hand-written", "corpus has 39 hand-written inputs, needs 40")

    def test_hand_written_input_with_generated_category_fails(self):
        self.assert_fails("hand-written-generated-category", "hand-written input h007 has category generated")

    def test_reference_that_does_not_load_fails(self):
        self.assert_fails("reference-noload", "reference does not load")

    def test_one_failing_task_among_passing_ones_exits_1(self):
        self.assertEqual(
            run("valid", "missing-file"),
            (1, "ok valid/shout\nFAIL missing-file/shout: missing properties.test.ts\n"),
        )


if __name__ == "__main__":
    unittest.main()
