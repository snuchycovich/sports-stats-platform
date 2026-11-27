import { findRuleset, maxYardLine } from "@stats/domain";
import type { GameSetup, TeamSide } from "@stats/domain";
import { z } from "zod";
import { addContractIssue, toContractResult } from "./contract-result";
import type { ContractResult } from "./contract-result";

/**
 * What a device downloads to start capturing a game: its setup and the revision it reflects.
 * See docs/adr/ADR-003-runtime-schema-library.md.
 */
export type GamePackage = {
  readonly setup: GameSetup;
  readonly gameRevision: number;
};

const teamSides: readonly TeamSide[] = ["home", "away"];

const wholeNumber = z.number().int();

const versionSchema = z.templateLiteral([
  z.string().min(1),
  "/",
  wholeNumber.min(0),
  ".",
  wholeNumber.min(0),
  ".",
  wholeNumber.min(0),
]);

const teamSchema = z.strictObject({ id: z.string(), name: z.string() });

const rosterSchema = z.strictObject({
  teamId: z.string(),
  entries: z.array(
    z.strictObject({
      playerId: z.string(),
      jerseyNumber: wholeNumber.min(0).max(99),
      displayName: z.string().exactOptional(),
    }),
  ),
});

const fieldPositionSchema = z.discriminatedUnion("side", [
  z.strictObject({ side: z.enum(["own", "opponent"]), yardLine: wholeNumber.min(1) }),
  z.strictObject({ side: z.literal("midfield") }),
]);

const checkTeams = (setup: GameSetup, ctx: z.RefinementCtx): void => {
  if (setup.home.id === setup.away.id) {
    addContractIssue(
      ctx,
      "duplicate_team",
      ["away", "id"],
      "Home and away must be different teams.",
    );
  }
  for (const side of teamSides) {
    if (setup.rosters[side].teamId !== setup[side].id) {
      addContractIssue(
        ctx,
        "roster_team_mismatch",
        ["rosters", side, "teamId"],
        "The roster belongs to another team.",
      );
    }
  }
};

const checkRosterEntries = (setup: GameSetup, ctx: z.RefinementCtx): void => {
  for (const side of teamSides) {
    const playerIds = new Set<string>();
    const jerseys = new Set<number>();
    for (const [index, entry] of setup.rosters[side].entries.entries()) {
      const path = ["rosters", side, "entries", index];
      if (playerIds.has(entry.playerId)) {
        addContractIssue(
          ctx,
          "duplicate_player",
          [...path, "playerId"],
          "The player is already on the roster.",
        );
      }
      if (jerseys.has(entry.jerseyNumber)) {
        addContractIssue(
          ctx,
          "duplicate_jersey",
          [...path, "jerseyNumber"],
          "The jersey number is already used.",
        );
      }
      playerIds.add(entry.playerId);
      jerseys.add(entry.jerseyNumber);
    }
  }
};

const checkStartingPosition = (setup: GameSetup, ctx: z.RefinementCtx): void => {
  const ruleset = findRuleset(setup.versions.ruleset);
  if (ruleset === undefined) {
    addContractIssue(
      ctx,
      "unsupported_ruleset",
      ["versions", "ruleset"],
      "The ruleset is not supported.",
    );
    return;
  }
  const { ballPosition } = setup.startingContext;
  if (ballPosition.side !== "midfield" && ballPosition.yardLine > maxYardLine(ruleset)) {
    addContractIssue(
      ctx,
      "out_of_range",
      ["startingContext", "ballPosition", "yardLine"],
      `The yard line must be at most ${maxYardLine(ruleset)} on this field.`,
    );
  }
};

const gameSetupSchema = z
  .strictObject({
    gameId: z.string(),
    home: teamSchema,
    away: teamSchema,
    rosters: z.strictObject({ home: rosterSchema, away: rosterSchema }),
    startingContext: z.strictObject({
      possession: z.enum(teamSides),
      ballPosition: fieldPositionSchema,
    }),
    versions: z.strictObject({ ruleset: versionSchema, statisticalPolicy: versionSchema }),
  })
  .superRefine((setup, ctx) => {
    checkTeams(setup, ctx);
    checkRosterEntries(setup, ctx);
    checkStartingPosition(setup, ctx);
  });

const gamePackageSchema = z.strictObject({
  setup: gameSetupSchema,
  gameRevision: wholeNumber.min(1),
});

/**
 * Parses a game package. Teams must differ, rosters must match their team without duplicate
 * players or jerseys, and the starting yard line is bounded by the field length of the setup's
 * ruleset; an unknown ruleset is reported as `unsupported_ruleset`.
 * See docs/technical/domain-model.md, "Field position and yards".
 */
export const parseGamePackage = (input: unknown): ContractResult<GamePackage> =>
  toContractResult(gamePackageSchema.safeParse(input));
