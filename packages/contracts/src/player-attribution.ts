import type { PlayerAttribution } from "@stats/domain";
import { z } from "zod";
import { toContractResult } from "./contract-result";
import type { ContractResult } from "./contract-result";

/** Package-internal: reused by other schemas, never re-exported from the package index. */
export const playerAttributionSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("identified"), playerId: z.string() }),
  z.strictObject({
    kind: z.literal("unknown"),
    observedJersey: z.number().int().min(0).max(99).exactOptional(),
  }),
]);

/**
 * Parses an identified roster player, or an unknown player with an optional jersey from 0 to 99.
 * See docs/technical/prototype-football-profile.md, "Required attribution".
 */
export const parsePlayerAttribution = (input: unknown): ContractResult<PlayerAttribution> =>
  toContractResult(playerAttributionSchema.safeParse(input));
