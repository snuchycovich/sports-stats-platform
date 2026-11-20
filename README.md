# sports-stats-platform

A statistics platform for tackle American football and flag football. Statisticians record each play once, even without a network, so the paper-to-digital double entry disappears. Corrections are preserved, and trustworthy statistics are rebuilt from the play log.

> **Status: scaffold only.** This repository contains the pnpm workspace layout and empty package entry points. No application, domain logic, tests, database, or product features are implemented yet. The root scripts run, but they currently do nothing because no workspace defines a `build`, `test`, `lint`, or `typecheck` script.

## Prerequisites

- Node.js 18 or later (the pinned pnpm version declares `>=18`)
- pnpm 12.3.4, pinned in the `packageManager` field of `package.json`

## Getting started

```sh
pnpm install
```

## Commands

Run these from the repository root. Each one runs the matching script in every workspace that defines it, and skips the rest.

```sh
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```

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

Each workspace currently contains only a `package.json` and an empty `src/index.ts`.

| Workspace | Intended responsibility |
| --- | --- |
| `apps/web` | Capture and review client (planned: React and Vite PWA) |
| `apps/api` | Server application (planned: NestJS with PostgreSQL) |
| `packages/domain` | Pure TypeScript domain engine shared by browser and server |
| `packages/contracts` | Runtime-validated command and payload contracts |
| `packages/test-fixtures` | Shared reference games and test data |

Both apps depend on `@stats/domain` and `@stats/contracts`, and `@stats/test-fixtures` depends on both packages, using `workspace:*`.

## Documentation

- [Project and scope](docs/project.md): product problem, users, delivery stages, and risks
- [Getting started](docs/getting-started.md): the first development slice
- [Technical architecture](docs/technical/architecture.md), [domain model](docs/technical/domain-model.md), and [synchronization](docs/technical/synchronization.md)
- [Use cases](docs/use-cases.md), [personas](docs/personas.md), and [market](docs/market.md)
- [Field capture](docs/field-capture.md) and [Mexican stat sheet](docs/mexican-stat-sheet.md)
- Decision records: [ADR-001](docs/adr/ADR-001-choix-techniques-plateforme-statistiques.md) and [ADR-002](docs/adr/ADR-002-segmented-play-observation.md)
