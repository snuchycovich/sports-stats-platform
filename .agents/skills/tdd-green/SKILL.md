---
name: tdd-green
description: TDD green step. Implement the minimum code that passes a failing test.
disable-model-invocation: true
argument-hint: <test file> [extra requirements]
---
Run the green step of the TDD cycle in AGENTS.md for: $ARGUMENTS

1. Read the test and every module it imports. Do not modify the test.
2. Implement the minimum code in the sibling module and re-export it from `src/index.ts`.
3. Follow the domain conventions in AGENTS.md; avoid type assertions.
4. Run the step checks until green with all earlier tests still green, then refactor if useful.
5. Report the files changed, the check results, and any test that looked wrong. Do not commit.