import type { PlayRevision } from "@stats/domain";
import { z } from "zod";
import { toContractIssues, toContractResult } from "./contract-result";
import type { ContractResult } from "./contract-result";
import { playObservationSchema } from "./play-observation";

const envelopeHeaderSchema = z.looseObject({ payloadVersion: z.unknown().optional() });

const playRevisionV1Schema = z.strictObject({
  playId: z.string(),
  gameId: z.string(),
  orderKey: z.string().min(1),
  revision: z.number().int().min(1),
  payloadVersion: z.literal(1),
  captureCompleteness: z.enum(["minimal", "needs_details", "complete"]),
  reviewStatus: z.enum(["draft", "needs_review", "confirmed"]),
  observation: playObservationSchema,
});

const unsupportedPayloadVersion: ContractResult<PlayRevision> = {
  ok: false,
  issues: [
    {
      path: ["payloadVersion"],
      code: "unsupported_payload_version",
      message: "The payload version is not supported.",
    },
  ],
};

/**
 * Parses a play revision envelope. The payload version is read first and selects the parser, so
 * an unsupported version is reported without parsing the observation.
 * See docs/technical/domain-model.md, "Ordered log and revisions".
 */
export const parsePlayRevision = (input: unknown): ContractResult<PlayRevision> => {
  const header = envelopeHeaderSchema.safeParse(input);
  if (!header.success) {
    return { ok: false, issues: toContractIssues(header.error) };
  }
  switch (header.data.payloadVersion) {
    case 1:
      return toContractResult(playRevisionV1Schema.safeParse(input));
    default:
      return unsupportedPayloadVersion;
  }
};
