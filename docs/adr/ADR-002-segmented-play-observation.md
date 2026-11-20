# ADR-002 — Segmented Play Observation from the First Payload Version

- **Date:** 18 November 2026
- **Status:** Accepted for the prototype
- **Scope:** `PlayObservation` payload in `packages/domain`; Live Capture and Review Mode entry flows
- **Related:** [ADR-001](ADR-001-choix-techniques-plateforme-statistiques.md), [Domain model](../technical/domain-model.md), [Field capture](../field-capture.md)

## Context

The domain model states that a play contains ordered segments (pass, interception, return, fumble, recovery, another return) and that one start/end position cannot represent every attribution. The first capture prototype stored a flat play (one type, one yards value, a passer and a receiver), and the first domain issue was drafted in the same flat shape.

A proposed capture flow — play family, then result, then any number of complementary events, then validation — showed that common real plays (complete pass then fumble recovered by the defense; interception then return then touchdown) need several attributed steps in one observation.

Plays are persisted offline and synchronized, and old payloads must be read through versioned adapters or controlled migrations. Moving from a flat to a segmented payload after data exists would require such a migration for every stored play.

## Decision

1. **Payload version 1 is segmented.** A `PlayObservation` carries a `family`, a primary `outcome`, and an ordered, non-empty `segments` list. The prototype implements only the segment kinds it supports (rush, reception, incompletion); later kinds (interception, fumble, recovery, return, kicks) are added as new cases of the same discriminated union.
2. **The first segment matches the primary outcome.** `createPlayObservation` builds the first segment from the draft; `validatePlayDraft` reports any inconsistency. Callers never assemble segments by hand.
3. **Yards belong to segments.** Each segment records its own whole-yard gain; net play yards and per-player passing, receiving, rushing, and return yards are derived. This keeps attribution separate without double counting team offense.
4. **Primary actors are typed segment fields.** Ball carrier, passer, receiver, or target are required fields of the segment kind, each a `PlayerAttribution` (identified, or unknown with an optional observed jersey). Secondary credits (tackles, forced fumbles, passes defended) will be `PlayerContribution` entries on a segment; they are not segments.
5. **Scores and dead-ball outcomes are derived, not entered as events.** Touchdowns and safeties follow from the end position of the last segment and the ruleset. An operator may flag an observed score; a mismatch with the derived result is an issue to review, not an overwrite.
6. **Penalties stay outside the segment chain**, as the separate collection already shown in the domain model.
7. **Which segment may follow is a domain rule.** A pure function such as `allowedNextSegments(segments, ruleset)` will determine compatible follow-up events from ball state (live or dead, which team holds it). React only renders the result. It is introduced with the first follow-up segment kind, not before.
8. **The step-by-step flow is not the Live Capture default.** Live Capture keeps one-screen entry for common plays; "add event" lives in the exceptional-action panel. The full sequential flow (family → result → events → summary) is intended for Review Mode and assisted transcription.

## Consequences

- No payload migration is needed when turnovers and returns are added; only new segment kinds, validation codes, and engine handling.
- The capture draft stays flat and simple for the supported subset; the domain converts it into segments. Draft shape and observation shape are deliberately different.
- Statistics code must aggregate over segments even while each play has exactly one.
- Conversion point values and kick outcomes come from the ruleset; they are not hard-coded in segment kinds.

## Rejected alternatives

- **Flat play now, segments later:** simpler first issue, but forces a payload version bump and adapter as soon as a fumble or interception is captured, and contradicts the documented domain model.
- **Free-form event list without a typed first segment:** flexible, but loses the guarantee that every play has a coherent primary action and weakens static typing.
- **Score and tackle as events:** mixes observations with derived results and contributions, and lets entered scores contradict the ruleset silently.
