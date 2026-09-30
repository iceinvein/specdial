# Run record: specdial

## Pre-flight (2026-09-30)

- **Review: tier 3 + measurement code.** Reviewer dispatches at T11
  (isolation boundary), T13 (the flip), and T4, T12, T14 (evaluator, scorer,
  analysis), because every number in the post is computed by those three. The
  rest get a commit-stat read; the final review covers the whole plan. Chosen
  by the operator from three options.
- **Effort: plan marks taken.** T1 and T3 at low effort: fixed file lists and
  byte copies. The other 14 at session effort.
- **Workspace: worktree per concurrent implementer.** The graph allows three
  at once (T1 to T3 after the base commit) and five in the corpus wave
  (T6 to T10). The repo was empty, so T1 runs alone on master to create the
  base commit; later waves get `git worktree add` trees under
  `../specdial-worktrees/`, agents commit their own task there, and the
  controller merges into master. The harness's worktree tool is bound to the
  session's primary repo (the blog), so implementer worktrees are cut by hand.

## Decisions and deviations

- Design decision 4 (container isolation instead of temp dirs) was added by
  the controller after design sign-off and surfaced to the operator at
  pre-flight; the operator said go without objecting.
- T2 goes to a fresh agent with no access to mutgap, so the tickets are blind
  to the specs. The controller had already read the specs and could not write
  them blind.
