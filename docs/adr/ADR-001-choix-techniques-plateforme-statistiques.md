# ADR-001 — Technical Direction for the Sports Statistics Platform

- **Date:** 4 November 2026
- **Status:** Accepted direction for the prototype; field validation and performance measurements pending
- **Scope:** Tackle football and flag football; multisport extension is a later possibility
- **History:** Original decision recorded in French on 4 November 2026. Rewritten in English during documentation consolidation without changing its identifier or core decisions.

## Context

The product must capture plays during a game, preserve corrections, calculate statistics, and publish results. Capture must work on phones, tablets, and computers when the network is unavailable. Browser and server calculations must not diverge, and a correction must be explainable without silently changing later observations.

Public reads may greatly outnumber capture writes. Match results feed season and league aggregates, but current scale and performance targets are not measured. Voice may later transcribe short utterances into structured proposals; video analysis is a separate future capability.

## Decision

Build a TypeScript monorepo as a modular monolith with domain, application, and infrastructure separation.

| Area | Decision | Status |
| --- | --- | --- |
| Domain engine | Pure TypeScript shared by browser and server | Accepted |
| Web client | React and Vite progressive web app | Accepted for prototype |
| Server | Node.js with NestJS | Recommended; not implemented |
| Server database | PostgreSQL with relational structure and targeted JSONB | Accepted |
| Local database | IndexedDB through Dexie with a transactional outbox | Accepted |
| Write transport | Idempotent business commands over HTTP | Accepted |
| Public updates | Periodic refresh initially; SSE when justified | Progressive |
| Statistics | Match projections, then season and league aggregation | Accepted |
| Heavy processing | Separate workers when measurements justify them | Deferred |
| ORM | Not selected | Open |

Exact dependency versions will be selected and locked when implementation begins. No broker, distributed cache, microservice, or specialized event store is required for the prototype.

## Rationale

### Shared TypeScript engine

The decisive need is to run the same provisional calculation offline and authoritative calculation on the server. A shared package reduces divergence while keeping React, NestJS, persistence, time, and external services outside the engine. Runtime schemas remain mandatory because TypeScript types are erased at runtime [S1]. The server always rechecks permissions and domain rules.

Symfony/PHP and Django/Python offer productive administration and server ecosystems, but require a different strategy for browser-side rule execution. Go offers strong resource control and concurrency, but its benefit is not demonstrated for current workloads and it would add another language. These are trade-offs, not claims that the alternatives lack capability.

### Ordered play log with retained revisions

The business source of truth is the ordered set of current play observations, with previous revisions retained. Score, situation, and statistics are projections that can be reconstructed. This is not full Event Sourcing: every object is not rebuilt exclusively from an immutable event stream, and a specialized event store is not selected [S2].

A correction or insertion rebuilds affected results. Recalculation alone does not resolve contradictions. If a corrected interception changes possession, later plays whose recorded possession no longer fits are reported for human review rather than silently rewritten.

### Versioned rules and calculations

Sports rules, statistical policy, and engine version are separate references. Sports rules govern play progression and scoring. Statistical policy governs attribution such as passing yards, sacks, and defensive credits. Engine version identifies the code producing projections. Each materialized result records these references and its source game revision.

### PWA before native applications

A PWA supports installable capture and web publishing from one UI codebase. A service worker caches assets, while IndexedDB stores prepared game data and pending commands. Browser quota and eviction behavior vary, so the product must request persistence when available, handle failed writes, test target devices, and provide recoverable export [S3].

Remote voice transcription depends on network access. It produces a structured proposal that a human validates. Audio is temporary and is not planned for durable retention. Offline touch capture remains available. Native applications should be reconsidered only if verified media, background, or device-integration requirements justify them.

### PostgreSQL and targeted JSONB

Organizations, teams, players, games, order, revisions, and projection rows remain relational. Variable play details may use a versioned JSONB payload [S4]. Payload version describes data shape; play revision describes correction history. Runtime validation and versioned adapters or migrations are required. JSONB does not remove schema evolution, and relationships that need database integrity should not be hidden inside payloads.

### Idempotent offline synchronization

One primary operator per game limits initial coordination but does not eliminate retries, multiple tabs, or reviewer conflicts. A command ID is separate from the play ID. Local play and outbox command are stored in one Dexie transaction [S5]. The server atomically stores the result, retained revision, and durable command receipt.

Repeating an ID with identical content returns the recorded result; reusing it with different content is rejected. Expected play and game revisions provide optimistic concurrency. A stale command becomes a visible conflict and preserves the local proposal. These rules provide idempotent effects, not guaranteed exactly-once delivery.

### Projections and processing

The TypeScript engine builds match projections. Season and league statistics aggregate match projections rather than replaying every play on each read. Percentages aggregate numerators and denominators before division. A match correction updates only its dependent aggregates and uses source revisions to prevent stale work from winning.

Long CPU work must not block the API event loop. Use separate processes and bounded worker threads when measurements require them [S6]. Evaluate another language or a task queue only against explicit latency, throughput, memory, or cost targets.

### Public updates

Commands and ordinary reads use HTTP. Public dashboards start with periodic refresh. SSE is the preferred next step for one-way updates if lower latency becomes valuable. Automatic reconnection does not by itself recover every missed update, so clients need a cursor or current snapshot [S7].

## Consequences

- The team must invest in TypeScript, React, and likely NestJS while keeping business logic framework-independent.
- Offline state, conflicts, storage errors, and provisional results are first-class UI concerns.
- Reference games independently reviewed by a statistician are required; tests generated from the same algorithm are not an oracle.
- A prototype may support only selected rush/pass observations. A field pilot must implement every event required by its selected ruleset before claiming complete-game or official-statistics capability.
- Authentication, organization isolation, privacy, and publication projections remain server responsibilities.
- Voice, video, native applications, and simultaneous capture are deferred.

## Validation

The first proof must prepare a game, record supported plays offline, correct a play, simulate a timeout after server commit, retry the command, and produce identical duplicate-free projections in browser and server. It must also demonstrate a stale-revision conflict and an inconsistency caused by a correction.

Before a field pilot, validate storage and microphone behavior on target devices, organization isolation, complete rules coverage, expected reports, and reference totals. Set service, freshness, and load objectives with the pilot before making production-capacity claims.

## Resolved contradictions and open decisions

Earlier documents proposed Python/Django, full Event Sourcing, offline audio retention, and premature ORM choices. This ADR supersedes those proposals: TypeScript is selected, full Event Sourcing is not, audio is not durably retained, and the ORM remains open.

Open decisions include the pilot ruleset, statistical policy, authentication approach, ORM, hosting, command-receipt retention, service objectives, public/private data boundary, and applicable privacy controls. Any later reversal of an accepted decision requires a new ADR that links to and supersedes this one; ADR-001 must not be rewritten to erase history.

## Sources

References were consulted during technical discussions on 3 and 4 November 2026. They support technology capabilities; the architecture remains a project decision.

- [S1 — TypeScript: Erased Types](https://www.typescriptlang.org/docs/handbook/2/basic-types.html)
- [S2 — Microsoft: Event Sourcing pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing)
- [S3 — MDN: Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- [S4 — PostgreSQL: JSON Types](https://www.postgresql.org/docs/current/datatype-json.html)
- [S5 — Dexie: Transactions](https://dexie.org/docs/Dexie/Dexie.transaction())
- [S6 — Node.js: Worker threads](https://nodejs.org/api/worker_threads.html)
- [S7 — HTML Standard: Server-sent events](https://html.spec.whatwg.org/dev/server-sent-events.html)
