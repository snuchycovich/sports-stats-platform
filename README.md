# Sports Stats Platform

Sports Stats Platform is a planned SaaS product for capturing, correcting, and publishing tackle-football and flag-football statistics. It is designed for unreliable stadium connectivity: operators record plays locally, review inconsistencies, and synchronize without duplicate effects.

The repository currently contains product and technical documentation only. No application code or infrastructure has been implemented.

## Current direction

- TypeScript monorepo and modular monolith.
- React and Vite progressive web app for capture and web interfaces.
- Pure TypeScript domain engine shared by browser and server.
- NestJS is the recommended backend framework, not an implemented component.
- PostgreSQL for relational structure and versioned JSONB play details.
- IndexedDB through Dexie with a local outbox for offline capture.
- Ordered play log with retained revisions and reconstructible statistics; not full Event Sourcing.

## Documentation

- [Project and scope](docs/project.md)
- [Market evidence and hypotheses](docs/market.md)
- [Personas](docs/personas.md)
- [Priority use cases](docs/use-cases.md)
- [Field capture experience](docs/field-capture.md)
- [Mexican statistics sheet](docs/mexican-stat-sheet.md)
- [Architecture](docs/technical/architecture.md)
- [Domain model](docs/technical/domain-model.md)
- [Offline synchronization](docs/technical/synchronization.md)
- [First development slice](docs/getting-started.md)
- [Architecture decisions](docs/adr/ADR-001-choix-techniques-plateforme-statistiques.md)

Start with the [first development slice](docs/getting-started.md). It proves preparation, offline capture, correction, synchronization, and duplicate-free statistics before expanding to a complete pilot.

## Frontend development

The initial React application lives in `apps/web` and requires Node.js 24 or newer.

```bash
cd apps/web
npm ci
npm run lint
npm run test
npm run build
```

The repository uses [pre-commit](https://pre-commit.com/) to run the same checks before a commit that changes frontend files. After installing `pre-commit`, enable the Git hook once per checkout:

```bash
pre-commit install
pre-commit run --all-files
```

GitHub Actions runs lint, tests, and the production build on pull requests and pushes to `main`.
