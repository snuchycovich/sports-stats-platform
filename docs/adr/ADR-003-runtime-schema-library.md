# ADR-003 — Runtime Schema Library for Contracts

- **Date:** 26 November 2026
- **Status:** Accepted for the prototype
- **Scope:** Runtime validation in `packages/contracts`, used by `apps/web` and `apps/api`
- **Related:** [ADR-001](ADR-001-choix-techniques-plateforme-statistiques.md), [ADR-002](ADR-002-segmented-play-observation.md), [Architecture](../technical/architecture.md), [Domain model](../technical/domain-model.md)

## Context

`packages/domain` owns the prototype types and cannot import `packages/contracts`. External data such as API requests, synchronized commands, and locally stored plays must be validated at runtime before it reaches the domain. `packages/contracts` needs a schema library that produces exactly the domain shapes under the repository's strict TypeScript settings and runs in both the PWA and the NestJS API.

The domain types set concrete requirements:

- `exactOptionalPropertyTypes` is enabled. An optional key may be absent but never `undefined`, for example `observedJersey` on an unknown `PlayerAttribution`.
- `PlayObservation` segments are a tuple with a rest element, `readonly [RushSegment, ...PlaySegment[]]`, so the first segment is typed by the outcome (ADR-002, decision 2).
- Validation failures must become structured issues with a path, like the domain's `DraftIssue`, so Live Capture and Review Mode can point at the faulty field.
- The PWA is used offline on phones, so bundle size matters.
- The API is planned on NestJS.

Three libraries were compared: Zod 4 (4.6), Valibot 1 (1.5), and ArkType 2 (2.2).

| Criterion | Zod 4 | Valibot | ArkType |
| --- | --- | --- | --- |
| Exact optional keys | `.exactOptional()`. Rejects an explicit `undefined` at runtime and in the inferred type | `exactOptional()` schema | Global `exactOptionalPropertyTypes` configuration |
| Tuple with rest, for a typed first segment | `z.tuple([first], rest)` | `tupleWithRest([first], rest)` | Variadic tuple definitions |
| Structured issue paths | `issue.path` is an array of keys and indexes, e.g. `[1, "observedJersey"]` | `issue.path` items with key and value; `getDotPath` helper | `ArkErrors` with a `path` per error |
| PWA bundle size | Largest of the classic APIs, because methods are not tree-shakable. The `zod/mini` functional API shares the same core and is tree-shakable | Smallest: modular functions, tree-shakable by design | Largest: ships a runtime parser for its string definitions |
| NestJS integration | NestJS 12 `StandardSchemaValidationPipe` and `@Body({ schema })` | Same pipe, through Standard Schema | Same pipe, through Standard Schema |
| Standard Schema | Implemented (`~standard`) | Implemented | Implemented |

Before this decision, Zod 4.6.7 was checked with the repository's `tsconfig.lib.json` (TypeScript 7, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`):

- `exactOptional` rejected `undefined` in types and at runtime.
- `strictObject` reported `unrecognized_keys`.
- A tuple with a rest element typed its first element and reported an empty list at path `[0]`.
- Concrete schemas stayed assignable to `ZodType`. The assignability problem reported in Zod issue #5830 did not reproduce in this setup.

## Decision

1. **`packages/contracts` uses Zod 4.** It meets every functional criterion, was verified against the repository's strict compiler settings, and is the most widely known of the three, which lowers the cost of review and onboarding.
2. **Zod is a dependency of `@stats/contracts` only.** Applications and other packages do not import `zod`.
3. **Parse functions return a contracts-owned `ContractResult`.** A success holds the domain-typed value. A failure holds a non-empty list of structured issues with our own codes and paths. Zod schemas, errors, issues, and inferred types are never part of the public API of `@stats/contracts`.
4. **Schemas are strict objects.** Every object schema rejects unknown keys (`z.strictObject`), and optional keys use `exactOptional`, so a parsed value has exactly the shape of the domain type.
5. **Bundle size is measured, not assumed.** The PWA build measures the contracts contribution. If it is too large, schemas move to `zod/mini`, which shares Zod's core, without changing `ContractResult`.

## Consequences

- Callers depend only on `ContractResult` and domain types. Replacing Zod, or moving to `zod/mini`, changes `packages/contracts` alone.
- Zod issue codes are translated into contract codes. For example, Zod 4 reports a non-integer value as `invalid_type` with an integer format, which contracts can map to the domain's `not_integer`.
- Strict objects reject fields from newer clients or payload versions. Compatibility is handled by `payloadVersion` and versioned adapters (domain model, "Ordered log and revisions"), not by accepting unknown keys.
- The NestJS API validates requests by calling the contracts parse functions, or through a thin pipe that wraps them, instead of passing raw Zod schemas to `StandardSchemaValidationPipe`. That keeps library types out of the API, at the cost of not using the built-in pipe directly.
- The Zod version is upgraded deliberately, and the strict-settings checks above are rerun, because exact-optional typing has regressed in past releases.

## Rejected alternatives

- **Valibot:** the smallest bundle and an exact-optional schema of its own. Its functional pipe style is more verbose for the nested discriminated unions in the play payload. Because callers only see `ContractResult`, it remains the first fallback if the bundle budget cannot be met with `zod/mini`.
- **ArkType:** concise definitions and a global exact-optional setting. Its string-based definitions are harder to review, and it adds the largest runtime to the PWA.
- **Exposing schemas or Standard Schema objects directly:** less code in contracts, but it would tie the web app and the API to the library's types and issue format.
