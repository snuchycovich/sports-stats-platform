import type { PlayObservation } from "@stats/domain";
import { z } from "zod";
import { toContractResult } from "./contract-result";
import type { ContractResult } from "./contract-result";
import { playerAttributionSchema } from "./player-attribution";

const wholeNumber = z.number().int();

const rushSegmentSchema = z.strictObject({
  kind: z.literal("rush"),
  ballCarrier: playerAttributionSchema,
  yards: wholeNumber,
});

const receptionSegmentSchema = z.strictObject({
  kind: z.literal("reception"),
  passer: playerAttributionSchema,
  receiver: playerAttributionSchema,
  yards: wholeNumber,
});

const incompletionSegmentSchema = z.strictObject({
  kind: z.literal("incompletion"),
  passer: playerAttributionSchema,
  target: playerAttributionSchema.exactOptional(),
});

const playSegmentSchema = z.discriminatedUnion("kind", [
  rushSegmentSchema,
  receptionSegmentSchema,
  incompletionSegmentSchema,
]);

const yardLineSchema = wholeNumber.min(1);

const fieldPositionSchema = z.discriminatedUnion("side", [
  z.strictObject({ side: z.enum(["own", "opponent"]), yardLine: yardLineSchema }),
  z.strictObject({ side: z.literal("midfield") }),
]);

const observedContextSchema = z.strictObject({
  possession: z.enum(["home", "away"]).exactOptional(),
  down: z.literal([1, 2, 3, 4]).exactOptional(),
  distance: z.union([wholeNumber.min(1), z.literal("goal")]).exactOptional(),
  ballPosition: fieldPositionSchema.exactOptional(),
});

const observationContextShape = {
  period: wholeNumber.min(1),
  clockSeconds: wholeNumber.min(0).exactOptional(),
  note: z.string().exactOptional(),
  observedContext: observedContextSchema.exactOptional(),
};

const playObservationSchema = z.discriminatedUnion("outcome", [
  z.strictObject({
    ...observationContextShape,
    family: z.literal("rush"),
    outcome: z.literal("rush"),
    marker: z.literal("kneelDown").exactOptional(),
    segments: z.tuple([rushSegmentSchema], playSegmentSchema),
  }),
  z.strictObject({
    ...observationContextShape,
    family: z.literal("pass"),
    outcome: z.literal("complete"),
    segments: z.tuple([receptionSegmentSchema], playSegmentSchema),
  }),
  z.strictObject({
    ...observationContextShape,
    family: z.literal("pass"),
    outcome: z.literal("incomplete"),
    marker: z.literal("spike").exactOptional(),
    segments: z.tuple([incompletionSegmentSchema], playSegmentSchema),
  }),
]);

/**
 * Parses a payload version 1 play observation. The first segment is typed by the outcome with a
 * tuple-with-rest schema; later segments may be any supported kind. Ruleset limits such as yards
 * and yard lines bounded by the field length are checked by the domain, not here.
 * See docs/adr/ADR-002-segmented-play-observation.md and docs/adr/ADR-003-runtime-schema-library.md.
 */
export const parsePlayObservation = (input: unknown): ContractResult<PlayObservation> =>
  toContractResult(playObservationSchema.safeParse(input));
