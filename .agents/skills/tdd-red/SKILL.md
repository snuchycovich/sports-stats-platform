---
name: tdd-red
description: TDD red step. Write only the failing test for the given spec.
disable-model-invocation: true
argument-hint: <spec>
---
Run the red step of the TDD cycle in AGENTS.md for this spec:

$ARGUMENTS

1. Read the docs the spec cites and the existing modules it builds on; reuse their types instead of redefining them.
2. Write only the test file named in the spec, importing from its sibling module.
3. Besides the listed cases, add when relevant: readonly checks, a JSON round-trip, determinism, and no mutation of inputs (deep-freeze them).
4. Do not create or edit production code.
5. Run the red signal and report the failure and why it is the expected one. Then stop.