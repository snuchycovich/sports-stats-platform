# sports-stats-platform

A statistics platform for tackle American football and flag football. Statisticians record each play once, even without a network, so the paper-to-digital double entry disappears. Corrections are preserved, and trustworthy statistics are rebuilt from the play log.

> **Status: scaffold only.** This repository contains the pnpm workspace layout and empty package entry points. No application, domain logic, database, or product features are implemented yet. Unit, API integration, and end-to-end test environments are configured with one example each. Component tests are pending. Strict TypeScript type checking, Oxlint, Oxfmt, Knip, and a Lefthook pre-commit hook are configured. The `build` root script runs, but it currently does nothing because no workspace defines a build script.

## Prerequisites

- Node.js 22.12 or later, 24, or 26 and later (required by Vitest, see `engines` in `package.json`)
- pnpm 12.3.4, pinned in the `packageManager` field of `package.json`

## Getting started

```sh
pnpm install
pnpm exec playwright install chromium
```

The second command downloads the Chromium browser used by the end-to-end tests. It is needed once per machine.

## Commands

Run these from the repository root.

```sh
pnpm build
pnpm test
pnpm test:unit
pnpm test:api
pnpm test:e2e
pnpm lint
pnpm format:check
pnpm format
pnpm knip
pnpm audit:deps
pnpm typecheck
pnpm check:boundaries
pnpm check:quality
```

- `pnpm build` runs the matching script in every workspace that defines it, and skips the rest.
- `pnpm test` runs the Vitest unit and API integration projects defined in `vitest.config.ts`. `pnpm test:unit` and `pnpm test:api` run one project each. Unit tests live in `packages/*/src/**/*.test.ts` and API integration tests in `apps/api/src/**/*.int.test.ts`.
- `pnpm test:e2e` runs the Playwright end-to-end tests in `apps/web/e2e` in Chromium. It is not part of `pnpm test`, because it needs the browser download.
- Component tests (React Testing Library) are not configured yet.
- `pnpm lint` runs Oxlint on the whole repository with one root configuration (`.oxlintrc.json`, `correctness` rules as errors), including React rules for `apps/web`, Node rules for `apps/api`, and import restrictions for `packages/domain`.
- `pnpm format:check` verifies Oxfmt formatting without modifying files. `pnpm format` rewrites files. `docs/` and `.github/` are not formatted.
- `pnpm knip` reports unused files, exports, and dependencies. The `@stats/*` workspace dependencies are ignored for now because the scaffold does not import them yet.
- `pnpm audit:deps` audits all dependencies, including devDependencies, against the npm advisory database and fails on high or critical vulnerabilities. It needs network access and is not part of the pre-commit hook.
- `pnpm typecheck` runs `tsc` with the strict shared configuration in every workspace.
- `pnpm check:boundaries` injects temporary invalid imports (for example `react` or an app import inside `packages/domain`) and confirms that type checking rejects them, and that the allowed app-to-package imports still pass.
- `pnpm check:quality` injects temporary invalid and badly formatted code and confirms that Oxlint and Oxfmt reject it, and that valid code passes.

## Pre-commit hook

`pnpm install` installs a Lefthook `pre-commit` hook (`lefthook.yml`) through the `prepare` script. On every commit it runs Oxfmt and Oxlint on the staged files, then type checking and Knip on the whole repository. A failing check blocks the commit.

## Continuous integration

`.github/workflows/ci.yml` runs on every pull request to `dev` and `main`. It installs dependencies from the lockfile and runs these jobs in parallel:

- `quality`: formatting, lint, type check, boundary checks, quality checks, and Knip.
- `test`: unit and API integration tests.
- `e2e`: Playwright end-to-end tests in Chromium.
- `build`: all workspace builds.
- `audit`: the dependency vulnerability audit.
- `ci`: a single result that fails when any job above fails, is cancelled, or is skipped. Use this as the required status check.

Third-party actions are pinned to full commit SHAs, and Dependabot keeps them up to date. The shared setup steps (pnpm, Node.js 24, cached install) live in `.github/actions/setup`.

## Dependency updates

Dependabot (`.github/dependabot.yml`) opens a grouped pull request for minor and patch updates every Monday, for npm dependencies and GitHub Actions. Major updates arrive as separate pull requests. Dependabot alerts and security updates are enabled for the repository.

## Repository structure

```text
.
├── apps/
│   ├── web/              @stats/web
│   └── api/              @stats/api
├── packages/
│   ├── domain/           @stats/domain
│   ├── contracts/        @stats/contracts
│   └── test-fixtures/    @stats/test-fixtures
├── docs/
├── package.json
└── pnpm-workspace.yaml
```

Each workspace currently contains only a `package.json`, a `tsconfig.json`, and an empty `src/index.ts`. Shared TypeScript settings live in `tsconfig.base.json`, extended by `tsconfig.lib.json`, `tsconfig.web.json`, and `tsconfig.api.json`.

| Workspace                | Intended responsibility                                    |
| ------------------------ | ---------------------------------------------------------- |
| `apps/web`               | Capture and review client (planned: React and Vite PWA)    |
| `apps/api`               | Server application (planned: NestJS with PostgreSQL)       |
| `packages/domain`        | Pure TypeScript domain engine shared by browser and server |
| `packages/contracts`     | Runtime-validated command and payload contracts            |
| `packages/test-fixtures` | Shared reference games and test data                       |

Both apps depend on `@stats/domain` and `@stats/contracts`, and `@stats/test-fixtures` depends on both packages, using `workspace:*`.

## Documentation

- [Project and scope](docs/project.md): product problem, users, delivery stages, and risks
- [Getting started](docs/getting-started.md): the first development slice
- [Technical architecture](docs/technical/architecture.md), [domain model](docs/technical/domain-model.md), and [synchronization](docs/technical/synchronization.md)
- [Use cases](docs/use-cases.md), [personas](docs/personas.md), and [market](docs/market.md)
- [Field capture](docs/field-capture.md) and [Mexican stat sheet](docs/mexican-stat-sheet.md)
- Decision records: [ADR-001](docs/adr/ADR-001-choix-techniques-plateforme-statistiques.md) and [ADR-002](docs/adr/ADR-002-segmented-play-observation.md)
