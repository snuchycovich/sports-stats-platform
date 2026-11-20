# Sports Statistics Platform

## Stack

pnpm TypeScript monorepo:

- `apps/web`: React, Vite, PWA
- `apps/api`: NestJS
- `packages/domain`: pure domain engine
- `packages/contracts`: shared runtime schemas
- `packages/test-fixtures`: shared test data

## Architecture

- Keep `packages/domain` deterministic and independent of frameworks, I/O, time, and persistence.
- Validate external data at runtime through shared contracts.
- Applications may depend on packages; packages must not depend on applications.
- Preserve ADR history and keep changes inside the current issue scope.

## Workflow

- Deliver the smallest change that satisfies the issue.
- All code changes must follow TDD: write a failing test, implement the minimum code to pass, then refactor with tests green.
- Run the failing test before implementation and the relevant test suite after each step.
- Do not add artificial tests for documentation or configuration-only changes.
- Run the smallest relevant checks; use root pnpm scripts when available.
- Do not commit or push unless explicitly requested.

## Documentation

- Use `docs/technical/architecture.md` for boundaries.
- Use `docs/technical/domain-model.md` for domain changes.
- Use `docs/getting-started.md` for the current delivery slice.
