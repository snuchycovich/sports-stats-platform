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
- Do not commit or push unless explicitly requested.

## TDD

All code changes follow TDD. Documentation and configuration-only changes get no artificial tests.

- Red: write only the test, run it, and confirm it fails for the expected reason (missing module or wrong behavior, not a syntax or import-path error). Stop for review unless asked to continue.
- Green: implement the minimum code to pass. Never modify a test to make it pass; if a test looks wrong, stop and explain.
- Refactor only with tests green, and keep every earlier test green.
- Type-only changes are tested with Vitest `expectTypeOf` and `// @ts-expect-error`; their red signal is the package typecheck.

## Checks

Use root pnpm scripts and run the smallest relevant set.

- Each TDD step: `pnpm --filter <package> typecheck` and the matching test project (`pnpm test:unit` for packages, `pnpm test:api` for the API, `pnpm test:e2e` for the web app).
- Before handing over an issue: also `pnpm lint`, `pnpm format:check`, `pnpm check:boundaries`, and `pnpm knip`.

## Domain conventions (`packages/domain`)

- Type aliases and discriminated unions; no classes or enums.
- Properties and arrays are readonly; values are plain JSON-serializable data (no `Date`, `Map`, `Set`, class instances, or undefined-valued keys).
- Respect `exactOptionalPropertyTypes`: omit optional keys rather than setting `undefined`; build them with conditional spreads.
- Functions are pure and deterministic: no I/O, time, randomness, input mutation, or exceptions; return result unions instead of throwing.
- One module per concept in `src/`, tested by a sibling `*.test.ts` and re-exported from `src/index.ts`.
- Public types carry a TSDoc link to the `docs/` section they implement.

## Documentation

- Use `docs/technical/architecture.md` for boundaries.
- Use `docs/technical/domain-model.md` for domain changes.
- Use `docs/getting-started.md` for the current delivery slice.
