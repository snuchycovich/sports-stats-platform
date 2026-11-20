# sports-stats-platform

A statistics platform for tackle American football and flag football. Statisticians record each play once, even without a network, so the paper-to-digital double entry disappears. Corrections are preserved, and trustworthy statistics are rebuilt from the play log. The architecture may later extend to other sports.

The project is at the documentation and design stage. No application code exists yet. The first goal is a prototype: prepare a game, capture a limited rush/pass subset offline, correct a play in Review Mode, synchronize, and verify identical statistics in browser and server.

**Planned stack:** a TypeScript monorepo and modular monolith. It has a React/Vite PWA with offline storage (IndexedDB/Dexie), a NestJS API, PostgreSQL, and a pure TypeScript domain engine shared by browser and server.

## Documentation

- [Project and scope](docs/project.md): product problem, users, delivery stages, and risks
- [Getting started](docs/getting-started.md): the first development slice
- [Technical architecture](docs/technical/architecture.md), [domain model](docs/technical/domain-model.md), and [synchronization](docs/technical/synchronization.md)
- [Use cases](docs/use-cases.md), [personas](docs/personas.md), and [market](docs/market.md)
- [Field capture](docs/field-capture.md) and [Mexican stat sheet](docs/mexican-stat-sheet.md)
- Decision records: [ADR-001](docs/adr/ADR-001-choix-techniques-plateforme-statistiques.md) and [ADR-002](docs/adr/ADR-002-segmented-play-observation.md)
